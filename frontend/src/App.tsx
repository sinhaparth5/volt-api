import { useState, useRef, useEffect, useCallback } from "react";
import { SendRequest, LoadHistoryItem, LoadSavedRequest, GetActiveVariables } from "../wailsjs/go/app/App";
import { app } from "../wailsjs/go/models";
import { Sidebar, SidebarRef } from "./components/Sidebar";
import { RequestSection } from "./components/RequestSection";
import { ResponseSection, SentRequestInfo } from "./components/ResponseSection";
import { ProxySettings, SSLSettings, RedirectSettings } from "./components/ClientSettings";
import { SaveRequestModal } from "./components/SaveRequestModal";
import { EnvironmentSelector } from "./components/EnvironmentSelector";
import { EnvironmentManager } from "./components/EnvironmentManager";
import { ResizablePanel } from "./components/ResizablePanel";
import { TitleBar } from "./components/TitleBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AboutDialog } from "./components/AboutDialog";
import { AppIcon } from "./components/AppLogo";
import { Icons } from "./components/Icons";
import {
  KeyValuePair,
  AuthSettings,
  BodyType,
  createEmptyPair,
  defaultAuthSettings,
  keyValuePairsToHeaders,
  authToHeaders,
  headersToKeyValuePairs,
  parseQueryParams,
  buildUrlWithParams,
  getBaseUrl,
  formDataToUrlEncoded,
  getContentTypeHeader,
} from "./utils/helpers";
import { Assertion, AssertionResult } from "./utils/assertions";
import { ChainVariable } from "./utils/chainVariables";
import {
  preloadWasm,
  wasmRunAssertions,
  wasmSubstituteVariables,
  wasmSubstituteVariablesBatch,
  isWasmLoaded
} from "./utils/wasm";
import { RequestTab, createDefaultTab } from "./utils/tabs";
import "./style.css";

type HTTPResponse = app.HTTPResponse;
type HistoryItem = app.HistoryItem;
type SavedRequest = app.SavedRequest;
type SidebarTab = "history" | "collections";

function App() {
  // Tab management
  const [tabs, setTabs] = useState<RequestTab[]>([createDefaultTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  // Get current active tab
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Sidebar and modal state (shared across tabs)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("history");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [activeVariables, setActiveVariables] = useState<Record<string, string>>({});

  const sidebarRef = useRef<SidebarRef>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update a field in the current tab
  const updateActiveTab = useCallback(
    <K extends keyof RequestTab>(field: K, value: RequestTab[K]) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, [field]: value } : tab
        )
      );
    },
    [activeTabId]
  );

  // Load active environment variables
  const loadActiveVariables = async () => {
    try {
      const vars = await GetActiveVariables();
      setActiveVariables(vars || {});
    } catch (err) {
      console.error("Failed to load active variables:", err);
      setActiveVariables({});
    }
  };

  useEffect(() => {
    loadActiveVariables();
    // Preload WASM module for faster response processing
    preloadWasm().catch((err) => console.warn("WASM preload failed:", err));
  }, []);

  // Tab operations
  const handleNewTab = () => {
    const newTab = createDefaultTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) return; // Don't close last tab

    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);
      // If closing active tab, switch to another
      if (tabId === activeTabId) {
        const closedIndex = prev.findIndex((t) => t.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      }
      return newTabs;
    });
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + Enter: Send request
      if (isMod && e.key === "Enter") {
        e.preventDefault();
        if (activeTab.url.trim() && activeTab.requestState !== "loading") {
          handleSend();
        }
        return;
      }

      // Ctrl/Cmd + S: Save to collection
      if (isMod && e.key === "s") {
        e.preventDefault();
        if (activeTab.url.trim() && !showSaveModal) {
          setShowSaveModal(true);
        }
        return;
      }

      // Ctrl/Cmd + E: Open environment manager
      if (isMod && e.key === "e") {
        e.preventDefault();
        setShowEnvManager((prev) => !prev);
        return;
      }

      // Ctrl/Cmd + T: New tab
      if (isMod && e.key === "t") {
        e.preventDefault();
        handleNewTab();
        return;
      }

      // Ctrl/Cmd + W: Close tab
      if (isMod && e.key === "w") {
        e.preventDefault();
        if (tabs.length > 1) {
          handleCloseTab(activeTabId);
        }
        return;
      }

      // Ctrl/Cmd + Shift + A: About dialog
      if (isMod && e.shiftKey && e.key === "A") {
        e.preventDefault();
        setShowAbout(true);
        return;
      }

      // Escape: Close modals or cancel request
      if (e.key === "Escape") {
        if (showAbout) {
          setShowAbout(false);
        } else if (showSaveModal) {
          setShowSaveModal(false);
        } else if (showEnvManager) {
          setShowEnvManager(false);
        } else if (activeTab.requestState === "loading") {
          handleCancel();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, showSaveModal, showEnvManager, tabs.length, activeTabId]);

  // Cancel current request
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    updateActiveTab("requestState", "idle");
  };

  const handleSend = async () => {
    if (!activeTab.url.trim()) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    updateActiveTab("requestState", "loading");
    updateActiveTab("response", null);
    updateActiveTab("assertionResults", []);
    updateActiveTab("sentRequest", null);

    // Merge environment variables with chain variables (chain takes precedence)
    const chainVarsMap = activeTab.chainVariables.reduce((acc, v) => {
      acc[v.name] = v.value;
      return acc;
    }, {} as Record<string, string>);
    const allVariables = { ...activeVariables, ...chainVarsMap };

    // Apply variable substitution using WASM (faster regex processing)
    let finalUrl = await wasmSubstituteVariables(activeTab.url.trim(), allVariables);
    if (activeTab.auth.type === "apikey" && activeTab.auth.apiKeyLocation === "query" && activeTab.auth.apiKeyName && activeTab.auth.apiKeyValue) {
      const baseUrl = getBaseUrl(finalUrl);
      const existingParams = parseQueryParams(finalUrl);
      const apiKeyParam: KeyValuePair = {
        id: "apikey",
        key: activeTab.auth.apiKeyName,
        value: activeTab.auth.apiKeyValue,
        enabled: true,
      };
      const filteredParams = existingParams.filter((p) => p.key !== activeTab.auth.apiKeyName);
      finalUrl = buildUrlWithParams(baseUrl, [...filteredParams, apiKeyParam]);
    }

    // Merge custom headers with auth headers and content-type
    const customHeaders = keyValuePairsToHeaders(activeTab.headers);
    const authHeaders = authToHeaders(activeTab.auth);
    const contentTypeHeader = getContentTypeHeader(activeTab.bodyType);
    const userAgentHeader: Record<string, string> = activeTab.userAgent ? { "User-Agent": activeTab.userAgent } : {};
    const mergedHeaders = { ...contentTypeHeader, ...userAgentHeader, ...customHeaders, ...authHeaders };

    // Apply variable substitution to headers using WASM batch processing
    const headerKeys = Object.keys(mergedHeaders);
    const headerValues = Object.values(mergedHeaders);
    const [substitutedKeys, substitutedValues] = await Promise.all([
      wasmSubstituteVariablesBatch(headerKeys, allVariables),
      wasmSubstituteVariablesBatch(headerValues, allVariables),
    ]);
    const finalHeaders: Record<string, string> = {};
    for (let i = 0; i < headerKeys.length; i++) {
      finalHeaders[substitutedKeys[i]] = substitutedValues[i];
    }

    // Prepare body based on type and apply variable substitution
    let finalBody = "";
    if (activeTab.bodyType === "json" || activeTab.bodyType === "raw") {
      finalBody = await wasmSubstituteVariables(activeTab.requestBody, allVariables);
    } else if (activeTab.bodyType === "form-data") {
      finalBody = formDataToUrlEncoded(activeTab.formData);
    }

    // Store sent request info for display
    updateActiveTab("sentRequest", {
      method: activeTab.method,
      url: finalUrl,
      headers: finalHeaders,
      body: finalBody,
    });

    try {
      const result = await SendRequest({
        method: activeTab.method,
        url: finalUrl,
        headers: finalHeaders,
        body: finalBody,
        timeout: activeTab.timeout,
        proxyUrl: activeTab.proxy.enabled ? activeTab.proxy.url : "",
        skipSslVerify: activeTab.ssl.skipVerify,
        clientCertPath: activeTab.ssl.clientCertPath,
        clientKeyPath: activeTab.ssl.clientKeyPath,
        followRedirects: activeTab.redirects.follow,
        maxRedirects: activeTab.redirects.maxRedirects,
      });

      // Check if request was cancelled
      if (currentAbortController.signal.aborted) {
        return;
      }

      updateActiveTab("response", result);
      updateActiveTab("requestState", result.error ? "error" : "success");

      // Run assertions if we have a valid response (no error)
      if (!result.error && activeTab.assertions.length > 0) {
        const responseData = {
          statusCode: result.statusCode,
          statusText: result.statusText,
          headers: result.headers || {},
          body: result.body,
          timingMs: result.timingMs,
        };
        // Use WASM for faster assertion evaluation (parses JSON once)
        const results = await wasmRunAssertions(activeTab.assertions, responseData);
        updateActiveTab("assertionResults", results);
      }

      setTimeout(() => {
        sidebarRef.current?.refreshHistory();
      }, 100);
    } catch (err) {
      // Check if request was cancelled
      if (currentAbortController.signal.aborted) {
        return;
      }

      updateActiveTab("response", {
        statusCode: 0,
        statusText: "",
        headers: {},
        body: "",
        timingMs: 0,
        contentLength: 0,
        error: String(err),
      });
      updateActiveTab("requestState", "error");
    }
  };

  const handleSelectHistoryItem = async (item: HistoryItem) => {
    try {
      const fullItem = await LoadHistoryItem(item.id);
      if (fullItem) {
        updateActiveTab("method", fullItem.method || "GET");
        updateActiveTab("url", fullItem.url || "");
        updateActiveTab("requestBody", fullItem.body || "");
        updateActiveTab("headers", headersToKeyValuePairs(fullItem.headers || {}));
        updateActiveTab("queryParams", parseQueryParams(fullItem.url || ""));
        updateActiveTab("auth", defaultAuthSettings());

        // Detect body type from content
        if (fullItem.body) {
          try {
            JSON.parse(fullItem.body);
            updateActiveTab("bodyType", "json");
          } catch {
            updateActiveTab("bodyType", "raw");
          }
        } else {
          updateActiveTab("bodyType", "json");
        }

        updateActiveTab("formData", [createEmptyPair()]);
        updateActiveTab("response", null);
        updateActiveTab("requestState", "idle");
      }
    } catch (err) {
      console.error("Failed to load history item:", err);
    }
  };

  const handleSelectSavedRequest = async (request: SavedRequest) => {
    try {
      const fullRequest = await LoadSavedRequest(request.id);
      if (fullRequest) {
        updateActiveTab("method", fullRequest.method || "GET");
        updateActiveTab("url", fullRequest.url || "");
        updateActiveTab("requestBody", fullRequest.body || "");
        updateActiveTab("headers", headersToKeyValuePairs(fullRequest.headers || {}));
        updateActiveTab("queryParams", parseQueryParams(fullRequest.url || ""));
        updateActiveTab("auth", defaultAuthSettings());

        // Detect body type from content
        if (fullRequest.body) {
          try {
            JSON.parse(fullRequest.body);
            updateActiveTab("bodyType", "json");
          } catch {
            updateActiveTab("bodyType", "raw");
          }
        } else {
          updateActiveTab("bodyType", "json");
        }

        updateActiveTab("formData", [createEmptyPair()]);
        updateActiveTab("response", null);
        updateActiveTab("requestState", "idle");
      }
    } catch (err) {
      console.error("Failed to load saved request:", err);
    }
  };

  const handleSaveRequest = () => {
    if (!activeTab.url.trim()) return;
    setShowSaveModal(true);
  };

  const handleSavedRequest = () => {
    sidebarRef.current?.refreshCollections();
  };

  // Get merged headers for save modal
  const getMergedHeaders = () => {
    const customHeaders = keyValuePairsToHeaders(activeTab.headers);
    const authHeaders = authToHeaders(activeTab.auth);
    return { ...customHeaders, ...authHeaders };
  };

  // Chain variable handlers
  const handleAddChainVariable = (variable: ChainVariable) => {
    updateActiveTab("chainVariables", (() => {
      const filtered = activeTab.chainVariables.filter((v) => v.name !== variable.name);
      return [...filtered, variable];
    })());
  };

  const handleRemoveChainVariable = (id: string) => {
    updateActiveTab("chainVariables", activeTab.chainVariables.filter((v) => v.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-ctp-base text-ctp-text font-mono text-sm">
      {/* Custom Title Bar - spans full width at top */}
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={setActiveTabId}
        onTabClose={handleCloseTab}
        onNewTab={handleNewTab}
        onLogoClick={() => setShowAbout(true)}
      />

      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ResizablePanel
          direction="horizontal"
          initialSize={240}
          minSize={180}
          maxSize={400}
          storageKey="sidebar"
          className="border-r border-ctp-surface0"
        >
          <ErrorBoundary>
            <Sidebar
              ref={sidebarRef}
              activeTab={sidebarTab}
              onTabChange={setSidebarTab}
              onSelectHistoryItem={handleSelectHistoryItem}
              onSelectSavedRequest={handleSelectSavedRequest}
            />
          </ErrorBoundary>
        </ResizablePanel>

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar - Environment and Save */}
          <header className="h-8 border-b border-ctp-surface0 flex items-center justify-between px-3 bg-ctp-mantle">
          <EnvironmentSelector
            onEnvironmentChange={loadActiveVariables}
            onManageClick={() => setShowEnvManager(true)}
          />
          <button
            onClick={handleSaveRequest}
            disabled={!activeTab.url.trim()}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 rounded disabled:opacity-50 disabled:pointer-events-none"
            title="Save to Collection (Ctrl+S)"
          >
            <Icons.Save size={10} />
            Save
          </button>
        </header>

        <ErrorBoundary>
          <RequestSection
            method={activeTab.method}
            url={activeTab.url}
            requestBody={activeTab.requestBody}
            requestState={activeTab.requestState}
            headers={activeTab.headers}
            queryParams={activeTab.queryParams}
            auth={activeTab.auth}
            bodyType={activeTab.bodyType}
            formData={activeTab.formData}
            assertions={activeTab.assertions}
            timeout={activeTab.timeout}
            userAgent={activeTab.userAgent}
            proxy={activeTab.proxy}
            ssl={activeTab.ssl}
            redirects={activeTab.redirects}
            activeVariables={activeVariables}
            onMethodChange={(v) => updateActiveTab("method", v)}
            onUrlChange={(v) => updateActiveTab("url", v)}
            onBodyChange={(v) => updateActiveTab("requestBody", v)}
            onHeadersChange={(v) => updateActiveTab("headers", v)}
            onQueryParamsChange={(v) => updateActiveTab("queryParams", v)}
            onAuthChange={(v) => updateActiveTab("auth", v)}
            onBodyTypeChange={(v) => updateActiveTab("bodyType", v)}
            onFormDataChange={(v) => updateActiveTab("formData", v)}
            onAssertionsChange={(v) => updateActiveTab("assertions", v)}
            onTimeoutChange={(v) => updateActiveTab("timeout", v)}
            onUserAgentChange={(v) => updateActiveTab("userAgent", v)}
            onProxyChange={(v) => updateActiveTab("proxy", v)}
            onSSLChange={(v) => updateActiveTab("ssl", v)}
            onRedirectsChange={(v) => updateActiveTab("redirects", v)}
            onSend={handleSend}
            onCancel={handleCancel}
          />
        </ErrorBoundary>

        <ErrorBoundary>
          <ResponseSection
            response={activeTab.response}
            requestState={activeTab.requestState}
            assertionResults={activeTab.assertionResults}
            chainVariables={activeTab.chainVariables}
            sentRequest={activeTab.sentRequest}
            onAddChainVariable={handleAddChainVariable}
            onRemoveChainVariable={handleRemoveChainVariable}
          />
        </ErrorBoundary>
        </main>
      </div>

      <SaveRequestModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaved={handleSavedRequest}
        method={activeTab.method}
        url={activeTab.url}
        headers={getMergedHeaders()}
        body={activeTab.requestBody}
      />

      <EnvironmentManager
        isOpen={showEnvManager}
        onClose={() => setShowEnvManager(false)}
        onEnvironmentChange={loadActiveVariables}
      />

      <AboutDialog
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </div>
  );
}

export default App;

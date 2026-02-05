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
import { RequestTabs } from "./components/RequestTabs";
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
  substituteVariables,
  substituteHeaderVariables,
} from "./utils/helpers";
import { Assertion, AssertionResult, runAssertions } from "./utils/assertions";
import { ChainVariable } from "./utils/chainVariables";
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
  const [activeVariables, setActiveVariables] = useState<Record<string, string>>({});

  const sidebarRef = useRef<SidebarRef>(null);

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

      // Escape: Close modals
      if (e.key === "Escape") {
        if (showSaveModal) {
          setShowSaveModal(false);
        } else if (showEnvManager) {
          setShowEnvManager(false);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, showSaveModal, showEnvManager, tabs.length, activeTabId]);

  const handleSend = async () => {
    if (!activeTab.url.trim()) return;

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

    // Apply variable substitution
    let finalUrl = substituteVariables(activeTab.url.trim(), allVariables);
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

    // Apply variable substitution to headers
    const finalHeaders = substituteHeaderVariables(mergedHeaders, allVariables);

    // Prepare body based on type and apply variable substitution
    let finalBody = "";
    if (activeTab.bodyType === "json" || activeTab.bodyType === "raw") {
      finalBody = substituteVariables(activeTab.requestBody, allVariables);
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

      updateActiveTab("response", result);
      updateActiveTab("requestState", result.error ? "error" : "success");

      // Run assertions if we have a valid response (no error)
      if (!result.error && activeTab.assertions.length > 0) {
        const results = runAssertions(activeTab.assertions, {
          statusCode: result.statusCode,
          statusText: result.statusText,
          headers: result.headers || {},
          body: result.body,
          timingMs: result.timingMs,
        });
        updateActiveTab("assertionResults", results);
      }

      setTimeout(() => {
        sidebarRef.current?.refreshHistory();
      }, 100);
    } catch (err) {
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
    <div className="flex h-screen bg-ctp-base text-ctp-text font-mono text-sm">
      <ResizablePanel
        direction="horizontal"
        initialSize={240}
        minSize={180}
        maxSize={400}
        storageKey="sidebar"
        className="border-r border-ctp-surface0"
      >
        <Sidebar
          ref={sidebarRef}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          onSelectHistoryItem={handleSelectHistoryItem}
          onSelectSavedRequest={handleSelectSavedRequest}
        />
      </ResizablePanel>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Request Tabs */}
        <RequestTabs
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={setActiveTabId}
          onTabClose={handleCloseTab}
          onNewTab={handleNewTab}
        />

        {/* Header - Environment and Save */}
        <header className="h-10 border-b border-ctp-surface0 flex items-center justify-between px-4 bg-ctp-mantle">
          <div className="flex items-center gap-2">
            <EnvironmentSelector
              onEnvironmentChange={loadActiveVariables}
              onManageClick={() => setShowEnvManager(true)}
            />
          </div>
          <button
            onClick={handleSaveRequest}
            disabled={!activeTab.url.trim()}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 rounded-md disabled:opacity-50 disabled:pointer-events-none"
            title="Save to Collection (Ctrl+S)"
          >
            <Icons.Save size={12} />
            Save
          </button>
        </header>

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
        />

        <ResponseSection
          response={activeTab.response}
          requestState={activeTab.requestState}
          assertionResults={activeTab.assertionResults}
          chainVariables={activeTab.chainVariables}
          sentRequest={activeTab.sentRequest}
          onAddChainVariable={handleAddChainVariable}
          onRemoveChainVariable={handleRemoveChainVariable}
        />
      </main>

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
    </div>
  );
}

export default App;

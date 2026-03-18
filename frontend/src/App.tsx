import { useState, useRef, useEffect, useCallback } from "react";
import design1 from "./assets/images/designs/design-1.webp";
import design2 from "./assets/images/designs/design-2.webp";
import design3 from "./assets/images/designs/design-3.webp";
import design4 from "./assets/images/designs/design-4.webp";
import { SendRequest, LoadHistoryItem, LoadSavedRequest, GetActiveVariables } from "../wailsjs/go/app/App";
import { EventsOn, EventsOff } from "../wailsjs/runtime/runtime";
import { app } from "../wailsjs/go/models";
import { Sidebar, SidebarRef } from "./components/Sidebar";
import { RequestSection } from "./components/RequestSection";
import { ResponseSection } from "./components/ResponseSection";
import { SaveRequestModal } from "./components/SaveRequestModal";
import { EnvironmentSelector } from "./components/EnvironmentSelector";
import { EnvironmentManager } from "./components/EnvironmentManager";
import { ResizablePanel } from "./components/ResizablePanel";
import { TitleBar } from "./components/TitleBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AboutDialog } from "./components/AboutDialog";
import { Icons } from "./components/Icons";
import {
  KeyValuePair,
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
import { ChainVariable } from "./utils/chainVariables";
import {
  preloadWasm,
  wasmRunAssertions,
  wasmSubstituteVariables,
  wasmSubstituteVariablesBatch,
} from "./utils/wasm";
import { RequestTab, createDefaultTab } from "./utils/tabs";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import "./style.css";

type HistoryItem = app.HistoryItem;
type SavedRequest = app.SavedRequest;
type SidebarTab = "history" | "collections";

const detectBodyType = (body: string) => {
  if (!body) {
    return "json" as const;
  }

  try {
    JSON.parse(body);
    return "json" as const;
  } catch {
    return "raw" as const;
  }
};

const buildVariableMap = (activeVariables: Record<string, string>, chainVariables: ChainVariable[]) => {
  return chainVariables.reduce(
    (variables, variable) => ({ ...variables, [variable.name]: variable.value }),
    activeVariables
  );
};

const mergeHeaders = (tab: RequestTab) => {
  const contentTypeHeader = getContentTypeHeader(tab.bodyType);
  const userAgentHeader = tab.userAgent ? { "User-Agent": tab.userAgent } : {};
  return {
    ...contentTypeHeader,
    ...userAgentHeader,
    ...keyValuePairsToHeaders(tab.headers),
    ...authToHeaders(tab.auth),
  };
};

function App() {
  const [tabs, setTabs] = useState<RequestTab[]>([createDefaultTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("history");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [activeVariables, setActiveVariables] = useState<Record<string, string>>({});

  const [downloadProgress, setDownloadProgress] = useState<{ bytesRead: number; total: number } | null>(null);

  const sidebarRef = useRef<SidebarRef>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const loadActiveVariables = useCallback(async () => {
    try {
      const vars = await GetActiveVariables();
      setActiveVariables(vars || {});
    } catch (err) {
      console.error("Failed to load active variables:", err);
      setActiveVariables({});
    }
  }, []);

  useEffect(() => {
    loadActiveVariables();
    preloadWasm().catch((err) => console.warn("WASM preload failed:", err));
  }, [loadActiveVariables]);

  useEffect(() => {
    const handleProgress = (data: { bytesRead: number; total: number }) => {
      setDownloadProgress({ bytesRead: data.bytesRead, total: data.total });
    };

    EventsOn("response:progress", handleProgress);

    return () => {
      EventsOff("response:progress");
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleNewTab = () => {
    const newTab = createDefaultTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) return;

    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);
      if (tabId === activeTabId) {
        const closedIndex = prev.findIndex((t) => t.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      }
      return newTabs;
    });
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setDownloadProgress(null);
    updateActiveTab("requestState", "idle");
  };

  const loadStoredRequest = useCallback((request: { method?: string; url?: string; body?: string; headers?: Record<string, string> }) => {
    const body = request.body || "";

    updateActiveTab("method", request.method || "GET");
    updateActiveTab("url", request.url || "");
    updateActiveTab("requestBody", body);
    updateActiveTab("headers", headersToKeyValuePairs(request.headers || {}));
    updateActiveTab("queryParams", parseQueryParams(request.url || ""));
    updateActiveTab("auth", defaultAuthSettings());
    updateActiveTab("bodyType", detectBodyType(body));
    updateActiveTab("formData", [createEmptyPair()]);
    updateActiveTab("response", null);
    updateActiveTab("requestState", "idle");
  }, [updateActiveTab]);

  const handleSend = useCallback(async () => {
    if (!activeTab.url.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    updateActiveTab("requestState", "loading");
    updateActiveTab("response", null);
    updateActiveTab("assertionResults", []);
    updateActiveTab("sentRequest", null);
    setDownloadProgress(null);

    const allVariables = buildVariableMap(activeVariables, activeTab.chainVariables);

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

    const mergedHeaders = mergeHeaders(activeTab);

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

    let finalBody = "";
    if (activeTab.bodyType === "json" || activeTab.bodyType === "raw") {
      finalBody = await wasmSubstituteVariables(activeTab.requestBody, allVariables);
    } else if (activeTab.bodyType === "form-data") {
      const formKeys = activeTab.formData.map((pair) => pair.key);
      const formValues = activeTab.formData.map((pair) => pair.value);
      const [substitutedFormKeys, substitutedFormValues] = await Promise.all([
        wasmSubstituteVariablesBatch(formKeys, allVariables),
        wasmSubstituteVariablesBatch(formValues, allVariables),
      ]);

      finalBody = formDataToUrlEncoded(
        activeTab.formData.map((pair, index) => ({
          ...pair,
          key: substitutedFormKeys[index],
          value: substitutedFormValues[index],
        }))
      );
    }

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

      if (currentAbortController.signal.aborted) {
        return;
      }

      setDownloadProgress(null);
      updateActiveTab("response", result);
      updateActiveTab("requestState", result.error ? "error" : "success");

      if (!result.error && activeTab.assertions.length > 0) {
        const responseData = {
          statusCode: result.statusCode,
          statusText: result.statusText,
          headers: result.headers || {},
          body: result.body,
          timingMs: result.timingMs,
        };
        const results = await wasmRunAssertions(activeTab.assertions, responseData);
        updateActiveTab("assertionResults", results);
      }

      setTimeout(() => {
        sidebarRef.current?.refreshHistory();
      }, 100);
    } catch (err) {
      setDownloadProgress(null);

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
  }, [activeTab, activeVariables, updateActiveTab]);

  const handleSelectHistoryItem = async (item: HistoryItem) => {
    try {
      const fullItem = await LoadHistoryItem(item.id);
      if (fullItem) {
        loadStoredRequest(fullItem);
      }
    } catch (err) {
      console.error("Failed to load history item:", err);
    }
  };

  const handleSelectSavedRequest = async (request: SavedRequest) => {
    try {
      const fullRequest = await LoadSavedRequest(request.id);
      if (fullRequest) {
        loadStoredRequest(fullRequest);
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

  const getMergedHeaders = () => {
    return {
      ...keyValuePairsToHeaders(activeTab.headers),
      ...authToHeaders(activeTab.auth),
    };
  };

  const handleAddChainVariable = (variable: ChainVariable) => {
    updateActiveTab("chainVariables", (() => {
      const filtered = activeTab.chainVariables.filter((v) => v.name !== variable.name);
      return [...filtered, variable];
    })());
  };

  const handleRemoveChainVariable = (id: string) => {
    updateActiveTab("chainVariables", activeTab.chainVariables.filter((v) => v.id !== id));
  };

  useGlobalShortcuts({
    canSend: Boolean(activeTab.url.trim()) && activeTab.requestState !== "loading",
    canSave: Boolean(activeTab.url.trim()) && !showSaveModal,
    canCloseTab: tabs.length > 1,
    onSend: handleSend,
    onSave: handleSaveRequest,
    onToggleEnvironmentManager: () => setShowEnvManager((prev) => !prev),
    onNewTab: handleNewTab,
    onCloseTab: () => handleCloseTab(activeTabId),
    onShowAbout: () => setShowAbout(true),
    onEscape: () => {
      if (showAbout) {
        setShowAbout(false);
      } else if (showSaveModal) {
        setShowSaveModal(false);
      } else if (showEnvManager) {
        setShowEnvManager(false);
      } else if (activeTab.requestState === "loading") {
        handleCancel();
      }
    },
  });

  return (
    <div className="relative flex flex-col h-screen bg-ctp-base text-ctp-text font-mono text-sm overflow-hidden">
      <img src={design1} alt="" aria-hidden="true" className="pointer-events-none select-none absolute -top-16 -right-16 w-80 h-80 opacity-[0.12] mix-blend-screen rotate-12 z-40" />
      <img src={design2} alt="" aria-hidden="true" className="pointer-events-none select-none absolute -bottom-20 -left-20 w-96 h-96 opacity-[0.12] mix-blend-screen -rotate-12 z-40" />
      <img src={design3} alt="" aria-hidden="true" className="pointer-events-none select-none absolute -bottom-10 -right-10 w-72 h-72 opacity-[0.08] mix-blend-screen rotate-6 z-40" />
      <img src={design4} alt="" aria-hidden="true" className="pointer-events-none select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.05] mix-blend-screen z-40" />

      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
        <TitleBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={setActiveTabId}
          onTabClose={handleCloseTab}
          onNewTab={handleNewTab}
          onLogoClick={() => setShowAbout(true)}
        />

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
                downloadProgress={downloadProgress}
                assertionResults={activeTab.assertionResults}
                chainVariables={activeTab.chainVariables}
                sentRequest={activeTab.sentRequest}
                onAddChainVariable={handleAddChainVariable}
                onRemoveChainVariable={handleRemoveChainVariable}
              />
            </ErrorBoundary>
          </main>
        </div>
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

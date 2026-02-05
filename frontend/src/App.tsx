import { useState, useRef, useEffect, useCallback } from "react";
import { SendRequest, LoadHistoryItem, LoadSavedRequest, GetActiveVariables } from "../wailsjs/go/app/App";
import { app } from "../wailsjs/go/models";
import { Sidebar, SidebarRef } from "./components/Sidebar";
import { RequestSection } from "./components/RequestSection";
import { ResponseSection } from "./components/ResponseSection";
import { SaveRequestModal } from "./components/SaveRequestModal";
import { EnvironmentSelector } from "./components/EnvironmentSelector";
import { EnvironmentManager } from "./components/EnvironmentManager";
import { ResizablePanel } from "./components/ResizablePanel";
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
import "./style.css";

type HTTPResponse = app.HTTPResponse;
type HistoryItem = app.HistoryItem;
type SavedRequest = app.SavedRequest;
type RequestState = "idle" | "loading" | "success" | "error";
type SidebarTab = "history" | "collections";

function App() {
  const [method, setMethod] = useState<string>("GET");
  const [url, setUrl] = useState<string>("");
  const [requestBody, setRequestBody] = useState<string>("");
  const [headers, setHeaders] = useState<KeyValuePair[]>([createEmptyPair()]);
  const [queryParams, setQueryParams] = useState<KeyValuePair[]>([createEmptyPair()]);
  const [auth, setAuth] = useState<AuthSettings>(defaultAuthSettings());
  const [bodyType, setBodyType] = useState<BodyType>("json");
  const [formData, setFormData] = useState<KeyValuePair[]>([createEmptyPair()]);
  const [response, setResponse] = useState<HTTPResponse | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [activeTab, setActiveTab] = useState<SidebarTab>("history");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [activeVariables, setActiveVariables] = useState<Record<string, string>>({});
  const [assertions, setAssertions] = useState<Assertion[]>([]);
  const [assertionResults, setAssertionResults] = useState<AssertionResult[]>([]);
  const [chainVariables, setChainVariables] = useState<ChainVariable[]>([]);
  const [requestTimeout, setRequestTimeout] = useState<number>(30); // seconds

  const sidebarRef = useRef<SidebarRef>(null);

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

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + Enter: Send request
      if (isMod && e.key === "Enter") {
        e.preventDefault();
        if (url.trim() && requestState !== "loading") {
          handleSend();
        }
        return;
      }

      // Ctrl/Cmd + S: Save to collection
      if (isMod && e.key === "s") {
        e.preventDefault();
        if (url.trim() && !showSaveModal) {
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
  }, [url, requestState, showSaveModal, showEnvManager]);

  const handleSend = async () => {
    if (!url.trim()) return;

    setRequestState("loading");
    setResponse(null);
    setAssertionResults([]);

    // Merge environment variables with chain variables (chain takes precedence)
    const chainVarsMap = chainVariables.reduce((acc, v) => {
      acc[v.name] = v.value;
      return acc;
    }, {} as Record<string, string>);
    const allVariables = { ...activeVariables, ...chainVarsMap };

    // Apply variable substitution
    let finalUrl = substituteVariables(url.trim(), allVariables);
    if (auth.type === "apikey" && auth.apiKeyLocation === "query" && auth.apiKeyName && auth.apiKeyValue) {
      const baseUrl = getBaseUrl(finalUrl);
      const existingParams = parseQueryParams(finalUrl);
      const apiKeyParam: KeyValuePair = {
        id: "apikey",
        key: auth.apiKeyName,
        value: auth.apiKeyValue,
        enabled: true,
      };
      // Filter out any existing params with the same key
      const filteredParams = existingParams.filter((p) => p.key !== auth.apiKeyName);
      finalUrl = buildUrlWithParams(baseUrl, [...filteredParams, apiKeyParam]);
    }

    // Merge custom headers with auth headers and content-type
    const customHeaders = keyValuePairsToHeaders(headers);
    const authHeaders = authToHeaders(auth);
    const contentTypeHeader = getContentTypeHeader(bodyType);
    const mergedHeaders = { ...contentTypeHeader, ...customHeaders, ...authHeaders };

    // Apply variable substitution to headers
    const finalHeaders = substituteHeaderVariables(mergedHeaders, allVariables);

    // Prepare body based on type and apply variable substitution
    let finalBody = "";
    if (bodyType === "json" || bodyType === "raw") {
      finalBody = substituteVariables(requestBody, allVariables);
    } else if (bodyType === "form-data") {
      finalBody = formDataToUrlEncoded(formData);
    }

    try {
      const result = await SendRequest({
        method,
        url: finalUrl,
        headers: finalHeaders,
        body: finalBody,
        timeout: requestTimeout,
      });

      setResponse(result);
      setRequestState(result.error ? "error" : "success");

      // Run assertions if we have a valid response (no error)
      if (!result.error && assertions.length > 0) {
        const results = runAssertions(assertions, {
          statusCode: result.statusCode,
          statusText: result.statusText,
          headers: result.headers || {},
          body: result.body,
          timingMs: result.timingMs,
        });
        setAssertionResults(results);
      }

      setTimeout(() => {
        sidebarRef.current?.refreshHistory();
      }, 100);
    } catch (err) {
      setResponse({
        statusCode: 0,
        statusText: "",
        headers: {},
        body: "",
        timingMs: 0,
        contentLength: 0,
        error: String(err),
      });
      setRequestState("error");
    }
  };

  const handleSelectHistoryItem = async (item: HistoryItem) => {
    try {
      const fullItem = await LoadHistoryItem(item.id);
      if (fullItem) {
        setMethod(fullItem.method || "GET");
        setUrl(fullItem.url || "");
        setRequestBody(fullItem.body || "");
        // Parse headers from history item
        const itemHeaders = fullItem.headers || {};
        setHeaders(headersToKeyValuePairs(itemHeaders));
        // Parse query params from URL
        setQueryParams(parseQueryParams(fullItem.url || ""));
        // Reset auth (history doesn't store auth separately)
        setAuth(defaultAuthSettings());
        // Detect body type from content
        if (fullItem.body) {
          try {
            JSON.parse(fullItem.body);
            setBodyType("json");
          } catch {
            setBodyType("raw");
          }
        } else {
          setBodyType("json");
        }
        setFormData([createEmptyPair()]);
        setResponse(null);
        setRequestState("idle");
      }
    } catch (err) {
      console.error("Failed to load history item:", err);
    }
  };

  const handleSelectSavedRequest = async (request: SavedRequest) => {
    try {
      const fullRequest = await LoadSavedRequest(request.id);
      if (fullRequest) {
        setMethod(fullRequest.method || "GET");
        setUrl(fullRequest.url || "");
        setRequestBody(fullRequest.body || "");
        // Parse headers from saved request
        const requestHeaders = fullRequest.headers || {};
        setHeaders(headersToKeyValuePairs(requestHeaders));
        // Parse query params from URL
        setQueryParams(parseQueryParams(fullRequest.url || ""));
        // Reset auth (saved requests don't store auth separately yet)
        setAuth(defaultAuthSettings());
        // Detect body type from content
        if (fullRequest.body) {
          try {
            JSON.parse(fullRequest.body);
            setBodyType("json");
          } catch {
            setBodyType("raw");
          }
        } else {
          setBodyType("json");
        }
        setFormData([createEmptyPair()]);
        setResponse(null);
        setRequestState("idle");
      }
    } catch (err) {
      console.error("Failed to load saved request:", err);
    }
  };

  const handleSaveRequest = () => {
    if (!url.trim()) return;
    setShowSaveModal(true);
  };

  const handleSavedRequest = () => {
    sidebarRef.current?.refreshCollections();
  };

  // Get merged headers for save modal
  const getMergedHeaders = () => {
    const customHeaders = keyValuePairsToHeaders(headers);
    const authHeaders = authToHeaders(auth);
    return { ...customHeaders, ...authHeaders };
  };

  // Chain variable handlers
  const handleAddChainVariable = (variable: ChainVariable) => {
    setChainVariables((prev) => {
      // Replace if same name exists
      const filtered = prev.filter((v) => v.name !== variable.name);
      return [...filtered, variable];
    });
  };

  const handleRemoveChainVariable = (id: string) => {
    setChainVariables((prev) => prev.filter((v) => v.id !== id));
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
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSelectHistoryItem={handleSelectHistoryItem}
          onSelectSavedRequest={handleSelectSavedRequest}
        />
      </ResizablePanel>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header - consistent 48px height */}
        <header className="h-12 border-b border-ctp-surface0 flex items-center justify-between px-4 bg-ctp-mantle">
          <div className="flex items-center gap-2">
            <Icons.Globe size={14} className="text-ctp-overlay0" />
            <span className="text-ctp-text text-sm">New Request</span>
          </div>
          <div className="flex items-center gap-2">
            <EnvironmentSelector
              onEnvironmentChange={loadActiveVariables}
              onManageClick={() => setShowEnvManager(true)}
            />
            <button
              onClick={handleSaveRequest}
              disabled={!url.trim()}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 rounded-md disabled:opacity-50 disabled:pointer-events-none"
              title="Save to Collection (Ctrl+S)"
            >
              <Icons.Save size={12} />
              Save
            </button>
          </div>
        </header>

        <RequestSection
          method={method}
          url={url}
          requestBody={requestBody}
          requestState={requestState}
          headers={headers}
          queryParams={queryParams}
          auth={auth}
          bodyType={bodyType}
          formData={formData}
          assertions={assertions}
          timeout={requestTimeout}
          onMethodChange={setMethod}
          onUrlChange={setUrl}
          onBodyChange={setRequestBody}
          onHeadersChange={setHeaders}
          onQueryParamsChange={setQueryParams}
          onAuthChange={setAuth}
          onBodyTypeChange={setBodyType}
          onFormDataChange={setFormData}
          onAssertionsChange={setAssertions}
          onTimeoutChange={setRequestTimeout}
          onSend={handleSend}
        />

        <ResponseSection
          response={response}
          requestState={requestState}
          assertionResults={assertionResults}
          chainVariables={chainVariables}
          onAddChainVariable={handleAddChainVariable}
          onRemoveChainVariable={handleRemoveChainVariable}
        />
      </main>

      <SaveRequestModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaved={handleSavedRequest}
        method={method}
        url={url}
        headers={getMergedHeaders()}
        body={requestBody}
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

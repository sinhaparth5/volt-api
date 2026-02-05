import { useState, useRef } from "react";
import { SendRequest, LoadHistoryItem, LoadSavedRequest } from "../wailsjs/go/app/App";
import { app } from "../wailsjs/go/models";
import { Sidebar, SidebarRef } from "./components/Sidebar";
import { RequestSection } from "./components/RequestSection";
import { ResponseSection } from "./components/ResponseSection";
import { SaveRequestModal } from "./components/SaveRequestModal";
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

  const sidebarRef = useRef<SidebarRef>(null);

  const handleSend = async () => {
    if (!url.trim()) return;

    setRequestState("loading");
    setResponse(null);

    // Build final URL with API key query param if needed
    let finalUrl = url.trim();
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

    // Prepare body based on type
    let finalBody = "";
    if (bodyType === "json" || bodyType === "raw") {
      finalBody = requestBody;
    } else if (bodyType === "form-data") {
      finalBody = formDataToUrlEncoded(formData);
    }

    try {
      const result = await SendRequest({
        method,
        url: finalUrl,
        headers: mergedHeaders,
        body: finalBody,
        timeout: 0,
      });

      setResponse(result);
      setRequestState(result.error ? "error" : "success");

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

  return (
    <div className="flex h-screen bg-ctp-base text-ctp-text font-mono text-sm">
      <Sidebar
        ref={sidebarRef}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectHistoryItem={handleSelectHistoryItem}
        onSelectSavedRequest={handleSelectSavedRequest}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header - consistent 48px height */}
        <header className="h-12 border-b border-ctp-surface0 flex items-center justify-between px-4 bg-ctp-mantle">
          <div className="flex items-center gap-2">
            <Icons.Globe size={14} className="text-ctp-overlay0" />
            <span className="text-ctp-text text-sm">New Request</span>
          </div>
          <button
            onClick={handleSaveRequest}
            disabled={!url.trim()}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 rounded-md disabled:opacity-50 disabled:pointer-events-none"
            title="Save to Collection"
          >
            <Icons.Save size={12} />
            Save
          </button>
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
          onMethodChange={setMethod}
          onUrlChange={setUrl}
          onBodyChange={setRequestBody}
          onHeadersChange={setHeaders}
          onQueryParamsChange={setQueryParams}
          onAuthChange={setAuth}
          onBodyTypeChange={setBodyType}
          onFormDataChange={setFormData}
          onSend={handleSend}
        />

        <ResponseSection
          response={response}
          requestState={requestState}
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
    </div>
  );
}

export default App;

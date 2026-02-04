import { useState, useRef } from "react";
import { SendRequest, LoadHistoryItem } from "../wailsjs/go/app/App";
import { app } from "../wailsjs/go/models";
import { HistorySidebarRef } from "./components/HistorySidebar";
import { Sidebar } from "./components/Sidebar";
import { RequestSection } from "./components/RequestSection";
import { ResponseSection } from "./components/ResponseSection";
import { Icons } from "./components/Icons";
import "./style.css";

type HTTPResponse = app.HTTPResponse;
type HistoryItem = app.HistoryItem;
type RequestState = "idle" | "loading" | "success" | "error";
type SidebarTab = "history" | "collections";

function App() {
  const [method, setMethod] = useState<string>("GET");
  const [url, setUrl] = useState<string>("");
  const [requestBody, setRequestBody] = useState<string>("");
  const [response, setResponse] = useState<HTTPResponse | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [activeTab, setActiveTab] = useState<SidebarTab>("history");

  const historySidebarRef = useRef<HistorySidebarRef>(null);

  const handleSend = async () => {
    if (!url.trim()) return;

    setRequestState("loading");
    setResponse(null);

    try {
      const result = await SendRequest({
        method,
        url: url.trim(),
        headers: {},
        body: requestBody,
        timeout: 0,
      });

      setResponse(result);
      setRequestState(result.error ? "error" : "success");

      setTimeout(() => {
        historySidebarRef.current?.refresh();
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
        setResponse(null);
        setRequestState("idle");
      }
    } catch (err) {
      console.error("Failed to load history item:", err);
    }
  };

  return (
    <div className="flex h-screen bg-ctp-base text-ctp-text font-mono text-sm">
      <Sidebar
        ref={historySidebarRef}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectHistoryItem={handleSelectHistoryItem}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-11 border-b border-ctp-surface0 flex items-center justify-between px-4 bg-ctp-mantle">
          <div className="flex items-center gap-2">
            <Icons.Globe size={14} className="text-ctp-subtext0" />
            <span className="text-ctp-text text-sm">New Request</span>
          </div>
        </header>

        <RequestSection
          method={method}
          url={url}
          requestBody={requestBody}
          requestState={requestState}
          onMethodChange={setMethod}
          onUrlChange={setUrl}
          onBodyChange={setRequestBody}
          onSend={handleSend}
        />

        <ResponseSection
          response={response}
          requestState={requestState}
        />
      </main>
    </div>
  );
}

export default App;

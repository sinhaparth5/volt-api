import { useState, useRef, useEffect } from "react";
import { SendRequest, LoadHistoryItem } from "../wailsjs/go/app/App";
import { app } from "../wailsjs/go/models";
import { HistorySidebar, HistorySidebarRef } from "./components/HistorySidebar";
import { Icons } from "./components/Icons";
import "./style.css";

type HTTPResponse = app.HTTPResponse;
type HistoryItem = app.HistoryItem;

type RequestState = "idle" | "loading" | "success" | "error";
type SidebarTab = "history" | "collections";

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

function App() {
  const [method, setMethod] = useState<string>("GET");
  const [url, setUrl] = useState<string>("");
  const [requestBody, setRequestBody] = useState<string>("");
  const [response, setResponse] = useState<HTTPResponse | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [activeTab, setActiveTab] = useState<SidebarTab>("history");
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false);

  const historySidebarRef = useRef<HistorySidebarRef>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMethodDropdownOpen(false);
      }
    };
    if (methodDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [methodDropdownOpen]);

  const handleSelectMethod = (m: string) => {
    setMethod(m);
    setMethodDropdownOpen(false);
  };

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

  const formatJSON = (str: string): string => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const getStatusColor = (code: number): string => {
    if (code >= 200 && code < 300) return "text-ctp-green";
    if (code >= 300 && code < 400) return "text-ctp-yellow";
    if (code >= 400 && code < 500) return "text-ctp-peach";
    return "text-ctp-red";
  };

  const getMethodColor = (m: string): string => {
    switch (m) {
      case "GET": return "text-ctp-green";
      case "POST": return "text-ctp-blue";
      case "PUT": return "text-ctp-peach";
      case "DELETE": return "text-ctp-red";
      case "PATCH": return "text-ctp-mauve";
      default: return "text-ctp-text";
    }
  };

  const getMethodBg = (m: string): string => {
    switch (m) {
      case "GET": return "bg-ctp-green/10 border-ctp-green/30";
      case "POST": return "bg-ctp-blue/10 border-ctp-blue/30";
      case "PUT": return "bg-ctp-peach/10 border-ctp-peach/30";
      case "DELETE": return "bg-ctp-red/10 border-ctp-red/30";
      case "PATCH": return "bg-ctp-mauve/10 border-ctp-mauve/30";
      default: return "bg-ctp-surface0 border-ctp-surface1";
    }
  };

  return (
    <div className="flex h-screen bg-ctp-base text-ctp-text font-mono text-sm">
      {/* Sidebar */}
      <aside className="w-60 bg-ctp-mantle border-r border-ctp-surface0 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-3 border-b border-ctp-surface0 flex items-center gap-2">
          <Icons.Bolt size={18} className="text-ctp-mauve" />
          <h1 className="text-ctp-mauve font-bold tracking-wide">VOLT</h1>
          <span className="text-ctp-subtext0 text-xs">API</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ctp-surface0">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 px-3 py-2.5 text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${
              activeTab === "history"
                ? "text-ctp-text bg-ctp-base border-b-2 border-ctp-mauve"
                : "text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0/50"
            }`}
          >
            <Icons.History size={14} />
            History
          </button>
          <button
            onClick={() => setActiveTab("collections")}
            className={`flex-1 px-3 py-2.5 text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${
              activeTab === "collections"
                ? "text-ctp-text bg-ctp-base border-b-2 border-ctp-mauve"
                : "text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0/50"
            }`}
          >
            <Icons.Folder size={14} />
            Collections
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "history" ? (
            <HistorySidebar
              ref={historySidebarRef}
              onSelectItem={handleSelectHistoryItem}
            />
          ) : (
            <div className="p-4 text-xs text-ctp-subtext0 flex flex-col items-center justify-center h-full gap-2">
              <Icons.Folder size={32} className="text-ctp-surface2" />
              <span>Coming in Phase 3</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-11 border-b border-ctp-surface0 flex items-center justify-between px-4 bg-ctp-mantle">
          <div className="flex items-center gap-2">
            <Icons.Globe size={14} className="text-ctp-subtext0" />
            <span className="text-ctp-text text-sm">New Request</span>
          </div>
        </header>

        {/* Request Section */}
        <section className="p-4 border-b border-ctp-surface0 bg-ctp-base">
          {/* URL Bar */}
          <div className="flex gap-2 items-center">
            {/* Method Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setMethodDropdownOpen(!methodDropdownOpen)}
                className={`border px-3 py-2.5 rounded-lg outline-none w-28 font-bold text-xs flex items-center justify-between gap-2 ${getMethodBg(method)} ${getMethodColor(method)} hover:brightness-110 transition-all`}
              >
                {method}
                <Icons.ChevronDown
                  size={14}
                  className={`transition-transform ${methodDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {methodDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-ctp-surface0 border border-ctp-surface1 rounded-lg shadow-lg shadow-ctp-crust/50 overflow-hidden z-50">
                  {METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMethod(m)}
                      className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center gap-2 transition-colors ${
                        method === m
                          ? `${getMethodBg(m)} ${getMethodColor(m)}`
                          : `text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text`
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${method === m ? "bg-current" : "bg-transparent"}`} />
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Enter request URL..."
                className="w-full bg-ctp-surface0 border border-ctp-surface1 px-4 py-2.5 rounded-lg outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={requestState === "loading" || !url.trim()}
              className="bg-ctp-mauve hover:bg-ctp-mauve/80 px-5 py-2.5 rounded-lg font-bold text-ctp-base flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {requestState === "loading" ? (
                <>
                  <Icons.Spinner size={16} />
                  Sending
                </>
              ) : (
                <>
                  <Icons.Send size={16} />
                  Send
                </>
              )}
            </button>
          </div>

          {/* Request Body */}
          {["POST", "PUT", "PATCH"].includes(method) && (
            <div className="mt-4">
              <label className="text-xs text-ctp-subtext0 mb-2 flex items-center gap-2">
                <Icons.Code size={12} />
                REQUEST BODY
              </label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full h-32 bg-ctp-surface0 border border-ctp-surface1 px-4 py-3 rounded-lg outline-none focus:border-ctp-lavender resize-none text-ctp-text placeholder:text-ctp-overlay0 mt-2"
              />
            </div>
          )}
        </section>

        {/* Response Section */}
        <section className="flex-1 flex flex-col overflow-hidden bg-ctp-base">
          {requestState === "loading" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-ctp-subtext0 flex flex-col items-center gap-3">
                <Icons.Spinner size={24} />
                <span>Sending request...</span>
              </div>
            </div>
          )}

          {response && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Status Bar */}
              <div className="px-4 py-3 bg-ctp-mantle border-b border-ctp-surface0 flex items-center gap-4">
                {response.error ? (
                  <span className="text-ctp-red flex items-center gap-2">
                    <Icons.X size={16} />
                    {response.error}
                  </span>
                ) : (
                  <>
                    <span className={`font-bold text-lg ${getStatusColor(response.statusCode)}`}>
                      {response.statusCode}
                    </span>
                    <span className="text-ctp-surface2">•</span>
                    <span className="text-ctp-subtext1 flex items-center gap-1">
                      <Icons.History size={12} />
                      {response.timingMs} ms
                    </span>
                    <span className="text-ctp-surface2">•</span>
                    <span className="text-ctp-subtext1">
                      {response.contentLength > 0
                        ? `${(response.contentLength / 1024).toFixed(2)} KB`
                        : `${(response.body.length / 1024).toFixed(2)} KB`}
                    </span>
                  </>
                )}
              </div>

              {/* Headers */}
              {response.headers && Object.keys(response.headers).length > 0 && (
                <details className="border-b border-ctp-surface0 group">
                  <summary className="px-4 py-2.5 cursor-pointer text-ctp-subtext0 hover:text-ctp-text bg-ctp-mantle select-none flex items-center gap-2">
                    <Icons.ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                    Headers ({Object.keys(response.headers).length})
                  </summary>
                  <div className="px-4 py-3 bg-ctp-base max-h-48 overflow-auto">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="py-1.5 flex text-xs">
                        <span className="text-ctp-mauve min-w-52 font-medium">{key}</span>
                        <span className="text-ctp-subtext1">{value}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Body */}
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-ctp-text whitespace-pre-wrap break-words leading-relaxed text-sm">
                  {formatJSON(response.body)}
                </pre>
              </div>
            </div>
          )}

          {requestState === "idle" && !response && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-ctp-surface0 flex items-center justify-center">
                  <Icons.Send size={28} className="text-ctp-overlay1" />
                </div>
                <div className="text-ctp-subtext0">Enter a URL and click Send</div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;

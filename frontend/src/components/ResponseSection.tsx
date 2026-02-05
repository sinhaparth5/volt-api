import { useState } from "react";
import { Icons } from "./Icons";
import { formatJSON, getStatusColor } from "../utils/helpers";
import { app } from "../../wailsjs/go/models";

type HTTPResponse = app.HTTPResponse;
type RequestState = "idle" | "loading" | "success" | "error";
type ResponseTab = "body" | "headers" | "cookies";

interface ResponseSectionProps {
  response: HTTPResponse | null;
  requestState: RequestState;
}

export function ResponseSection({ response, requestState }: ResponseSectionProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>("body");
  const [copied, setCopied] = useState(false);
  const [bodyView, setBodyView] = useState<"pretty" | "raw">("pretty");

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Parse cookies from Set-Cookie headers
  const parseCookies = (headers: Record<string, string>): { name: string; value: string; attributes: string }[] => {
    const cookies: { name: string; value: string; attributes: string }[] = [];

    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === "set-cookie") {
        const parts = value.split(";");
        const [nameValue, ...attrs] = parts;
        const [name, ...valueParts] = nameValue.split("=");
        cookies.push({
          name: name.trim(),
          value: valueParts.join("=").trim(),
          attributes: attrs.join(";").trim(),
        });
      }
    }

    return cookies;
  };

  // Loading state
  if (requestState === "loading") {
    return (
      <section className="flex-1 flex flex-col overflow-hidden bg-ctp-base">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-ctp-subtext0 flex flex-col items-center gap-3">
            <Icons.Spinner size={20} className="text-ctp-mauve" />
            <span className="text-sm">Sending request...</span>
          </div>
        </div>
      </section>
    );
  }

  // Response received
  if (response) {
    const cookies = parseCookies(response.headers || {});
    const headersCount = Object.keys(response.headers || {}).length;

    const tabs: { id: ResponseTab; label: string; count?: number }[] = [
      { id: "body", label: "Body" },
      { id: "headers", label: "Headers", count: headersCount },
      { id: "cookies", label: "Cookies", count: cookies.length },
    ];

    return (
      <section className="flex-1 flex flex-col overflow-hidden bg-ctp-base">
        {/* Status Bar - separated visually from tabs */}
        <div className="px-4 py-3 border-b border-ctp-surface0 flex items-center justify-between bg-ctp-base">
          <div className="flex items-center gap-3">
            {response.error ? (
              <span className="text-ctp-red text-sm flex items-center gap-2">
                <Icons.X size={14} />
                {response.error}
              </span>
            ) : (
              <>
                <div className={`text-sm font-semibold px-2 py-0.5 rounded ${getStatusColor(response.statusCode)} bg-current/10`}>
                  {response.statusCode}
                </div>
                <div className="flex items-center gap-1 text-ctp-subtext0 text-sm">
                  <Icons.History size={12} />
                  <span>{response.timingMs} ms</span>
                </div>
                <div className="text-ctp-subtext0 text-sm">
                  {response.contentLength > 0
                    ? `${(response.contentLength / 1024).toFixed(2)} KB`
                    : `${(response.body.length / 1024).toFixed(2)} KB`}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs - consistent with request section */}
        <div className="flex items-center justify-between border-b border-ctp-surface0 px-4 bg-ctp-base">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm border-b-2 -mb-px flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "text-ctp-mauve border-ctp-mauve"
                    : "text-ctp-subtext0 border-transparent hover:text-ctp-text hover:border-ctp-surface1"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="min-w-5 h-5 px-1.5 text-xs bg-ctp-surface0 text-ctp-subtext0 rounded flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Actions - only show for body tab */}
          {activeTab === "body" && response.body && (
            <div className="flex items-center gap-2">
              <div className="flex bg-ctp-surface0 rounded-md p-0.5">
                <button
                  onClick={() => setBodyView("pretty")}
                  className={`px-2 py-1 text-xs rounded ${
                    bodyView === "pretty"
                      ? "bg-ctp-mauve text-ctp-base"
                      : "text-ctp-subtext0 hover:text-ctp-text"
                  }`}
                >
                  Pretty
                </button>
                <button
                  onClick={() => setBodyView("raw")}
                  className={`px-2 py-1 text-xs rounded ${
                    bodyView === "raw"
                      ? "bg-ctp-mauve text-ctp-base"
                      : "text-ctp-subtext0 hover:text-ctp-text"
                  }`}
                >
                  Raw
                </button>
              </div>
              <button
                onClick={() => handleCopy(bodyView === "pretty" ? formatJSON(response.body) : response.body)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 rounded-md"
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <Icons.Check size={12} className="text-ctp-green" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Icons.Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "body" && (
            <div className="p-4">
              {response.body ? (
                <pre className="text-ctp-text whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {bodyView === "pretty" ? formatJSON(response.body) : response.body}
                </pre>
              ) : (
                <div className="text-ctp-subtext0 text-center text-sm py-12">
                  No response body
                </div>
              )}
            </div>
          )}

          {activeTab === "headers" && (
            <div className="p-4">
              {headersCount > 0 ? (
                <div className="space-y-0">
                  {Object.entries(response.headers || {}).map(([key, value]) => (
                    <div key={key} className="py-2 grid grid-cols-[180px_1fr] gap-4 text-sm border-b border-ctp-surface0/50 last:border-0">
                      <span className="text-ctp-mauve truncate">{key}</span>
                      <span className="text-ctp-text break-all">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-ctp-subtext0 text-center text-sm py-12">
                  No headers
                </div>
              )}
            </div>
          )}

          {activeTab === "cookies" && (
            <div className="p-4">
              {cookies.length > 0 ? (
                <div className="space-y-2">
                  {cookies.map((cookie, idx) => (
                    <div key={idx} className="p-3 bg-ctp-surface0/30 rounded-md border border-ctp-surface0">
                      <div className="flex items-baseline gap-2 text-sm">
                        <span className="text-ctp-mauve">{cookie.name}</span>
                        <span className="text-ctp-overlay0">=</span>
                        <span className="text-ctp-text break-all">{cookie.value}</span>
                      </div>
                      {cookie.attributes && (
                        <div className="text-xs text-ctp-subtext0 mt-1">{cookie.attributes}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-ctp-subtext0 text-center text-sm py-12">
                  No cookies in response
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Idle state - no response yet
  if (requestState === "idle") {
    return (
      <section className="flex-1 flex flex-col overflow-hidden bg-ctp-base">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-ctp-surface0 flex items-center justify-center">
              <Icons.Send size={24} className="text-ctp-overlay0" />
            </div>
            <div className="text-ctp-subtext0 text-sm">Enter a URL and click Send</div>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

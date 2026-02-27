import { useState, useEffect } from "react";
import { Icons } from "./Icons";
import { getStatusColor } from "../utils/helpers";
import { AssertionResults } from "./AssertionResults";
import { ChainVariableExtractor } from "./ChainVariableExtractor";
import { AssertionResult, getAssertionsSummary } from "../utils/assertions";
import { ChainVariable } from "../utils/chainVariables";
import { app } from "../../wailsjs/go/models";
import { wasmJsonFormat, wasmParseCookiesSync, isWasmLoaded } from "../utils/wasm";

type HTTPResponse = app.HTTPResponse;
type RequestState = "idle" | "loading" | "success" | "error";
type ResponseTab = "body" | "headers" | "cookies" | "tests" | "chain" | "request";

// Sent request info to display in Request tab
export interface SentRequestInfo {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

interface ResponseSectionProps {
  response: HTTPResponse | null;
  requestState: RequestState;
  downloadProgress?: { bytesRead: number; total: number } | null;
  assertionResults?: AssertionResult[];
  chainVariables?: ChainVariable[];
  sentRequest?: SentRequestInfo | null;
  onAddChainVariable?: (variable: ChainVariable) => void;
  onRemoveChainVariable?: (id: string) => void;
}

export function ResponseSection({
  response,
  requestState,
  downloadProgress,
  assertionResults = [],
  chainVariables = [],
  sentRequest,
  onAddChainVariable,
  onRemoveChainVariable,
}: ResponseSectionProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>("body");
  const [copied, setCopied] = useState(false);
  const [bodyView, setBodyView] = useState<"pretty" | "raw" | "preview">("pretty");
  const [formattedBody, setFormattedBody] = useState<string>("");
  const [formattedSentBody, setFormattedSentBody] = useState<string>("");

  // Pre-format JSON bodies using WASM (faster for large responses)
  useEffect(() => {
    if (response?.body) {
      wasmJsonFormat(response.body).then(setFormattedBody).catch(() => setFormattedBody(response.body));
    } else {
      setFormattedBody("");
    }
  }, [response?.body]);

  useEffect(() => {
    if (sentRequest?.body) {
      wasmJsonFormat(sentRequest.body).then(setFormattedSentBody).catch(() => setFormattedSentBody(sentRequest.body));
    } else {
      setFormattedSentBody("");
    }
  }, [sentRequest?.body]);

  // Detect content type from headers
  const getContentType = (headers: Record<string, string>): string => {
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === "content-type") {
        return value.toLowerCase();
      }
    }
    return "";
  };

  // Check if response is an image
  const isImageResponse = (headers: Record<string, string>): boolean => {
    const contentType = getContentType(headers);
    return contentType.startsWith("image/");
  };

  // Check if response is HTML
  const isHtmlResponse = (headers: Record<string, string>): boolean => {
    const contentType = getContentType(headers);
    return contentType.includes("text/html");
  };

  // Check if response is binary (non-text)
  const isBinaryResponse = (headers: Record<string, string>): boolean => {
    const contentType = getContentType(headers);
    const textTypes = ["text/", "application/json", "application/xml", "application/javascript"];
    return !textTypes.some((t) => contentType.includes(t)) && contentType !== "";
  };

  // Create data URL for image display
  const getImageDataUrl = (body: string, headers: Record<string, string>): string | null => {
    const contentType = getContentType(headers);
    if (!contentType.startsWith("image/")) return null;

    // Check if body looks like base64 (from Go backend)
    // The body might be raw binary or base64 encoded
    try {
      // If the body contains mostly printable characters, it might be base64
      const isPrintable = /^[\x20-\x7E\s]+$/.test(body.slice(0, 100));
      if (isPrintable && body.length > 0) {
        return `data:${contentType};base64,${body}`;
      }
    } catch {
      // Fall through
    }
    return null;
  };

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
    if (isWasmLoaded()) {
      return wasmParseCookiesSync(headers).map((c) => ({
        name: c.name,
        value: c.value,
        attributes: [
          c.path     ? `Path=${c.path}`         : null,
          c.domain   ? `Domain=${c.domain}`     : null,
          c.expires  ? `Expires=${c.expires}`   : null,
          c.maxAge   ? `Max-Age=${c.maxAge}`     : null,
          c.sameSite ? `SameSite=${c.sameSite}` : null,
          c.secure   ? "Secure"                 : null,
          c.httpOnly ? "HttpOnly"               : null,
        ].filter(Boolean).join("; "),
      }));
    }
    const cookies: { name: string; value: string; attributes: string }[] = [];
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === "set-cookie") {
        const parts = value.split(";");
        const [nameValue, ...attrs] = parts;
        const [name, ...valueParts] = nameValue.split("=");
        cookies.push({ name: name.trim(), value: valueParts.join("=").trim(), attributes: attrs.join(";").trim() });
      }
    }
    return cookies;
  };

  // Loading state
  if (requestState === "loading") {
    const hasProgress = downloadProgress && downloadProgress.bytesRead > 0;
    const progressPercent =
      hasProgress && downloadProgress.total > 0
        ? Math.min(100, Math.round((downloadProgress.bytesRead / downloadProgress.total) * 100))
        : null;
    const receivedKB = hasProgress ? (downloadProgress.bytesRead / 1024).toFixed(1) : null;
    const totalKB =
      hasProgress && downloadProgress.total > 0
        ? (downloadProgress.total / 1024).toFixed(1)
        : null;

    return (
      <section className="flex-1 flex flex-col overflow-hidden bg-ctp-base">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-ctp-text flex flex-col items-center gap-3 w-64">
            <Icons.Spinner size={20} className="text-ctp-mauve" />
            {hasProgress ? (
              <>
                <span className="text-sm">Downloading response...</span>
                <div className="w-full bg-ctp-surface0 rounded-full h-1.5">
                  <div
                    className="bg-ctp-mauve h-1.5 rounded-full transition-all duration-150"
                    style={{ width: progressPercent !== null ? `${progressPercent}%` : "100%" }}
                  />
                </div>
                <span className="text-xs text-ctp-subtext0">
                  {totalKB ? `${receivedKB} / ${totalKB} KB` : `${receivedKB} KB received`}
                </span>
              </>
            ) : (
              <span className="text-sm">Sending request...</span>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Response received
  if (response) {
    const cookies = parseCookies(response.headers || {});
    const headersCount = Object.keys(response.headers || {}).length;
    const assertionsSummary = assertionResults.length > 0 ? getAssertionsSummary(assertionResults) : null;

    const sentHeadersCount = sentRequest ? Object.keys(sentRequest.headers).length : 0;

    const tabs: { id: ResponseTab; label: string; count?: number; status?: "pass" | "fail"; highlight?: boolean }[] = [
      { id: "body", label: "Body" },
      { id: "headers", label: "Headers", count: headersCount },
      { id: "cookies", label: "Cookies", count: cookies.length },
      ...(assertionResults.length > 0
        ? [{
            id: "tests" as ResponseTab,
            label: "Tests",
            count: assertionResults.length,
            status: (assertionsSummary?.failed === 0 ? "pass" : "fail") as "pass" | "fail",
          }]
        : []),
      { id: "chain", label: "Chain", count: chainVariables.length || undefined },
      { id: "request", label: "Request", count: sentHeadersCount || undefined },
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
                <div className="flex items-center gap-1 text-ctp-text text-sm">
                  <Icons.History size={12} />
                  <span>{response.timingMs} ms</span>
                </div>
                <div className="text-ctp-text text-sm">
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
                {tab.status && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      tab.status === "pass" ? "bg-ctp-green" : "bg-ctp-red"
                    }`}
                  />
                )}
                {tab.count !== undefined && tab.count > 0 && !tab.status && (
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
              {!isImageResponse(response.headers || {}) && !isBinaryResponse(response.headers || {}) && (
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
                  {isHtmlResponse(response.headers || {}) && (
                    <button
                      onClick={() => setBodyView("preview")}
                      className={`px-2 py-1 text-xs rounded ${
                        bodyView === "preview"
                          ? "bg-ctp-mauve text-ctp-base"
                          : "text-ctp-subtext0 hover:text-ctp-text"
                      }`}
                    >
                      Preview
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => handleCopy(bodyView === "pretty" ? formattedBody : response.body)}
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
                <>
                  {/* Image response */}
                  {isImageResponse(response.headers || {}) && (
                    <div className="flex flex-col items-center gap-4">
                      {getImageDataUrl(response.body, response.headers || {}) ? (
                        <img
                          src={getImageDataUrl(response.body, response.headers || {}) || ""}
                          alt="Response"
                          className="max-w-full max-h-96 object-contain rounded-md border border-ctp-surface0"
                        />
                      ) : (
                        <div className="text-ctp-text text-sm">
                          Image data could not be displayed
                        </div>
                      )}
                      <div className="text-xs text-ctp-text">
                        {getContentType(response.headers || {})} • {(response.body.length / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  )}

                  {/* Binary response (non-image) */}
                  {isBinaryResponse(response.headers || {}) && !isImageResponse(response.headers || {}) && (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="w-16 h-16 rounded-xl bg-ctp-surface0 flex items-center justify-center">
                        <Icons.File size={32} className="text-ctp-overlay0" />
                      </div>
                      <div className="text-center">
                        <div className="text-ctp-text text-sm font-medium mb-1">Binary Response</div>
                        <div className="text-xs text-ctp-text">
                          {getContentType(response.headers || {})} • {(response.body.length / 1024).toFixed(2)} KB
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(response.body)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-ctp-surface0 hover:bg-ctp-surface1 text-ctp-text rounded-md"
                      >
                        <Icons.Copy size={12} />
                        Copy Raw Data
                      </button>
                    </div>
                  )}

                  {/* Text response */}
                  {!isImageResponse(response.headers || {}) && !isBinaryResponse(response.headers || {}) && (
                    <>
                      {bodyView === "preview" && isHtmlResponse(response.headers || {}) ? (
                        <div className="bg-white rounded-md border border-ctp-surface0 overflow-hidden">
                          <iframe
                            srcDoc={response.body}
                            title="HTML Preview"
                            className="w-full h-96 border-0"
                            sandbox="allow-same-origin"
                          />
                        </div>
                      ) : (
                        <pre className="text-ctp-text whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {bodyView === "pretty" ? formattedBody : response.body}
                        </pre>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="text-ctp-text text-center text-sm py-12">
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
                <div className="text-ctp-text text-center text-sm py-12">
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
                <div className="text-ctp-text text-center text-sm py-12">
                  No cookies in response
                </div>
              )}
            </div>
          )}

          {activeTab === "tests" && (
            <AssertionResults results={assertionResults} />
          )}

          {activeTab === "chain" && (
            <div className="p-4">
              <ChainVariableExtractor
                response={{
                  statusCode: response.statusCode,
                  headers: response.headers || {},
                  body: response.body,
                }}
                chainVariables={chainVariables}
                onAddVariable={onAddChainVariable || (() => {})}
                onRemoveVariable={onRemoveChainVariable || (() => {})}
              />
            </div>
          )}

          {activeTab === "request" && (
            <div className="p-4 space-y-4">
              {sentRequest ? (
                <>
                  {/* Method and URL */}
                  <div className="space-y-2">
                    <div className="text-xs text-ctp-text uppercase tracking-wider">Request</div>
                    <div className="p-3 bg-ctp-surface0/30 rounded-md border border-ctp-surface0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${
                          sentRequest.method === "GET" ? "text-ctp-green" :
                          sentRequest.method === "POST" ? "text-ctp-blue" :
                          sentRequest.method === "PUT" ? "text-ctp-peach" :
                          sentRequest.method === "DELETE" ? "text-ctp-red" :
                          sentRequest.method === "PATCH" ? "text-ctp-mauve" :
                          "text-ctp-text"
                        }`}>
                          {sentRequest.method}
                        </span>
                        <span className="text-sm text-ctp-text break-all">{sentRequest.url}</span>
                      </div>
                    </div>
                  </div>

                  {/* Headers Sent */}
                  <div className="space-y-2">
                    <div className="text-xs text-ctp-text uppercase tracking-wider">
                      Headers Sent ({Object.keys(sentRequest.headers).length})
                    </div>
                    {Object.keys(sentRequest.headers).length > 0 ? (
                      <div className="p-3 bg-ctp-surface0/30 rounded-md border border-ctp-surface0 space-y-0">
                        {Object.entries(sentRequest.headers).map(([key, value]) => (
                          <div key={key} className="py-2 grid grid-cols-[180px_1fr] gap-4 text-sm border-b border-ctp-surface0/50 last:border-0">
                            <span className="text-ctp-mauve truncate">{key}</span>
                            <span className="text-ctp-text break-all font-mono text-xs">{value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-ctp-surface0/30 rounded-md border border-ctp-surface0 text-ctp-text text-sm text-center">
                        No headers sent
                      </div>
                    )}
                  </div>

                  {/* Body Sent */}
                  {sentRequest.body && (
                    <div className="space-y-2">
                      <div className="text-xs text-ctp-text uppercase tracking-wider">Body Sent</div>
                      <pre className="p-3 bg-ctp-surface0/30 rounded-md border border-ctp-surface0 text-sm text-ctp-text whitespace-pre-wrap break-words max-h-48 overflow-auto">
                        {formattedSentBody}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-ctp-text text-center text-sm py-12">
                  No request data available
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
            <div className="text-ctp-text text-sm">Enter a URL and click Send</div>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

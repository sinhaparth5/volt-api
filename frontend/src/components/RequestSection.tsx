import { useState, useEffect, useRef } from "react";
import { Icons } from "./Icons";
import { MethodDropdown } from "./MethodDropdown";
import { KeyValueEditor } from "./KeyValueEditor";
import { AuthEditor } from "./AuthEditor";
import {
  KeyValuePair,
  AuthSettings,
  parseQueryParams,
  buildUrlWithParams,
  getBaseUrl,
} from "../utils/helpers";

type RequestState = "idle" | "loading" | "success" | "error";
type RequestTab = "params" | "headers" | "auth" | "body";

interface RequestSectionProps {
  method: string;
  url: string;
  requestBody: string;
  requestState: RequestState;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  auth: AuthSettings;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onBodyChange: (body: string) => void;
  onHeadersChange: (headers: KeyValuePair[]) => void;
  onQueryParamsChange: (params: KeyValuePair[]) => void;
  onAuthChange: (auth: AuthSettings) => void;
  onSend: () => void;
}

export function RequestSection({
  method,
  url,
  requestBody,
  requestState,
  headers,
  queryParams,
  auth,
  onMethodChange,
  onUrlChange,
  onBodyChange,
  onHeadersChange,
  onQueryParamsChange,
  onAuthChange,
  onSend,
}: RequestSectionProps) {
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<RequestTab>("params");
  const isUpdatingFromUrl = useRef(false);
  const isUpdatingFromParams = useRef(false);

  const handleSelectMethod = (m: string) => {
    onMethodChange(m);
    setMethodDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSend();
    }
  };

  // Sync URL -> params when URL changes
  const handleUrlChange = (newUrl: string) => {
    onUrlChange(newUrl);

    if (isUpdatingFromParams.current) {
      isUpdatingFromParams.current = false;
      return;
    }

    isUpdatingFromUrl.current = true;
    const newParams = parseQueryParams(newUrl);
    onQueryParamsChange(newParams);
  };

  // Sync params -> URL when params change
  const handleParamsChange = (newParams: KeyValuePair[]) => {
    onQueryParamsChange(newParams);

    if (isUpdatingFromUrl.current) {
      isUpdatingFromUrl.current = false;
      return;
    }

    isUpdatingFromParams.current = true;
    const baseUrl = getBaseUrl(url);
    const newUrl = buildUrlWithParams(baseUrl, newParams);
    onUrlChange(newUrl);
  };

  // Reset flags on external changes
  useEffect(() => {
    isUpdatingFromUrl.current = false;
    isUpdatingFromParams.current = false;
  }, []);

  const showBody = ["POST", "PUT", "PATCH"].includes(method);

  // Count active items for badges
  const activeHeadersCount = headers.filter((h) => h.enabled && h.key.trim()).length;
  const activeParamsCount = queryParams.filter((p) => p.enabled && p.key.trim()).length;
  const hasAuth = auth.type !== "none";

  const tabs: { id: RequestTab; label: string; badge?: number; highlight?: boolean }[] = [
    { id: "params", label: "Params", badge: activeParamsCount || undefined },
    { id: "headers", label: "Headers", badge: activeHeadersCount || undefined },
    { id: "auth", label: "Auth", highlight: hasAuth },
    ...(showBody ? [{ id: "body" as RequestTab, label: "Body" }] : []),
  ];

  return (
    <section className="border-b border-ctp-surface0 bg-ctp-base">
      {/* URL Bar */}
      <div className="flex gap-2 items-center p-4 pb-3">
        <MethodDropdown
          method={method}
          isOpen={methodDropdownOpen}
          onToggle={() => setMethodDropdownOpen(!methodDropdownOpen)}
          onSelect={handleSelectMethod}
        />
        <div className="flex-1 relative">
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter request URL..."
            className="w-full bg-ctp-surface0 border border-ctp-surface1 px-4 py-2.5 rounded-lg outline-none focus:border-ctp-lavender text-ctp-text font-medium placeholder:text-ctp-overlay0 placeholder:font-normal"
          />
        </div>
        <button
          onClick={onSend}
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

      {/* Tabs */}
      <div className="flex border-b border-ctp-surface0 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? "text-ctp-mauve border-ctp-mauve"
                : "text-ctp-subtext0 border-transparent hover:text-ctp-text"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-ctp-mauve/20 text-ctp-mauve rounded-full">
                {tab.badge}
              </span>
            )}
            {tab.highlight && (
              <span className="w-2 h-2 bg-ctp-green rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-64 overflow-y-auto">
        {activeTab === "params" && (
          <KeyValueEditor
            pairs={queryParams}
            onChange={handleParamsChange}
            keyPlaceholder="Parameter"
            valuePlaceholder="Value"
          />
        )}

        {activeTab === "headers" && (
          <KeyValueEditor
            pairs={headers}
            onChange={onHeadersChange}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
          />
        )}

        {activeTab === "auth" && (
          <AuthEditor auth={auth} onChange={onAuthChange} />
        )}

        {activeTab === "body" && showBody && (
          <div>
            <label className="text-xs text-ctp-subtext0 font-semibold mb-2 flex items-center gap-2 uppercase tracking-wide">
              <Icons.Code size={12} />
              Request Body
            </label>
            <textarea
              value={requestBody}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder='{"key": "value"}'
              className="w-full h-40 bg-ctp-surface0 border border-ctp-surface1 px-4 py-3 rounded-lg outline-none focus:border-ctp-lavender resize-none text-ctp-text font-medium placeholder:text-ctp-overlay0 placeholder:font-normal mt-2"
            />
          </div>
        )}
      </div>
    </section>
  );
}

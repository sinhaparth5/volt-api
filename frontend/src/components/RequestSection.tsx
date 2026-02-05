import { useState, useEffect, useRef } from "react";
import { Icons } from "./Icons";
import { MethodDropdown } from "./MethodDropdown";
import { KeyValueEditor } from "./KeyValueEditor";
import { AuthEditor } from "./AuthEditor";
import { AssertionsEditor } from "./AssertionsEditor";
import {
  KeyValuePair,
  AuthSettings,
  parseQueryParams,
  buildUrlWithParams,
  getBaseUrl,
  formatJSON,
} from "../utils/helpers";
import { Assertion } from "../utils/assertions";

type RequestState = "idle" | "loading" | "success" | "error";
type RequestTab = "params" | "headers" | "auth" | "body" | "tests";
type BodyType = "json" | "form-data" | "raw" | "none";

interface RequestSectionProps {
  method: string;
  url: string;
  requestBody: string;
  requestState: RequestState;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  auth: AuthSettings;
  bodyType: BodyType;
  formData: KeyValuePair[];
  assertions: Assertion[];
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onBodyChange: (body: string) => void;
  onHeadersChange: (headers: KeyValuePair[]) => void;
  onQueryParamsChange: (params: KeyValuePair[]) => void;
  onAuthChange: (auth: AuthSettings) => void;
  onBodyTypeChange: (type: BodyType) => void;
  onFormDataChange: (data: KeyValuePair[]) => void;
  onAssertionsChange: (assertions: Assertion[]) => void;
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
  bodyType,
  formData,
  assertions,
  onMethodChange,
  onUrlChange,
  onBodyChange,
  onHeadersChange,
  onQueryParamsChange,
  onAuthChange,
  onBodyTypeChange,
  onFormDataChange,
  onAssertionsChange,
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
  const activeAssertionsCount = assertions.filter((a) => a.enabled).length;
  const hasAuth = auth.type !== "none";

  const tabs: { id: RequestTab; label: string; badge?: number; highlight?: boolean }[] = [
    { id: "params", label: "Params", badge: activeParamsCount || undefined },
    { id: "headers", label: "Headers", badge: activeHeadersCount || undefined },
    { id: "auth", label: "Auth", highlight: hasAuth },
    ...(showBody ? [{ id: "body" as RequestTab, label: "Body" }] : []),
    { id: "tests", label: "Tests", badge: activeAssertionsCount || undefined },
  ];

  return (
    <section className="border-b border-ctp-surface0 bg-ctp-base">
      {/* URL Bar - consistent 16px padding, 8px gap */}
      <div className="flex gap-2 items-center p-4">
        <MethodDropdown
          method={method}
          isOpen={methodDropdownOpen}
          onToggle={() => setMethodDropdownOpen(!methodDropdownOpen)}
          onSelect={handleSelectMethod}
        />
        <div className="flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter request URL..."
            className="w-full bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-md outline-none focus:border-ctp-lavender focus:bg-ctp-surface0/80 text-ctp-text text-sm placeholder:text-ctp-overlay0"
          />
        </div>
        <button
          onClick={onSend}
          disabled={requestState === "loading" || !url.trim()}
          className="bg-ctp-mauve hover:bg-ctp-mauve/90 active:bg-ctp-mauve/80 px-4 py-2 rounded-md text-ctp-base text-sm flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          {requestState === "loading" ? (
            <>
              <Icons.Spinner size={14} />
              <span>Sending</span>
            </>
          ) : (
            <>
              <Icons.Send size={14} />
              <span>Send</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs - consistent spacing */}
      <div className="flex border-b border-ctp-surface0 px-4 gap-1">
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
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="min-w-5 h-5 px-1.5 text-xs bg-ctp-surface0 text-ctp-subtext0 rounded flex items-center justify-center">
                {tab.badge}
              </span>
            )}
            {tab.highlight && (
              <span className="w-1.5 h-1.5 bg-ctp-green rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - consistent padding, better max height */}
      <div className="p-4 max-h-56 overflow-y-auto">
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
          <div className="space-y-3">
            {/* Body Type Selector */}
            <div className="flex items-center justify-between">
              <div className="flex bg-ctp-surface0 rounded-md p-0.5">
                {(["none", "json", "form-data", "raw"] as BodyType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => onBodyTypeChange(type)}
                    className={`px-3 py-1 text-xs rounded transition-colors capitalize ${
                      bodyType === type
                        ? "bg-ctp-mauve text-ctp-base"
                        : "text-ctp-subtext0 hover:text-ctp-text"
                    }`}
                  >
                    {type === "form-data" ? "Form" : type}
                  </button>
                ))}
              </div>

              {bodyType === "json" && (
                <button
                  onClick={() => {
                    try {
                      const formatted = formatJSON(requestBody);
                      if (formatted !== requestBody) {
                        onBodyChange(formatted);
                      }
                    } catch {
                      // Invalid JSON, do nothing
                    }
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 rounded-md"
                  title="Format JSON"
                >
                  <Icons.Code size={12} />
                  Format
                </button>
              )}
            </div>

            {/* Body Content */}
            {bodyType === "none" && (
              <div className="text-ctp-subtext0 text-center text-sm py-8 bg-ctp-surface0/30 rounded-md border border-ctp-surface0 border-dashed">
                No body content for this request
              </div>
            )}

            {bodyType === "json" && (
              <textarea
                value={requestBody}
                onChange={(e) => onBodyChange(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full h-36 bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-md outline-none focus:border-ctp-lavender resize-none text-ctp-text text-sm placeholder:text-ctp-overlay0"
              />
            )}

            {bodyType === "form-data" && (
              <KeyValueEditor
                pairs={formData}
                onChange={onFormDataChange}
                keyPlaceholder="Field name"
                valuePlaceholder="Value"
              />
            )}

            {bodyType === "raw" && (
              <textarea
                value={requestBody}
                onChange={(e) => onBodyChange(e.target.value)}
                placeholder="Raw request body..."
                className="w-full h-36 bg-ctp-surface0 border border-ctp-surface1 px-3 py-2 rounded-md outline-none focus:border-ctp-lavender resize-none text-ctp-text text-sm placeholder:text-ctp-overlay0"
              />
            )}
          </div>
        )}

        {activeTab === "tests" && (
          <AssertionsEditor
            assertions={assertions}
            onChange={onAssertionsChange}
          />
        )}
      </div>
    </section>
  );
}

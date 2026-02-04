import { useState } from "react";
import { Icons } from "./Icons";
import { MethodDropdown } from "./MethodDropdown";

type RequestState = "idle" | "loading" | "success" | "error";

interface RequestSectionProps {
  method: string;
  url: string;
  requestBody: string;
  requestState: RequestState;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onBodyChange: (body: string) => void;
  onSend: () => void;
}

export function RequestSection({
  method,
  url,
  requestBody,
  requestState,
  onMethodChange,
  onUrlChange,
  onBodyChange,
  onSend,
}: RequestSectionProps) {
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false);

  const handleSelectMethod = (m: string) => {
    onMethodChange(m);
    setMethodDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSend();
    }
  };

  const showBody = ["POST", "PUT", "PATCH"].includes(method);

  return (
    <section className="p-4 border-b border-ctp-surface0 bg-ctp-base">
      {/* URL Bar */}
      <div className="flex gap-2 items-center">
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
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter request URL..."
            className="w-full bg-ctp-surface0 border border-ctp-surface1 px-4 py-2.5 rounded-lg outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
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

      {/* Request Body */}
      {showBody && (
        <div className="mt-4">
          <label className="text-xs text-ctp-subtext0 mb-2 flex items-center gap-2">
            <Icons.Code size={12} />
            REQUEST BODY
          </label>
          <textarea
            value={requestBody}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder='{"key": "value"}'
            className="w-full h-32 bg-ctp-surface0 border border-ctp-surface1 px-4 py-3 rounded-lg outline-none focus:border-ctp-lavender resize-none text-ctp-text placeholder:text-ctp-overlay0 mt-2"
          />
        </div>
      )}
    </section>
  );
}

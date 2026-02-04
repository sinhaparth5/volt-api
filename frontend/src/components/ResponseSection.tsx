import { Icons } from "./Icons";
import { formatJSON, getStatusColor } from "../utils/helpers";
import { app } from "../../wailsjs/go/models";

type HTTPResponse = app.HTTPResponse;
type RequestState = "idle" | "loading" | "success" | "error";

interface ResponseSectionProps {
  response: HTTPResponse | null;
  requestState: RequestState;
}

export function ResponseSection({ response, requestState }: ResponseSectionProps) {
  // Loading state
  if (requestState === "loading") {
    return (
      <section className="flex-1 flex flex-col overflow-hidden bg-ctp-base">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-ctp-subtext0 flex flex-col items-center gap-3">
            <Icons.Spinner size={24} />
            <span>Sending request...</span>
          </div>
        </div>
      </section>
    );
  }

  // Response received
  if (response) {
    return (
      <section className="flex-1 flex flex-col overflow-hidden bg-ctp-base">
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
      </section>
    );
  }

  // Idle state - no response yet
  if (requestState === "idle") {
    return (
      <section className="flex-1 flex flex-col overflow-hidden bg-ctp-base">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-ctp-surface0 flex items-center justify-center">
              <Icons.Send size={28} className="text-ctp-overlay1" />
            </div>
            <div className="text-ctp-subtext0">Enter a URL and click Send</div>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

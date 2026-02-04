import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { GetHistory, DeleteHistoryItem, ClearHistory } from "../../wailsjs/go/app/App";
import { app } from "../../wailsjs/go/models";
import { Icons } from "./Icons";

type HistoryItem = app.HistoryItem;

interface Props {
  onSelectItem: (item: HistoryItem) => void;
}

export interface HistorySidebarRef {
  refresh: () => void;
}

export const HistorySidebar = forwardRef<HistorySidebarRef, Props>(
  ({ onSelectItem }, ref) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const items = await GetHistory(100, search);
        setHistory(items || []);
      } catch (err) {
        console.error("Failed to load history:", err);
        setHistory([]);
      }
      setIsLoading(false);
    };

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
      refresh: loadHistory,
    }));

    // Load history on mount and when search changes
    useEffect(() => {
      const timer = setTimeout(() => {
        loadHistory();
      }, 300); // Debounce search
      return () => clearTimeout(timer);
    }, [search]);

    // Initial load
    useEffect(() => {
      loadHistory();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await DeleteHistoryItem(id);
        loadHistory();
      } catch (err) {
        console.error("Failed to delete item:", err);
      }
    };

    const handleClear = async () => {
      if (history.length === 0) return;
      try {
        await ClearHistory();
        loadHistory();
      } catch (err) {
        console.error("Failed to clear history:", err);
      }
    };

    const formatTime = (timestamp: number): string => {
      const now = Date.now() / 1000;
      const diff = now - timestamp;

      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString();
    };

    const getMethodColor = (method: string): string => {
      switch (method.toUpperCase()) {
        case "GET":
          return "text-ctp-green";
        case "POST":
          return "text-ctp-blue";
        case "PUT":
          return "text-ctp-peach";
        case "DELETE":
          return "text-ctp-red";
        case "PATCH":
          return "text-ctp-mauve";
        default:
          return "text-ctp-text";
      }
    };

    const getStatusColor = (code: number): string => {
      if (code >= 200 && code < 300) return "text-ctp-green";
      if (code >= 300 && code < 400) return "text-ctp-yellow";
      if (code >= 400 && code < 500) return "text-ctp-peach";
      return "text-ctp-red";
    };

    const getUrlPath = (url: string): string => {
      try {
        const parsed = new URL(url);
        const path = parsed.pathname + parsed.search;
        return path.length > 30 ? path.substring(0, 30) + "..." : path;
      } catch {
        return url.length > 30 ? url.substring(0, 30) + "..." : url;
      }
    };

    return (
      <div className="flex flex-col h-full">
        {/* Search */}
        <div className="p-2 border-b border-ctp-surface0">
          <div className="relative">
            <Icons.Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ctp-overlay0" />
            <input
              type="text"
              placeholder="Search history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-ctp-surface0 border border-ctp-surface1 pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
            />
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && history.length === 0 && (
            <div className="p-4 text-center text-ctp-subtext0 text-xs flex flex-col items-center gap-2">
              <Icons.Spinner size={16} />
              Loading...
            </div>
          )}

          {!isLoading && history.length === 0 && (
            <div className="p-4 text-center text-ctp-subtext0 text-xs flex flex-col items-center gap-2">
              <Icons.History size={24} className="text-ctp-surface2" />
              {search ? "No matching requests" : "No history yet"}
            </div>
          )}

          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="p-2.5 hover:bg-ctp-surface0/50 cursor-pointer border-b border-ctp-surface0 group"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold text-xs w-12 ${getMethodColor(
                    item.method
                  )}`}
                >
                  {item.method}
                </span>
                <span className="text-xs text-ctp-text truncate flex-1">
                  {getUrlPath(item.url)}
                </span>
                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-ctp-overlay0 hover:text-ctp-red transition-opacity p-0.5"
                  title="Delete"
                >
                  <Icons.Trash size={12} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-ctp-subtext0">
                <span className={getStatusColor(item.statusCode)}>
                  {item.statusCode || "—"}
                </span>
                <span className="text-ctp-surface2">•</span>
                <span>{item.timingMs}ms</span>
                <span className="text-ctp-surface2">•</span>
                <span>{formatTime(item.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-ctp-surface0 flex justify-between items-center bg-ctp-mantle">
          <span className="text-xs text-ctp-subtext0">
            {history.length} {history.length === 1 ? "request" : "requests"}
          </span>
          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-ctp-subtext0 hover:text-ctp-red transition-colors flex items-center gap-1"
            >
              <Icons.Trash size={12} />
              Clear All
            </button>
          )}
        </div>
      </div>
    );
  }
);

HistorySidebar.displayName = "HistorySidebar";

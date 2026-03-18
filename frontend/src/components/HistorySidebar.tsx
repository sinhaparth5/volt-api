import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { GetHistory, DeleteHistoryItem, ClearHistory } from "../../wailsjs/go/app/App";
import { app } from "../../wailsjs/go/models";
import { Icons } from "./Icons";
import { getMethodColor, getStatusColor } from "../utils/helpers";

type HistoryItem = app.HistoryItem;
const HISTORY_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 300;

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
        const items = await GetHistory(HISTORY_LIMIT, search);
        setHistory(items || []);
      } catch (err) {
        console.error("Failed to load history:", err);
        setHistory([]);
      }
      setIsLoading(false);
    };

    useImperativeHandle(ref, () => ({
      refresh: loadHistory,
    }));

    useEffect(() => {
      const timer = setTimeout(() => {
        loadHistory();
      }, SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }, [search]);

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

      if (diff < 60) return "now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString();
    };

    const getUrlDisplay = (url: string): string => {
      try {
        const parsed = new URL(url);
        const display = parsed.hostname + parsed.pathname + parsed.search;
        return display.length > 35 ? display.substring(0, 35) + "..." : display;
      } catch {
        return url.length > 35 ? url.substring(0, 35) + "..." : url;
      }
    };

    return (
      <div className="flex flex-col h-full">
        <div className="p-2 border-b border-ctp-surface0">
          <div className="relative">
            <Icons.Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-ctp-overlay0" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-ctp-surface0 border border-ctp-surface1 pl-7 pr-2 py-1.5 rounded-md text-xs outline-none focus:border-ctp-lavender text-ctp-text placeholder:text-ctp-overlay0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && history.length === 0 && (
            <div className="p-6 text-center text-ctp-text text-xs flex flex-col items-center gap-2">
              <Icons.Spinner size={14} className="text-ctp-mauve" />
              Loading...
            </div>
          )}

          {!isLoading && history.length === 0 && (
            <div className="p-6 text-center text-ctp-text text-xs flex flex-col items-center gap-3">
              <Icons.History size={20} className="text-ctp-surface2" />
              {search ? "No matches" : "No history yet"}
            </div>
          )}

          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="px-3 py-2 hover:bg-ctp-surface0/50 cursor-pointer border-b border-ctp-surface0/50 group"
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs w-9 font-semibold ${getMethodColor(item.method)}`}>
                  {item.method}
                </span>
                <span className="text-xs text-ctp-text truncate flex-1">
                  {getUrlDisplay(item.url)}
                </span>
                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-ctp-overlay0 hover:text-ctp-red p-0.5 rounded"
                  title="Delete"
                >
                  <Icons.Trash size={11} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-ctp-subtext0">
                <span className={getStatusColor(item.statusCode)}>
                  {item.statusCode || "—"}
                </span>
                <span className="text-ctp-surface2">·</span>
                <span>{item.timingMs}ms</span>
                <span className="text-ctp-surface2">·</span>
                <span>{formatTime(item.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 py-2 border-t border-ctp-surface0 flex justify-between items-center">
          <span className="text-xs text-ctp-text">
            {history.length} {history.length === 1 ? "item" : "items"}
          </span>
          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-ctp-text hover:text-ctp-red flex items-center gap-1 px-1 py-0.5 rounded hover:bg-ctp-red/10"
            >
              <Icons.Trash size={10} />
              Clear
            </button>
          )}
        </div>
      </div>
    );
  }
);

HistorySidebar.displayName = "HistorySidebar";

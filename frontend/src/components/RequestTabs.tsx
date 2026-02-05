import { Icons } from "./Icons";
import { RequestTab, getTabDisplayName } from "../utils/tabs";
import { getMethodColor } from "../utils/helpers";

interface RequestTabsProps {
  tabs: RequestTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

export function RequestTabs({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
}: RequestTabsProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-ctp-mantle border-b border-ctp-surface0 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onTabSelect(tab.id)}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer min-w-0 max-w-48 ${
            activeTabId === tab.id
              ? "bg-ctp-base border-t border-l border-r border-ctp-surface0 -mb-px"
              : "bg-ctp-surface0/50 hover:bg-ctp-surface0"
          }`}
        >
          <span className={`text-xs font-semibold ${getMethodColor(tab.method)}`}>
            {tab.method.substring(0, 3)}
          </span>
          <span
            className={`text-xs truncate flex-1 ${
              activeTabId === tab.id ? "text-ctp-text" : "text-ctp-subtext0"
            }`}
            title={tab.url || "New Request"}
          >
            {getTabDisplayName(tab)}
          </span>
          {tab.requestState === "loading" && (
            <Icons.Spinner size={10} className="text-ctp-mauve" />
          )}
          {tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className={`p-0.5 rounded hover:bg-ctp-surface1 ${
                activeTabId === tab.id
                  ? "opacity-60 hover:opacity-100"
                  : "opacity-0 group-hover:opacity-60 hover:opacity-100"
              }`}
            >
              <Icons.X size={10} className="text-ctp-subtext0" />
            </button>
          )}
        </div>
      ))}

      {/* New Tab Button */}
      <button
        onClick={onNewTab}
        className="p-1.5 rounded-md hover:bg-ctp-surface0 text-ctp-subtext0 hover:text-ctp-text flex-shrink-0"
        title="New Tab (Ctrl+T)"
      >
        <Icons.Plus size={14} />
      </button>
    </div>
  );
}

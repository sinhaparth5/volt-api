import { forwardRef } from "react";
import { Icons } from "./Icons";
import { HistorySidebar, HistorySidebarRef } from "./HistorySidebar";
import { app } from "../../wailsjs/go/models";

type HistoryItem = app.HistoryItem;
type SidebarTab = "history" | "collections";

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
}

export const Sidebar = forwardRef<HistorySidebarRef, SidebarProps>(
  ({ activeTab, onTabChange, onSelectHistoryItem }, ref) => {
    return (
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
            onClick={() => onTabChange("history")}
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
            onClick={() => onTabChange("collections")}
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
              ref={ref}
              onSelectItem={onSelectHistoryItem}
            />
          ) : (
            <div className="p-4 text-xs text-ctp-subtext0 flex flex-col items-center justify-center h-full gap-2">
              <Icons.Folder size={32} className="text-ctp-surface2" />
              <span>Coming in Phase 3</span>
            </div>
          )}
        </div>
      </aside>
    );
  }
);

Sidebar.displayName = "Sidebar";

import { forwardRef, useRef, useImperativeHandle } from "react";
import { Icons } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";
import { HistorySidebar, HistorySidebarRef } from "./HistorySidebar";
import { CollectionsSidebar, CollectionsSidebarRef } from "./CollectionsSidebar";
import { app } from "../../wailsjs/go/models";

type HistoryItem = app.HistoryItem;
type SavedRequest = app.SavedRequest;
type SidebarTab = "history" | "collections";

export interface SidebarRef {
  refreshHistory: () => void;
  refreshCollections: () => void;
}

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
  onSelectSavedRequest: (request: SavedRequest) => void;
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(
  ({ activeTab, onTabChange, onSelectHistoryItem, onSelectSavedRequest }, ref) => {
    const historySidebarRef = useRef<HistorySidebarRef>(null);
    const collectionsSidebarRef = useRef<CollectionsSidebarRef>(null);

    useImperativeHandle(ref, () => ({
      refreshHistory: () => historySidebarRef.current?.refresh(),
      refreshCollections: () => collectionsSidebarRef.current?.refresh(),
    }));

    return (
      <aside className="w-full h-full bg-ctp-mantle flex flex-col">
        {/* Logo - consistent height */}
        <div className="h-12 px-4 border-b border-ctp-surface0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.Bolt size={16} className="text-ctp-mauve" />
            <span className="text-ctp-mauve text-sm font-semibold tracking-wide">VOLT</span>
            <span className="text-ctp-overlay0 text-xs">API</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Tabs - consistent with main content tabs */}
        <div className="flex border-b border-ctp-surface0">
          <button
            onClick={() => onTabChange("history")}
            className={`flex-1 h-10 text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 -mb-px ${
              activeTab === "history"
                ? "text-ctp-text bg-ctp-base border-ctp-mauve"
                : "text-ctp-subtext0 hover:text-ctp-text border-transparent"
            }`}
          >
            <Icons.History size={12} />
            History
          </button>
          <button
            onClick={() => onTabChange("collections")}
            className={`flex-1 h-10 text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 -mb-px ${
              activeTab === "collections"
                ? "text-ctp-text bg-ctp-base border-ctp-mauve"
                : "text-ctp-subtext0 hover:text-ctp-text border-transparent"
            }`}
          >
            <Icons.Folder size={12} />
            Collections
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden bg-ctp-base">
          {activeTab === "history" ? (
            <HistorySidebar
              ref={historySidebarRef}
              onSelectItem={onSelectHistoryItem}
            />
          ) : (
            <CollectionsSidebar
              ref={collectionsSidebarRef}
              onSelectRequest={onSelectSavedRequest}
            />
          )}
        </div>
      </aside>
    );
  }
);

Sidebar.displayName = "Sidebar";

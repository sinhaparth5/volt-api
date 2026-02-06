import { WindowMinimise, WindowToggleMaximise, Quit } from "../../wailsjs/runtime/runtime";
import { AppIcon } from "./AppLogo";
import { Icons } from "./Icons";
import { RequestTab, getTabDisplayName } from "../utils/tabs";
import { getMethodColor } from "../utils/helpers";

interface TitleBarProps {
  tabs: RequestTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onLogoClick: () => void;
}

export function TitleBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  onLogoClick,
}: TitleBarProps) {
  return (
    <div
      className="h-9 flex items-center bg-ctp-crust border-b border-ctp-surface0 select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Logo */}
      <button
        onClick={onLogoClick}
        className="flex items-center gap-2 px-3 h-full hover:bg-ctp-surface0/50"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        title="About Volt-API"
      >
        <AppIcon size={14} className="text-ctp-mauve" />
        <span className="text-xs font-semibold text-ctp-text">Volt-API</span>
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-ctp-surface1" />

      {/* Tabs */}
      <div
        className="flex-1 flex items-center gap-0.5 px-1 overflow-x-auto h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            className={`group flex items-center gap-1.5 px-2.5 h-7 rounded cursor-pointer min-w-0 max-w-40 ${
              activeTabId === tab.id
                ? "bg-ctp-base text-ctp-text"
                : "text-ctp-subtext0 hover:bg-ctp-surface0/50 hover:text-ctp-text"
            }`}
          >
            <span className={`text-[10px] font-bold ${getMethodColor(tab.method)}`}>
              {tab.method.substring(0, 3)}
            </span>
            <span className="text-xs truncate flex-1" title={tab.url || "New Request"}>
              {getTabDisplayName(tab)}
            </span>
            {tab.requestState === "loading" && (
              <Icons.Spinner size={10} className="text-ctp-mauve flex-shrink-0" />
            )}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-ctp-surface1 flex-shrink-0 ${
                  activeTabId === tab.id
                    ? "opacity-50 hover:opacity-100"
                    : "opacity-0 group-hover:opacity-50 hover:opacity-100"
                }`}
              >
                <Icons.X size={10} />
              </button>
            )}
          </div>
        ))}

        {/* New Tab Button */}
        <button
          onClick={onNewTab}
          className="p-1.5 rounded hover:bg-ctp-surface0/50 text-ctp-overlay0 hover:text-ctp-text flex-shrink-0"
          title="New Tab (Ctrl+T)"
        >
          <Icons.Plus size={12} />
        </button>
      </div>

      {/* Window Controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          onClick={() => WindowMinimise()}
          className="w-11 h-full flex items-center justify-center text-ctp-subtext0 hover:bg-ctp-surface0/50 hover:text-ctp-text"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={() => WindowToggleMaximise()}
          className="w-11 h-full flex items-center justify-center text-ctp-subtext0 hover:bg-ctp-surface0/50 hover:text-ctp-text"
          title="Maximize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        <button
          onClick={() => Quit()}
          className="w-11 h-full flex items-center justify-center text-ctp-subtext0 hover:bg-ctp-red hover:text-ctp-base"
          title="Close"
        >
          <Icons.X size={12} />
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Icons } from "./Icons";
import { AppLogo } from "./AppLogo";
import { GetAppInfo } from "../../wailsjs/go/app/App";

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppInfo {
  version: string;
  buildTime: string;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [appInfo, setAppInfo] = useState<AppInfo>({ version: "dev", buildTime: "unknown" });

  useEffect(() => {
    if (isOpen) {
      GetAppInfo().then((info) => {
        setAppInfo(info);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-ctp-base border border-ctp-surface0 rounded-lg shadow-xl w-80 max-w-[90vw]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-ctp-overlay0 hover:text-ctp-text rounded-md hover:bg-ctp-surface0"
        >
          <Icons.X size={16} />
        </button>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <AppLogo size={64} />
          </div>

          {/* App name */}
          <h1 className="text-xl font-bold text-ctp-text mb-1">Volt-API</h1>
          <p className="text-sm text-ctp-subtext0 mb-4">
            Fast, lightweight API client
          </p>

          {/* Version info */}
          <div className="bg-ctp-surface0/50 rounded-md p-3 mb-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-ctp-subtext0 text-right">Version:</div>
              <div className="text-ctp-text text-left font-mono">{appInfo.version}</div>
              <div className="text-ctp-subtext0 text-right">Built:</div>
              <div className="text-ctp-text text-left font-mono">
                {appInfo.buildTime === "unknown" ? "Development" : appInfo.buildTime}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="text-xs text-ctp-overlay0 space-y-1 mb-4">
            <p>Built with Go + React + Wails</p>
            <p>Catppuccin Theme</p>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-4 text-xs">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ctp-mauve hover:underline"
            >
              GitHub
            </a>
            <span className="text-ctp-surface1">|</span>
            <a
              href="#"
              className="text-ctp-mauve hover:underline"
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
            >
              Close
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

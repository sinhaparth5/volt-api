import { useEffect } from "react";

interface UseGlobalShortcutsOptions {
  canSend: boolean;
  canSave: boolean;
  canCloseTab: boolean;
  onSend: () => void;
  onSave: () => void;
  onToggleEnvironmentManager: () => void;
  onNewTab: () => void;
  onCloseTab: () => void;
  onShowAbout: () => void;
  onEscape: () => void;
}

export function useGlobalShortcuts({
  canSend,
  canSave,
  canCloseTab,
  onSend,
  onSave,
  onToggleEnvironmentManager,
  onNewTab,
  onCloseTab,
  onShowAbout,
  onEscape,
}: UseGlobalShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey;

      if (isMod && event.key === "Enter") {
        event.preventDefault();
        if (canSend) {
          onSend();
        }
        return;
      }

      if (isMod && event.key === "s") {
        event.preventDefault();
        if (canSave) {
          onSave();
        }
        return;
      }

      if (isMod && event.key === "e") {
        event.preventDefault();
        onToggleEnvironmentManager();
        return;
      }

      if (isMod && event.key === "t") {
        event.preventDefault();
        onNewTab();
        return;
      }

      if (isMod && event.key === "w") {
        event.preventDefault();
        if (canCloseTab) {
          onCloseTab();
        }
        return;
      }

      if (isMod && event.shiftKey && event.key === "A") {
        event.preventDefault();
        onShowAbout();
        return;
      }

      if (event.key === "Escape") {
        onEscape();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canSend,
    canSave,
    canCloseTab,
    onSend,
    onSave,
    onToggleEnvironmentManager,
    onNewTab,
    onCloseTab,
    onShowAbout,
    onEscape,
  ]);
}

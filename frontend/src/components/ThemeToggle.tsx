import { useTheme } from "../hooks/useTheme";
import { Icons } from "./Icons";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
    </button>
  );
}

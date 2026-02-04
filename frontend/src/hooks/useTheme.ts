import { useState, useEffect } from "react";

export type Theme = "latte" | "macchiato";

const THEME_KEY = "volt-api-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored === "latte" || stored === "macchiato") {
      return stored;
    }
    // Default to latte (light theme)
    return "latte";
  });

  useEffect(() => {
    // Prevent transition flash on initial load
    document.documentElement.classList.add("no-transitions");

    // Apply theme
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);

    // Re-enable transitions after a tick
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("no-transitions");
      });
    });
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "latte" ? "macchiato" : "latte"));
  };

  const isDark = theme === "macchiato";

  return { theme, setTheme, toggleTheme, isDark };
}

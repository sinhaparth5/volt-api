import { useState, useEffect } from "react";

export type Theme = "latte" | "macchiato";

const THEME_KEY = "volt-api-theme";

const resolveInitialTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  return stored === "latte" || stored === "macchiato" ? stored : "latte";
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.classList.add("no-transitions");
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("no-transitions");
      });
    });
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "latte" ? "macchiato" : "latte"));
  };

  const isDark = theme === "macchiato";

  return { theme, setTheme, toggleTheme, isDark };
}

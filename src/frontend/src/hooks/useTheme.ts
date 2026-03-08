/**
 * useTheme — Phase 5 Theme System
 * Manages 'dark' | 'light' | 'red' themes via localStorage.
 * Applies data-theme attribute to document.documentElement.
 * Default = 'dark' (no attribute needed).
 */

import { useCallback, useEffect, useState } from "react";

export type AppTheme = "dark" | "light" | "red";

const THEME_KEY = "aria_theme";

function getStoredTheme(): AppTheme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "red") return stored;
  } catch {
    // ignore
  }
  return "dark";
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(getStoredTheme);

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: AppTheme) => {
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // ignore
    }
    applyTheme(newTheme);
    setThemeState(newTheme);
  }, []);

  return { theme, setTheme };
}

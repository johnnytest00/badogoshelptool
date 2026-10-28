"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getEffectiveTheme, getThemeChromeColor, isThemeMode, themeStorageKey, type ThemeMode } from "@/lib/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  effectiveTheme: Exclude<ThemeMode, "system">;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Exclude<ThemeMode, "system">) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = getThemeChromeColor(theme);
  });
}

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemIsDark, setSystemIsDark] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(themeStorageKey);
    if (isThemeMode(storedMode)) setModeState(storedMode);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemIsDark(mediaQuery.matches);
    updateSystemTheme();
    setInitialized(true);
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    window.localStorage.setItem(themeStorageKey, nextMode);
    const nextEffectiveTheme = getEffectiveTheme(nextMode, systemIsDark);
    applyTheme(nextEffectiveTheme);
  }, [systemIsDark]);

  const effectiveTheme = getEffectiveTheme(mode, systemIsDark);

  useEffect(() => {
    if (!initialized) return;
    applyTheme(effectiveTheme);
  }, [effectiveTheme, initialized]);

  const value = useMemo(() => ({ mode, effectiveTheme, setMode }), [mode, effectiveTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}

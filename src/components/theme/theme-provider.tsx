"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getEffectiveTheme, isThemeMode, type ThemeMode } from "@/lib/theme";

const storageKey = "tetopro-theme";

type ThemeContextValue = {
  mode: ThemeMode;
  effectiveTheme: Exclude<ThemeMode, "system">;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemIsDark, setSystemIsDark] = useState(false);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(storageKey);
    if (isThemeMode(storedMode)) setModeState(storedMode);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemIsDark(mediaQuery.matches);
    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    window.localStorage.setItem(storageKey, nextMode);
  };

  const effectiveTheme = getEffectiveTheme(mode, systemIsDark);

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.style.colorScheme = effectiveTheme;
  }, [effectiveTheme]);

  const value = useMemo(() => ({ mode, effectiveTheme, setMode }), [mode, effectiveTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}

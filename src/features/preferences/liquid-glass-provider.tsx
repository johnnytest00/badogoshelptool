"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  liquidGlassDefaults,
  liquidGlassStorageKey,
  clampGlassOpacity,
  normalizeGlassColor,
  parseLiquidGlassPreferences,
  persistLiquidGlassPreferences,
  type LiquidGlassPreferences,
} from "@/features/preferences/liquid-glass";

type LiquidGlassContextValue = LiquidGlassPreferences & {
  setOpacity: (opacity: number) => void;
  setTintMode: (mode: LiquidGlassPreferences["tintMode"]) => void;
  setCustomTint: (color: string) => void;
  resetLiquidGlass: () => void;
};

const LiquidGlassContext = createContext<LiquidGlassContextValue | null>(null);

function applyLiquidGlassPreferences(preferences: LiquidGlassPreferences) {
  const root = document.documentElement;
  root.style.setProperty("--glass-opacity", `${preferences.opacity}%`);
  root.style.setProperty("--glass-custom-tint", preferences.customTint);
  root.dataset.glassTintMode = preferences.tintMode;
  const reduceGlassEffects = window.matchMedia("(prefers-reduced-transparency: reduce)").matches || window.matchMedia("(forced-colors: active)").matches;
  root.dataset.glassFrameFree = String((preferences.opacity === 0 || preferences.opacity === 100) && !reduceGlassEffects);
}

export function LiquidGlassProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [preferences, setPreferences] = useState<LiquidGlassPreferences>(liquidGlassDefaults);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let restored: LiquidGlassPreferences = liquidGlassDefaults;
    try {
      restored = parseLiquidGlassPreferences(window.localStorage.getItem(liquidGlassStorageKey));
    } catch {
      // Keep the validated defaults when browser storage is unavailable.
    }
    setPreferences(restored);
    applyLiquidGlassPreferences(restored);
    setInitialized(true);
  }, []);

  const update = useCallback((change: (current: LiquidGlassPreferences) => LiquidGlassPreferences) => {
    setPreferences(change);
  }, []);

  const setOpacity = useCallback((opacity: number) => update((current) => ({ ...current, opacity: clampGlassOpacity(opacity) })), [update]);
  const setTintMode = useCallback((tintMode: LiquidGlassPreferences["tintMode"]) => update((current) => ({ ...current, tintMode })), [update]);
  const setCustomTint = useCallback((color: string) => {
    const customTint = normalizeGlassColor(color);
    if (customTint) update((current) => ({ ...current, tintMode: "custom", customTint }));
  }, [update]);
  const resetLiquidGlass = useCallback(() => {
    setPreferences({ ...liquidGlassDefaults });
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const apply = () => applyLiquidGlassPreferences(preferences);
    apply();
    const transparencyPreference = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const contrastPreference = window.matchMedia("(forced-colors: active)");
    transparencyPreference.addEventListener("change", apply);
    contrastPreference.addEventListener("change", apply);
    try {
      persistLiquidGlassPreferences(window.localStorage, preferences);
    } catch {
      // Keep the in-memory setting active when persistence is unavailable.
    }
    return () => {
      transparencyPreference.removeEventListener("change", apply);
      contrastPreference.removeEventListener("change", apply);
    };
  }, [initialized, preferences]);

  const value = useMemo(() => ({ ...preferences, setOpacity, setTintMode, setCustomTint, resetLiquidGlass }), [preferences, setOpacity, setTintMode, setCustomTint, resetLiquidGlass]);
  return <LiquidGlassContext.Provider value={value}>{children}</LiquidGlassContext.Provider>;
}

export function useLiquidGlass() {
  const context = useContext(LiquidGlassContext);
  if (!context) throw new Error("useLiquidGlass must be used inside LiquidGlassProvider");
  return context;
}

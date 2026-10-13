"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clampScalingValue,
  parseScalingPreferences,
  persistScalingPreferences,
  resetScalingPreferences,
  scalingDefaults,
  scalingStorageKey,
  updateScaling,
  type ScalingKey,
  type ScalingPreferences,
} from "@/features/preferences/scaling";

type ScalingContextValue = ScalingPreferences & {
  setScale: (key: ScalingKey, value: number) => void;
  adjustScale: (key: ScalingKey, delta: number) => void;
  resetScales: () => void;
};

const ScalingContext = createContext<ScalingContextValue | null>(null);

function applyScalingVariables(preferences: ScalingPreferences) {
  const root = document.documentElement;
  root.style.setProperty("--tp-text-scale", `${preferences.text / 100}`);
  root.style.setProperty("--tp-ui-scale", `${preferences.ui / 100}`);
  root.style.setProperty("--tp-drawing-scale", `${preferences.drawing / 100}`);
  root.style.setProperty("--tp-spacing-scale", `${preferences.spacing / 100}`);
}

export function ScalingProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [preferences, setPreferences] = useState<ScalingPreferences>(scalingDefaults);

  useEffect(() => {
    const restored = parseScalingPreferences(window.localStorage.getItem(scalingStorageKey));
    setPreferences(restored);
    applyScalingVariables(restored);
  }, []);

  const setScale = useCallback((key: ScalingKey, value: number) => {
    setPreferences((current) => {
      const next = updateScaling(current, key, value);
      applyScalingVariables(next);
      persistScalingPreferences(window.localStorage, next);
      return next;
    });
  }, []);

  const adjustScale = useCallback((key: ScalingKey, delta: number) => {
    setPreferences((current) => {
      const next = updateScaling(current, key, clampScalingValue(key, current[key] + delta));
      applyScalingVariables(next);
      persistScalingPreferences(window.localStorage, next);
      return next;
    });
  }, []);

  const resetScales = useCallback(() => {
    const next = resetScalingPreferences(window.localStorage);
    setPreferences(next);
    applyScalingVariables(next);
  }, []);

  const value = useMemo(() => ({ ...preferences, setScale, adjustScale, resetScales }), [preferences, setScale, adjustScale, resetScales]);
  return <ScalingContext.Provider value={value}>{children}</ScalingContext.Provider>;
}

export function useScaling() {
  const context = useContext(ScalingContext);
  if (!context) throw new Error("useScaling must be used inside ScalingProvider");
  return context;
}

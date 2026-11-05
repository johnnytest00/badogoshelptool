export const scalingStorageKey = "tetopro-scaling";
export const scalingVersion = 1;

export const scalingDefaults = {
  text: 100,
  ui: 115,
  drawing: 100,
  spacing: 100,
  mobileStickyEnabled: true,
} as const;

export type ScalingKey = Exclude<keyof typeof scalingDefaults, "mobileStickyEnabled">;
export type ScalingPreferences = Record<ScalingKey, number> & { mobileStickyEnabled: boolean };

export const scalingRanges: Record<ScalingKey, { min: number; max: number; step: number }> = {
  text: { min: 80, max: 200, step: 10 },
  ui: { min: 80, max: 150, step: 5 },
  drawing: { min: 50, max: 250, step: 10 },
  spacing: { min: 75, max: 150, step: 5 },
};

export function clampScalingValue(key: ScalingKey, value: unknown): number {
  const range = scalingRanges[key];
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : scalingDefaults[key];
  return Math.min(range.max, Math.max(range.min, Math.round(numericValue / range.step) * range.step));
}

export function updateScaling(preferences: ScalingPreferences, key: ScalingKey, value: unknown): ScalingPreferences {
  return { ...preferences, [key]: clampScalingValue(key, value) };
}

export function parseScalingPreferences(raw: string | null): ScalingPreferences {
  if (!raw) return { ...scalingDefaults };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...scalingDefaults };
    const candidate = parsed as Partial<Record<ScalingKey, unknown>> & { version?: unknown; mobileStickyEnabled?: unknown };
    if (candidate.version !== scalingVersion) return { ...scalingDefaults };
    return {
      text: clampScalingValue("text", candidate.text),
      ui: clampScalingValue("ui", candidate.ui),
      drawing: clampScalingValue("drawing", candidate.drawing),
      spacing: clampScalingValue("spacing", candidate.spacing),
      mobileStickyEnabled: typeof candidate.mobileStickyEnabled === "boolean" ? candidate.mobileStickyEnabled : true,
    };
  } catch {
    return { ...scalingDefaults };
  }
}

export function serializeScalingPreferences(preferences: ScalingPreferences): string {
  return JSON.stringify({ version: scalingVersion, ...preferences });
}

export function persistScalingPreferences(storage: Pick<Storage, "setItem">, preferences: ScalingPreferences): void {
  storage.setItem(scalingStorageKey, serializeScalingPreferences(preferences));
}

export function resetScalingPreferences(storage: Pick<Storage, "setItem">): ScalingPreferences {
  const preferences = { ...scalingDefaults };
  persistScalingPreferences(storage, preferences);
  return preferences;
}

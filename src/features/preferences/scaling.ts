export const scalingStorageKey = "tetopro-scaling";
export const scalingVersion = 2;

export const scalingDefaults = {
  text: 100,
  mobileStickyEnabled: true,
} as const;

export type ScalingKey = "text";
export type ScalingPreferences = Record<ScalingKey, number> & { mobileStickyEnabled: boolean };

export const scalingRanges: Record<ScalingKey, { min: number; max: number; step: number }> = {
  text: { min: 80, max: 200, step: 10 },
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
    if (candidate.version !== scalingVersion && candidate.version !== 1) return { ...scalingDefaults };
    return {
      text: clampScalingValue("text", candidate.text),
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

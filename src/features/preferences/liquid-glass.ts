export const liquidGlassStorageKey = "tetopro-liquid-glass-v1";
export const liquidGlassVersion = 2;

export const liquidGlassDefaults = {
  version: liquidGlassVersion,
  opacity: 10,
  tintMode: "auto",
  customTint: "#FFFFFF",
} as const;

export type LiquidGlassPreferences = {
  version: typeof liquidGlassVersion;
  opacity: number;
  tintMode: "auto" | "custom";
  customTint: string;
};

export function normalizeGlassColor(value: unknown): string | null {
  if (typeof value !== "string" || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) return null;
  const color = value.slice(1);
  const expanded = color.length === 3 ? [...color].map((part) => `${part}${part}`).join("") : color;
  return `#${expanded.toUpperCase()}`;
}

export function clampGlassOpacity(value: unknown): number {
  const opacity = typeof value === "number" && Number.isFinite(value) ? value : liquidGlassDefaults.opacity;
  return Math.min(100, Math.max(0, Math.round(opacity)));
}

export function parseLiquidGlassPreferences(raw: string | null): LiquidGlassPreferences {
  if (!raw) return { ...liquidGlassDefaults };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...liquidGlassDefaults };
    const candidate = parsed as {
      version?: unknown;
      opacity?: unknown;
      tintMode?: unknown;
      customTint?: unknown;
    };
    if (candidate.version !== 1 && candidate.version !== liquidGlassVersion) return { ...liquidGlassDefaults };
    const customTint = normalizeGlassColor(candidate.customTint) ?? liquidGlassDefaults.customTint;
    const storedOpacity = clampGlassOpacity(candidate.opacity);
    return {
      version: liquidGlassVersion,
      // Version 1's 10% first-use baseline is also the current default.
      opacity: storedOpacity,
      tintMode: candidate.tintMode === "custom" ? "custom" : "auto",
      customTint,
    };
  } catch {
    return { ...liquidGlassDefaults };
  }
}

export function serializeLiquidGlassPreferences(preferences: LiquidGlassPreferences): string {
  return JSON.stringify({
    version: liquidGlassVersion,
    opacity: clampGlassOpacity(preferences.opacity),
    tintMode: preferences.tintMode === "custom" ? "custom" : "auto",
    customTint: normalizeGlassColor(preferences.customTint) ?? liquidGlassDefaults.customTint,
  });
}

export function persistLiquidGlassPreferences(storage: Pick<Storage, "setItem">, preferences: LiquidGlassPreferences): void {
  storage.setItem(liquidGlassStorageKey, serializeLiquidGlassPreferences(preferences));
}

export function resetLiquidGlassPreferences(storage: Pick<Storage, "setItem">): LiquidGlassPreferences {
  const preferences = { ...liquidGlassDefaults };
  persistLiquidGlassPreferences(storage, preferences);
  return preferences;
}

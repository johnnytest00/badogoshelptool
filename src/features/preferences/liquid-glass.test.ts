import { describe, expect, it } from "vitest";
import { liquidGlassDefaults, normalizeGlassColor, parseLiquidGlassPreferences, persistLiquidGlassPreferences, resetLiquidGlassPreferences, serializeLiquidGlassPreferences } from "./liquid-glass";

describe("global Liquid Glass preferences", () => {
  it("starts with the 10% transparent, theme-aware appearance", () => {
    expect(liquidGlassDefaults).toEqual({ version: 2, opacity: 10, tintMode: "auto", customTint: "#FFFFFF" });
    expect(parseLiquidGlassPreferences(null)).toEqual(liquidGlassDefaults);
  });

  it("retains the previous 10% first-use opacity and customized values", () => {
    expect(parseLiquidGlassPreferences(JSON.stringify({ version: 1, opacity: 10, tintMode: "auto", customTint: "#FFFFFF" }))).toEqual(liquidGlassDefaults);
    expect(parseLiquidGlassPreferences(JSON.stringify({ version: 1, opacity: 35, tintMode: "custom", customTint: "#ed6100" }))).toEqual({ version: 2, opacity: 35, tintMode: "custom", customTint: "#ED6100" });
  });

  it("validates, clamps and normalizes persisted settings", () => {
    expect(parseLiquidGlassPreferences(JSON.stringify({ version: 2, opacity: 145, tintMode: "custom", customTint: "#aBc" }))).toEqual({ version: 2, opacity: 100, tintMode: "custom", customTint: "#AABBCC" });
    expect(parseLiquidGlassPreferences(JSON.stringify({ version: 2, opacity: -5, tintMode: "invalid", customTint: "url(x)" }))).toEqual({ version: 2, opacity: 0, tintMode: "auto", customTint: "#FFFFFF" });
    expect(parseLiquidGlassPreferences(JSON.stringify({ version: 0, opacity: 50 }))).toEqual(liquidGlassDefaults);
    expect(parseLiquidGlassPreferences("not json")).toEqual(liquidGlassDefaults);
    expect(normalizeGlassColor("#e61")).toBe("#EE6611");
    expect(normalizeGlassColor("red")).toBeNull();
  });

  it("writes versioned values and restores defaults", () => {
    const storage = { value: "", setItem(_key: string, value: string) { this.value = value; } };
    const preferences = { version: 2 as const, opacity: 0, tintMode: "custom" as const, customTint: "#ed6100" };
    persistLiquidGlassPreferences(storage, preferences);
    expect(JSON.parse(storage.value)).toEqual({ version: 2, opacity: 0, tintMode: "custom", customTint: "#ED6100" });
    expect(serializeLiquidGlassPreferences(preferences)).toBe(storage.value);
    expect(resetLiquidGlassPreferences(storage)).toEqual(liquidGlassDefaults);
    expect(JSON.parse(storage.value)).toEqual(liquidGlassDefaults);
  });
});

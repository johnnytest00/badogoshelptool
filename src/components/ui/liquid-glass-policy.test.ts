import { describe, expect, it } from "vitest";
import { shouldEnhanceLiquidGlass, type LiquidGlassRuntimeProfile } from "./liquid-glass-policy";

const desktopChrome: LiquidGlassRuntimeProfile = {
  userAgent: "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36",
  reducedMotion: false,
  reducedTransparency: false,
  coarsePointer: false,
  deviceMemory: 8,
  hardwareConcurrency: 8,
};

describe("Liquid Glass renderer policy", () => {
  it("enhances supported desktop Chromium only", () => {
    expect(shouldEnhanceLiquidGlass(desktopChrome)).toBe(true);
    expect(shouldEnhanceLiquidGlass({ ...desktopChrome, userAgent: "Firefox/130" })).toBe(false);
    expect(shouldEnhanceLiquidGlass({ ...desktopChrome, userAgent: "Version/18.0 Safari/605.1.15" })).toBe(false);
  });

  it("keeps the CSS fallback for accessibility and constrained devices", () => {
    expect(shouldEnhanceLiquidGlass({ ...desktopChrome, reducedMotion: true })).toBe(false);
    expect(shouldEnhanceLiquidGlass({ ...desktopChrome, reducedTransparency: true })).toBe(false);
    expect(shouldEnhanceLiquidGlass({ ...desktopChrome, coarsePointer: true })).toBe(false);
    expect(shouldEnhanceLiquidGlass({ ...desktopChrome, deviceMemory: 4 })).toBe(false);
    expect(shouldEnhanceLiquidGlass({ ...desktopChrome, hardwareConcurrency: 4 })).toBe(false);
    expect(shouldEnhanceLiquidGlass({ ...desktopChrome, userAgent: "iPhone Chrome/130 Mobile Safari/537.36", touchPoints: 5 })).toBe(false);
  });
});

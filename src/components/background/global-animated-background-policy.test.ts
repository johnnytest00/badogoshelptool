import { describe, expect, it } from "vitest";
import { capBackgroundPixelRatio, createRenderGate, getBackgroundColor, getBackgroundPointCount, getNetworkColor, getRenderTargetFps, shouldUseStaticBackground } from "./global-animated-background-policy";

describe("global animated background policy", () => {
  it("keeps animation enabled on mobile while respecting reduced motion and the saved setting", () => {
    expect(shouldUseStaticBackground({ reducedMotion: true, enabled: true })).toBe(true);
    expect(shouldUseStaticBackground({ reducedMotion: false, enabled: false })).toBe(true);
    expect(shouldUseStaticBackground({ reducedMotion: false, enabled: true })).toBe(false);
  });

  it("uses a low-energy frame target and caps high-DPI rendering at one", () => {
    expect(getRenderTargetFps()).toBe(20);
    expect(getBackgroundPointCount(false)).toBe(6);
    expect(getBackgroundPointCount(true)).toBe(4);
    expect(capBackgroundPixelRatio(2.5)).toBe(1);
    expect(capBackgroundPixelRatio(1)).toBe(1);
    expect(capBackgroundPixelRatio(0)).toBe(1);
  });

  it("limits actual render calls over a simulated 60 Hz animation loop", () => {
    for (const targetFps of [30, 20]) {
      let now = 0;
      let renderedFrames = 0;
      const allowRender = createRenderGate(targetFps, () => now);
      for (let frame = 0; frame < 600; frame += 1) {
        now = frame * (1000 / 60);
        if (allowRender()) renderedFrames += 1;
      }
      expect(renderedFrames).toBeLessThanOrEqual(targetFps * 10);
      expect(renderedFrames).toBeGreaterThanOrEqual(targetFps * 9);
    }
  });

  it("uses theme-appropriate network and canvas colors", () => {
    expect(getBackgroundColor(true)).toBe(0x0b1220);
    expect(getBackgroundColor(false)).toBe(0xf5f7fb);
    expect(getNetworkColor(true)).toBe(0xed6100);
    expect(getNetworkColor(false)).toBe(0xb45309);
  });
});

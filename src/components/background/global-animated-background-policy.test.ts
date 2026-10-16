import { describe, expect, it } from "vitest";
import { getBackgroundColor, getNetworkColor, shouldUseStaticBackground } from "./global-animated-background-policy";

describe("global animated background policy", () => {
  it("keeps animation static for reduced motion, mobile, data saver and lower power devices", () => {
    const base = { reducedMotion: false, isMobile: false, saveData: false, hardwareConcurrency: 8, deviceMemory: 8 };

    expect(shouldUseStaticBackground({ ...base, reducedMotion: true })).toBe(true);
    expect(shouldUseStaticBackground({ ...base, isMobile: true })).toBe(true);
    expect(shouldUseStaticBackground({ ...base, saveData: true })).toBe(true);
    expect(shouldUseStaticBackground({ ...base, hardwareConcurrency: 4 })).toBe(true);
    expect(shouldUseStaticBackground({ ...base, deviceMemory: 4 })).toBe(true);
  });

  it("allows animation on a capable desktop profile", () => {
    expect(shouldUseStaticBackground({ reducedMotion: false, isMobile: false, saveData: false, hardwareConcurrency: 8, deviceMemory: 8 })).toBe(false);
    expect(shouldUseStaticBackground({ reducedMotion: false, isMobile: false, saveData: false, hardwareConcurrency: undefined, deviceMemory: undefined })).toBe(false);
  });

  it("uses theme-appropriate network and canvas colors", () => {
    expect(getBackgroundColor(true)).toBe(0x0b1220);
    expect(getBackgroundColor(false)).toBe(0xf5f7fb);
    expect(getNetworkColor(true)).toBe(0xed6100);
    expect(getNetworkColor(false)).toBe(0xc94f00);
  });
});

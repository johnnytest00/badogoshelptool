import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("TetőPro web app manifest", () => {
  it("uses the existing app identity, standalone mode, icons, and matching default background", () => {
    const result = manifest();
    expect(result.name).toBe("TetőPro");
    expect(result.short_name).toBe("TetőPro");
    expect(result.display).toBe("standalone");
    expect(result.start_url).toBe("/");
    expect(result.theme_color).toBe("#f5f7fb");
    expect(result.background_color).toBe("#f5f7fb");
    expect(result.icons?.map((icon) => icon.src)).toEqual([
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/icon-maskable-512.png",
    ]);
  });
});

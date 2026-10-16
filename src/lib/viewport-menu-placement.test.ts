import { describe, expect, it } from "vitest";
import { placeAnchoredMenu } from "./viewport-menu-placement";

describe("viewport-aware anchored menu placement", () => {
  it.each([320, 390])("keeps the menu inside a %i px visual viewport", (width) => {
    const placement = placeAnchoredMenu(
      { left: 12, right: 180, top: 140, bottom: 184 },
      { width: 304, height: 280 },
      { left: 0, top: 0, width, height: 700 },
      { left: 0, right: 0, top: 0, bottom: 0 },
    );
    expect(placement.left).toBeGreaterThanOrEqual(12);
    expect(placement.left + Math.min(304, placement.maxWidth)).toBeLessThanOrEqual(width - 12);
    expect(placement.top).toBeGreaterThanOrEqual(12);
    expect(placement.top + placement.maxHeight).toBeLessThanOrEqual(688);
    expect(placement.left).toBe(12);
  });

  it("respects visual viewport offsets and safe-area insets", () => {
    const placement = placeAnchoredMenu(
      { left: 280, right: 360, top: 340, bottom: 384 },
      { width: 280, height: 320 },
      { left: 100, top: 40, width: 390, height: 360 },
      { left: 24, right: 30, top: 14, bottom: 22 },
    );
    expect(placement.left).toBe(136);
    expect(placement.top).toBeGreaterThanOrEqual(66);
    expect(placement.side).toBe("above");
    expect(placement.top + placement.maxHeight).toBeLessThanOrEqual(378);
  });
});

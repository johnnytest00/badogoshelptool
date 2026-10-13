import { describe, expect, it } from "vitest";
import { focusedElementNeedsReveal } from "./keyboard-visibility";

describe("focusedElementNeedsReveal", () => {
  it("keeps a visible field in place and reveals one outside the visual viewport", () => {
    expect(focusedElementNeedsReveal({ top: 180, bottom: 220 }, { top: 0, height: 700 })).toBe(false);
    expect(focusedElementNeedsReveal({ top: 650, bottom: 690 }, { top: 0, height: 660 })).toBe(true);
    expect(focusedElementNeedsReveal({ top: 80, bottom: 110 }, { top: 100, height: 500 })).toBe(true);
  });
});

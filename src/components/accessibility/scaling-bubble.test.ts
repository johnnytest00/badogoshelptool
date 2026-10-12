import { describe, expect, it } from "vitest";
import { closeBubbleOnKey, closeBubbleOnOutsideClick, toggleBubble } from "@/components/accessibility/scaling-bubble.utils";

describe("scaling bubble interaction", () => {
  it("toggles open and closed state", () => {
    expect(toggleBubble(false)).toBe(true);
    expect(toggleBubble(true)).toBe(false);
  });

  it("closes on Escape or outside click, but not on inside interaction", () => {
    expect(closeBubbleOnKey(true, "Escape")).toBe(false);
    expect(closeBubbleOnKey(true, "Enter")).toBe(true);
    expect(closeBubbleOnOutsideClick(true, false)).toBe(false);
    expect(closeBubbleOnOutsideClick(true, true)).toBe(true);
  });
});

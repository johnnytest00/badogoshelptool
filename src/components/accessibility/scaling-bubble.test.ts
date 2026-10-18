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

import { chooseFloatingPlacement } from "@/lib/floating-control-placement";

describe("floating launcher placement", () => {
  const viewport = { left: 0, top: 0, width: 390, height: 800 };
  const base = { viewport, size: 44, margin: 12, baseBottom: 12 };

  it("stays bottom-right when nothing is in the way", () => {
    expect(chooseFloatingPlacement({ ...base, obstacles: [] })).toEqual({ side: "right", bottom: 12 });
  });

  it("moves above a sticky bottom bar instead of hiding", () => {
    const saveBar = { left: 0, right: 390, top: 730, bottom: 800 };
    const placement = chooseFloatingPlacement({ ...base, obstacles: [saveBar] });
    expect(placement.bottom).toBeGreaterThanOrEqual(70);
  });

  it("keeps the current free placement while the default slot is blocked", () => {
    const current = { side: "left", bottom: 12 } as const;
    const blockRight = { left: 330, right: 390, top: 740, bottom: 800 };
    expect(chooseFloatingPlacement({ ...base, obstacles: [blockRight], current })).toEqual(current);
  });

  it("returns to the default slot once it is free again", () => {
    expect(chooseFloatingPlacement({ ...base, obstacles: [], current: { side: "left", bottom: 12 } })).toEqual({ side: "right", bottom: 12 });
  });

  it("falls back to the least-overlapping slot when everything is covered", () => {
    const wall = { left: 0, right: 390, top: 0, bottom: 800 };
    expect(chooseFloatingPlacement({ ...base, obstacles: [wall] })).toBeDefined();
  });
});

import { describe, expect, it } from "vitest";
import { chooseFloatingPlacement, rectanglesOverlap, type ScreenRect } from "./floating-control-placement";

describe("rectanglesOverlap", () => {
  it("detects actionable content under a fixed control without treating touching edges as overlap", () => {
    expect(rectanglesOverlap({ left: 10, right: 60, top: 10, bottom: 60 }, { left: 50, right: 100, top: 50, bottom: 100 })).toBe(true);
    expect(rectanglesOverlap({ left: 10, right: 60, top: 10, bottom: 60 }, { left: 60, right: 100, top: 10, bottom: 60 })).toBe(false);
  });
});

describe("chooseFloatingPlacement", () => {
  const viewport = { left: 0, top: 0, width: 375, height: 667 };
  const base = { viewport, size: 44, margin: 12, baseBottom: 12, obstacles: [] as ScreenRect[] };

  it("az alapértelmezett jobb alsó helyet választja, ha szabad", () => {
    expect(chooseFloatingPlacement(base)).toEqual({ side: "right", bottom: 12 });
  });

  it("feljebb lép, ha az alapértelmezett helyet vezérlő foglalja", () => {
    const blocked: ScreenRect = { left: 0, right: 375, top: 600, bottom: 667 };
    const placement = chooseFloatingPlacement({ ...base, obstacles: [blocked] });
    expect(placement.docked).toBeFalsy();
    expect(placement.bottom).toBeGreaterThan(12);
  });

  it("nem ugrál: a szabad jelenlegi helyet megtartja", () => {
    const blocked: ScreenRect = { left: 0, right: 375, top: 600, bottom: 667 };
    const current = { side: "left" as const, bottom: 120 };
    expect(chooseFloatingPlacement({ ...base, obstacles: [blocked], current })).toEqual(current);
  });

  it("a szélre húzódik, ha sehol nincs szabad teljes méretű hely", () => {
    // Teljes szélességű mezők minden magasságban: csak a lapszéli sáv marad szabad.
    const wall: ScreenRect = { left: 0, right: 350, top: 0, bottom: 667 };
    const placement = chooseFloatingPlacement({ ...base, obstacles: [wall] });
    expect(placement.docked).toBe(true);
  });

  it("szélre húzva sem tűnik el, ha semmi nem szabad", () => {
    const full: ScreenRect = { left: 0, right: 375, top: 0, bottom: 667 };
    const placement = chooseFloatingPlacement({ ...base, obstacles: [full] });
    expect(placement.docked).toBe(true);
    expect(placement.side).toBeDefined();
    expect(Number.isFinite(placement.bottom)).toBe(true);
  });
});

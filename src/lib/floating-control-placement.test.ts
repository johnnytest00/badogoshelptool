import { describe, expect, it } from "vitest";
import { rectanglesOverlap } from "./floating-control-placement";

describe("rectanglesOverlap", () => {
  it("detects actionable content under a fixed control without treating touching edges as overlap", () => {
    expect(rectanglesOverlap({ left: 10, right: 60, top: 10, bottom: 60 }, { left: 50, right: 100, top: 50, bottom: 100 })).toBe(true);
    expect(rectanglesOverlap({ left: 10, right: 60, top: 10, bottom: 60 }, { left: 60, right: 100, top: 10, bottom: 60 })).toBe(false);
  });
});

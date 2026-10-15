import { describe, expect, it } from "vitest";
import { calculateGableRoof } from "./gable-roof";
import { gableSegments, selectedGableLength } from "./gable-segments";

describe("gable segments", () => {
  it("exposes individual edges and planes from the validated roof geometry", () => {
    const roof = calculateGableRoof({ inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 });
    const segments = gableSegments(roof);
    expect(roof.lengths.slopeLengthIncludingEaveMm).toBe(5_000);
    expect(roof.areas.combinedRoofM2).toBe(100);
    expect(segments.filter((segment) => segment.kind === "plane").map((segment) => segment.areaMm2)).toEqual([50_000_000, 50_000_000]);
    expect(segments.filter((segment) => segment.kind === "eave").map((segment) => segment.lengthMm)).toEqual([10_000, 10_000]);
    expect(selectedGableLength(segments, ["left-eave", "left-eave", "right-eave"], "eave")).toBe(20_000);
    expect(selectedGableLength(segments, ["ridge", "left-front-gable"], "ridge")).toBe(10_000);
    expect(segments.filter((segment) => segment.kind === "rake").map((segment) => segment.lengthMm)).toEqual([5_000, 5_000, 5_000, 5_000]);
  });
});

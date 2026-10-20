import { describe, expect, it } from "vitest";
import { calculateRoofGeometry } from "./roof-geometry";
import { calculateRoofMaterialTakeoff } from "./roof-material-takeoff";

const m = 1_000;
const timber = {
  rafter: { maxSpacingMm: 1_000, startInsetMm: 0, endInsetMm: 0, sectionWidthMm: 80, sectionHeightMm: 200 },
  batten: { maxSpacingMm: 500, startInsetMm: 0, endInsetMm: 0, sectionWidthMm: 50, sectionHeightMm: 30 },
} as const;
const underlay = { rollWidthMm: 2_000, rollLengthMm: 10_000, sideOverlapMm: 100, endOverlapMm: 100, installationDirection: "eave-to-ridge" } as const;
const covering = { form: "sheet", nominalWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, physicalLengthMm: 4_000, usableCoveringLengthMm: 3_900, manufacturerConstraintReference: "DEMO termékadat" } as const;

describe("roof material takeoff", () => {
  it("runs geometry, timber, underlay and covering as one gable workflow", () => {
    const geometry = calculateRoofGeometry({ type: "gable", geometry: { inputMode: "angle", buildingLengthMm: 10 * m, buildingWidthMm: 6 * m, roofPitchDegrees: 45, eaveOverhangMm: 500, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } });
    const result = calculateRoofMaterialTakeoff(geometry, { timber, underlay, covering });
    expect(result.status).toBe("VALID");
    expect(result.geometry.totalAreaMm2).toBeCloseTo(70 * m * Math.SQRT2 * m, 0);
    expect(result.timber.status).toBe("available");
    expect(result.timber.status === "available" && result.timber.rafters?.count).toBe(22);
    expect(result.timber.status === "available" && result.timber.battens?.count).toBe(21);
    expect(result.underlay.status).toBe("VALID");
    expect(result.covering.status).toBe("VALID");
    expect(result.covering.totalSheetCount).toBeGreaterThan(0);
  });

  it("keeps missing material parameters explicit instead of inventing quantities", () => {
    const geometry = calculateRoofGeometry({ type: "shed", lengthMm: 10 * m, widthMm: 6 * m, pitchDegrees: 30, eaveOverhangMm: 400 });
    const result = calculateRoofMaterialTakeoff(geometry);
    expect(result.status).toBe("INCOMPLETE");
    expect(result.timber.status).toBe("unavailable");
    expect(result.underlay.status).toBe("INCOMPLETE");
    expect(result.covering.status).toBe("INCOMPLETE");
    expect(result.covering.totalSheetCount).toBeNull();
    expect(result.reasons.some((reason) => reason.includes("hiányoznak"))).toBe(true);
  });
});

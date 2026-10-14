import { describe, expect, it } from "vitest";
import { calculateGableRoof, type GableRoofInput } from "./gable-roof";
import { calculateGableTrapezoidalCovering, type GableTrapezoidalCoveringInput } from "./gable-trapezoidal-covering";

const roof = calculateGableRoof({ inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } satisfies GableRoofInput);
const product = (overrides: Partial<GableTrapezoidalCoveringInput> = {}): GableTrapezoidalCoveringInput => ({ nominalSheetWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, selectedSheetLengthMm: 3_000, minimumSheetLengthMm: null, maximumSheetLengthMm: null, endAllowanceMm: null, longitudinalOverlapMm: null, lapCompatibilityConfirmed: false, maximumSheetCount: 100_000, ...overrides });

describe("gable trapezoidal sheet covering", () => {
  it("counts exact width division on both symmetric planes and uses full-length sheets", () => {
    const result = calculateGableTrapezoidalCovering(roof, product({ effectiveCoveringWidthMm: 1_000, selectedSheetLengthMm: 5_000 }));
    expect(result.status).toBe("VALID");
    expect(result.columnsPerPlane).toBe(10);
    expect(result.rowsPerPlane).toBe(1);
    expect(result.totalSheetCount).toBe(20);
    expect(result.purchasedNominalAreaMm2).toBe(110_000_000);
    expect(result.installedCoveredAreaMm2).toBe(100_000_000);
  });

  it("rounds a partial final width column upward", () => {
    const otherRoof = calculateGableRoof({ inputMode: "height", buildingLengthMm: 10_001, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 });
    const result = calculateGableTrapezoidalCovering(otherRoof, product({ selectedSheetLengthMm: 6_000 }));
    expect(result.columnsPerPlane).toBe(11);
    expect(result.rowsPerPlane).toBe(1);
    expect(result.totalSheetCount).toBe(22);
    expect(result.totalRoofAreaMm2).toBe(otherRoof.areas.combinedRoofMm2);
  });

  it("supports explicit compatible longitudinal lap and rejects missing or invalid lap data", () => {
    const supported = calculateGableTrapezoidalCovering(roof, product({ longitudinalOverlapMm: 200, lapCompatibilityConfirmed: true }));
    expect(supported.rowsPerPlane).toBe(2);
    expect(supported.totalSheetCount).toBe(40);
    const missing = calculateGableTrapezoidalCovering(roof, product());
    expect(missing.status).toBe("UNSUPPORTED");
    const invalid = calculateGableTrapezoidalCovering(roof, product({ longitudinalOverlapMm: 5_000, lapCompatibilityConfirmed: true }));
    expect(invalid.status).toBe("INVALID");
    const zeroLap = calculateGableTrapezoidalCovering(roof, product({ longitudinalOverlapMm: 0, lapCompatibilityConfirmed: true }));
    expect(zeroLap.status).toBe("INVALID");
  });

  it("reports missing product values as incomplete without fabricating counts", () => {
    const result = calculateGableTrapezoidalCovering(roof, product({ nominalSheetWidthMm: null, effectiveCoveringWidthMm: null, selectedSheetLengthMm: null }));
    expect(result.status).toBe("INCOMPLETE");
    expect(result.totalSheetCount).toBeNull();
    expect(result.purchasedNominalAreaMm2).toBeNull();
  });

  it("rejects excessive calculated column counts", () => {
    const result = calculateGableTrapezoidalCovering(roof, product({ effectiveCoveringWidthMm: 1 }));
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.totalSheetCount).toBeNull();
  });

  it("applies only explicit allowance and supplied product length limits", () => {
    const restricted = calculateGableTrapezoidalCovering(roof, product({ selectedSheetLengthMm: 5_000, maximumSheetLengthMm: 4_000 }));
    expect(restricted.status).toBe("UNSUPPORTED");
    const allowance = calculateGableTrapezoidalCovering(roof, product({ selectedSheetLengthMm: 5_000, endAllowanceMm: 100, longitudinalOverlapMm: 200, lapCompatibilityConfirmed: true }));
    expect(allowance.requiredCoveringLengthMm).toBe(5_100);
    expect(allowance.rowsPerPlane).toBe(2);
    const overflow = calculateGableTrapezoidalCovering(roof, product({ endAllowanceMm: Number.MAX_VALUE }));
    expect(overflow.status).toBe("UNSUPPORTED");
  });
});

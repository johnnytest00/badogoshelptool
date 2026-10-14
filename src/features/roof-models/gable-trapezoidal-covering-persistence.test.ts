import { describe, expect, it } from "vitest";
import { calculateCoveringSnapshot, gableTrapezoidalCoveringSaveSchema } from "./gable-trapezoidal-covering-persistence";

const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const coveringInput = { nominalSheetWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, selectedSheetLengthMm: 5_000, minimumSheetLengthMm: null, maximumSheetLengthMm: null, endAllowanceMm: null, longitudinalOverlapMm: null, lapCompatibilityConfirmed: false, maximumSheetCount: 100_000 };

describe("gable covering persistence contract", () => {
  it("recomputes geometry and covering from normalized standalone inputs", () => {
    const result = calculateCoveringSnapshot(geometryInput, coveringInput);
    expect(result?.geometry.dimensions.overallRoofLengthMm).toBe(10_000);
    expect(result?.output.totalSheetCount).toBe(20);
    expect(result?.output.status).toBe("VALID");
  });

  it("rejects invalid geometry and unsupported layout snapshots", () => {
    expect(calculateCoveringSnapshot({ ...geometryInput, buildingLengthMm: 0 }, coveringInput)).toBeNull();
    expect(calculateCoveringSnapshot(geometryInput, { ...coveringInput, selectedSheetLengthMm: 3_000 })).toBeNull();
  });

  it("requires explicit scope, stable operation identity, and exact source identity for project saves", () => {
    const valid = { organizationId: crypto.randomUUID(), calculationId: crypto.randomUUID(), operationId: crypto.randomUUID(), expectedRevisionNumber: 0, name: "Fedés", scope: { kind: "project", projectId: crypto.randomUUID(), roofModelId: crypto.randomUUID(), roofModelRevisionId: crypto.randomUUID() }, geometryInput, coveringInput };
    expect(gableTrapezoidalCoveringSaveSchema.safeParse(valid).success).toBe(true);
    expect(gableTrapezoidalCoveringSaveSchema.safeParse({ ...valid, scope: { kind: "project", projectId: valid.scope.projectId, roofModelId: valid.scope.roofModelId } }).success).toBe(false);
  });
});

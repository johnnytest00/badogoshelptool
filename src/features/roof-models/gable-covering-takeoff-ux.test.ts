import { describe, expect, it } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateGableTrapezoidalCovering } from "@/domain/calculations/gable-trapezoidal-covering";
import type { GableCoveringTakeoffOption } from "@/features/material-takeoffs/takeoff-data";
import type { SavedGableCovering, SavedGableCoveringRevision } from "./gable-trapezoidal-covering-data";
import { compatibleGableCoveringTakeoffOptions, sameOrNewGableCoveringTakeoffOperation, supportedTakeoffRevision } from "./gable-covering-takeoff-ux";

const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const coveringInput = { nominalSheetWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, selectedSheetLengthMm: 5_000, minimumSheetLengthMm: null, maximumSheetLengthMm: null, endAllowanceMm: null, longitudinalOverlapMm: null, lapCompatibilityConfirmed: false, maximumSheetCount: 100_000 };
const geometry = calculateGableRoof(geometryInput);
const covering = calculateGableTrapezoidalCovering(geometry, coveringInput);
const revision: SavedGableCoveringRevision = { revisionId: "revision-v1", revisionNumber: 1, scope: "project", input: { scope: "project", source: { mode: "project", projectId: "project", roofModelId: "roof", roofModelRevisionId: "roof-v3", geometryCalculationId: "geometry", geometryCalculationRevisionId: "geometry-v3", geometryInput }, coveringInput }, output: { geometry, covering }, provenance: { geometry: "saved_verified_roof_model_revision", coveringParameters: "user_provided", calculation: "server_recomputed", professionalApproval: false }, validationStatus: "estimated", createdAt: "2026-10-15T10:00:00.000Z" };
const saved: SavedGableCovering = { calculationId: "covering-calculation", organizationId: "org", projectId: "project", roofModelId: "roof", displayName: "DEMO fedés", currentRevisionId: "revision-v2", currentRevisionNumber: 2, revisions: [revision] };
const option = (overrides: Partial<GableCoveringTakeoffOption> = {}): GableCoveringTakeoffOption => ({ id: "variant", productId: "product", productName: "DEMO lemez", productCode: null, productCategory: "roof_covering", variantName: "1100×1000×5000", purchasingUnit: "piece", nominalWidthMm: 1_100, effectiveWidthMm: 1_000, lengthMm: 5_000, provenance: "demo", sourceName: "DEMO", latestPrice: null, ...overrides });

describe("gable covering takeoff UX contract", () => {
  it("uses the selected historical revision snapshot and displays the 20 piece ordering quantity", () => {
    const result = supportedTakeoffRevision(saved, revision, "project", "roof");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.view.covering.totalSheetCount).toBe(20);
    expect(result.view.coveringInput.selectedSheetLengthMm).toBe(5_000);
    expect(result.view.coveringInput.nominalSheetWidthMm).toBe(1_100);
    expect(result.view.coveringInput.effectiveCoveringWidthMm).toBe(1_000);
    expect(revision.revisionId).toBe("revision-v1");
  });

  it("offers only backend-compatible piece variants and allows missing dimensions as manual associations", () => {
    expect(compatibleGableCoveringTakeoffOptions([option(), option({ id: "missing", nominalWidthMm: null, effectiveWidthMm: null, lengthMm: null })], { nominalWidthMm: 1_100, effectiveWidthMm: 1_000, lengthMm: 5_000 }).map((item) => item.id)).toEqual(["variant", "missing"]);
    expect(compatibleGableCoveringTakeoffOptions([option({ id: "wrong-length", lengthMm: 4_000 }), option({ id: "area", purchasingUnit: "square_meter" })], { nominalWidthMm: 1_100, effectiveWidthMm: 1_000, lengthMm: 5_000 })).toEqual([]);
  });

  it("rejects a saved multi-row layout and a mismatched project source", () => {
    const multiRow = { ...revision, output: { geometry, covering: { ...covering, rowsPerPlane: 2, totalSheetCount: 40 } } };
    expect(supportedTakeoffRevision(saved, multiRow, "project", "roof")).toMatchObject({ ok: false, reason: expect.stringContaining("egy teljes hosszú") });
    expect(supportedTakeoffRevision(saved, revision, "other-project", "roof").ok).toBe(false);
  });

  it("reuses one operation ID for an unchanged retry and renews it for changed payload", () => {
    let count = 0;
    const createId = () => `secure-${++count}`;
    const first = sameOrNewGableCoveringTakeoffOperation(null, "V1:variant-a", createId);
    expect(sameOrNewGableCoveringTakeoffOperation(first, "V1:variant-a", createId)).toBe(first);
    expect(sameOrNewGableCoveringTakeoffOperation(first, "V1:variant-b", createId)).toEqual({ signature: "V1:variant-b", operationId: "secure-2" });
  });
});

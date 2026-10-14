import { describe, expect, it } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateGableTrapezoidalCovering } from "@/domain/calculations/gable-trapezoidal-covering";
import { deriveGableCoveringTakeoffQuantity } from "./gable-covering-transfer";

const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000,
  roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const coveringInput = { nominalSheetWidthMm: 1_100, effectiveCoveringWidthMm: 1_000,
  selectedSheetLengthMm: 5_000, minimumSheetLengthMm: null, maximumSheetLengthMm: null,
  endAllowanceMm: null, longitudinalOverlapMm: null, lapCompatibilityConfirmed: false, maximumSheetCount: 100_000 };
const geometry = calculateGableRoof(geometryInput);
const covering = calculateGableTrapezoidalCovering(geometry, coveringInput);
const source = { mode: "project" as const, projectId: "11111111-1111-4111-8111-111111111111",
  roofModelId: "22222222-2222-4222-8222-222222222222", roofModelRevisionId: "33333333-3333-4333-8333-333333333333",
  geometryCalculationId: "44444444-4444-4444-8444-444444444444", geometryCalculationRevisionId: "55555555-5555-4555-8555-555555555555", geometryInput };
const input = { scope: "project" as const, source, coveringInput };
const output = { geometry, covering };

describe("nyeregtető-fedés anyagkimutatás mennyisége", () => {
  it("a 10×6 m, 4 m emelkedésű referencia 20 teljes lemezt ad át db egységben", () => {
    const result = deriveGableCoveringTakeoffQuantity(input, output);
    expect(result).toMatchObject({ ok: true, quantity: 20, quantityUnit: "piece" });
    expect(result.coveringOutput).toMatchObject({ columnsPerPlane: 10, rowsPerPlane: 1, totalRoofAreaMm2: 100_000_000, purchasedNominalAreaMm2: 110_000_000 });
    expect(result.coveringInput?.selectedSheetLengthMm).toBe(5_000);
    expect(result.quantity).not.toBe(110);
  });

  it("a two-row toldott layouthoz darabjegyzék nélkül nem következtet darabokra", () => {
    const multiRowInput = { ...coveringInput, selectedSheetLengthMm: 3_000, longitudinalOverlapMm: 100,
      lapCompatibilityConfirmed: true };
    const multiRowOutput = { geometry, covering: calculateGableTrapezoidalCovering(geometry, multiRowInput) };
    expect(multiRowOutput.covering.rowsPerPlane).toBeGreaterThan(1);
    expect(deriveGableCoveringTakeoffQuantity({ ...input, coveringInput: multiRowInput }, multiRowOutput)).toMatchObject({
      ok: false, code: "UNSUPPORTED_LAYOUT",
    });
  });

  it("a forged saved output vagy nem nulla overlap nem készít átadható mennyiséget", () => {
    expect(deriveGableCoveringTakeoffQuantity(input, { ...output, covering: { ...covering, totalSheetCount: 110 } })).toMatchObject({ ok: false, code: "INVALID_SOURCE" });
    const overlapInput = { ...coveringInput, longitudinalOverlapMm: 100 };
    const overlapOutput = { geometry, covering: calculateGableTrapezoidalCovering(geometry, overlapInput) };
    expect(deriveGableCoveringTakeoffQuantity({ ...input, coveringInput: overlapInput }, overlapOutput)).toMatchObject({ ok: false, code: "UNSUPPORTED_LAYOUT" });
  });
});

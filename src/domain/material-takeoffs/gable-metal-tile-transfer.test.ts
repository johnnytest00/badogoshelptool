import { describe, expect, it } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateGableMetalTileCovering } from "@/domain/calculations/gable-metal-tile-covering";
import { deriveGableMetalTileTakeoff } from "./gable-metal-tile-transfer";

const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000,
  roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const source = { mode: "project" as const, projectId: "11111111-1111-4111-8111-111111111111",
  roofModelId: "22222222-2222-4222-8222-222222222222", roofModelRevisionId: "33333333-3333-4333-8333-333333333333",
  geometryCalculationId: "44444444-4444-4444-8444-444444444444", geometryCalculationRevisionId: "55555555-5555-4555-8555-555555555555", geometryInput };
const productInput = { nominalSheetWidthMm: 1100, effectiveCoveringWidthMm: 1000, physicalSheetLengthMm: 5100,
  effectiveCoveringLengthMm: 5100, minimumPhysicalLengthMm: null, maximumPhysicalLengthMm: null,
  eaveEndAllowanceMm: 0, ridgeEndAllowanceMm: 100, longitudinalOverlapMm: 0, lengthCompatibilityConfirmed: true,
  lengthDataSource: "DEMO: user reference", isModular: true, moduleBaseLengthMm: 300, modulePitchMm: 300, moduleCount: 16 };
const input = { calculatorType: "roof.gable.metal-tile-covering", scope: "project", source, productInput };
const geometry = calculateGableRoof(geometryInput);
const output = { geometry, covering: calculateGableMetalTileCovering(geometry, productInput) };

describe("cserepeslemez darabjegyzék forrásvalidálás", () => {
  it("a szerveroldali újraszámolt darabszámot és fizikai/fedési/modul snapshotot adja", () => {
    expect(deriveGableMetalTileTakeoff(input, output)).toMatchObject({ ok: true, quantity: 20,
      productInput: { physicalSheetLengthMm: 5100, effectiveCoveringLengthMm: 5100, isModular: true, moduleCount: 16 } });
  });

  it("elutasítja a módosított forráseredményt", () => {
    expect(deriveGableMetalTileTakeoff(input, { ...output, covering: { ...output.covering, totalSheetCount: 21 } }))
      .toMatchObject({ ok: false, code: "INVALID_SOURCE" });
  });

  it("elutasítja a hiányzó hosszprovenienciát és a moduláris adatot", () => {
    expect(deriveGableMetalTileTakeoff({ ...input, productInput: { ...productInput, lengthDataSource: null } }, output))
      .toMatchObject({ ok: false, code: "INVALID_SOURCE" });
    const invalid = { ...productInput, moduleCount: 15 };
    expect(deriveGableMetalTileTakeoff({ ...input, productInput: invalid }, output))
      .toMatchObject({ ok: false, code: "INVALID_SOURCE" });
  });
});

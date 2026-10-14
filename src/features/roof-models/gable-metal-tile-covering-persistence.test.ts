import { describe, expect, it } from "vitest";
import { calculateMetalTileSnapshot, gableMetalTileCoveringSaveSchema } from "./gable-metal-tile-covering-persistence";

const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const productInput = { nominalSheetWidthMm: 1_200, effectiveCoveringWidthMm: 1_000, physicalSheetLengthMm: 5_100, effectiveCoveringLengthMm: 5_000,
  minimumPhysicalLengthMm: null, maximumPhysicalLengthMm: null, eaveEndAllowanceMm: 0, ridgeEndAllowanceMm: 0, longitudinalOverlapMm: 0,
  lengthCompatibilityConfirmed: true, lengthDataSource: "DEMO kézi termékadat", isModular: false,
  moduleBaseLengthMm: null, modulePitchMm: null, moduleCount: null };

describe("cserepeslemez mentési szerződés", () => {
  it("server snapshot újraszámolja a roof.gable geometriát és VALID fedési eredményt", () => {
    const result = calculateMetalTileSnapshot(geometryInput, productInput);
    expect(result).toMatchObject({ geometry: { dimensions: { overallRoofLengthMm: 10_000 }, areas: { combinedRoofMm2: 100_000_000 } }, output: { status: "VALID", totalSheetCount: 20 } });
  });

  it("nem ment hibás modulhosszt, hiányos technikai adatot vagy nem támogatott toldást", () => {
    expect(calculateMetalTileSnapshot(geometryInput, { ...productInput, isModular: true, moduleBaseLengthMm: 1_000, modulePitchMm: 1_000, moduleCount: 3 })).toBeNull();
    expect(calculateMetalTileSnapshot(geometryInput, { ...productInput, lengthCompatibilityConfirmed: false })).toBeNull();
    expect(calculateMetalTileSnapshot(geometryInput, { ...productInput, longitudinalOverlapMm: 100 })).toBeNull();
  });

  it("nem követel katalógus/metaadatot, önálló mentéshez engedi elhagyni a megjelenítési nevet", () => {
    const valid = gableMetalTileCoveringSaveSchema.safeParse({ organizationId: crypto.randomUUID(), calculationId: crypto.randomUUID(), operationId: crypto.randomUUID(), expectedRevisionNumber: 0, scope: { kind: "standalone" }, geometryInput, productInput });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.name).toBeUndefined();
  });

  it("projekt módhoz explicit projekt/tető/revízió azonosság kell", () => {
    const base = { organizationId: crypto.randomUUID(), calculationId: crypto.randomUUID(), operationId: crypto.randomUUID(), expectedRevisionNumber: 0, scope: { kind: "project", projectId: crypto.randomUUID(), roofModelId: crypto.randomUUID() }, productInput };
    expect(gableMetalTileCoveringSaveSchema.safeParse(base).success).toBe(false);
    expect(gableMetalTileCoveringSaveSchema.safeParse({ ...base, scope: { ...base.scope, roofModelRevisionId: crypto.randomUUID() } }).success).toBe(true);
  });
});

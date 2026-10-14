import { describe, expect, it } from "vitest";
import { calculateGableRoof, gableRoofCalculator } from "@/domain/calculations/gable-roof";
import { calculateGableMetalTileCovering, gableMetalTileCoveringCalculator } from "@/domain/calculations/gable-metal-tile-covering";
import { createProductionCalculatorRegistry } from "@/domain/calculations/registry";

const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const geometry = calculateGableRoof(geometryInput);
const product = {
  nominalSheetWidthMm: 1_200, effectiveCoveringWidthMm: 1_000, physicalSheetLengthMm: 5_100, effectiveCoveringLengthMm: 5_000,
  minimumPhysicalLengthMm: 1_000, maximumPhysicalLengthMm: 8_000, eaveEndAllowanceMm: 0, ridgeEndAllowanceMm: 0, longitudinalOverlapMm: 0,
  lengthCompatibilityConfirmed: true, lengthDataSource: "DEMO-adatlap az önálló tesztfixture-ben", isModular: false,
  moduleBaseLengthMm: null, modulePitchMm: null, moduleCount: null,
};

describe("gable metal tile full-length coverage", () => {
  it("uses roof area and exact width division with physical sheet area", () => {
    const result = calculateGableMetalTileCovering(geometry, product);
    expect(geometry.areas.combinedRoofM2).toBe(100);
    expect(result).toMatchObject({ status: "VALID", roofLongitudinalLengthMm: 10_000, slopeLengthMm: 5_000, totalRoofAreaMm2: 100_000_000, columnsPerPlane: 10, sheetsPerPlane: 10, rowsPerPlane: 1, totalSheetCount: 20, physicalSheetLengthMm: 5_100, effectiveCoveringLengthMm: 5_000, nominalSheetAreaMm2: 6_120_000, totalNominalSheetAreaMm2: 122_400_000 });
    expect(result.requiredCoveringLengthMm).toBe(5_000);
  });

  it("adds a partial last width column independently on each plane", () => {
    const longer = calculateGableRoof({ ...geometryInput, buildingLengthMm: 10_001 });
    expect(calculateGableMetalTileCovering(longer, product)).toMatchObject({ status: "VALID", columnsPerPlane: 11, sheetsPerPlane: 11, totalSheetCount: 22 });
  });

  it("adds explicit end allowances once to the required slope length", () => {
    const result = calculateGableMetalTileCovering(geometry, { ...product, physicalSheetLengthMm: 5_300, effectiveCoveringLengthMm: 5_200, eaveEndAllowanceMm: 100, ridgeEndAllowanceMm: 100 });
    expect(result).toMatchObject({ status: "VALID", requiredCoveringLengthMm: 5_200, physicalSheetLengthMm: 5_300, effectiveCoveringLengthMm: 5_200, totalSheetCount: 20 });
  });

  it("accepts explicit modular length contract and exposes only input-derived divisions", () => {
    const result = calculateGableMetalTileCovering(geometry, { ...product, isModular: true, moduleBaseLengthMm: 1_000, modulePitchMm: 1_000, moduleCount: 4 });
    expect(result).toMatchObject({ status: "VALID", moduleDivisionPositionsMm: [1_000, 2_000, 3_000, 4_000] });
  });

  it("classifies missing and mismatched length compatibility without quantity", () => {
    expect(calculateGableMetalTileCovering(geometry, { ...product, lengthCompatibilityConfirmed: false }).status).toBe("INCOMPLETE");
    expect(calculateGableMetalTileCovering(geometry, { ...product, isModular: true, moduleBaseLengthMm: null, modulePitchMm: null, moduleCount: null }).status).toBe("INCOMPLETE");
    expect(calculateGableMetalTileCovering(geometry, { ...product, lengthDataSource: null }).status).toBe("INCOMPLETE");
    expect(calculateGableMetalTileCovering(geometry, { ...product, isModular: true, moduleBaseLengthMm: 1_000, modulePitchMm: 1_000, moduleCount: 3 }).status).toBe("INVALID");
    const mismatch = calculateGableMetalTileCovering(geometry, { ...product, isModular: true, moduleBaseLengthMm: 1_000, modulePitchMm: 1_000, moduleCount: 3 });
    expect(mismatch.totalSheetCount).toBeNull();
  });

  it("requires explicit allowances and overlap, and rejects unsupported joints and insufficient lengths", () => {
    expect(calculateGableMetalTileCovering(geometry, { ...product, eaveEndAllowanceMm: null }).status).toBe("INCOMPLETE");
    expect(calculateGableMetalTileCovering(geometry, { ...product, longitudinalOverlapMm: null }).status).toBe("INCOMPLETE");
    expect(calculateGableMetalTileCovering(geometry, { ...product, longitudinalOverlapMm: 50 }).status).toBe("UNSUPPORTED");
    expect(calculateGableMetalTileCovering(geometry, { ...product, longitudinalOverlapMm: -1 }).status).toBe("INVALID");
    expect(calculateGableMetalTileCovering(geometry, { ...product, eaveEndAllowanceMm: -1 }).status).toBe("INVALID");
    expect(calculateGableMetalTileCovering(geometry, { ...product, effectiveCoveringLengthMm: 4_999 }).status).toBe("UNSUPPORTED");
    expect(calculateGableMetalTileCovering(geometry, { ...product, physicalSheetLengthMm: 9_000 }).status).toBe("UNSUPPORTED");
    expect(calculateGableMetalTileCovering(geometry, { ...product, physicalSheetLengthMm: 4_900 }).status).toBe("INVALID");
  });

  it("classifies invalid geometry, bounds, and excessive columns safely", () => {
    const onePlane = { ...geometry, planes: [geometry.planes[0]] } as unknown as typeof geometry;
    expect(calculateGableMetalTileCovering(onePlane, product).status).toBe("UNSUPPORTED");
    const invalidWidth = calculateGableMetalTileCovering(geometry, { ...product, nominalSheetWidthMm: 0 });
    expect(invalidWidth.status).toBe("INVALID");
    expect(invalidWidth.reasons[0]).toContain("Névleges lemezszélesség");
    expect(calculateGableMetalTileCovering(geometry, { ...product, effectiveCoveringWidthMm: 0.001 }).status).toBe("UNSUPPORTED");
    expect(calculateGableMetalTileCovering(geometry, { ...product, eaveEndAllowanceMm: 1_000_000, ridgeEndAllowanceMm: 1_000_000 }).status).toBe("UNSUPPORTED");
  });

  it("is registered with its real geometry input contract", () => {
    const result = createProductionCalculatorRegistry().execute(gableMetalTileCoveringCalculator.id, { roof: geometryInput, product });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toMatchObject({ status: "VALID", totalSheetCount: 20 });
    expect(gableRoofCalculator.id).toBe("roof.gable");
  });
});

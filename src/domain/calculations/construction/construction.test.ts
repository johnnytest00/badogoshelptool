import { describe, expect, it } from "vitest";
import { calculateConcreteMix, calculateConcreteRing, calculateCylindricalPiles, calculateFoundationSlab, calculatePavingMaterials, calculateRectangularBlindArea, calculateReinforcementBars, calculateReinforcementMesh, calculateRightAngleDiagonal, calculateStripFoundation, concreteRingInputSchema, reinforcementMeshInputSchema } from "./concrete";
import { calculateRafterGeometry, calculateTriangularTrussGeometry, convertGableGeometryFromRafterCut } from "./roofs";
import { calculateBeveledRiserGeometry, calculateConcreteStairGeometry, calculateLandingStairGeometry, calculateSpiralStairGeometry, calculateStraightStairGeometry, spiralStairGeometryInputSchema } from "./stairs";
import { calculateGableRoof } from "../gable-roof";
import { calculateGableMetalTileCovering } from "../gable-metal-tile-covering";

const m = 1_000;

describe("independent construction calculations", () => {
  it("solves diagonal and rafter right-triangle geometry", () => {
    expect(calculateRightAngleDiagonal({ lengthMm: 4 * m, widthMm: 3 * m }).diagonalMm).toBe(5 * m);
    const rafter = calculateRafterGeometry({ horizontalHalfSpanMm: 3 * m, riseMm: 4 * m, eaveProjectionMm: 0 });
    expect(rafter.slopeLengthMm).toBe(5 * m);
    expect(rafter.pitchDegrees).toBeCloseTo(53.13010235, 6);
    expect(rafter.pitchDegrees + rafter.plumbCutToBoardAxisDegrees).toBeCloseTo(90, 10);
  });

  it("keeps the eave on the rafter slope instead of flattening the pitch", () => {
    // The eave extends the same inclined line, so it may not be folded into one hypotenuse
    // with the unchanged rise: that would understate the rafter.
    const rafter = calculateRafterGeometry({ horizontalHalfSpanMm: 3 * m, riseMm: 2 * m, eaveProjectionMm: 500 });
    const pitchRadians = Math.atan2(2 * m, 3 * m);
    expect(rafter.bodyLengthMm).toBeCloseTo(Math.hypot(3 * m, 2 * m), 9);
    expect(rafter.eaveLengthMm).toBeCloseTo(500 / Math.cos(pitchRadians), 9);
    expect(rafter.slopeLengthMm).toBeCloseTo(3_500 / Math.cos(pitchRadians), 9);
    expect(rafter.slopeLengthMm).toBeGreaterThan(Math.hypot(3_500, 2 * m));
  });

  it("lowers the rafter's upper edge by the seat cut height", () => {
    const rafter = calculateRafterGeometry({ horizontalHalfSpanMm: 3 * m, riseMm: 2 * m, eaveProjectionMm: 500, seatCutHeightMm: 200 });
    expect(rafter.bodyLengthMm).toBeCloseTo(Math.hypot(3 * m, 1_800), 9);
    expect(rafter.pitchDegrees).toBeCloseTo(Math.atan2(1_800, 3 * m) * 180 / Math.PI, 9);
    expect(() => calculateRafterGeometry({ horizontalHalfSpanMm: 3 * m, riseMm: 2 * m, eaveProjectionMm: 0, seatCutHeightMm: 2 * m })).toThrow();
  });

  it("converts gable width/pitch from a symmetric rafter-cut source (M10 Fázis 1)", () => {
    const first = convertGableGeometryFromRafterCut({ horizontalHalfSpanMm: "4000", riseMm: "2800", seatCutHeightMm: "100" });
    expect(first).toEqual({ ok: true, widthMm: 8_000, pitchDegrees: expect.closeTo(34.019, 3) });
    expect(first.ok && 4000 * Math.tan(first.pitchDegrees * Math.PI / 180)).toBeCloseTo(2_700, 6);

    const second = convertGableGeometryFromRafterCut({ horizontalHalfSpanMm: "3000", riseMm: "1500", seatCutHeightMm: "0" });
    expect(second).toEqual({ ok: true, widthMm: 6_000, pitchDegrees: expect.closeTo(26.565, 3) });

    const third = convertGableGeometryFromRafterCut({ horizontalHalfSpanMm: "5000", riseMm: "3200", seatCutHeightMm: "200" });
    expect(third).toEqual({ ok: true, widthMm: 10_000, pitchDegrees: expect.closeTo(30.964, 3) });
  });

  it("rejects missing, invalid or out-of-range gable conversion inputs instead of estimating (M10 Fázis 1)", () => {
    expect(convertGableGeometryFromRafterCut({ horizontalHalfSpanMm: "4000", riseMm: "2800" })).toEqual({ ok: false, reason: "MISSING_HAP" });
    expect(convertGableGeometryFromRafterCut({ horizontalHalfSpanMm: "4000", riseMm: "2800", seatCutHeightMm: "2800" })).toEqual({ ok: false, reason: "INVALID_HAP" });
    expect(convertGableGeometryFromRafterCut({ horizontalHalfSpanMm: "4000", riseMm: "2800", seatCutHeightMm: "-10" })).toEqual({ ok: false, reason: "INVALID_HAP" });
    expect(convertGableGeometryFromRafterCut({ horizontalHalfSpanMm: "0", riseMm: "2800", seatCutHeightMm: "0" })).toEqual({ ok: false, reason: "INVALID_SOURCE_GEOMETRY" });
    expect(convertGableGeometryFromRafterCut({ horizontalHalfSpanMm: "-100", riseMm: "2800", seatCutHeightMm: "0" })).toEqual({ ok: false, reason: "INVALID_SOURCE_GEOMETRY" });
    expect(convertGableGeometryFromRafterCut({ horizontalHalfSpanMm: "abc", riseMm: "2800", seatCutHeightMm: "0" })).toEqual({ ok: false, reason: "INVALID_SOURCE_GEOMETRY" });
    expect(convertGableGeometryFromRafterCut({ horizontalHalfSpanMm: "60000", riseMm: "2800", seatCutHeightMm: "0" })).toEqual({ ok: false, reason: "TARGET_RANGE" });
  });

  it("calculates triangular truss envelope lengths", () => {
    const truss = calculateTriangularTrussGeometry({ spanMm: 8 * m, riseMm: 3 * m, panelCountPerHalf: 4 });
    expect(truss.halfRafterMm).toBeCloseTo(5 * m, 8);
    expect(truss.nodes).toHaveLength(5);
    expect(truss.nodes.at(-1)).toEqual({ xMm: 4 * m, yMm: 3 * m });
  });

  it("keeps straight stair risers uniform and computes straight and spiral paths", () => {
    const straight = calculateStraightStairGeometry({ totalRiseMm: 2_800, availableRunMm: 4_200, riserCount: 16 });
    expect(straight.riserHeightMm).toBe(175);
    expect(straight.treadCount).toBe(15);
    expect(straight.goingMm).toBe(280);
    expect(straight.stepRuleMm).toBe(630);
    const spiral = calculateSpiralStairGeometry({ totalRiseMm: 3_000, outerDiameterMm: 2_000, innerDiameterMm: 400, turnDegrees: 360, riserCount: 18 });
    expect(spiral.walkingRadiusMm).toBe(600);
    expect(spiral.walkingLineLengthMm).toBeCloseTo(1_200 * Math.PI, 8);
    expect(spiral.riserHeightMm).toBeCloseTo(3000 / 18, 10);
    expect(spiral.treadCount).toBe(17);
  });

  it("calculates a beveled riser profile without joinery assumptions", () => {
    const result = calculateBeveledRiserGeometry({ goingMm: 280, riserHeightMm: 175, nosingProjectionMm: 30 });
    expect(result.diagonalMm).toBeCloseTo(Math.hypot(310, 175), 8);
    expect(result.bevelAngleDegrees + result.slopeDegrees).toBeCloseTo(90, 10);
    const basic = calculateBeveledRiserGeometry({ goingMm: 280, riserHeightMm: 175 });
    expect(basic.horizontalMm).toBe(280);
    expect(basic.diagonalMm).toBeCloseTo(Math.hypot(280, 175), 8);
  });

  it("calculates foundation volumes and exposed geometric formwork", () => {
    expect(calculateStripFoundation({ totalCenterlineLengthMm: 30 * m, widthMm: 400, depthMm: 800 })).toEqual({ nominalPlanAreaM2: 12, volumeM3: 9.6, twoSideFormworkM2: 48 });
    const slab = calculateFoundationSlab({ lengthMm: 10 * m, widthMm: 8 * m, thicknessMm: 200 });
    expect(slab.volumeM3).toBe(16);
    expect(slab.edgeFormworkM2).toBe(7.2);
    expect(slab.planAreaM2).toBe(80);
    expect(slab.perimeterM).toBe(36);
    const piles = calculateCylindricalPiles({ count: 12, diameterMm: 400, lengthMm: 2 * m });
    expect(piles.onePileM3).toBeCloseTo(Math.PI * 0.2 ** 2 * 2, 10);
    expect(piles.totalVolumeM3).toBeCloseTo(12 * Math.PI * 0.2 ** 2 * 2, 10);
    expect(piles.onePileLateralAreaM2).toBeCloseTo(Math.PI * 0.4 * 2, 10);
    expect(piles.totalLateralAreaM2).toBeCloseTo(12 * Math.PI * 0.4 * 2, 10);
    expect(piles.onePilePlanAreaM2).toBeCloseTo(Math.PI * 0.2 ** 2, 10);
    expect(piles.totalPlanAreaM2).toBeCloseTo(12 * Math.PI * 0.2 ** 2, 10);
  });

  it("calculates ring, paving and rectangular apron quantities", () => {
    const ring = calculateConcreteRing({ outerDiameterMm: 1_500, wallThicknessMm: 100, heightMm: 1_000 });
    expect(ring.innerDiameterMm).toBe(1_300);
    expect(ring.concreteVolumeM3).toBeCloseTo(Math.PI * (0.75 ** 2 - 0.65 ** 2), 10);
    expect(ring.internalVolumeM3).toBeCloseTo(Math.PI * 0.65 ** 2, 10);
    expect(ring.outsideLateralAreaM2).toBeCloseTo(Math.PI * 1.5, 10);
    expect(ring.insideLateralAreaM2).toBeCloseTo(Math.PI * 1.3, 10);
    expect(ring.annularEndAreaM2).toBeCloseTo(ring.concreteVolumeM3, 10);
    expect(ring.totalGeometricSurfaceAreaM2).toBeCloseTo(Math.PI * 1.5 + Math.PI * 1.3 + 2 * Math.PI * (0.75 ** 2 - 0.65 ** 2), 10);
    const paving = calculatePavingMaterials({ lengthMm: 10 * m, widthMm: 1_200, tileLengthMm: 200, tileWidthMm: 100, baseLayerThicknessMm: 150 });
    expect(paving.areaM2).toBe(12);
    expect(paving.tileAreaM2).toBeCloseTo(0.02, 10);
    expect(paving.tilesByArea).toBe(600);
    expect(paving.perimeterM).toBe(22.4);
    expect(paving.baseLayerVolumeM3).toBeCloseTo(1.8, 10);
    const apron = calculateRectangularBlindArea({ buildingLengthMm: 10 * m, buildingWidthMm: 8 * m, apronWidthMm: 1 * m, concreteThicknessMm: 100, gravelThicknessMm: 150 });
    expect(apron.apronAreaM2).toBe(40);
    expect(apron.outerAreaM2).toBe(120);
    expect(apron.innerAreaM2).toBe(80);
    expect(apron.outerLengthMm).toBe(12 * m);
    expect(apron.outerWidthMm).toBe(10 * m);
    expect(apron.outerPerimeterM).toBe(44);
    expect(apron.buildingPerimeterM).toBe(36);
    expect(apron.concreteVolumeM3).toBe(4);
    expect(apron.gravelVolumeM3).toBe(6);
  });

  it("uses user-provided mix inputs and explicit steel density", () => {
    const mix = calculateConcreteMix({ concreteVolumeM3: 1.2, cementKgPerM3: 300, cementRatio: 1, sandRatio: 2, aggregateRatio: 4, bagWeightKg: 25 });
    expect(mix).toEqual({ cementKg: 360, sandKg: 720, aggregateKg: 1_440, totalSpecifiedDryMaterialKg: 2_520, bagCount: 15 });
    const bars = calculateReinforcementBars({ barDiameterMm: 12, cutLengthMm: 6 * m, pieceCount: 10, steelDensityKgPerM3: 7_850 });
    expect(bars.totalLengthM).toBe(60);
    expect(bars.crossSectionM2).toBeCloseTo(Math.PI * 0.006 ** 2, 12);
    expect(bars.oneBarVolumeM3).toBeCloseTo(Math.PI * 0.006 ** 2 * 6, 12);
    expect(bars.totalMassKg).toBeCloseTo(Math.PI * 0.006 ** 2 * 60 * 7_850, 10);
    expect(bars.totalSteelVolumeM3).toBeCloseTo(Math.PI * 0.006 ** 2 * 60, 10);
    expect(bars.unitMassKgPerM).toBeCloseTo(Math.PI * 0.006 ** 2 * 7_850, 10);
    const mesh = calculateReinforcementMesh({ lengthMm: 5 * m, widthMm: 4 * m, coverMm: 30, spacingMm: 200, barDiameterMm: 10, steelDensityKgPerM3: 7_850 });
    expect(mesh.lengthwiseBarCount).toBe(21);
    expect(mesh.widthwiseBarCount).toBe(26);
    expect(mesh.lengthwiseBarLengthM).toBeCloseTo(21 * 4.94, 10);
    expect(mesh.widthwiseBarLengthM).toBeCloseTo(26 * 3.94, 10);
    expect(mesh.intersectionCount).toBe(546);
    expect(mesh.totalSteelVolumeM3).toBeCloseTo((21 * 4.94 + 26 * 3.94) * Math.PI * 0.005 ** 2, 12);
    expect(mesh.totalMassKg).toBeCloseTo((21 * 4.94 + 26 * 3.94) * Math.PI * 0.005 ** 2 * 7_850, 10);
    expect(mesh.lengthwiseBarLengthM + mesh.widthwiseBarLengthM).toBe(mesh.totalBarLengthM);
    expect(mesh.actualSpacingAlongLengthMm).toBeCloseTo(4_940 / 25, 10);
    expect(mesh.actualSpacingAlongWidthMm).toBeCloseTo(3_940 / 20, 10);
  });

  it("keeps reinforcement geometry available without assuming steel density", () => {
    const bars = calculateReinforcementBars({ barDiameterMm: 12, cutLengthMm: 6 * m, pieceCount: 10 });
    const mesh = calculateReinforcementMesh({ lengthMm: 5 * m, widthMm: 4 * m, coverMm: 30, spacingMm: 200, barDiameterMm: 10 });
    expect(bars.totalLengthM).toBe(60);
    expect(bars.totalSteelVolumeM3).toBeGreaterThan(0);
    expect(bars.totalMassKg).toBeNull();
    expect(bars.unitMassKgPerM).toBeNull();
    expect(mesh.totalBarLengthM).toBeGreaterThan(0);
    expect(mesh.totalMassKg).toBeNull();
  });

  it("checks the reported stair dimensions against independent arithmetic fixtures", () => {
    const straight = calculateStraightStairGeometry({ totalRiseMm: 2_800, availableRunMm: 4_200, riserCount: 16 });
    expect(straight).toMatchObject({ riserHeightMm: 175, treadCount: 15, goingMm: 280, stepRuleMm: 630 });
    // Pitch is riser/going (175/280), not total rise/run; the pitch line spans the 15 treads: 15 × √(175² + 280²).
    expect(straight.pitchDegrees).toBeCloseTo(32.005383208, 8);
    expect(straight.pitchLineLengthMm).toBeCloseTo(4_952.840094, 5);

    const landing = calculateLandingStairGeometry({ layout: "quarter_turn", totalRiseMm: 3_000, stairWidthMm: 900, goingMm: 250, landingDepthMm: 900, flightRiserCounts: [8, 8], turnDirection: "right" });
    expect(landing.riserHeightMm).toBe(187.5);
    expect(landing.treadCount).toBe(14);
    expect(landing.pitchDegrees).toBeCloseTo(Math.atan2(187.5, 250) * 180 / Math.PI, 10);
    expect(landing.stepRuleMm).toBe(625);
    expect(landing.flightGeometricLengthsMm).toEqual([2_187.5, 2_187.5]);
    expect(landing.flightTreadSurfaceAreaM2).toBe(3.15);
    expect(landing.landingSurfaceAreaM2).toBe(0.81);

    const spiral = calculateSpiralStairGeometry({ totalRiseMm: 3_000, outerDiameterMm: 2_000, innerDiameterMm: 400, turnDegrees: 360, riserCount: 18 });
    expect(spiral.walkingRadiusMm).toBe(600);
    expect(spiral.walkingLineLengthMm).toBeCloseTo(1_200 * Math.PI, 8);
    expect(spiral.planAreaM2).toBeCloseTo(Math.PI * (1 ** 2 - 0.2 ** 2), 10);
    expect(spiral.stepRuleMm).toBeCloseTo(2 * (3_000 / 18) + (1_200 * Math.PI / 17), 10);
    expect(spiral.pitchDegrees).toBeCloseTo(Math.atan2(3_000 / 18, 1_200 * Math.PI / 17) * 180 / Math.PI, 10);
    expect(spiral.developedWalkingLengthMm).toBeCloseTo(17 * Math.hypot(3_000 / 18, 1_200 * Math.PI / 17), 8);

    const concreteStair = calculateConcreteStairGeometry({ totalRiseMm: 2_800, availableRunMm: 4_200, stairWidthMm: 1_000, riserCount: 16 });
    expect(concreteStair.wedgeVolumeM3).toBe(5.88);
    expect(concreteStair.pitchLengthMm).toBeCloseTo(4_952.840094, 5);
    expect(concreteStair.pitchDegrees).toBeCloseTo(32.005383208, 8);
    expect(concreteStair.stepRuleMm).toBe(630);
  });

  it("reports the same riser/going pitch for every stair type with the same steps", () => {
    const pitch = Math.atan2(175, 280) * 180 / Math.PI;
    expect(calculateStraightStairGeometry({ totalRiseMm: 2_800, availableRunMm: 4_200, riserCount: 16 }).pitchDegrees).toBeCloseTo(pitch, 10);
    expect(calculateConcreteStairGeometry({ totalRiseMm: 2_800, availableRunMm: 4_200, stairWidthMm: 1_000, riserCount: 16 }).pitchDegrees).toBeCloseTo(pitch, 10);
    expect(calculateLandingStairGeometry({ layout: "quarter_turn", totalRiseMm: 2_800, stairWidthMm: 900, goingMm: 280, landingDepthMm: 900, flightRiserCounts: [8, 8], turnDirection: "right" }).pitchDegrees).toBeCloseTo(pitch, 10);
  });

  it("reuses the existing gable and metal-tile engines for a product-data-based estimate", () => {
    const roof = calculateGableRoof({ inputMode: "height", buildingLengthMm: 10 * m, buildingWidthMm: 6 * m, roofRiseMm: 4 * m, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 });
    const material = calculateGableMetalTileCovering(roof, {
      nominalSheetWidthMm: 1_200, effectiveCoveringWidthMm: 1_000, physicalSheetLengthMm: 5_100, effectiveCoveringLengthMm: 5_000,
      minimumPhysicalLengthMm: null, maximumPhysicalLengthMm: null, eaveEndAllowanceMm: 0, ridgeEndAllowanceMm: 0, longitudinalOverlapMm: 0,
      lengthCompatibilityConfirmed: true, lengthDataSource: "Independent test fixture", isModular: false, moduleBaseLengthMm: null, modulePitchMm: null, moduleCount: null,
    });
    expect(roof.areas.combinedRoofM2).toBe(100);
    expect(material).toMatchObject({ status: "VALID", columnsPerPlane: 10, totalSheetCount: 20, totalNominalSheetAreaMm2: 122_400_000 });
  });

  it("preserves dimensional scaling for lengths, areas, volumes and steel mass", () => {
    const diagonal = calculateRightAngleDiagonal({ lengthMm: 3 * m, widthMm: 4 * m });
    const scaledDiagonal = calculateRightAngleDiagonal({ lengthMm: 6 * m, widthMm: 8 * m });
    expect(scaledDiagonal.diagonalMm).toBe(2 * diagonal.diagonalMm);
    const slab = calculateFoundationSlab({ lengthMm: 10 * m, widthMm: 8 * m, thicknessMm: 200 });
    const scaledSlab = calculateFoundationSlab({ lengthMm: 20 * m, widthMm: 16 * m, thicknessMm: 400 });
    expect(scaledSlab.planAreaM2).toBe(4 * slab.planAreaM2);
    expect(scaledSlab.volumeM3).toBe(8 * slab.volumeM3);
    const bars = calculateReinforcementBars({ barDiameterMm: 10, cutLengthMm: 1_000, pieceCount: 4, steelDensityKgPerM3: 7_850 });
    const scaledBars = calculateReinforcementBars({ barDiameterMm: 20, cutLengthMm: 2_000, pieceCount: 4, steelDensityKgPerM3: 7_850 });
    expect(scaledBars.totalLengthM).toBe(2 * bars.totalLengthM);
    if (bars.totalMassKg === null || scaledBars.totalMassKg === null) throw new Error("Explicit steel density must produce a mass result.");
    expect(scaledBars.totalMassKg).toBe(8 * bars.totalMassKg);
    const stair = calculateStraightStairGeometry({ totalRiseMm: 2_800, availableRunMm: 4_200, riserCount: 16 });
    const scaledStair = calculateStraightStairGeometry({ totalRiseMm: 5_600, availableRunMm: 8_400, riserCount: 16 });
    expect(scaledStair.riserHeightMm).toBe(2 * stair.riserHeightMm);
    expect(scaledStair.goingMm).toBe(2 * stair.goingMm);
    expect(scaledStair.pitchDegrees).toBeCloseTo(stair.pitchDegrees, 10);
  });

  it("rejects invalid dimensions and geometries", () => {
    expect(() => calculateRightAngleDiagonal({ lengthMm: 0, widthMm: 3 * m })).toThrow();
    expect(concreteRingInputSchema.safeParse({ outerDiameterMm: 1_000, wallThicknessMm: 500, heightMm: 1_000 }).success).toBe(false);
    expect(spiralStairGeometryInputSchema.safeParse({ totalRiseMm: 3_000, outerDiameterMm: 1_500, innerDiameterMm: 1_600, turnDegrees: 360, riserCount: 16 }).success).toBe(false);
    expect(reinforcementMeshInputSchema.safeParse({ lengthMm: 1_000, widthMm: 1_000, coverMm: 500, spacingMm: 100, barDiameterMm: 10 }).success).toBe(false);
  });
});

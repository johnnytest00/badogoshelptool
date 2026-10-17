import { z } from "zod";
import { assertFiniteResult, constructionCount, constructionLengthMm, constructionNonNegativeMm, mmToM, mm3ToM3 } from "./numeric";

export const straightStairGeometryInputSchema = z.object({
  totalRiseMm: constructionLengthMm,
  availableRunMm: constructionLengthMm,
  riserCount: constructionCount.min(2).max(200),
  /** Optional drawing-only width; the straight-stair calculation does not depend on width. */
  stairWidthMm: constructionLengthMm.optional(),
});
export type StraightStairGeometryInput = z.infer<typeof straightStairGeometryInputSchema>;

/** The upper floor is the final riser; tread count is therefore riser count minus one. */
export function calculateStraightStairGeometry(rawInput: StraightStairGeometryInput) {
  const input = straightStairGeometryInputSchema.parse(rawInput);
  const treadCount = input.riserCount - 1;
  const riserHeightMm = input.totalRiseMm / input.riserCount;
  const goingMm = input.availableRunMm / treadCount;
  const stringerLengthMm = Math.hypot(input.totalRiseMm, input.availableRunMm);
  const pitchDegrees = Math.atan2(input.totalRiseMm, input.availableRunMm) * 180 / Math.PI;
  const stepRuleMm = 2 * riserHeightMm + goingMm;
  assertFiniteResult([riserHeightMm, goingMm, stringerLengthMm, pitchDegrees, stepRuleMm]);
  return { riserCount: input.riserCount, treadCount, riserHeightMm, goingMm, totalRiseMm: input.totalRiseMm, totalRunMm: input.availableRunMm, stringerLengthMm, pitchDegrees, stepRuleMm };
}

const landingStairBaseSchema = z.object({
  layout: z.enum(["quarter_turn", "half_turn", "three_flight"]),
  totalRiseMm: constructionLengthMm,
  stairWidthMm: constructionLengthMm,
  goingMm: constructionLengthMm,
  landingDepthMm: constructionLengthMm,
  flightRiserCounts: z.array(constructionCount.min(2).max(100)).min(2).max(3),
  landingGapMm: constructionNonNegativeMm.default(0),
  turnDirection: z.enum(["right", "left"]).default("right"),
  openingLengthMm: constructionLengthMm.optional(),
  openingWidthMm: constructionLengthMm.optional(),
}).superRefine((input, context) => {
  const expectedFlightCount = input.layout === "three_flight" ? 3 : 2;
  if (input.flightRiserCounts.length !== expectedFlightCount) {
    context.addIssue({ code: "custom", path: ["flightRiserCounts"], message: `Ehhez az elrendezéshez ${expectedFlightCount} lépcsőkar fellépésszámát adja meg.` });
  }
  if (input.landingDepthMm < input.stairWidthMm) {
    context.addIssue({ code: "custom", path: ["landingDepthMm"], message: "A pihenő mélysége nem lehet kisebb a lépcsőkar szélességénél." });
  }
  if (input.layout !== "half_turn" && input.landingGapMm !== 0) {
    context.addIssue({ code: "custom", path: ["landingGapMm"], message: "Köztes karhézag csak az U-alakú elrendezésben adható meg." });
  }
  if (input.flightRiserCounts.reduce((total, value) => total + value, 0) > 200) {
    context.addIssue({ code: "custom", path: ["flightRiserCounts"], message: "Az összes fellépés száma legfeljebb 200 lehet." });
  }
});

export const landingStairGeometryInputSchema = landingStairBaseSchema;
export type LandingStairGeometryInput = z.input<typeof landingStairGeometryInputSchema>;
type StairPlanPoint = Readonly<{ xMm: number; yMm: number }>;
type StairPlanTread = Readonly<{ index: number; levelMm: number; polygon: readonly StairPlanPoint[] }>;
type StairPlanFlight = Readonly<{ index: number; riserCount: number; treadCount: number; runMm: number; startRiseMm: number; endRiseMm: number; treads: readonly StairPlanTread[] }>;

/**
 * Shared orthogonal layout geometry for explicit 90°, U-shaped 180°, and three-flight landing plans.
 * Every flight uses the same going and riser. Landing size and central gap are explicit user inputs.
 */
export function calculateLandingStairGeometry(rawInput: LandingStairGeometryInput) {
  const input = landingStairGeometryInputSchema.parse(rawInput);
  const riserCount = input.flightRiserCounts.reduce((total, value) => total + value, 0);
  const treadCount = input.flightRiserCounts.reduce((total, value) => total + value - 1, 0);
  const riserHeightMm = input.totalRiseMm / riserCount;
  const direction = input.turnDirection === "right" ? 1 : -1;
  const rawFlights: { riserCount: number; treadCount: number; runMm: number; startRiseMm: number; endRiseMm: number; treads: StairPlanTread[] }[] = [];
  const landings: StairPlanPoint[][] = [];
  const makeRect = (x1: number, y1: number, x2: number, y2: number): StairPlanPoint[] => [
    { xMm: x1, yMm: y1 }, { xMm: x2, yMm: y1 }, { xMm: x2, yMm: y2 }, { xMm: x1, yMm: y2 },
  ];
  const pushFlight = (risers: number, orientation: "east" | "north" | "west", startX: number, startY: number, startRise: number) => {
    const flightTreads = risers - 1;
    const runMm = flightTreads * input.goingMm;
    const treads: StairPlanTread[] = Array.from({ length: flightTreads }, (_, index) => {
      const a = index * input.goingMm;
      const b = (index + 1) * input.goingMm;
      let polygon: StairPlanPoint[];
      if (orientation === "east") polygon = makeRect(startX + a, startY, startX + b, startY + input.stairWidthMm);
      else if (orientation === "north") polygon = makeRect(startX, startY + a, startX + input.stairWidthMm, startY + b);
      else polygon = makeRect(startX - b, startY, startX - a, startY + input.stairWidthMm);
      return { index: index + 1, levelMm: startRise + (index + 1) * riserHeightMm, polygon };
    });
    rawFlights.push({ riserCount: risers, treadCount: flightTreads, runMm, startRiseMm: startRise, endRiseMm: startRise + risers * riserHeightMm, treads });
  };

  if (input.layout === "quarter_turn") {
    const firstRun = (input.flightRiserCounts[0] - 1) * input.goingMm;
    pushFlight(input.flightRiserCounts[0], "east", 0, 0, 0);
    landings.push(makeRect(firstRun, 0, firstRun + input.landingDepthMm, input.landingDepthMm));
    const secondX = firstRun + input.landingDepthMm - input.stairWidthMm;
    pushFlight(input.flightRiserCounts[1], "north", secondX, input.landingDepthMm, input.flightRiserCounts[0] * riserHeightMm);
  } else if (input.layout === "half_turn") {
    const firstRun = (input.flightRiserCounts[0] - 1) * input.goingMm;
    const landingWidth = 2 * input.stairWidthMm + input.landingGapMm;
    pushFlight(input.flightRiserCounts[0], "east", 0, 0, 0);
    landings.push(makeRect(firstRun, 0, firstRun + input.landingDepthMm, landingWidth));
    const secondStartX = firstRun + input.landingDepthMm;
    pushFlight(input.flightRiserCounts[1], "west", secondStartX, input.stairWidthMm + input.landingGapMm, input.flightRiserCounts[0] * riserHeightMm);
  } else {
    const firstRun = (input.flightRiserCounts[0] - 1) * input.goingMm;
    const secondRun = (input.flightRiserCounts[1] - 1) * input.goingMm;
    pushFlight(input.flightRiserCounts[0], "east", 0, 0, 0);
    landings.push(makeRect(firstRun, 0, firstRun + input.landingDepthMm, input.landingDepthMm));
    const secondX = firstRun + input.landingDepthMm - input.stairWidthMm;
    pushFlight(input.flightRiserCounts[1], "north", secondX, input.landingDepthMm, input.flightRiserCounts[0] * riserHeightMm);
    const secondLandingY = input.landingDepthMm + secondRun;
    landings.push(makeRect(firstRun, secondLandingY, firstRun + input.landingDepthMm, secondLandingY + input.landingDepthMm));
    pushFlight(input.flightRiserCounts[2], "west", firstRun, secondLandingY + input.landingDepthMm - input.stairWidthMm, (input.flightRiserCounts[0] + input.flightRiserCounts[1]) * riserHeightMm);
  }

  const mirrorPoint = (point: StairPlanPoint): StairPlanPoint => ({ xMm: point.xMm, yMm: point.yMm * direction });
  const allPoints = [...rawFlights.flatMap((flight) => flight.treads.flatMap((tread) => tread.polygon)), ...landings.flat()].map(mirrorPoint);
  const minX = Math.min(...allPoints.map((point) => point.xMm));
  const maxX = Math.max(...allPoints.map((point) => point.xMm));
  const minY = Math.min(...allPoints.map((point) => point.yMm));
  const maxY = Math.max(...allPoints.map((point) => point.yMm));
  const normalize = (point: StairPlanPoint): StairPlanPoint => ({ xMm: point.xMm - minX, yMm: point.yMm - minY });
  const flights: StairPlanFlight[] = rawFlights.map((flight, index) => ({ index: index + 1, ...flight, treads: flight.treads.map((tread) => ({ ...tread, polygon: tread.polygon.map((point) => normalize(mirrorPoint(point))) })) }));
  const normalizedLandings = landings.map((polygon) => polygon.map((point) => normalize(mirrorPoint(point))));
  const planWidthMm = maxX - minX;
  const planDepthMm = maxY - minY;
  if (input.openingLengthMm !== undefined && planWidthMm > input.openingLengthMm) throw new RangeError("A megadott tervhossz kisebb a lépcső számított alaprajzi kiterjedésénél.");
  if (input.openingWidthMm !== undefined && planDepthMm > input.openingWidthMm) throw new RangeError("A megadott tervszélesség kisebb a lépcső számított alaprajzi kiterjedésénél.");
  assertFiniteResult([riserHeightMm, treadCount, planWidthMm, planDepthMm, ...flights.flatMap((flight) => [flight.runMm, flight.startRiseMm, flight.endRiseMm])]);
  return { layout: input.layout, totalRiseMm: input.totalRiseMm, stairWidthMm: input.stairWidthMm, goingMm: input.goingMm, landingDepthMm: input.landingDepthMm, landingGapMm: input.landingGapMm, turnDirection: input.turnDirection, riserCount, treadCount, riserHeightMm, totalFlightRunMm: flights.reduce((total, flight) => total + flight.runMm, 0), planWidthMm, planDepthMm, flights, landings: normalizedLandings };
}

export const concreteStairGeometryInputSchema = z.object({
  totalRiseMm: constructionLengthMm,
  availableRunMm: constructionLengthMm,
  stairWidthMm: constructionLengthMm,
  riserCount: constructionCount.min(2).max(200),
});
export type ConcreteStairGeometryInput = z.infer<typeof concreteStairGeometryInputSchema>;

/** Exact quantity for a solid right-triangular concrete stair wedge with uniformly spaced steps. */
export function calculateConcreteStairGeometry(rawInput: ConcreteStairGeometryInput) {
  const input = concreteStairGeometryInputSchema.parse(rawInput);
  const treadCount = input.riserCount - 1;
  const goingMm = input.availableRunMm / treadCount;
  const riserHeightMm = input.totalRiseMm / input.riserCount;
  const pitchLengthM = Math.hypot(mmToM(input.availableRunMm), mmToM(input.totalRiseMm));
  const wedgeVolumeM3 = mm3ToM3(input.stairWidthMm * input.availableRunMm * input.totalRiseMm / 2);
  const pitchDegrees = Math.atan2(input.totalRiseMm, input.availableRunMm) * 180 / Math.PI;
  assertFiniteResult([goingMm, riserHeightMm, pitchLengthM, wedgeVolumeM3, pitchDegrees]);
  return { totalRiseMm: input.totalRiseMm, availableRunMm: input.availableRunMm, stairWidthMm: input.stairWidthMm, riserCount: input.riserCount, treadCount, goingMm, riserHeightMm, pitchLengthM, pitchDegrees, wedgeVolumeM3 };
}

export const spiralStairGeometryInputSchema = z.object({
  totalRiseMm: constructionLengthMm,
  outerDiameterMm: constructionLengthMm,
  innerDiameterMm: constructionLengthMm,
  turnDegrees: z.number().finite().positive().max(1_440),
  riserCount: constructionCount.min(2).max(200),
}).refine((value) => value.innerDiameterMm < value.outerDiameterMm, { path: ["innerDiameterMm"], message: "A belső átmérő legyen kisebb a külsőnél." });
export type SpiralStairGeometryInput = z.infer<typeof spiralStairGeometryInputSchema>;

/** Annular-sector plan geometry at the explicitly defined mid-width walking radius. */
export function calculateSpiralStairGeometry(rawInput: SpiralStairGeometryInput) {
  const input = spiralStairGeometryInputSchema.parse(rawInput);
  const innerRadiusMm = input.innerDiameterMm / 2;
  const outerRadiusMm = input.outerDiameterMm / 2;
  const walkingRadiusMm = (innerRadiusMm + outerRadiusMm) / 2;
  const turnRadians = input.turnDegrees * Math.PI / 180;
  const walkingLineLengthMm = walkingRadiusMm * turnRadians;
  const treadCount = input.riserCount - 1;
  const walkingGoingMm = walkingLineLengthMm / treadCount;
  const riserHeightMm = input.totalRiseMm / input.riserCount;
  const stepAngleDegrees = input.turnDegrees / treadCount;
  assertFiniteResult([walkingRadiusMm, walkingLineLengthMm, walkingGoingMm, riserHeightMm, stepAngleDegrees]);
  return { innerRadiusMm, outerRadiusMm, walkingRadiusMm, walkingLineLengthMm, walkingGoingMm, riserHeightMm, stepAngleDegrees, riserCount: input.riserCount, treadCount };
}

export const beveledRiserInputSchema = z.object({
  goingMm: constructionLengthMm,
  riserHeightMm: constructionLengthMm,
  nosingProjectionMm: z.number().finite().nonnegative().max(100_000),
  treadThicknessMm: constructionLengthMm,
  riserBlankThicknessMm: constructionLengthMm,
});
export type BeveledRiserInput = z.infer<typeof beveledRiserInputSchema>;

/** Right-triangle step profile; output is blank geometry, not a joinery or fastening design. */
export function calculateBeveledRiserGeometry(rawInput: BeveledRiserInput) {
  const input = beveledRiserInputSchema.parse(rawInput);
  const horizontalMm = input.goingMm + input.nosingProjectionMm;
  const diagonalMm = Math.hypot(horizontalMm, input.riserHeightMm);
  const slopeDegrees = Math.atan2(input.riserHeightMm, horizontalMm) * 180 / Math.PI;
  const bevelAngleDegrees = 90 - slopeDegrees;
  const riserBlankLengthMm = Math.hypot(input.goingMm, input.riserHeightMm);
  assertFiniteResult([horizontalMm, diagonalMm, slopeDegrees, bevelAngleDegrees, riserBlankLengthMm, input.treadThicknessMm, input.riserBlankThicknessMm]);
  return { horizontalMm, diagonalMm, slopeDegrees, bevelAngleDegrees, riserBlankLengthMm };
}

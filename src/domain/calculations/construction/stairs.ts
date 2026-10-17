import { z } from "zod";
import { assertFiniteResult, constructionCount, constructionLengthMm } from "./numeric";

export const straightStairGeometryInputSchema = z.object({
  totalRiseMm: constructionLengthMm,
  availableRunMm: constructionLengthMm,
  riserCount: constructionCount.min(2).max(200),
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

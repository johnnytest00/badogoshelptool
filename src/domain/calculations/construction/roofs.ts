import { z } from "zod";
import { calculateRoofGeometry, roofGeometryInputSchema, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { assertFiniteResult, constructionCount, constructionLengthMm, mmToM } from "./numeric";

const roofDimension = constructionLengthMm;

export const rafterGeometryInputSchema = z.object({
  horizontalHalfSpanMm: roofDimension,
  riseMm: roofDimension,
  eaveProjectionMm: z.number().finite().nonnegative().max(100_000),
});
export type RafterGeometryInput = z.infer<typeof rafterGeometryInputSchema>;
export type RafterGeometry = {
  horizontalRunMm: number;
  slopeLengthMm: number;
  pitchDegrees: number;
  plumbCutToBoardAxisDegrees: number;
};

/** Geometry only: no birdsmouth, ridge-seat deduction, timber section or structural sizing. */
export function calculateRafterGeometry(rawInput: RafterGeometryInput): RafterGeometry {
  const input = rafterGeometryInputSchema.parse(rawInput);
  const horizontalRunMm = input.horizontalHalfSpanMm + input.eaveProjectionMm;
  const slopeLengthMm = Math.hypot(horizontalRunMm, input.riseMm);
  const pitchDegrees = Math.atan2(input.riseMm, input.horizontalHalfSpanMm) * 180 / Math.PI;
  const plumbCutToBoardAxisDegrees = 90 - pitchDegrees;
  assertFiniteResult([horizontalRunMm, slopeLengthMm, pitchDegrees, plumbCutToBoardAxisDegrees]);
  return { horizontalRunMm, slopeLengthMm, pitchDegrees, plumbCutToBoardAxisDegrees };
}

export const mansardGeometryInputSchema = z.object({
  buildingLengthMm: roofDimension,
  lowerRunMm: roofDimension,
  upperRunMm: roofDimension,
  lowerRiseMm: roofDimension,
  upperRiseMm: roofDimension,
});
export type MansardGeometryInput = z.infer<typeof mansardGeometryInputSchema>;

/** Symmetric broken-pitch roof with explicit horizontal runs and rises. */
export function calculateMansardGeometry(rawInput: MansardGeometryInput) {
  const input = mansardGeometryInputSchema.parse(rawInput);
  const lowerSlopeMm = Math.hypot(input.lowerRunMm, input.lowerRiseMm);
  const upperSlopeMm = Math.hypot(input.upperRunMm, input.upperRiseMm);
  const totalRoofWidthMm = 2 * (input.lowerRunMm + input.upperRunMm);
  const oneSideAreaM2 = mmToM(input.buildingLengthMm) * mmToM(lowerSlopeMm + upperSlopeMm);
  const totalAreaM2 = 2 * oneSideAreaM2;
  assertFiniteResult([lowerSlopeMm, upperSlopeMm, totalRoofWidthMm, oneSideAreaM2, totalAreaM2]);
  return { lowerSlopeMm, upperSlopeMm, totalRoofWidthMm, oneSideAreaM2, totalAreaM2 };
}

export const triangularTrussGeometryInputSchema = z.object({
  spanMm: roofDimension,
  riseMm: roofDimension,
  panelCountPerHalf: constructionCount.max(50),
});
export type TriangularTrussGeometryInput = z.infer<typeof triangularTrussGeometryInputSchema>;

/** Envelope and equally spaced idealized node positions; no web layout or structural approval. */
export function calculateTriangularTrussGeometry(rawInput: TriangularTrussGeometryInput) {
  const input = triangularTrussGeometryInputSchema.parse(rawInput);
  const halfSpanMm = input.spanMm / 2;
  const halfRafterMm = Math.hypot(halfSpanMm, input.riseMm);
  const baseAngleDegrees = Math.atan2(input.riseMm, halfSpanMm) * 180 / Math.PI;
  const panelWidthMm = halfSpanMm / input.panelCountPerHalf;
  const nodes = Array.from({ length: input.panelCountPerHalf + 1 }, (_, index) => {
    const xMm = index * panelWidthMm;
    return { xMm, yMm: input.riseMm * xMm / halfSpanMm };
  });
  assertFiniteResult([halfRafterMm, baseAngleDegrees, panelWidthMm, ...nodes.flatMap((node) => [node.xMm, node.yMm])]);
  return { halfSpanMm, halfRafterMm, baseAngleDegrees, panelWidthMm, nodes };
}

export function calculateExistingRoofGeometry(input: RoofGeometryInput) {
  const validated = roofGeometryInputSchema.parse(input);
  return calculateRoofGeometry(validated);
}

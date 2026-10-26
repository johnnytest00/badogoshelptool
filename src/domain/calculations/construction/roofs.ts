import { z } from "zod";
import { calculateRoofGeometry, roofGeometryInputSchema, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { assertFiniteResult, constructionCount, constructionLengthMm } from "./numeric";

const roofDimension = constructionLengthMm;

export const rafterGeometryInputSchema = z.object({
  horizontalHalfSpanMm: roofDimension,
  riseMm: roofDimension,
  eaveProjectionMm: z.number().finite().nonnegative().max(100_000),
  seatCutHeightMm: z.number().finite().nonnegative().max(100_000).optional(),
}).refine((value) => (value.seatCutHeightMm ?? 0) < value.riseMm, { path: ["seatCutHeightMm"], message: "A Karmi vízszintes vágása nem érheti el a gerincemelkedést." });
export type RafterGeometryInput = z.infer<typeof rafterGeometryInputSchema>;
export type RafterGeometry = {
  horizontalRunMm: number;
  bodyLengthMm: number;
  eaveLengthMm: number;
  slopeLengthMm: number;
  pitchDegrees: number;
  plumbCutToBoardAxisDegrees: number;
};

/**
 * Lengths are measured along the rafter's upper edge, which the seat cut lowers by seatCutHeightMm
 * at the wall. Geometry only: no timber section, fixing or structural sizing.
 */
export function calculateRafterGeometry(rawInput: RafterGeometryInput): RafterGeometry {
  const input = rafterGeometryInputSchema.parse(rawInput);
  const effectiveRiseMm = input.riseMm - (input.seatCutHeightMm ?? 0);
  const horizontalRunMm = input.horizontalHalfSpanMm + input.eaveProjectionMm;
  const pitchRadians = Math.atan2(effectiveRiseMm, input.horizontalHalfSpanMm);
  const bodyLengthMm = Math.hypot(input.horizontalHalfSpanMm, effectiveRiseMm);
  const eaveLengthMm = input.eaveProjectionMm / Math.cos(pitchRadians);
  const slopeLengthMm = bodyLengthMm + eaveLengthMm;
  const pitchDegrees = pitchRadians * 180 / Math.PI;
  const plumbCutToBoardAxisDegrees = 90 - pitchDegrees;
  assertFiniteResult([horizontalRunMm, bodyLengthMm, eaveLengthMm, slopeLengthMm, pitchDegrees, plumbCutToBoardAxisDegrees]);
  return { horizontalRunMm, bodyLengthMm, eaveLengthMm, slopeLengthMm, pitchDegrees, plumbCutToBoardAxisDegrees };
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

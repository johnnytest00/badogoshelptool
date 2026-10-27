import { z } from "zod";
import { calculateRoofGeometry, roofGeometryInputSchema, pitch as targetPitchDegrees, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
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

export type GableGeometryTransferReason = "INVALID_SOURCE_GEOMETRY" | "MISSING_HAP" | "INVALID_HAP" | "TARGET_RANGE";
export type GableGeometryTransferResult =
  | Readonly<{ ok: true; widthMm: number; pitchDegrees: number }>
  | Readonly<{ ok: false; reason: GableGeometryTransferReason }>;

/**
 * M10 Fázis 1: widthMm = 2 × horizontalHalfSpanMm és a HAP-pal csökkentett pitchDegrees, kizárólag a felhasználó
 * által explicit elfogadott szimmetrikus nyeregtető-feltevés mellett (docs/M10_PHASE1_GEOMETRY_TRANSFER_DESIGN.md).
 * A cél séma (gableRoofInputSchema/roofGeometryInputSchema) marad a végső érvényességi kapu; itt csak a
 * nyilvánvalóan érvénytelen vagy tartományon kívüli esetet szűrjük ki explicit hibakóddal, becslés nélkül.
 * Hiányzó HAP (régi snapshot, ahol a mező még nem létezett) nem kezelhető 0-ként: MISSING_HAP.
 */
export function convertGableGeometryFromRafterCut(source: Readonly<{ horizontalHalfSpanMm?: string; riseMm?: string; seatCutHeightMm?: string }>): GableGeometryTransferResult {
  const halfSpanMm = Number(source.horizontalHalfSpanMm);
  const riseMm = Number(source.riseMm);
  if (!Number.isFinite(halfSpanMm) || halfSpanMm <= 0 || !Number.isFinite(riseMm) || riseMm <= 0) return { ok: false, reason: "INVALID_SOURCE_GEOMETRY" };
  if (source.seatCutHeightMm === undefined) return { ok: false, reason: "MISSING_HAP" };
  const seatCutHeightMm = Number(source.seatCutHeightMm);
  if (!Number.isFinite(seatCutHeightMm) || seatCutHeightMm < 0 || seatCutHeightMm >= riseMm) return { ok: false, reason: "INVALID_HAP" };
  const widthMm = halfSpanMm * 2;
  const pitchDegrees = Math.atan2(riseMm - seatCutHeightMm, halfSpanMm) * 180 / Math.PI;
  if (!Number.isInteger(widthMm) || widthMm <= 0 || widthMm > 100_000 || !targetPitchDegrees.safeParse(pitchDegrees).success) return { ok: false, reason: "TARGET_RANGE" };
  return { ok: true, widthMm, pitchDegrees };
}

export type RafterCutGeometryTransferResult =
  | Readonly<{ ok: true; horizontalHalfSpanMm: number; riseMm: number; eaveProjectionMm: number }>
  | Readonly<{ ok: false; reason: GableGeometryTransferReason }>;

/**
 * M10.2: the exact inverse of convertGableGeometryFromRafterCut — symmetric-gable widthMm/pitchDegrees (plus the
 * already-proven eaveOverhangMm ↔ eaveProjectionMm mapping, see rafter-connection-fields.ts) to the rafter-cut
 * calculator's horizontalHalfSpanMm/riseMm/eaveProjectionMm, only under the same caller-confirmed symmetry
 * precondition. Missing HAP (seatCutHeightMm) is never silently treated as zero, same as the forward direction.
 */
export function convertRafterCutGeometryFromGable(source: Readonly<{ widthMm?: string; pitchDegrees?: string; eaveOverhangMm?: string; seatCutHeightMm?: string }>): RafterCutGeometryTransferResult {
  const widthMm = Number(source.widthMm);
  const pitchDegrees = Number(source.pitchDegrees);
  if (!Number.isFinite(widthMm) || widthMm <= 0 || !Number.isFinite(pitchDegrees) || !targetPitchDegrees.safeParse(pitchDegrees).success) return { ok: false, reason: "INVALID_SOURCE_GEOMETRY" };
  if (source.seatCutHeightMm === undefined) return { ok: false, reason: "MISSING_HAP" };
  const seatCutHeightMm = Number(source.seatCutHeightMm);
  if (!Number.isFinite(seatCutHeightMm) || seatCutHeightMm < 0) return { ok: false, reason: "INVALID_HAP" };
  const halfSpanMm = widthMm / 2;
  const riseMm = seatCutHeightMm + halfSpanMm * Math.tan(pitchDegrees * Math.PI / 180);
  const eaveProjectionMm = source.eaveOverhangMm !== undefined && Number.isFinite(Number(source.eaveOverhangMm)) ? Number(source.eaveOverhangMm) : 0;
  if (!rafterGeometryInputSchema.safeParse({ horizontalHalfSpanMm: halfSpanMm, riseMm, eaveProjectionMm, seatCutHeightMm }).success) return { ok: false, reason: "TARGET_RANGE" };
  return { ok: true, horizontalHalfSpanMm: halfSpanMm, riseMm, eaveProjectionMm };
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

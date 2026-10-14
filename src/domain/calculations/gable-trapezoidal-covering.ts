import { z } from "zod";
import type { GableRoofOutput } from "@/domain/calculations/gable-roof";

export const GABLE_TRAPEZOIDAL_COVERING_VERSION = "1.0.0" as const;
const optionalMm = z.number().finite().positive().nullable();
export const gableTrapezoidalCoveringInputSchema = z.object({
  nominalSheetWidthMm: optionalMm,
  effectiveCoveringWidthMm: optionalMm,
  selectedSheetLengthMm: optionalMm,
  minimumSheetLengthMm: optionalMm,
  maximumSheetLengthMm: optionalMm,
  endAllowanceMm: z.number().finite().nonnegative().nullable(),
  longitudinalOverlapMm: z.number().finite().nonnegative().nullable(),
  lapCompatibilityConfirmed: z.boolean(),
  maximumSheetCount: z.number().int().positive().max(100_000).default(100_000),
});

export type GableTrapezoidalCoveringInput = z.input<typeof gableTrapezoidalCoveringInputSchema>;
export type GableTrapezoidalCoveringOutput = Readonly<{
  status: "VALID" | "INCOMPLETE" | "INVALID" | "UNSUPPORTED";
  reasons: readonly string[];
  planeCount: 2;
  roofLongitudinalLengthMm: number;
  slopeLengthMm: number;
  requiredCoveringLengthMm: number;
  roofPlaneAreaMm2: number;
  totalRoofAreaMm2: number;
  pitchDegrees: number;
  columnsPerPlane: number | null;
  rowsPerPlane: number | null;
  totalSheetCount: number | null;
  nominalSheetAreaMm2: number | null;
  purchasedNominalAreaMm2: number | null;
  installedCoveredAreaMm2: number | null;
  overlapMm: number | null;
  rowCoverageMm: number | null;
}>;

function ceilDiv(n: number, d: number): number { return Math.ceil(n / d - 1e-12); }

/** Uses only dimensions and areas already calculated by roof.gable. No roof trigonometry is duplicated. */
export function calculateGableTrapezoidalCovering(geometry: GableRoofOutput, rawInput: GableTrapezoidalCoveringInput): GableTrapezoidalCoveringOutput {
  const parsed = gableTrapezoidalCoveringInputSchema.safeParse(rawInput);
  const base = { planeCount: 2 as const, roofLongitudinalLengthMm: geometry.dimensions.overallRoofLengthMm, slopeLengthMm: geometry.lengths.slopeLengthIncludingEaveMm, requiredCoveringLengthMm: geometry.lengths.slopeLengthIncludingEaveMm, roofPlaneAreaMm2: geometry.areas.individualRoofPlaneMm2, totalRoofAreaMm2: geometry.areas.combinedRoofMm2, pitchDegrees: geometry.angles.pitchDegrees };
  if (!parsed.success) return { ...base, status: "INVALID", reasons: parsed.error.issues.map((issue) => issue.message), columnsPerPlane: null, rowsPerPlane: null, totalSheetCount: null, nominalSheetAreaMm2: null, purchasedNominalAreaMm2: null, installedCoveredAreaMm2: null, overlapMm: null, rowCoverageMm: null };
  const input = parsed.data;
  if (input.effectiveCoveringWidthMm !== null && input.nominalSheetWidthMm !== null && input.effectiveCoveringWidthMm > input.nominalSheetWidthMm) return { ...base, status: "INVALID", reasons: ["A hasznos fedési szélesség nem lehet nagyobb a névleges szélességnél."], columnsPerPlane: null, rowsPerPlane: null, totalSheetCount: null, nominalSheetAreaMm2: null, purchasedNominalAreaMm2: null, installedCoveredAreaMm2: null, overlapMm: null, rowCoverageMm: null };
  if (input.selectedSheetLengthMm !== null && input.longitudinalOverlapMm !== null && input.longitudinalOverlapMm >= input.selectedSheetLengthMm) return { ...base, status: "INVALID", reasons: ["Az átlapolásnak kisebbnek kell lennie a lemezhossznál."], columnsPerPlane: null, rowsPerPlane: null, totalSheetCount: null, nominalSheetAreaMm2: null, purchasedNominalAreaMm2: null, installedCoveredAreaMm2: null, overlapMm: input.longitudinalOverlapMm, rowCoverageMm: null };
  const width = input.effectiveCoveringWidthMm;
  const length = input.selectedSheetLengthMm;
  const roofLongitudinalLengthMm = geometry.dimensions.overallRoofLengthMm;
  const slopeLengthMm = geometry.lengths.slopeLengthIncludingEaveMm;
  const requiredCoveringLengthMm = slopeLengthMm + (input.endAllowanceMm ?? 0);
  const calculatedBase = { ...base, requiredCoveringLengthMm };
  const reasons: string[] = [];
  if (geometry.planes.length !== 2 || geometry.planes.some((plane) => plane.vertices.length !== 4) || !(roofLongitudinalLengthMm > 0) || !(slopeLengthMm > 0)) {
    return { ...calculatedBase, status: "UNSUPPORTED", reasons: ["A számításhoz két téglalap alakú nyeregtető-sík szükséges."], columnsPerPlane: null, rowsPerPlane: null, totalSheetCount: null, nominalSheetAreaMm2: null, purchasedNominalAreaMm2: null, installedCoveredAreaMm2: null, overlapMm: null, rowCoverageMm: null };
  }
  if (!Number.isFinite(requiredCoveringLengthMm) || requiredCoveringLengthMm > Number.MAX_SAFE_INTEGER) return { ...base, status: "UNSUPPORTED", reasons: ["A szükséges fedési hossz meghaladja a biztonságos numerikus tartományt."], columnsPerPlane: null, rowsPerPlane: null, totalSheetCount: null, nominalSheetAreaMm2: null, purchasedNominalAreaMm2: null, installedCoveredAreaMm2: null, overlapMm: input.longitudinalOverlapMm, rowCoverageMm: null };
  if (input.minimumSheetLengthMm !== null && input.maximumSheetLengthMm !== null && input.minimumSheetLengthMm > input.maximumSheetLengthMm) return { ...calculatedBase, status: "INVALID", reasons: ["A megadott minimum lemezhossz nagyobb a maximumnál."], columnsPerPlane: null, rowsPerPlane: null, totalSheetCount: null, nominalSheetAreaMm2: null, purchasedNominalAreaMm2: null, installedCoveredAreaMm2: null, overlapMm: null, rowCoverageMm: null };
  if (length !== null && ((input.minimumSheetLengthMm !== null && length < input.minimumSheetLengthMm) || (input.maximumSheetLengthMm !== null && length > input.maximumSheetLengthMm))) return { ...calculatedBase, status: "UNSUPPORTED", reasons: ["A kiválasztott lemezhossz a megadott termékhatáron kívül van."], columnsPerPlane: null, rowsPerPlane: null, totalSheetCount: null, nominalSheetAreaMm2: null, purchasedNominalAreaMm2: null, installedCoveredAreaMm2: null, overlapMm: input.longitudinalOverlapMm, rowCoverageMm: null };
  if (length !== null && length < slopeLengthMm && input.longitudinalOverlapMm !== null && input.longitudinalOverlapMm <= 0) return { ...base, status: "INVALID", reasons: ["Toldott kiosztásnál az átlapolásnak nullánál nagyobbnak kell lennie."], columnsPerPlane: null, rowsPerPlane: null, totalSheetCount: null, nominalSheetAreaMm2: null, purchasedNominalAreaMm2: null, installedCoveredAreaMm2: null, overlapMm: input.longitudinalOverlapMm, rowCoverageMm: null };
  if (width === null) reasons.push("A hasznos fedési szélesség hiányzik.");
  if (length === null) reasons.push("A kiválasztott lemezhossz hiányzik.");
  const columns = width === null ? null : ceilDiv(roofLongitudinalLengthMm, width);
  let rows: number | null = null;
  let rowCoverage: number | null = null;
  if (length !== null) {
    if (length >= requiredCoveringLengthMm) { rows = 1; rowCoverage = length; }
    else if (!input.lapCompatibilityConfirmed || input.longitudinalOverlapMm === null) reasons.push("A ferde hosszhoz toldás kell; explicit, kompatibilis átlapolási adat nélkül a kiosztás nem támogatott.");
    else if (input.longitudinalOverlapMm <= 0 || input.longitudinalOverlapMm >= length) reasons.push("Az átlapolásnak nagyobbnak kell lennie nullánál és kisebbnek a lemezhossznál.");
    else {
      const step = length - input.longitudinalOverlapMm;
      rows = 1 + ceilDiv(requiredCoveringLengthMm - length, step);
      rowCoverage = rows * length - (rows - 1) * input.longitudinalOverlapMm;
    }
  }
  const unsupported = reasons.some((reason) => reason.includes("nem támogatott") || reason.includes("kell"));
  if (columns !== null && (columns > 400 || (rows !== null && (!Number.isSafeInteger(rows) || columns * rows * 2 > input.maximumSheetCount)))) {
    return { ...calculatedBase, status: "UNSUPPORTED", reasons: ["A lemezmennyiség meghaladja a számítási biztonsági korlátot."], columnsPerPlane: columns, rowsPerPlane: rows, totalSheetCount: null, nominalSheetAreaMm2: null, purchasedNominalAreaMm2: null, installedCoveredAreaMm2: null, overlapMm: input.longitudinalOverlapMm, rowCoverageMm: rowCoverage };
  }
  const count = columns === null || rows === null ? null : columns * rows * 2;
  const nominalSheetAreaMm2 = input.nominalSheetWidthMm === null || length === null ? null : input.nominalSheetWidthMm * length;
  const purchased = count === null || nominalSheetAreaMm2 === null ? null : count * nominalSheetAreaMm2;
  if ([nominalSheetAreaMm2, purchased].some((value) => value !== null && (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER))) {
    return { ...calculatedBase, status: "UNSUPPORTED", reasons: ["A névleges terület meghaladja a biztonságosan kezelhető numerikus tartományt."], columnsPerPlane: columns, rowsPerPlane: rows, totalSheetCount: null, nominalSheetAreaMm2: null, purchasedNominalAreaMm2: null, installedCoveredAreaMm2: null, overlapMm: input.longitudinalOverlapMm, rowCoverageMm: rowCoverage };
  }
  return {
    status: unsupported ? "UNSUPPORTED" : reasons.length ? "INCOMPLETE" : "VALID", reasons, planeCount: 2, requiredCoveringLengthMm,
    roofLongitudinalLengthMm, slopeLengthMm, roofPlaneAreaMm2: geometry.areas.individualRoofPlaneMm2,
    totalRoofAreaMm2: geometry.areas.combinedRoofMm2, pitchDegrees: geometry.angles.pitchDegrees,
    columnsPerPlane: columns, rowsPerPlane: rows, totalSheetCount: count,
    nominalSheetAreaMm2, purchasedNominalAreaMm2: purchased,
    installedCoveredAreaMm2: count === null ? null : geometry.areas.combinedRoofMm2,
    overlapMm: rows !== null && rows > 1 ? input.longitudinalOverlapMm : 0,
    rowCoverageMm: rows !== null && rowCoverage !== null && rowCoverage < slopeLengthMm ? rowCoverage : null,
  };
}

import { z } from "zod";
import type { CalculatorDefinition } from "@/domain/calculations/engine";
import { gableRoofCalculator, gableRoofInputSchema, type GableRoofOutput } from "./gable-roof";

export const GABLE_METAL_TILE_COVERING_ID = "roof.gable.metal-tile-covering" as const;
export const GABLE_METAL_TILE_COVERING_VERSION = "1.0.0" as const;

const MAX_PRODUCT_DIMENSION_MM = 1_000_000;
const MAX_COLUMNS_PER_PLANE = 400;
const MAX_SHEET_COUNT = 100_000;
export const METAL_TILE_DIMENSION_TOLERANCE_MM = 0.000001;

const positiveMm = z.number().finite().positive().max(MAX_PRODUCT_DIMENSION_MM);
const nonNegativeMm = z.number().finite().nonnegative().max(MAX_PRODUCT_DIMENSION_MM);
const optionalPositiveMm = positiveMm.nullable();
const optionalNonNegativeMm = nonNegativeMm.nullable();
const inputFieldLabels: Record<string, string> = {
  nominalSheetWidthMm: "Névleges lemezszélesség",
  effectiveCoveringWidthMm: "Hasznos fedési szélesség",
  physicalSheetLengthMm: "Fizikai lemezhossz",
  effectiveCoveringLengthMm: "Tényleges fedési hossz",
  minimumPhysicalLengthMm: "Termékminimum",
  maximumPhysicalLengthMm: "Termékmaximum",
  eaveEndAllowanceMm: "Ereszvégi ráhagyás",
  ridgeEndAllowanceMm: "Gerincvégi ráhagyás",
  longitudinalOverlapMm: "Hosszanti átlapolás",
  moduleBaseLengthMm: "Első modul fedési hossza",
  modulePitchMm: "Modulosztás",
  moduleCount: "Modulszám",
  lengthDataSource: "Hosszadat forrása",
};

export const gableMetalTileCoveringInputSchema = z.object({
  nominalSheetWidthMm: optionalPositiveMm,
  effectiveCoveringWidthMm: optionalPositiveMm,
  physicalSheetLengthMm: optionalPositiveMm,
  effectiveCoveringLengthMm: optionalPositiveMm,
  minimumPhysicalLengthMm: optionalPositiveMm,
  maximumPhysicalLengthMm: optionalPositiveMm,
  eaveEndAllowanceMm: optionalNonNegativeMm,
  ridgeEndAllowanceMm: optionalNonNegativeMm,
  longitudinalOverlapMm: optionalNonNegativeMm,
  lengthCompatibilityConfirmed: z.boolean(),
  lengthDataSource: z.string().trim().max(200).nullable(),
  isModular: z.boolean(),
  moduleBaseLengthMm: optionalPositiveMm,
  modulePitchMm: optionalPositiveMm,
  moduleCount: z.number().int().positive().max(100).nullable(),
});

export type GableMetalTileCoveringInput = z.infer<typeof gableMetalTileCoveringInputSchema>;
export const gableMetalTileCalculatorInputSchema = z.object({ roof: gableRoofInputSchema, product: gableMetalTileCoveringInputSchema });
export type GableMetalTileCalculatorInput = z.infer<typeof gableMetalTileCalculatorInputSchema>;
export type GableMetalTileCoveringOutput = Readonly<{
  status: "VALID" | "INCOMPLETE" | "INVALID" | "UNSUPPORTED";
  reasons: readonly string[];
  planeCount: 2;
  roofLongitudinalLengthMm: number;
  roofPlaneAreaMm2: number;
  totalRoofAreaMm2: number;
  slopeLengthMm: number;
  requiredCoveringLengthMm: number | null;
  effectiveCoveringWidthMm: number | null;
  physicalSheetLengthMm: number | null;
  effectiveCoveringLengthMm: number | null;
  columnsPerPlane: number | null;
  sheetsPerPlane: number | null;
  rowsPerPlane: 1 | null;
  totalSheetCount: number | null;
  nominalSheetAreaMm2: number | null;
  totalNominalSheetAreaMm2: number | null;
  moduleDivisionPositionsMm: readonly number[];
}>;

const emptyCounts = {
  columnsPerPlane: null,
  sheetsPerPlane: null,
  rowsPerPlane: null,
  totalSheetCount: null,
  nominalSheetAreaMm2: null,
  totalNominalSheetAreaMm2: null,
  moduleDivisionPositionsMm: [] as readonly number[],
};

function baseOutput(geometry: GableRoofOutput): Pick<GableMetalTileCoveringOutput, "planeCount" | "roofLongitudinalLengthMm" | "roofPlaneAreaMm2" | "totalRoofAreaMm2" | "slopeLengthMm"> {
  const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
  return {
    planeCount: 2,
    roofLongitudinalLengthMm: finite(geometry?.dimensions?.overallRoofLengthMm),
    roofPlaneAreaMm2: finite(geometry?.areas?.individualRoofPlaneMm2),
    totalRoofAreaMm2: finite(geometry?.areas?.combinedRoofMm2),
    slopeLengthMm: finite(geometry?.lengths?.slopeLengthIncludingEaveMm),
  };
}

function validGableGeometry(geometry: GableRoofOutput): boolean {
  if (!geometry || !Array.isArray(geometry.planes) || !geometry.dimensions || !geometry.lengths || !geometry.areas) return false;
  const roofLength = geometry.dimensions.overallRoofLengthMm;
  const slopeLength = geometry.lengths.slopeLengthIncludingEaveMm;
  return geometry.planes.length === 2
    && geometry.planes.every((plane) => Array.isArray(plane.vertices) && plane.vertices.length === 4 && Number.isFinite(plane.areaMm2) && plane.areaMm2 > 0)
    && Number.isFinite(roofLength) && roofLength > 0
    && Number.isFinite(slopeLength) && slopeLength > 0
    && Math.abs(geometry.planes[0].areaMm2 - geometry.planes[1].areaMm2) <= METAL_TILE_DIMENSION_TOLERANCE_MM * Math.max(1, geometry.planes[0].areaMm2)
    && Math.abs(geometry.areas.combinedRoofMm2 - geometry.planes[0].areaMm2 * 2) <= METAL_TILE_DIMENSION_TOLERANCE_MM * Math.max(1, geometry.areas.combinedRoofMm2);
}

function columnsFor(roofLengthMm: number, widthMm: number): number {
  return Math.ceil((roofLengthMm - METAL_TILE_DIMENSION_TOLERANCE_MM) / widthMm);
}

function failed(
  status: GableMetalTileCoveringOutput["status"],
  reasons: readonly string[],
  base: ReturnType<typeof baseOutput>,
  input?: Partial<GableMetalTileCoveringInput>,
  requiredCoveringLengthMm: number | null = null,
): GableMetalTileCoveringOutput {
  return {
    ...base,
    status,
    reasons,
    requiredCoveringLengthMm,
    effectiveCoveringWidthMm: input?.effectiveCoveringWidthMm ?? null,
    physicalSheetLengthMm: input?.physicalSheetLengthMm ?? null,
    effectiveCoveringLengthMm: input?.effectiveCoveringLengthMm ?? null,
    ...emptyCounts,
  };
}

/** One full-length sheet row on each of the two planes from roof.gable. */
export function calculateGableMetalTileCovering(
  geometry: GableRoofOutput,
  rawInput: GableMetalTileCoveringInput,
): GableMetalTileCoveringOutput {
  if (!validGableGeometry(geometry)) {
    const base = baseOutput(geometry);
    return failed("UNSUPPORTED", ["A cserepeslemez-előnézet két szimmetrikus, négyszög alakú nyeregtető-síkot támogat."], base);
  }
  const base = baseOutput(geometry);

  const parsed = gableMetalTileCoveringInputSchema.safeParse(rawInput);
  if (!parsed.success) return failed("INVALID", parsed.error.issues.map((issue) => {
    const key = String(issue.path[0] ?? "");
    const label = inputFieldLabels[key] ?? "Termékadat";
    return `${label}: az érték érvénytelen vagy kívül esik a támogatott tartományon.`;
  }), base);
  const input = parsed.data;

  if (input.effectiveCoveringWidthMm !== null && input.nominalSheetWidthMm !== null
    && input.effectiveCoveringWidthMm - input.nominalSheetWidthMm > METAL_TILE_DIMENSION_TOLERANCE_MM) {
    return failed("INVALID", ["A hasznos fedési szélesség nem lehet nagyobb a névleges lemezszélességnél."], base, input);
  }
  if (input.minimumPhysicalLengthMm !== null && input.maximumPhysicalLengthMm !== null
    && input.minimumPhysicalLengthMm - input.maximumPhysicalLengthMm > METAL_TILE_DIMENSION_TOLERANCE_MM) {
    return failed("INVALID", ["A megadott minimális fizikai lemezhossz nagyobb a maximumnál."], base, input);
  }
  if (input.longitudinalOverlapMm !== null && input.longitudinalOverlapMm > METAL_TILE_DIMENSION_TOLERANCE_MM) {
    return failed("UNSUPPORTED", ["A hosszirányú toldás és átlapolás ebben az egysoros, teljes hosszúságú előnézetben nem támogatott."], base, input);
  }

  const requiredValues = [input.eaveEndAllowanceMm, input.ridgeEndAllowanceMm];
  if (requiredValues.some((value) => value === null)) {
    return failed("INCOMPLETE", ["Add meg külön az eresz- és gerincvégi ráhagyást; ha nem alkalmazandó, írj 0 mm-t."], base, input);
  }
  if (input.longitudinalOverlapMm === null) {
    return failed("INCOMPLETE", ["Add meg a hosszirányú átlapolást; ha nem alkalmazandó, írj 0 mm-t."], base, input);
  }
  const requiredCoveringLengthMm = geometry.lengths.slopeLengthIncludingEaveMm
    + input.eaveEndAllowanceMm! + input.ridgeEndAllowanceMm!;
  if (!Number.isFinite(requiredCoveringLengthMm) || requiredCoveringLengthMm > MAX_PRODUCT_DIMENSION_MM) {
    return failed("UNSUPPORTED", ["A szükséges fedési hossz túllépi a támogatott numerikus tartományt."], base, input);
  }

  const missing: string[] = [];
  if (input.nominalSheetWidthMm === null) missing.push("A névleges lemezszélesség hiányzik.");
  if (input.effectiveCoveringWidthMm === null) missing.push("A hasznos fedési szélesség hiányzik.");
  if (input.physicalSheetLengthMm === null) missing.push("A fizikai lemezhossz hiányzik.");
  if (input.effectiveCoveringLengthMm === null) missing.push("A tényleges fedési hossz hiányzik.");
  if (!input.lengthCompatibilityConfirmed || !input.lengthDataSource) {
    missing.push("A kiválasztott hossz gyártói kompatibilitása és annak adatforrása nincs megadva.");
  }

  let moduleDivisionPositionsMm: number[] = [];
  if (input.isModular) {
    if (input.moduleBaseLengthMm === null || input.modulePitchMm === null || input.moduleCount === null) {
      missing.push("Moduláris termékhez add meg az első modul fedési hosszát, az osztást és a modulszámot.");
    } else {
      const declaredEffectiveLength = input.moduleBaseLengthMm + input.moduleCount * input.modulePitchMm;
      if (!Number.isFinite(declaredEffectiveLength) || declaredEffectiveLength > MAX_PRODUCT_DIMENSION_MM) {
        return failed("UNSUPPORTED", ["A modulszerződés hossza túllépi a támogatott numerikus tartományt."], base, input, requiredCoveringLengthMm);
      }
      if (input.effectiveCoveringLengthMm !== null
        && Math.abs(declaredEffectiveLength - input.effectiveCoveringLengthMm) > METAL_TILE_DIMENSION_TOLERANCE_MM) {
        return failed("INVALID", ["A termékadatokból számított modulhossz nem egyezik a megadott tényleges fedési hosszal."], base, input, requiredCoveringLengthMm);
      }
      moduleDivisionPositionsMm = Array.from({ length: input.moduleCount }, (_, index) => input.moduleBaseLengthMm! + index * input.modulePitchMm!);
    }
  } else if (input.moduleBaseLengthMm !== null || input.modulePitchMm !== null || input.moduleCount !== null) {
    return failed("INVALID", ["Nem moduláris terméknél ne adj meg modulméreteket."], base, input, requiredCoveringLengthMm);
  }

  if (missing.length) return failed("INCOMPLETE", missing, base, input, requiredCoveringLengthMm);

  const physicalLength = input.physicalSheetLengthMm!;
  if ((input.minimumPhysicalLengthMm !== null && physicalLength + METAL_TILE_DIMENSION_TOLERANCE_MM < input.minimumPhysicalLengthMm)
    || (input.maximumPhysicalLengthMm !== null && physicalLength - METAL_TILE_DIMENSION_TOLERANCE_MM > input.maximumPhysicalLengthMm)) {
    return failed("UNSUPPORTED", ["A fizikai lemezhossz kívül esik a megadott termékhatáron."], base, input, requiredCoveringLengthMm);
  }
  const effectiveLength = input.effectiveCoveringLengthMm!;
  if (effectiveLength - physicalLength > METAL_TILE_DIMENSION_TOLERANCE_MM) {
    return failed("INVALID", ["A tényleges fedési hossz nem lehet nagyobb a fizikai lemezhossznál."], base, input, requiredCoveringLengthMm);
  }
  if (effectiveLength + METAL_TILE_DIMENSION_TOLERANCE_MM < requiredCoveringLengthMm) {
    return failed("UNSUPPORTED", ["A megadott tényleges fedési hossz nem éri el a szükséges ferde tetőhosszt és végi ráhagyásokat. Egysoros kiosztás készült; toldás nem támogatott."], base, input, requiredCoveringLengthMm);
  }

  const columns = columnsFor(geometry.dimensions.overallRoofLengthMm, input.effectiveCoveringWidthMm!);
  const count = columns * 2;
  if (!Number.isSafeInteger(columns) || columns > MAX_COLUMNS_PER_PLANE || count > MAX_SHEET_COUNT) {
    return failed("UNSUPPORTED", ["Az oszlopszám túllépi a sematikus előnézet számítási korlátját."], base, input, requiredCoveringLengthMm);
  }
  const nominalSheetAreaMm2 = input.nominalSheetWidthMm! * physicalLength;
  const totalNominalSheetAreaMm2 = nominalSheetAreaMm2 * count;
  // Decimal millimetres are allowed; areas need to remain finite and in safe numeric range.
  if (![nominalSheetAreaMm2, totalNominalSheetAreaMm2].every((value) => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER)) {
    return failed("UNSUPPORTED", ["A névleges lemezterület túllépi a biztonságos numerikus tartományt."], base, input, requiredCoveringLengthMm);
  }

  return {
    ...base,
    status: "VALID",
    reasons: [],
    requiredCoveringLengthMm,
    effectiveCoveringWidthMm: input.effectiveCoveringWidthMm,
    physicalSheetLengthMm: physicalLength,
    effectiveCoveringLengthMm: effectiveLength,
    columnsPerPlane: columns,
    sheetsPerPlane: columns,
    rowsPerPlane: 1,
    totalSheetCount: count,
    nominalSheetAreaMm2,
    totalNominalSheetAreaMm2,
    moduleDivisionPositionsMm,
  };
}

const nullableNumber = z.number().finite().nullable();
export const gableMetalTileCoveringOutputSchema: z.ZodType<GableMetalTileCoveringOutput> = z.object({
  status: z.enum(["VALID", "INCOMPLETE", "INVALID", "UNSUPPORTED"]),
  reasons: z.array(z.string()),
  planeCount: z.literal(2),
  roofLongitudinalLengthMm: z.number().finite(),
  roofPlaneAreaMm2: z.number().finite(),
  totalRoofAreaMm2: z.number().finite(),
  slopeLengthMm: z.number().finite(),
  requiredCoveringLengthMm: nullableNumber,
  effectiveCoveringWidthMm: nullableNumber,
  physicalSheetLengthMm: nullableNumber,
  effectiveCoveringLengthMm: nullableNumber,
  columnsPerPlane: z.number().int().nullable(),
  sheetsPerPlane: z.number().int().nullable(),
  rowsPerPlane: z.literal(1).nullable(),
  totalSheetCount: z.number().int().nullable(),
  nominalSheetAreaMm2: nullableNumber,
  totalNominalSheetAreaMm2: nullableNumber,
  moduleDivisionPositionsMm: z.array(z.number().finite()),
});

export const gableMetalTileCoveringCalculator: CalculatorDefinition<GableMetalTileCalculatorInput, GableMetalTileCoveringOutput> = {
  id: GABLE_METAL_TILE_COVERING_ID,
  implementationVersion: GABLE_METAL_TILE_COVERING_VERSION,
  inputSchemaVersion: "1.0.0",
  resultSchemaVersion: "1.0.0",
  inputSchema: gableMetalTileCalculatorInputSchema,
  outputSchema: gableMetalTileCoveringOutputSchema,
  calculate: (input) => calculateGableMetalTileCovering(gableRoofCalculator.calculate(input.roof), input.product),
};

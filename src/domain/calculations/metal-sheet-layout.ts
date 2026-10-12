import { z } from "zod";
import { calculationError } from "@/domain/calculations/errors";
import type { CalculatorDefinition } from "@/domain/calculations/engine";

export const METAL_SHEET_LAYOUT_CALCULATOR_ID = "covering.metal-sheets.layout" as const;
export const METAL_SHEET_LAYOUT_CALCULATOR_VERSION = "1.0.0" as const;
export const METAL_SHEET_LAYOUT_INPUT_SCHEMA_VERSION = "1.0.0" as const;
export const METAL_SHEET_LAYOUT_RESULT_SCHEMA_VERSION = "1.0.0" as const;
export const MAX_RENDERABLE_STRIPS_PER_PLANE = 400;

const positiveMm = z.number().finite().positive();
const optionalPositiveMm = positiveMm.nullable();
const optionalNonNegativeMm = z.number().finite().nonnegative().nullable();

export const metalSheetLayoutInputSchema = z.object({
  roof: z.object({
    startXmm: z.number().finite(),
    endXmm: z.number().finite(),
    slopeLengthMm: positiveMm,
  }),
  effectiveCoveringWidthMm: positiveMm,
  nominalSheetWidthMm: optionalPositiveMm,
  alignment: z.enum(["left", "right"]),
  minimumSheetLengthMm: optionalPositiveMm,
  maximumSheetLengthMm: optionalPositiveMm,
  endAllowanceMm: optionalNonNegativeMm,
});

export type MetalSheetAlignment = "left" | "right";
export type MetalSheetLayoutInput = z.infer<typeof metalSheetLayoutInputSchema>;
export type MetalSheetStrip = Readonly<{
  id: string;
  planeSide: "left" | "right";
  indexFromStart: number;
  startXmm: number;
  endXmm: number;
  effectiveWidthMm: number;
  isPartial: boolean;
}>;
export type ManufacturingIssue = Readonly<{
  code: "BELOW_MINIMUM_LENGTH" | "ABOVE_MAXIMUM_LENGTH";
  message: string;
}>;
export type MetalSheetLayoutOutput = Readonly<{
  roofLongitudinalLengthMm: number;
  effectiveCoveringWidthMm: number;
  nominalSheetWidthMm: number | null;
  alignment: MetalSheetAlignment;
  stripsPerPlane: number;
  totalStripCount: number;
  fullWidthIntervalsPerPlane: number;
  partialEdgeIntervalMm: number | null;
  geometricSheetLengthMm: number;
  endAllowanceMm: number | null;
  provisionalSheetLengthMm: number;
  manufacturingStatus: "not_evaluated" | "within_limits" | "outside_limits";
  manufacturingIssues: readonly ManufacturingIssue[];
  strips: readonly MetalSheetStrip[];
}>;

function stripsForPlane(input: MetalSheetLayoutInput, planeSide: "left" | "right", stripsPerPlane: number, partialWidthMm: number | null): MetalSheetStrip[] {
  const prefix = planeSide === "left" ? "L" : "R";
  return Array.from({ length: stripsPerPlane }, (_, index) => {
    const isPartial = partialWidthMm !== null && index === stripsPerPlane - 1;
    const width = isPartial ? partialWidthMm : input.effectiveCoveringWidthMm;
    const startXmm = input.alignment === "left"
      ? input.roof.startXmm + index * input.effectiveCoveringWidthMm
      : input.roof.endXmm - index * input.effectiveCoveringWidthMm - width;
    return {
      id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
      planeSide,
      indexFromStart: index + 1,
      startXmm,
      endXmm: startXmm + width,
      effectiveWidthMm: width,
      isPartial,
    };
  });
}

export function calculateMetalSheetLayout(input: MetalSheetLayoutInput): MetalSheetLayoutOutput {
  const roofLongitudinalLengthMm = input.roof.endXmm - input.roof.startXmm;
  if (roofLongitudinalLengthMm <= 0) throw calculationError("INVALID_GEOMETRY", "A tető hosszanti kezdő- és végpontja érvénytelen.");
  if (input.minimumSheetLengthMm !== null && input.maximumSheetLengthMm !== null && input.minimumSheetLengthMm > input.maximumSheetLengthMm) {
    throw calculationError("VALIDATION_ERROR", "A minimális lemezhossz nem lehet nagyobb a maximálisnál.");
  }

  const stripsPerPlane = Math.ceil(roofLongitudinalLengthMm / input.effectiveCoveringWidthMm);
  if (stripsPerPlane > MAX_RENDERABLE_STRIPS_PER_PLANE) {
    throw calculationError("UNSUPPORTED_OPERATION", `A kiosztás tetősíkonként ${stripsPerPlane} sávot igényel; a biztonságosan megjeleníthető határ ${MAX_RENDERABLE_STRIPS_PER_PLANE}.`);
  }
  const fullWidthIntervalsPerPlane = Math.floor(roofLongitudinalLengthMm / input.effectiveCoveringWidthMm);
  const remainder = roofLongitudinalLengthMm % input.effectiveCoveringWidthMm;
  const partialEdgeIntervalMm = remainder === 0 ? null : remainder;
  const provisionalSheetLengthMm = input.roof.slopeLengthMm + (input.endAllowanceMm ?? 0);
  const readableMm = (value: number) => Number(value.toFixed(3));
  const manufacturingIssues: ManufacturingIssue[] = [];
  if (input.minimumSheetLengthMm !== null && provisionalSheetLengthMm < input.minimumSheetLengthMm) {
    manufacturingIssues.push({ code: "BELOW_MINIMUM_LENGTH", message: `Az ideiglenes ${readableMm(provisionalSheetLengthMm)} mm lemezhossz kisebb a megadott ${readableMm(input.minimumSheetLengthMm)} mm minimumnál.` });
  }
  if (input.maximumSheetLengthMm !== null && provisionalSheetLengthMm > input.maximumSheetLengthMm) {
    manufacturingIssues.push({ code: "ABOVE_MAXIMUM_LENGTH", message: `Az ideiglenes ${readableMm(provisionalSheetLengthMm)} mm lemezhossz meghaladja a megadott ${readableMm(input.maximumSheetLengthMm)} mm maximumot.` });
  }
  const hasManufacturingLimits = input.minimumSheetLengthMm !== null || input.maximumSheetLengthMm !== null;
  const left = stripsForPlane(input, "left", stripsPerPlane, partialEdgeIntervalMm);
  const right = stripsForPlane(input, "right", stripsPerPlane, partialEdgeIntervalMm);

  return {
    roofLongitudinalLengthMm,
    effectiveCoveringWidthMm: input.effectiveCoveringWidthMm,
    nominalSheetWidthMm: input.nominalSheetWidthMm,
    alignment: input.alignment,
    stripsPerPlane,
    totalStripCount: stripsPerPlane * 2,
    fullWidthIntervalsPerPlane,
    partialEdgeIntervalMm,
    geometricSheetLengthMm: input.roof.slopeLengthMm,
    endAllowanceMm: input.endAllowanceMm,
    provisionalSheetLengthMm,
    manufacturingStatus: !hasManufacturingLimits ? "not_evaluated" : manufacturingIssues.length ? "outside_limits" : "within_limits",
    manufacturingIssues,
    strips: [...left, ...right],
  };
}

const stripSchema = z.object({ id: z.string(), planeSide: z.enum(["left", "right"]), indexFromStart: z.number().int().positive(), startXmm: z.number(), endXmm: z.number(), effectiveWidthMm: z.number().positive(), isPartial: z.boolean() });
const issueSchema = z.object({ code: z.enum(["BELOW_MINIMUM_LENGTH", "ABOVE_MAXIMUM_LENGTH"]), message: z.string() });

export const metalSheetLayoutCalculator: CalculatorDefinition<MetalSheetLayoutInput, MetalSheetLayoutOutput> = {
  id: METAL_SHEET_LAYOUT_CALCULATOR_ID,
  implementationVersion: METAL_SHEET_LAYOUT_CALCULATOR_VERSION,
  inputSchemaVersion: METAL_SHEET_LAYOUT_INPUT_SCHEMA_VERSION,
  resultSchemaVersion: METAL_SHEET_LAYOUT_RESULT_SCHEMA_VERSION,
  inputSchema: metalSheetLayoutInputSchema,
  outputSchema: z.object({
    roofLongitudinalLengthMm: z.number().positive(), effectiveCoveringWidthMm: z.number().positive(), nominalSheetWidthMm: z.number().positive().nullable(), alignment: z.enum(["left", "right"]),
    stripsPerPlane: z.number().int().positive(), totalStripCount: z.number().int().positive(), fullWidthIntervalsPerPlane: z.number().int().nonnegative(), partialEdgeIntervalMm: z.number().positive().nullable(),
    geometricSheetLengthMm: z.number().positive(), endAllowanceMm: z.number().nonnegative().nullable(), provisionalSheetLengthMm: z.number().positive(),
    manufacturingStatus: z.enum(["not_evaluated", "within_limits", "outside_limits"]), manufacturingIssues: z.array(issueSchema), strips: z.array(stripSchema),
  }) as z.ZodType<MetalSheetLayoutOutput>,
  calculate: calculateMetalSheetLayout,
};

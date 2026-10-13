import { z } from "zod";
import { calculationError } from "@/domain/calculations/errors";
import { resultIssueSchema } from "@/domain/calculations/contracts";
import type { CalculatorDefinition } from "@/domain/calculations/engine";
import { buildProfileGeometry, MAX_PROFILE_EXTENT_MM, type ProfileGeometry } from "@/domain/calculations/profile-geometry";

export const SHEET_METAL_PROFILE_CALCULATOR_ID = "sheet_metal.profiles.flat-pattern" as const;
export const SHEET_METAL_PROFILE_CALCULATOR_VERSION = "1.0.0" as const;
export const SHEET_METAL_PROFILE_INPUT_SCHEMA_VERSION = "1.0.0" as const;
export const SHEET_METAL_PROFILE_RESULT_SCHEMA_VERSION = "1.0.0" as const;

// Software precision envelope in canonical millimetres, not manufacturing limits or tolerances.
export const MIN_PROFILE_DIMENSION_MM = 0.000001;
export const MIN_PROFILE_TURN_DEG = 0.000001;
export const MAX_PROFILE_BENDS = 50;

const positiveMm = z.number().finite().min(MIN_PROFILE_DIMENSION_MM).max(MAX_PROFILE_EXTENT_MM);
const sourceSchema = z.object({
  kind: z.enum(["user_provided", "catalog_snapshot", "machine_calibration", "demo"]),
  label: z.string().trim().min(1).max(200),
  sourceUrl: z.url().nullable().optional(),
  sourceDate: z.string().trim().max(40).nullable().optional(),
  catalogVariantId: z.uuid().nullable().optional(),
  machineId: z.string().trim().min(1).max(120).nullable().optional(),
  toolingId: z.string().trim().min(1).max(120).nullable().optional(),
  calibrationId: z.string().trim().min(1).max(120).nullable().optional(),
  manuallyOverridden: z.boolean().optional(),
}).strict();

const straightSchema = z.object({
  id: z.string().trim().min(1).max(120),
  tangentLengthMm: positiveMm,
  dimensionSource: sourceSchema,
}).strict();

const allowanceSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("explicit_ba"), baMm: positiveMm, source: sourceSchema }).strict(),
  z.object({ mode: z.literal("k_factor"), kFactor: z.number().finite().min(0).max(1), source: sourceSchema }).strict(),
  z.object({ mode: z.literal("unknown") }).strict(),
]);

const bendSchema = z.object({
  id: z.string().trim().min(1).max(120),
  signedTurnDeg: z.number().finite().refine((value) => Math.abs(value) >= MIN_PROFILE_TURN_DEG && Math.abs(value) < 180,
    "A signedTurnDeg előjeles elfordulás; abszolút értéke 0 és 180 fok között szükséges."),
  insideRadiusMm: positiveMm,
  allowance: allowanceSchema,
}).strict();

export const sheetMetalProfileInputSchema = z.object({
  schemaVersion: z.literal(SHEET_METAL_PROFILE_INPUT_SCHEMA_VERSION),
  profileId: z.uuid().optional(),
  label: z.string().trim().min(1).max(160),
  coordinateConvention: z.literal("x-right-y-up", { error: "Csak x-right-y-up koordinátarendszer támogatott." }),
  dimensionConvention: z.enum(["finished_tangent", "outside_virtual_sharp", "inside_virtual_sharp"]),
  thicknessMm: positiveMm,
  material: z.object({ catalogVariantId: z.uuid().optional(), materialSpec: z.string().trim().max(200).optional(), provenance: sourceSchema }).strict().optional(),
  straights: z.array(straightSchema).min(1).max(MAX_PROFILE_BENDS + 1),
  bends: z.array(bendSchema).max(MAX_PROFILE_BENDS),
  formedRunLengthMm: positiveMm.optional(),
  notes: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
}).strict().superRefine((input, context) => {
  if (input.straights.length !== input.bends.length + 1) {
    context.addIssue({ code: "custom", path: ["straights"], message: "A nyitott profilhoz pontosan eggyel több egyenes kell, mint hajtás." });
  }
  const ids = new Set<string>();
  for (const [kind, items] of [["straights", input.straights], ["bends", input.bends]] as const) {
    items.forEach((item, index) => {
      if (ids.has(item.id)) context.addIssue({ code: "custom", path: [kind, index, "id"], message: "A profil elemazonosítói legyenek egyediek." });
      ids.add(item.id);
    });
  }
});

export type SheetMetalProfileInput = z.infer<typeof sheetMetalProfileInputSchema>;

const pointSchema = z.object({ xMm: z.number().finite(), yMm: z.number().finite() });
const lineSchema = z.object({ kind: z.literal("line"), id: z.string(), start: pointSchema, end: pointSchema });
const arcSchema = z.object({ kind: z.literal("arc"), id: z.string(), start: pointSchema, end: pointSchema,
  center: pointSchema, radiusMm: z.number().finite().positive(), startAngleRad: z.number().finite(), sweepRad: z.number().finite() });
const primitiveSchema = z.discriminatedUnion("kind", [lineSchema, arcSchema]);
const geometrySchema = z.object({
  coordinateConvention: z.literal("x-right-y-up"),
  segments: z.array(z.object({ id: z.string(), tangentLengthMm: z.number().finite().positive(), start: pointSchema, end: pointSchema, directionRad: z.number().finite() })),
  bends: z.array(z.object({ id: z.string(), entry: pointSchema, exit: pointSchema, center: pointSchema, signedTurnRad: z.number().finite(), innerArc: arcSchema, outerArc: arcSchema })),
  centerline: z.array(primitiveSchema), leftContour: z.array(primitiveSchema), rightContour: z.array(primitiveSchema), boundary: z.array(primitiveSchema),
  tangentPointsMm: z.array(pointSchema),
  boundsMm: z.object({ minXmm: z.number().finite(), maxXmm: z.number().finite(), minYmm: z.number().finite(), maxYmm: z.number().finite() }),
  selfIntersectionStatus: z.literal("clear"),
});

const classificationSchema = z.enum(["GEOMETRICALLY_DETERMINED", "PARAMETER_BASED_ESTIMATE", "INCOMPLETE", "UNSUPPORTED"]);
export const sheetMetalProfileOutputSchema = z.object({
  schemaVersion: z.literal(SHEET_METAL_PROFILE_RESULT_SCHEMA_VERSION),
  geometry: geometrySchema,
  bends: z.array(z.object({
    id: z.string(), turnDeg: z.number().finite(), includedAngleDeg: z.number().finite(), thetaRad: z.number().finite(),
    innerRadiusMm: z.number().finite().positive(), neutralRadiusMm: z.number().finite().nullable(),
    allowanceMode: z.enum(["explicit_ba", "k_factor", "unknown"]), allowanceMm: z.number().finite().positive().nullable(),
    outsideSetbackMm: z.number().finite().nullable(), bendDeductionMm: z.number().finite().nullable(),
    sourceSnapshot: sourceSchema.nullable(),
  })),
  flatPattern: z.object({ widthMm: z.number().finite().positive().nullable(), bendLineOffsetsMm: z.array(z.number().finite()).nullable(),
    method: z.enum(["explicit_ba", "k_factor", "mixed", "no_bends"]).nullable(), classification: classificationSchema, issues: z.array(resultIssueSchema) }),
  classificationByField: z.object({ geometry: classificationSchema, flatPattern: classificationSchema }),
  issues: z.array(resultIssueSchema),
  parameterSnapshot: z.array(z.object({ bendId: z.string(), mode: z.enum(["explicit_ba", "k_factor", "unknown"]), value: z.number().finite().nullable(), source: sourceSchema.nullable() })),
});

export type SheetMetalProfileOutput = Omit<z.infer<typeof sheetMetalProfileOutputSchema>, "geometry"> & { geometry: ProfileGeometry };

function checked(value: number, label: string): number {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_PROFILE_EXTENT_MM) {
    throw calculationError("NUMERIC_OVERFLOW", `${label} nem ábrázolható biztonságosan ebben a profilmodellben.`);
  }
  return value;
}

function sum(values: readonly number[], label: string): number {
  let total = 0, correction = 0;
  for (const value of values) {
    const adjusted = value - correction, next = total + adjusted;
    correction = (next - total) - adjusted;
    total = checked(next, label);
  }
  return total;
}

function calculateBend(bend: SheetMetalProfileInput["bends"][number], thicknessMm: number): SheetMetalProfileOutput["bends"][number] {
  const thetaRad = checked(Math.abs(bend.signedTurnDeg) * Math.PI / 180, `${bend.id}.theta`);
  const mode = bend.allowance.mode;
  const neutralRadiusMm = mode === "k_factor" ? checked(bend.insideRadiusMm + bend.allowance.kFactor * thicknessMm, `${bend.id}.neutralRadius`) : null;
  const allowanceMm = mode === "explicit_ba" ? bend.allowance.baMm
    : neutralRadiusMm === null ? null : checked(thetaRad * neutralRadiusMm, `${bend.id}.allowance`);
  if (allowanceMm !== null && allowanceMm <= 0) throw calculationError("NUMERIC_OVERFLOW", "A hajlítási nadd nem maradt pozitív.", ["bends", bend.id]);
  if (allowanceMm !== null && allowanceMm < MIN_PROFILE_DIMENSION_MM) {
    throw calculationError("NUMERIC_OVERFLOW", "A hajlítási nadd kisebb a dokumentált numerikus felbontásnál.", ["bends", bend.id]);
  }
  const rawSetback = (bend.insideRadiusMm + thicknessMm) * Math.tan(thetaRad / 2);
  const outsideSetbackMm = Number.isFinite(rawSetback) && rawSetback <= MAX_PROFILE_EXTENT_MM ? rawSetback : null;
  const bendDeductionMm = outsideSetbackMm === null || allowanceMm === null ? null
    : Number.isFinite(2 * outsideSetbackMm - allowanceMm) && Math.abs(2 * outsideSetbackMm - allowanceMm) <= MAX_PROFILE_EXTENT_MM
      ? 2 * outsideSetbackMm - allowanceMm : null;
  return { id: bend.id, turnDeg: bend.signedTurnDeg, includedAngleDeg: 180 - Math.abs(bend.signedTurnDeg), thetaRad,
    innerRadiusMm: bend.insideRadiusMm, neutralRadiusMm, allowanceMode: mode, allowanceMm,
    outsideSetbackMm, bendDeductionMm, sourceSnapshot: mode === "unknown" ? null : bend.allowance.source };
}

export function calculateSheetMetalProfile(input: SheetMetalProfileInput): SheetMetalProfileOutput {
  if (input.dimensionConvention !== "finished_tangent") {
    throw calculationError("UNSUPPORTED_OPERATION", "Csak készállapotú tangensméret támogatott; külső/belső csúcsméret konverziója nem támogatott.", ["dimensionConvention"]);
  }
  const geometry: ProfileGeometry = buildProfileGeometry(input);
  const bends = input.bends.map((bend) => calculateBend(bend, input.thicknessMm));
  const incomplete = bends.some((bend) => bend.allowanceMm === null);
  const flatIssues: SheetMetalProfileOutput["issues"] = incomplete ? bends.flatMap((bend, index) => bend.allowanceMm === null
    ? [{ code: "MISSING_BEND_PARAMETER", message: "A hajtáshoz nincs BA vagy K; a terítékszélesség nem számítható.", severity: "warning" as const, path: ["bends", String(index), "allowance"] }] : []) : [];
  const parameterIssues: SheetMetalProfileOutput["issues"] = bends.some((bend) => bend.sourceSnapshot?.kind === "machine_calibration")
    ? [{ code: "CALIBRATION_UNVERIFIED", message: "A gépi kalibrációs hivatkozás ebben a domainfázisban nem ellenőrzött; az eredmény paraméteralapú becslés.", severity: "warning", path: ["bends"] }] : [];
  input.bends.forEach((bend, index) => {
    if (bend.allowance.mode !== "explicit_ba") return;
    const theta = Math.abs(bend.signedTurnDeg) * Math.PI / 180;
    const lower = theta * bend.insideRadiusMm, upper = theta * (bend.insideRadiusMm + input.thicknessMm);
    if (bend.allowance.baMm < lower || bend.allowance.baMm > upper) {
      parameterIssues.push({ code: "BA_OUTSIDE_IDEAL_NEUTRAL_RANGE", message: "Az explicit BA kívül esik az egyszerű semleges tengelyű körívmodell tartományán; a megadott érték alkalmazhatósága külön ellenőrizendő.", severity: "warning", path: ["bends", String(index), "allowance"] });
    }
  });
  const modes = new Set(bends.map((bend) => bend.allowanceMode));
  const method: SheetMetalProfileOutput["flatPattern"]["method"] = incomplete ? null : bends.length === 0 ? "no_bends"
    : modes.size === 1 && modes.has("explicit_ba") ? "explicit_ba" : modes.size === 1 && modes.has("k_factor") ? "k_factor" : "mixed";
  const widthMm = incomplete ? null : sum([...input.straights.map((straight) => straight.tangentLengthMm), ...bends.map((bend) => bend.allowanceMm ?? 0)], "flatPattern.widthMm");
  const bendLineOffsetsMm: number[] | null = incomplete ? null : [];
  if (bendLineOffsetsMm) {
    let progressed = 0;
    bends.forEach((bend, index) => {
      progressed = sum([progressed, input.straights[index].tangentLengthMm], "flatPattern.progress");
      bendLineOffsetsMm.push(checked(progressed + (bend.allowanceMm ?? 0) / 2, "flatPattern.bendLine"));
      progressed = sum([progressed, bend.allowanceMm ?? 0], "flatPattern.progress");
    });
  }
  const classification = incomplete ? "INCOMPLETE" : bends.length === 0 ? "GEOMETRICALLY_DETERMINED" : "PARAMETER_BASED_ESTIMATE";
  const issues = [...flatIssues, ...parameterIssues];
  return { schemaVersion: SHEET_METAL_PROFILE_RESULT_SCHEMA_VERSION, geometry, bends,
    flatPattern: { widthMm, bendLineOffsetsMm, method, classification, issues },
    classificationByField: { geometry: "GEOMETRICALLY_DETERMINED", flatPattern: classification }, issues,
    parameterSnapshot: input.bends.map((bend) => ({ bendId: bend.id, mode: bend.allowance.mode,
      value: bend.allowance.mode === "explicit_ba" ? bend.allowance.baMm : bend.allowance.mode === "k_factor" ? bend.allowance.kFactor : null,
      source: bend.allowance.mode === "unknown" ? null : bend.allowance.source })) };
}

export const sheetMetalProfileCalculator: CalculatorDefinition<SheetMetalProfileInput, SheetMetalProfileOutput> = {
  id: SHEET_METAL_PROFILE_CALCULATOR_ID,
  implementationVersion: SHEET_METAL_PROFILE_CALCULATOR_VERSION,
  inputSchemaVersion: SHEET_METAL_PROFILE_INPUT_SCHEMA_VERSION,
  resultSchemaVersion: SHEET_METAL_PROFILE_RESULT_SCHEMA_VERSION,
  inputSchema: sheetMetalProfileInputSchema,
  outputSchema: sheetMetalProfileOutputSchema,
  calculate: calculateSheetMetalProfile,
};

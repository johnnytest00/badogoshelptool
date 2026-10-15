import { z } from "zod";
import { calculationError } from "@/domain/calculations/errors";
import type { CalculatorDefinition } from "@/domain/calculations/engine";

export const GUTTER_MATERIAL_CALCULATOR_ID = "gutters.material-estimate" as const;
export const GUTTER_MATERIAL_CALCULATOR_VERSION = "1.0.0" as const;
export const GUTTER_MATERIAL_INPUT_SCHEMA_VERSION = "1.0.0" as const;
export const GUTTER_MATERIAL_RESULT_SCHEMA_VERSION = "1.0.0" as const;

const positiveMm = z.number().finite().positive();
const nonNegative = z.number().finite().nonnegative();
const runSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  lengthMm: positiveMm,
  description: z.string().trim().max(500).optional().default(""),
  measurementSource: z.enum(["site_measurement", "drawing", "demo", "user_provided"]),
  roofEdge: z.object({
    revisionId: z.string().uuid(), edgeId: z.string().trim().min(1).max(80),
    roofModelId: z.string().uuid().optional(), calculationId: z.string().uuid().optional(), calculationRevisionId: z.string().uuid().optional(),
    suggestedLengthMm: positiveMm.optional(), lengthOverridden: z.boolean().optional(),
  }).nullable().optional().default(null),
  bracketSpacingMm: positiveMm.nullable().optional().default(null),
});

const manualComponentSchema = z.object({
  id: z.string().trim().min(1).max(80),
  category: z.enum(["end_cap", "connector", "bracket", "outlet", "downpipe", "elbow", "accessory"]),
  quantity: nonNegative,
  note: z.string().trim().max(300).optional().default(""),
});

const downpipeSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  lengthMm: positiveMm,
  commercialLengthMm: positiveMm,
  selectedBends: z.number().finite().int().nonnegative(),
  relatedAccessories: z.array(z.object({ name: z.string().trim().min(1).max(160), quantity: nonNegative })).default([]),
});

export const gutterMaterialInputSchema = z.object({
  gutterStockLengthMm: positiveMm,
  runs: z.array(runSchema).min(1).max(200),
  downpipes: z.array(downpipeSchema).max(100).default([]),
  manualComponents: z.array(manualComponentSchema).max(500).default([]),
});

export type GutterMaterialInput = z.infer<typeof gutterMaterialInputSchema>;
export type GutterComponentCategory = z.infer<typeof manualComponentSchema>["category"];
export type GutterMaterialOutput = Readonly<{
  gutterRuns: readonly Readonly<{
    id: string;
    name: string;
    lengthMm: number;
    stockSections: number;
    remainderMm: number | null;
    bracketEstimate: number | null;
    bracketBasis: string | null;
  }>[];
  downpipeRuns: readonly Readonly<{
    id: string;
    name: string;
    lengthMm: number;
    stockSections: number;
    remainderMm: number | null;
    selectedBends: number;
  }>[];
  componentQuantities: readonly Readonly<{ category: GutterComponentCategory | "gutter_section" | "downpipe_section"; quantity: number; source: "calculated" | "manual"; basis: string }>[];
  totals: Readonly<{ gutterStockSections: number; downpipeStockSections: number; totalManualComponents: number }>;
  assumptions: readonly string[];
  warnings: readonly string[];
}>;

function safe(value: number, label: string): number {
  if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER) throw calculationError("NUMERIC_OVERFLOW", `${label} nem ábrázolható biztonságosan.`);
  return value;
}

function sections(lengthMm: number, stockLengthMm: number): { count: number; remainder: number | null } {
  const count = Math.ceil(lengthMm / stockLengthMm);
  const remainder = lengthMm % stockLengthMm;
  return { count: safe(count, "A szálak száma"), remainder: remainder === 0 ? null : safe(remainder, "A maradék hossz") };
}

function calculateGutterMaterial(input: GutterMaterialInput): GutterMaterialOutput {
  const ids = new Set<string>();
  for (const run of input.runs) {
    if (ids.has(run.id)) throw calculationError("VALIDATION_ERROR", `Ismétlődő ereszszakasz-azonosító: ${run.id}.`);
    ids.add(run.id);
  }
  for (const run of input.downpipes) {
    if (ids.has(run.id)) throw calculationError("VALIDATION_ERROR", `Ismétlődő szakasz-azonosító: ${run.id}.`);
    ids.add(run.id);
  }
  const assumptions = [
    "Az ereszszakaszok egymástól függetlenül kerülnek előzetes szálbecslésre.",
    "A kereskedelmi szálhossz nem vágási vagy toldási terv; a végleges kiosztást a kivitelező határozza meg.",
    "A számítás nem hidraulikai méretezés, és nem igazolja a csatorna vagy lefolyó átmérőjét.",
  ];
  const warnings: string[] = [];
  const gutterRuns = input.runs.map((run) => {
    const stock = sections(run.lengthMm, input.gutterStockLengthMm);
    const bracketEstimate = run.bracketSpacingMm === null ? null : safe(Math.ceil(run.lengthMm / run.bracketSpacingMm) + 1, "A konzolbecslés");
    if (run.bracketSpacingMm !== null) warnings.push(`${run.name}: a konzolmennyiség csak a felhasználó által megadott kiosztás alapján becslés.`);
    return {
      id: run.id,
      name: run.name,
      lengthMm: run.lengthMm,
      stockSections: stock.count,
      remainderMm: stock.remainder,
      bracketEstimate,
      bracketBasis: bracketEstimate === null ? null : `ceil(${run.lengthMm} / ${run.bracketSpacingMm}) + 1; felhasználói kiosztás`,
    };
  });
  const downpipeRuns = input.downpipes.map((run) => {
    const stock = sections(run.lengthMm, run.commercialLengthMm);
    return { id: run.id, name: run.name, lengthMm: run.lengthMm, stockSections: stock.count, remainderMm: stock.remainder, selectedBends: run.selectedBends };
  });
  const componentQuantities = [
    { category: "gutter_section" as const, quantity: gutterRuns.reduce((sum, run) => sum + run.stockSections, 0), source: "calculated" as const, basis: "Független ereszszakaszonként ceil(hossz / kereskedelmi szálhossz)." },
    { category: "downpipe_section" as const, quantity: downpipeRuns.reduce((sum, run) => sum + run.stockSections, 0), source: "calculated" as const, basis: "Független lefolyómenetenként ceil(hossz / kereskedelmi szálhossz)." },
    ...gutterRuns.filter((run) => run.bracketEstimate !== null).map((run) => ({ category: "bracket" as const, quantity: run.bracketEstimate as number, source: "calculated" as const, basis: `A ${run.name} szakasz felhasználói kiosztásból számított előzetes becslése.` })),
    ...input.manualComponents.map((component) => ({ category: component.category, quantity: component.quantity, source: "manual" as const, basis: component.note || "Felhasználó által megadott mennyiség." })),
  ];
  return {
    gutterRuns,
    downpipeRuns,
    componentQuantities,
    totals: {
      gutterStockSections: gutterRuns.reduce((sum, run) => sum + run.stockSections, 0),
      downpipeStockSections: downpipeRuns.reduce((sum, run) => sum + run.stockSections, 0),
      totalManualComponents: input.manualComponents.reduce((sum, item) => sum + item.quantity, 0),
    },
    assumptions,
    warnings,
  };
}

export const gutterMaterialCalculator: CalculatorDefinition<GutterMaterialInput, GutterMaterialOutput> = {
  id: GUTTER_MATERIAL_CALCULATOR_ID,
  implementationVersion: GUTTER_MATERIAL_CALCULATOR_VERSION,
  inputSchemaVersion: GUTTER_MATERIAL_INPUT_SCHEMA_VERSION,
  resultSchemaVersion: GUTTER_MATERIAL_RESULT_SCHEMA_VERSION,
  inputSchema: gutterMaterialInputSchema,
  outputSchema: z.object({
    gutterRuns: z.array(z.object({ id: z.string(), name: z.string(), lengthMm: z.number().positive(), stockSections: z.number().int().positive(), remainderMm: z.number().positive().nullable(), bracketEstimate: z.number().int().positive().nullable(), bracketBasis: z.string().nullable() })),
    downpipeRuns: z.array(z.object({ id: z.string(), name: z.string(), lengthMm: z.number().positive(), stockSections: z.number().int().positive(), remainderMm: z.number().positive().nullable(), selectedBends: z.number().int().nonnegative() })),
    componentQuantities: z.array(z.object({ category: z.string(), quantity: z.number().nonnegative(), source: z.enum(["calculated", "manual"]), basis: z.string() })),
    totals: z.object({ gutterStockSections: z.number().int().nonnegative(), downpipeStockSections: z.number().int().nonnegative(), totalManualComponents: z.number().nonnegative() }),
    assumptions: z.array(z.string()),
    warnings: z.array(z.string()),
  }) as z.ZodType<GutterMaterialOutput>,
  calculate: calculateGutterMaterial,
};

export { calculateGutterMaterial };

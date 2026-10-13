import { z } from "zod";
import { calculationError } from "@/domain/calculations/errors";
import type { CalculatorDefinition } from "@/domain/calculations/engine";

export const FLASHING_MATERIAL_CALCULATOR_ID = "sheet_metal.flashings.material-estimate" as const;
export const FLASHING_MATERIAL_CALCULATOR_VERSION = "1.0.0" as const;
export const FLASHING_MATERIAL_INPUT_SCHEMA_VERSION = "1.0.0" as const;
export const FLASHING_MATERIAL_RESULT_SCHEMA_VERSION = "1.0.0" as const;

const safeInteger = z.number().finite().int().refine(Number.isSafeInteger, "Biztonságosan ábrázolható egész szám szükséges.");
const positiveMm = safeInteger.positive();
const nonNegativeMm = safeInteger.nonnegative();
const nonNegativeQuantity = safeInteger.nonnegative();

export const flashingCategories = ["verge", "wall", "eaves", "ridge", "valley", "custom"] as const;
export type FlashingCategory = (typeof flashingCategories)[number];

const provenanceSchema = z.object({
  kind: z.enum(["user_provided", "demo", "catalog_snapshot"]),
  label: z.string().trim().min(1).max(200),
  sourceUrl: z.string().trim().url().nullable().optional().default(null),
  sourceDate: z.string().trim().max(40).nullable().optional().default(null),
  catalogVariantId: z.string().uuid().nullable().optional().default(null),
  manuallyOverridden: z.boolean().default(false),
});

const sectionConnectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("no_overlap_confirmed"), source: provenanceSchema }),
  z.object({ mode: z.literal("explicit_overlap"), overlapMm: nonNegativeMm, source: provenanceSchema }),
  z.object({ mode: z.literal("effective_length_supplied"), additionalCoveragePerSectionMm: positiveMm, source: provenanceSchema }),
  z.object({ mode: z.literal("unknown") }),
]);

const roofEdgeReferenceSchema = z.object({
  roofModelId: z.string().uuid(),
  roofModelRevisionId: z.string().uuid(),
  calculationRevisionId: z.string().uuid(),
  edgeId: z.string().trim().min(1).max(120),
  outputField: z.string().trim().min(1).max(120),
});

const runSchema = z.object({
  id: z.string().trim().min(1).max(120),
  category: z.enum(flashingCategories),
  name: z.string().trim().min(1).max(160),
  lengthMm: positiveMm,
  lengthSource: z.enum(["geometry", "site_measurement", "drawing", "user_provided", "demo"]),
  roofEdgeReference: roofEdgeReferenceSchema.nullable().default(null),
  startExtensionMm: nonNegativeMm.default(0),
  endExtensionMm: nonNegativeMm.default(0),
  reserveMm: nonNegativeMm.default(0),
  installationNotes: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
}).superRefine((run, context) => {
  if (run.lengthSource === "geometry" && run.roofEdgeReference === null) {
    context.addIssue({ code: "custom", path: ["roofEdgeReference"], message: "Geometriai hosszhoz forrásrevízió- és élhivatkozás szükséges." });
  }
});

const manualComponentSchema = z.object({
  id: z.string().trim().min(1).max(120),
  category: z.enum(flashingCategories),
  name: z.string().trim().min(1).max(160),
  quantity: nonNegativeQuantity,
  note: z.string().trim().max(500).default(""),
  source: provenanceSchema,
});

export const flashingMaterialInputSchema = z.object({
  sectionSpec: z.object({
    nominalLengthMm: positiveMm,
    nominalLengthSource: provenanceSchema,
    connection: sectionConnectionSchema,
  }),
  runs: z.array(runSchema).min(1).max(300),
  manualComponents: z.array(manualComponentSchema).max(500).default([]),
}).superRefine((input, context) => {
  const ids = new Set<string>();
  input.runs.forEach((run, index) => {
    if (ids.has(run.id)) context.addIssue({ code: "custom", path: ["runs", index, "id"], message: `Ismétlődő szakaszazonosító: ${run.id}.` });
    ids.add(run.id);
  });
  input.manualComponents.forEach((component, index) => {
    if (ids.has(component.id)) context.addIssue({ code: "custom", path: ["manualComponents", index, "id"], message: `Ismétlődő tételazonosító: ${component.id}.` });
    ids.add(component.id);
  });
  if (input.sectionSpec.connection.mode === "explicit_overlap" && input.sectionSpec.connection.overlapMm >= input.sectionSpec.nominalLengthMm) {
    context.addIssue({ code: "custom", path: ["sectionSpec", "connection", "overlapMm"], message: "Az átfedésnek rövidebbnek kell lennie a névleges szálhossznál." });
  }
  if (input.sectionSpec.connection.mode === "effective_length_supplied" && input.sectionSpec.connection.additionalCoveragePerSectionMm > input.sectionSpec.nominalLengthMm) {
    context.addIssue({ code: "custom", path: ["sectionSpec", "connection", "additionalCoveragePerSectionMm"], message: "A szálankénti hasznos többlet nem lehet nagyobb a névleges szálhossznál." });
  }
});

export type FlashingMaterialInput = z.infer<typeof flashingMaterialInputSchema>;
export type FlashingMeasurementSource = z.infer<typeof runSchema>["lengthSource"];
export type FlashingSectionConnection = z.infer<typeof sectionConnectionSchema>;

export type FlashingRunEstimate = Readonly<{
  id: string;
  category: FlashingCategory;
  name: string;
  lengthMm: number;
  lengthSource: FlashingMeasurementSource;
  roofEdgeReference: z.infer<typeof roofEdgeReferenceSchema> | null;
  requiredCoverageLengthMm: number;
  reserveMm: number;
  planningTargetLengthMm: number;
  nominalSectionLengthMm: number;
  estimatedSectionCount: number | null;
  jointCount: number | null;
  totalNominalStockLengthMm: number | null;
  explicitOverlapConsumptionMm: number | null;
  availableCoverageCapacityMm: number | null;
  unallocatedCoverageCapacityMm: number | null;
  status: "preliminary" | "incomplete";
  parameterProvenance: Readonly<{
    nominalLength: z.infer<typeof provenanceSchema>;
    connection: z.infer<typeof provenanceSchema> | null;
  }>;
  assumptions: readonly string[];
  warnings: readonly string[];
  unresolvedInstallationRequirements: readonly string[];
}>;

export type FlashingMaterialOutput = Readonly<{
  runs: readonly FlashingRunEstimate[];
  manualComponents: readonly Readonly<{
    id: string;
    category: FlashingCategory;
    name: string;
    quantity: number;
    unit: "piece";
    source: z.infer<typeof provenanceSchema>;
    note: string;
  }>[];
  totals: Readonly<{
    runCount: number;
    unresolvedRunCount: number;
    estimatedSectionCount: number | null;
    totalNominalStockLengthMm: number | null;
    manualComponentQuantity: number;
  }>;
  assumptions: readonly string[];
  warnings: readonly string[];
}>;

function asSafeNumber(value: bigint, label: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw calculationError("NUMERIC_OVERFLOW", `${label} nem ábrázolható biztonságosan.`);
  }
  return Number(value);
}

function ceilDivide(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - BigInt(1)) / denominator;
}

function estimateSections(targetMm: bigint, stockMm: bigint, connection: FlashingSectionConnection): bigint | null {
  if (connection.mode === "unknown") return null;
  if (targetMm <= stockMm) return BigInt(1);
  if (connection.mode === "explicit_overlap") {
    const overlapMm = BigInt(connection.overlapMm);
    return ceilDivide(targetMm - overlapMm, stockMm - overlapMm);
  }
  if (connection.mode === "effective_length_supplied") {
    return BigInt(1) + ceilDivide(targetMm - stockMm, BigInt(connection.additionalCoveragePerSectionMm));
  }
  return ceilDivide(targetMm, stockMm);
}

function calculateFlashingMaterial(input: FlashingMaterialInput): FlashingMaterialOutput {
  const stockMm = BigInt(input.sectionSpec.nominalLengthMm);
  const connection = input.sectionSpec.connection;
  const unresolvedRequirements = [
    "Az első és utolsó szakasz szerelési/végzárási szabálya nincs modellezve.",
    "Vágáskép, vágási veszteség és maradékdarabok újrafelhasználása nincs számítva.",
    "Rögzítési kiosztás, sarok- és csomópontképzés, vízzáróság és gyárthatóság nincs ellenőrizve.",
    "A becsült darabszám nem végleges beszerzési mennyiség.",
  ];
  const assumptions = [
    "Minden szegélyszakasz egymástól függetlenül készül; nincs közös vágás vagy maradék-újrafelhasználás.",
    "A felhasználó által megadott végkiterjesztés a lefedendő hossz része; a tartalék külön tervezési cél.",
    "A kereskedelmi darabszám matematikai becslés, nem szerelési vagy gyártási terv.",
  ];

  const runs: FlashingRunEstimate[] = input.runs.map((run) => {
    const required = BigInt(run.lengthMm) + BigInt(run.startExtensionMm) + BigInt(run.endExtensionMm);
    const planningTarget = required + BigInt(run.reserveMm);
    const count = estimateSections(planningTarget, stockMm, connection);
    const sectionCount = count === null ? null : asSafeNumber(count, "A szegélyszálak száma");
    const nominalStock = count === null ? null : asSafeNumber(count * stockMm, "A névleges készlethossz");
    const jointCount = count === null ? null : asSafeNumber(count - BigInt(1), "A toldások száma");
    let explicitOverlapConsumption: number | null = null;
    let availableCoverage: number | null = null;
    let unallocatedCoverage: number | null = null;
    if (count !== null) {
      if (connection.mode === "explicit_overlap") {
        const overlap = BigInt(connection.overlapMm);
        explicitOverlapConsumption = asSafeNumber((count - BigInt(1)) * overlap, "Az explicit átfedés hossza");
        const capacity = count * stockMm - (count - BigInt(1)) * overlap;
        availableCoverage = asSafeNumber(capacity, "A fedési kapacitás");
        unallocatedCoverage = asSafeNumber(capacity - planningTarget, "A fel nem használt fedési kapacitás");
      } else if (connection.mode === "no_overlap_confirmed") {
        availableCoverage = nominalStock;
        unallocatedCoverage = asSafeNumber(count * stockMm - planningTarget, "A fel nem használt fedési kapacitás");
        explicitOverlapConsumption = 0;
      } else if (connection.mode === "effective_length_supplied") {
        const capacity = stockMm + (count - BigInt(1)) * BigInt(connection.additionalCoveragePerSectionMm);
        availableCoverage = asSafeNumber(capacity, "A fedési kapacitás");
        unallocatedCoverage = asSafeNumber(capacity - planningTarget, "A fel nem használt fedési kapacitás");
      }
    }
    const source = connection.mode === "unknown" ? null : connection.source;
    const warnings = connection.mode === "unknown"
      ? ["A toldási kapcsolat ismeretlen; a szükséges szálak száma nem számítható."]
      : ["Az eredmény előzetes, a termékhez és kivitelezési helyzethez tartozó korlátozások nincsenek ellenőrizve."];
    if (run.lengthSource === "demo") warnings.push("A bemeneti hossz DEMO adat.");
    if (source?.kind === "demo" || input.sectionSpec.nominalLengthSource.kind === "demo") warnings.push("A termékparaméter DEMO adat.");
    return {
      id: run.id,
      category: run.category,
      name: run.name,
      lengthMm: run.lengthMm,
      lengthSource: run.lengthSource,
      roofEdgeReference: run.roofEdgeReference,
      requiredCoverageLengthMm: asSafeNumber(required, "A lefedendő hossz"),
      reserveMm: run.reserveMm,
      planningTargetLengthMm: asSafeNumber(planningTarget, "A tartalékkal növelt tervezési hossz"),
      nominalSectionLengthMm: input.sectionSpec.nominalLengthMm,
      estimatedSectionCount: sectionCount,
      jointCount,
      totalNominalStockLengthMm: nominalStock,
      explicitOverlapConsumptionMm: explicitOverlapConsumption,
      availableCoverageCapacityMm: availableCoverage,
      unallocatedCoverageCapacityMm: unallocatedCoverage,
      status: count === null ? "incomplete" : "preliminary",
      parameterProvenance: { nominalLength: input.sectionSpec.nominalLengthSource, connection: source },
      assumptions,
      warnings,
      unresolvedInstallationRequirements: [...unresolvedRequirements, ...run.installationNotes],
    };
  });

  const unresolvedRunCount = runs.filter((run) => run.estimatedSectionCount === null).length;
  const knownSectionCount = runs.reduce((sum, run) => sum + BigInt(run.estimatedSectionCount ?? 0), BigInt(0));
  const knownNominalLength = runs.reduce((sum, run) => sum + BigInt(run.totalNominalStockLengthMm ?? 0), BigInt(0));
  const manualComponentCount = input.manualComponents.reduce((sum, component) => sum + BigInt(component.quantity), BigInt(0));
  const warnings = [...new Set(runs.flatMap((run) => run.warnings))];
  if (unresolvedRunCount > 0) warnings.push("Az összesített szálmennyiség hiányos, mert legalább egy szakasz kapcsolati paramétere ismeretlen.");

  return {
    runs,
    manualComponents: input.manualComponents.map((component) => ({ ...component, unit: "piece" as const })),
    totals: {
      runCount: runs.length,
      unresolvedRunCount,
      estimatedSectionCount: unresolvedRunCount === 0 ? asSafeNumber(knownSectionCount, "Az összes szegélyszál") : null,
      totalNominalStockLengthMm: unresolvedRunCount === 0 ? asSafeNumber(knownNominalLength, "Az összes névleges készlethossz") : null,
      manualComponentQuantity: asSafeNumber(manualComponentCount, "A kézi alkatrészek mennyisége"),
    },
    assumptions,
    warnings,
  };
}

const outputRunSchema = z.object({
  id: z.string(), category: z.enum(flashingCategories), name: z.string(), lengthMm: safeInteger, lengthSource: z.enum(["geometry", "site_measurement", "drawing", "user_provided", "demo"]),
  roofEdgeReference: roofEdgeReferenceSchema.nullable(), requiredCoverageLengthMm: safeInteger, reserveMm: safeInteger, planningTargetLengthMm: safeInteger,
  nominalSectionLengthMm: positiveMm, estimatedSectionCount: safeInteger.nullable(), jointCount: safeInteger.nullable(), totalNominalStockLengthMm: safeInteger.nullable(),
  explicitOverlapConsumptionMm: safeInteger.nullable(), availableCoverageCapacityMm: safeInteger.nullable(), unallocatedCoverageCapacityMm: safeInteger.nullable(),
  status: z.enum(["preliminary", "incomplete"]), parameterProvenance: z.object({ nominalLength: provenanceSchema, connection: provenanceSchema.nullable() }),
  assumptions: z.array(z.string()), warnings: z.array(z.string()), unresolvedInstallationRequirements: z.array(z.string()),
});

export const flashingMaterialCalculator: CalculatorDefinition<FlashingMaterialInput, FlashingMaterialOutput> = {
  id: FLASHING_MATERIAL_CALCULATOR_ID,
  implementationVersion: FLASHING_MATERIAL_CALCULATOR_VERSION,
  inputSchemaVersion: FLASHING_MATERIAL_INPUT_SCHEMA_VERSION,
  resultSchemaVersion: FLASHING_MATERIAL_RESULT_SCHEMA_VERSION,
  inputSchema: flashingMaterialInputSchema,
  outputSchema: z.object({
    runs: z.array(outputRunSchema),
    manualComponents: z.array(z.object({ id: z.string(), category: z.enum(flashingCategories), name: z.string(), quantity: nonNegativeQuantity, unit: z.literal("piece"), source: provenanceSchema, note: z.string() })),
    totals: z.object({ runCount: safeInteger, unresolvedRunCount: safeInteger, estimatedSectionCount: safeInteger.nullable(), totalNominalStockLengthMm: safeInteger.nullable(), manualComponentQuantity: safeInteger }),
    assumptions: z.array(z.string()), warnings: z.array(z.string()),
  }) as z.ZodType<FlashingMaterialOutput>,
  calculate: calculateFlashingMaterial,
};

export { calculateFlashingMaterial };

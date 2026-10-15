import { z } from "zod";
import { calculateGableRoof, gableRoofInputSchema } from "@/domain/calculations/gable-roof";
import { calculateGableMetalTileCovering, gableMetalTileCoveringInputSchema } from "@/domain/calculations/gable-metal-tile-covering";

const sourceSchema = z.object({
  mode: z.literal("project"), projectId: z.string().uuid(), roofModelId: z.string().uuid(),
  roofModelRevisionId: z.string().uuid(), geometryCalculationId: z.string().uuid(),
  geometryCalculationRevisionId: z.string().uuid(), geometryInput: gableRoofInputSchema,
});
const inputSchema = z.object({
  calculatorType: z.literal("roof.gable.metal-tile-covering"), scope: z.literal("project"),
  source: sourceSchema, productInput: gableMetalTileCoveringInputSchema,
});
const stable = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : item);

export type GableMetalTileTransferResult = Readonly<{
  ok: boolean; code?: "INVALID_SOURCE" | "UNSUPPORTED_LAYOUT"; error?: string;
  quantity?: number; inputSnapshot?: unknown; outputSnapshot?: unknown;
  source?: z.infer<typeof sourceSchema>; productInput?: z.infer<typeof gableMetalTileCoveringInputSchema>;
  coveringOutput?: ReturnType<typeof calculateGableMetalTileCovering>;
}>;

export function deriveGableMetalTileTakeoff(rawInput: unknown, rawOutput: unknown): GableMetalTileTransferResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success || !rawOutput || typeof rawOutput !== "object") {
    return { ok: false, code: "INVALID_SOURCE", error: "A mentett cserepeslemez-forrás bemenete érvénytelen." };
  }
  const geometry = calculateGableRoof(parsed.data.source.geometryInput);
  const covering = calculateGableMetalTileCovering(geometry, parsed.data.productInput);
  const expected = { geometry, covering };
  if (covering.status !== "VALID" || stable(expected) !== stable(rawOutput)) {
    return { ok: false, code: "INVALID_SOURCE", error: "A mentett cserepeslemez-eredmény nem reprodukálható; az átadás leállt." };
  }
  const product = parsed.data.productInput;
  if (covering.rowsPerPlane !== 1 || covering.columnsPerPlane === null || covering.totalSheetCount === null
    || covering.totalSheetCount !== covering.columnsPerPlane * covering.planeCount
    || !Number.isSafeInteger(covering.totalSheetCount)
    || product.physicalSheetLengthMm === null || product.effectiveCoveringLengthMm === null
    || product.nominalSheetWidthMm === null || product.effectiveCoveringWidthMm === null
    || !product.lengthCompatibilityConfirmed || !product.lengthDataSource?.trim()
    || (product.longitudinalOverlapMm ?? 0) !== 0
    || (product.isModular && (product.moduleBaseLengthMm === null || product.modulePitchMm === null || product.moduleCount === null))) {
    return { ok: false, code: "UNSUPPORTED_LAYOUT", error: "Csak a teljes hosszú, egysoros, igazolt hosszadatú lemezkiosztás adható át; az osztott vagy hiányos kiosztás nem támogatott." };
  }
  return { ok: true, quantity: covering.totalSheetCount, inputSnapshot: rawInput, outputSnapshot: rawOutput,
    source: parsed.data.source, productInput: product, coveringOutput: covering };
}

import { z } from "zod";
import { calculateGableRoof, gableRoofInputSchema } from "@/domain/calculations/gable-roof";
import { calculateGableTrapezoidalCovering, gableTrapezoidalCoveringInputSchema } from "@/domain/calculations/gable-trapezoidal-covering";

const snapshotSchema = z.object({
  scope: z.literal("project"),
  source: z.object({
    mode: z.literal("project"),
    projectId: z.string().uuid(),
    roofModelId: z.string().uuid(),
    roofModelRevisionId: z.string().uuid(),
    geometryCalculationId: z.string().uuid(),
    geometryCalculationRevisionId: z.string().uuid(),
    geometryInput: gableRoofInputSchema,
  }),
  coveringInput: gableTrapezoidalCoveringInputSchema,
});

const stable = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
    : item);

export type GableCoveringTransferResult = Readonly<{
  ok: boolean;
  code?: "INVALID_SOURCE" | "UNSUPPORTED_LAYOUT";
  error?: string;
  quantity?: number;
  quantityUnit?: "piece";
  inputSnapshot?: unknown;
  outputSnapshot?: unknown;
  source?: z.infer<typeof snapshotSchema>["source"];
  coveringInput?: z.infer<typeof gableTrapezoidalCoveringInputSchema>;
  coveringOutput?: ReturnType<typeof calculateGableTrapezoidalCovering>;
}>;

export function deriveGableCoveringTakeoffQuantity(rawInput: unknown, rawOutput: unknown): GableCoveringTransferResult {
  const input = snapshotSchema.safeParse(rawInput);
  if (!input.success || !rawOutput || typeof rawOutput !== "object") {
    return { ok: false, code: "INVALID_SOURCE", error: "A mentett projektfedési változat bemenete érvénytelen." };
  }
  const output = rawOutput as { geometry?: unknown; covering?: unknown };
  const geometry = calculateGableRoof(input.data.source.geometryInput);
  const covering = calculateGableTrapezoidalCovering(geometry, input.data.coveringInput);
  if (covering.status !== "VALID" || !output.geometry || !output.covering
    || stable({ geometry, covering }) !== stable(output)) {
    return { ok: false, code: "INVALID_SOURCE", error: "A mentett fedési eredmény nem reprodukálható; az átadás leállt." };
  }
  if (covering.rowsPerPlane !== 1 || covering.columnsPerPlane === null || covering.totalSheetCount === null
    || covering.totalSheetCount !== covering.columnsPerPlane * covering.planeCount
    || !Number.isSafeInteger(covering.totalSheetCount)
    || input.data.coveringInput.selectedSheetLengthMm === null
    || input.data.coveringInput.nominalSheetWidthMm === null
    || input.data.coveringInput.effectiveCoveringWidthMm === null
    || input.data.coveringInput.selectedSheetLengthMm < covering.requiredCoveringLengthMm
    || (input.data.coveringInput.longitudinalOverlapMm ?? 0) !== 0) {
    return { ok: false, code: "UNSUPPORTED_LAYOUT", error: "Csak az egysoros, teljes hosszú lemezkiosztás adható át; toldott vagy hiányos kiosztáshoz nincs darabjegyzék." };
  }
  return {
    ok: true,
    quantity: covering.totalSheetCount,
    quantityUnit: "piece",
    inputSnapshot: rawInput,
    outputSnapshot: rawOutput,
    source: input.data.source,
    coveringInput: input.data.coveringInput,
    coveringOutput: covering,
  };
}

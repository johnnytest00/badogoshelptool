import { z } from "zod";
import { calculateGableRoof, gableRoofInputSchema } from "@/domain/calculations/gable-roof";
import {
  GABLE_TRAPEZOIDAL_COVERING_VERSION,
  calculateGableTrapezoidalCovering,
  gableTrapezoidalCoveringInputSchema,
} from "@/domain/calculations/gable-trapezoidal-covering";

export const GABLE_TRAPEZOIDAL_COVERING_ID = "roof.gable.trapezoidal-covering" as const;
export const gableTrapezoidalCoveringSaveSchema = z.object({
  organizationId: z.string().uuid(),
  calculationId: z.string().uuid(),
  operationId: z.string().uuid(),
  expectedRevisionNumber: z.number().int().nonnegative(),
  name: z.string().trim().min(1).max(200),
  scope: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("project"), projectId: z.string().uuid(), roofModelId: z.string().uuid(), roofModelRevisionId: z.string().uuid() }),
    z.object({ kind: z.literal("standalone") }),
  ]),
  geometryInput: gableRoofInputSchema,
  coveringInput: gableTrapezoidalCoveringInputSchema,
});

export type GableTrapezoidalCoveringSaveInput = z.input<typeof gableTrapezoidalCoveringSaveSchema>;

export function calculateCoveringSnapshot(geometryInput: unknown, coveringInput: unknown) {
  const parsedGeometry = gableRoofInputSchema.safeParse(geometryInput);
  const parsedCovering = gableTrapezoidalCoveringInputSchema.safeParse(coveringInput);
  if (!parsedGeometry.success || !parsedCovering.success) return null;
  const geometry = calculateGableRoof(parsedGeometry.data);
  const output = calculateGableTrapezoidalCovering(geometry, parsedCovering.data);
  if (output.status === "INVALID" || output.status === "UNSUPPORTED") return null;
  return { geometry, output, geometryInput: parsedGeometry.data, coveringInput: parsedCovering.data };
}

export { GABLE_TRAPEZOIDAL_COVERING_VERSION };

import { z } from "zod";
import { calculateGableRoof, gableRoofInputSchema } from "@/domain/calculations/gable-roof";
import { GABLE_METAL_TILE_COVERING_VERSION, calculateGableMetalTileCovering, gableMetalTileCoveringInputSchema } from "@/domain/calculations/gable-metal-tile-covering";

export const GABLE_METAL_TILE_COVERING_ID = "roof.gable.metal-tile-covering" as const;
export const METAL_TILE_INPUT_SCHEMA_VERSION = "1.0.0" as const;
export const gableMetalTileCoveringSaveSchema = z.object({
  organizationId: z.string().uuid(),
  calculationId: z.string().uuid(),
  operationId: z.string().uuid(),
  expectedRevisionNumber: z.number().int().nonnegative(),
  name: z.string().trim().min(1).max(200).optional(),
  scope: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("project"), projectId: z.string().uuid(), roofModelId: z.string().uuid(), roofModelRevisionId: z.string().uuid() }),
    z.object({ kind: z.literal("standalone") }),
  ]),
  // Project mode always replaces this optional convenience value with the exact saved revision input.
  geometryInput: gableRoofInputSchema.optional(),
  productInput: gableMetalTileCoveringInputSchema,
});

export type GableMetalTileCoveringSaveInput = z.input<typeof gableMetalTileCoveringSaveSchema>;

export function calculateMetalTileSnapshot(geometryInput: unknown, productInput: unknown) {
  const parsedGeometry = gableRoofInputSchema.safeParse(geometryInput);
  const parsedProduct = gableMetalTileCoveringInputSchema.safeParse(productInput);
  if (!parsedGeometry.success || !parsedProduct.success) return null;
  const geometry = calculateGableRoof(parsedGeometry.data);
  const output = calculateGableMetalTileCovering(geometry, parsedProduct.data);
  if (output.status !== "VALID") return null;
  return { geometry, output, geometryInput: parsedGeometry.data, productInput: parsedProduct.data };
}

export { GABLE_METAL_TILE_COVERING_VERSION };

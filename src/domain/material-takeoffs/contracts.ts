import { z } from "zod";
import type { MaterialPurchasingUnit } from "@/domain/materials/contracts";

export const takeoffMethods = ["area", "linear", "manual", "calculated"] as const;
export type TakeoffMethod = (typeof takeoffMethods)[number];
export const takeoffStatuses = ["draft", "approved"] as const;
export type TakeoffStatus = (typeof takeoffStatuses)[number];

export const areaMeasurementKeys = ["combinedRoofM2", "individualRoofPlaneM2", "horizontalProjectedM2"] as const;
export type AreaMeasurementKey = (typeof areaMeasurementKeys)[number];
export const linearMeasurementKeys = ["ridgeLineMm", "totalEaveEdgesMm", "totalSlopingGableEdgesMm"] as const;
export type LinearMeasurementKey = (typeof linearMeasurementKeys)[number];

export const takeoffItemInputSchema = z.object({
  method: z.enum(takeoffMethods),
  variantId: z.string().uuid(),
  measurementKey: z.string().optional(),
  allowancePercent: z.number().finite().nonnegative().max(1000).optional(),
  manualQuantity: z.number().finite().nonnegative().optional(),
  finalQuantity: z.number().finite().nonnegative().optional(),
  adjustmentReason: z.string().trim().max(500).optional(),
  priceId: z.string().uuid().optional(),
});

export type TakeoffItemInput = z.infer<typeof takeoffItemInputSchema>;
export type TakeoffEstimate = Readonly<{
  calculatedQuantity: number | null;
  finalQuantity: number;
  unit: MaterialPurchasingUnit;
  source: string;
  allowancePercent: number | null;
  warning?: string;
}>;

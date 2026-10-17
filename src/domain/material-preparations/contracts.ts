import { z } from "zod";
import { materialPurchasingUnits } from "@/domain/materials/contracts";

export const preparationCategories = ["purchasing", "workshop"] as const;
export const purchasingStatuses = ["required", "prepared", "ordered", "received"] as const;
export const workshopStatuses = ["prepare", "in_progress", "done"] as const;

export type PreparationCategory = (typeof preparationCategories)[number];
export type PurchasingStatus = (typeof purchasingStatuses)[number];
export type WorkshopStatus = (typeof workshopStatuses)[number];

export const preparationItemDraftSchema = z.object({
  id: z.string().uuid(),
  sourceItemIds: z.array(z.string().uuid()).max(200),
  category: z.enum(preparationCategories),
  status: z.string().min(1).max(24),
  description: z.string().trim().min(1, "A tétel megnevezése kötelező.").max(240),
  quantity: z.string().optional(),
  unit: z.enum(materialPurchasingUnits).optional(),
  manualTechnicalData: z.object({
    profileDescription: z.string().trim().max(240).optional(),
    lengthMm: z.string().trim().max(24).optional(),
    widthMm: z.string().trim().max(24).optional(),
    thicknessMm: z.string().trim().max(24).optional(),
    materialSpec: z.string().trim().max(240).optional(),
    technicalNotes: z.string().trim().max(1000).optional(),
  }).optional(),
  supplier: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
}).superRefine((item, context) => {
  if (item.category === "purchasing" && !purchasingStatuses.includes(item.status as PurchasingStatus)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Érvénytelen beszerzési állapot." });
  }
  if (item.category === "workshop" && !workshopStatuses.includes(item.status as WorkshopStatus)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Érvénytelen műhelyállapot." });
  }
  if (item.sourceItemIds.length === 0) {
    if (item.category !== "workshop") context.addIssue({ code: "custom", path: ["category"], message: "Kézi tétel csak a műhelylistára vehető fel." });
    if (!item.unit || !item.quantity || !/^\d{1,12}(?:\.\d{1,6})?$/.test(item.quantity) || Number(item.quantity) <= 0) {
      context.addIssue({ code: "custom", path: ["quantity"], message: "A kézi tételhez pozitív, legfeljebb 6 tizedesjegyű mennyiség szükséges." });
    }
  }
});

export const preparationListSaveSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  preparationId: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  sourceTakeoffIds: z.array(z.string().uuid()).max(50),
  items: z.array(preparationItemDraftSchema).min(1).max(200),
  expectedVersion: z.number().int().nonnegative(),
  requestKey: z.string().uuid(),
}).superRefine((input, context) => {
  if (new Set(input.sourceTakeoffIds).size !== input.sourceTakeoffIds.length) {
    context.addIssue({ code: "custom", path: ["sourceTakeoffIds"], message: "Egy anyagkimutatás csak egyszer választható." });
  }
  if (new Set(input.items.map((item) => item.id)).size !== input.items.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "Ismétlődő előkészítési tétel." });
  }
  const sourceIds = input.items.flatMap((item) => item.sourceItemIds);
  if (new Set(sourceIds).size !== sourceIds.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "Egy forrástétel csak egyszer szerepelhet." });
  }
  if (input.preparationId === null && input.expectedVersion !== 0) {
    context.addIssue({ code: "custom", path: ["expectedVersion"], message: "Új lista verziója csak 0 lehet." });
  }
});

export type MaterialPreparationItem = Readonly<{
  id: string;
  kind: "source" | "manual" | "catalog";
  category: PreparationCategory;
  status: string;
  description: string;
  productId?: string | null;
  variantId?: string | null;
  productName?: string | null;
  variantName?: string | null;
  sku?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  quantity: string;
  unit: string;
  priceId?: string | null;
  manualPriceAmount?: string | null;
  manualPriceKind?: "net" | "gross" | null;
  priceSnapshot?: Readonly<Record<string, unknown>> | null;
  dimensions: Readonly<Record<string, unknown>>;
  materialSnapshot?: Readonly<Record<string, unknown>>;
  sourceItemIds: readonly string[];
  sourceSnapshots: readonly Readonly<Record<string, unknown>>[];
  supplier: string | null;
  notes: string | null;
  provenance: string;
}>;

export type PreparationSourceSnapshot = Readonly<{
  takeoffId: string;
  name: string;
  version: number;
  status: "draft" | "approved";
  calculationId: string;
  calculationRevisionId: string;
  currentCalculationRevisionId: string | null;
}>;

const purchasingStatusLabels: Record<PurchasingStatus, string> = {
  required: "Szükséges", prepared: "Megrendelésre előkészítve", ordered: "Megrendelve", received: "Beérkezett",
};
const workshopStatusLabels: Record<WorkshopStatus, string> = {
  prepare: "Előkészítendő", in_progress: "Gyártás alatt", done: "Elkészült",
};

export function preparationStatusLabel(category: PreparationCategory, status: string): string {
  return category === "purchasing"
    ? purchasingStatusLabels[status as PurchasingStatus] ?? "Ismeretlen állapot"
    : workshopStatusLabels[status as WorkshopStatus] ?? "Ismeretlen állapot";
}

function csvCell(value: string, numeric = false): string {
  const safeValue = numeric || !/^[\s]*[=+\-@]/.test(value) ? value : `'${value}`;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function materialPreparationCsv(name: string, items: readonly MaterialPreparationItem[], unitLabels: Readonly<Record<string, string>>): string {
  const rows = [["Lista", "Kategória", "Tétel", "Mennyiség", "Egység", "Méretadatok", "Állapot", "Beszállító", "Megjegyzés", "Eredet"]];
  for (const item of items) {
    const dimensions = Object.entries(item.dimensions)
      .filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== "{}")
      .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`).join("; ");
    rows.push([
      name, item.category === "purchasing" ? "Beszerzés" : "Műhely", item.description,
      item.quantity, unitLabels[item.unit] ?? item.unit, dimensions,
      preparationStatusLabel(item.category, item.status), item.supplier ?? "", item.notes ?? "",
      item.kind === "manual" ? "Kézi tétel" : "Jóváhagyott anyagkimutatás",
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map((value, index) => csvCell(value, index === 3)).join(";")).join("\r\n")}`;
}

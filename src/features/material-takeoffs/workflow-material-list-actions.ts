"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { materialCategories, materialPurchasingUnits } from "@/domain/materials/contracts";
import { userFacingActionError } from "@/lib/user-facing-action-error";

const itemSchema = z.object({
  id: z.string().uuid(), kind: z.enum(["manual", "catalog"]),
  description: z.string().trim().min(1).max(240),
  materialCategory: z.enum(materialCategories),
  quantity: z.string().trim().regex(/^\d{1,12}(?:[.,]\d{1,6})?$/).transform((value) => value.replace(",", ".")),
  unit: z.enum(materialPurchasingUnits), variantId: z.string().uuid().nullable(), priceId: z.string().uuid().nullable(),
}).superRefine((item, context) => {
  if (Number(item.quantity) <= 0) context.addIssue({ code: "custom", path: ["quantity"], message: "A mennyiség legyen pozitív." });
  if (item.kind === "catalog" && !item.variantId) context.addIssue({ code: "custom", path: ["variantId"], message: "Válassz termékváltozatot." });
  if (item.kind === "manual" && (item.variantId || item.priceId)) context.addIssue({ code: "custom", path: ["variantId"], message: "A kézi tételhez ne adj katalógus-hivatkozást." });
  if (item.priceId && item.kind !== "catalog") context.addIssue({ code: "custom", path: ["priceId"], message: "Árat csak katalógustételhez lehet kapcsolni." });
});

const inputSchema = z.object({
  organizationId: z.string().uuid(), listId: z.string().uuid().nullable(), executionPlanId: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120), expectedVersion: z.number().int().nonnegative(),
  requestKey: z.string().uuid(), items: z.array(itemSchema).min(1).max(200),
}).superRefine((input, context) => {
  if (input.listId === null && input.expectedVersion !== 0) context.addIssue({ code: "custom", path: ["expectedVersion"], message: "Új lista verziója csak nulla lehet." });
  if (new Set(input.items.map((item) => item.id)).size !== input.items.length) context.addIssue({ code: "custom", path: ["items"], message: "Ismétlődő listaelem." });
});

export type WorkflowMaterialListActionState = { ok: boolean; error?: string; listId?: string; version?: number };
const initial: WorkflowMaterialListActionState = { ok: false };
const formText = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export async function saveWorkflowMaterialListAction(_previous: WorkflowMaterialListActionState = initial, form: FormData): Promise<WorkflowMaterialListActionState> {
  void _previous;
  let rawItems: unknown;
  try { rawItems = JSON.parse(formText(form, "items") || "[]"); }
  catch { return { ok: false, error: "Az anyaglista adatai hibásak. Frissítsd az oldalt, és próbáld újra." }; }
  const parsed = inputSchema.safeParse({
    organizationId: formText(form, "organizationId"), listId: formText(form, "listId") || null,
    executionPlanId: formText(form, "executionPlanId") || null, name: formText(form, "name"),
    expectedVersion: Number(formText(form, "expectedVersion")), requestKey: formText(form, "requestKey"), items: rawItems,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ellenőrizd az anyaglista adatait." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === parsed.data.organizationId)) return { ok: false, error: "Nincs hozzáférésed ehhez a műhelyhez." };
  const supabase = await createClient();
  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ list_id: string; version: number }> | null; error: { code?: string; message?: string } | null }> };
  const { data, error } = await db.rpc("save_workflow_material_list_revision", {
    p_organization_id: parsed.data.organizationId, p_list_id: parsed.data.listId,
    p_execution_plan_id: parsed.data.executionPlanId, p_name: parsed.data.name,
    p_items: parsed.data.items.map((item) => ({ ...item, sourceRefs: [] })),
    p_expected_version: parsed.data.expectedVersion, p_request_key: parsed.data.requestKey,
  });
  if (error || !data?.[0]) {
    if (error?.code === "40001") return { ok: false, error: "Az anyaglista időközben megváltozott. Töltsd újra, majd ellenőrizd a módosításokat." };
    return { ok: false, error: userFacingActionError(error, "Az anyaglista mentése nem sikerült.") };
  }
  revalidatePath("/anyaglistak");
  revalidatePath("/kivitelezes");
  if (parsed.data.executionPlanId) revalidatePath(`/kivitelezes/${parsed.data.executionPlanId}`);
  return { ok: true, listId: data[0].list_id, version: data[0].version };
}

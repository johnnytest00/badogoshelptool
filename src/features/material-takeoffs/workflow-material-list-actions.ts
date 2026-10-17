"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { workflowMaterialListInputSchema } from "@/domain/materials/material-list-contract";
import { userFacingActionError } from "@/lib/user-facing-action-error";

export type WorkflowMaterialListActionState = { ok: boolean; error?: string; listId?: string; version?: number };
const initial: WorkflowMaterialListActionState = { ok: false };
const formText = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export async function saveWorkflowMaterialListAction(_previous: WorkflowMaterialListActionState = initial, form: FormData): Promise<WorkflowMaterialListActionState> {
  void _previous;
  let rawItems: unknown;
  try { rawItems = JSON.parse(formText(form, "items") || "[]"); }
  catch { return { ok: false, error: "Az anyaglista adatai hibásak. Frissítsd az oldalt, és próbáld újra." }; }
  if (formText(form, "listId") && Array.isArray(rawItems)) {
    rawItems = rawItems.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      return Object.fromEntries(Object.entries(item).filter(([key]) => key !== "sourceRef"));
    });
  }
  const parsed = workflowMaterialListInputSchema.safeParse({
    organizationId: formText(form, "organizationId"), listId: formText(form, "listId") || null,
    executionPlanId: formText(form, "executionPlanId") || null, name: formText(form, "name"),
    expectedVersion: Number(formText(form, "expectedVersion")), requestKey: formText(form, "requestKey"), items: rawItems,
    ...(formText(form, "sourceSurveyId") || formText(form, "sourceSurveyRevisionId") || formText(form, "sourceSurveyVersion")
      ? { surveySource: {
        surveyId: formText(form, "sourceSurveyId"),
        surveyRevisionId: formText(form, "sourceSurveyRevisionId"),
        surveyVersion: Number(formText(form, "sourceSurveyVersion")),
        allowStaleSource: formText(form, "allowStaleSource") === "true",
      } }
      : {}),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ellenőrizd az anyaglista adatait." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === parsed.data.organizationId)) return { ok: false, error: "Nincs hozzáférésed ehhez a műhelyhez." };
  const supabase = await createClient();
  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ list_id: string; version: number }> | null; error: { code?: string; message?: string } | null }> };
  const source = parsed.data.surveySource;
  const { data, error } = source
    ? await db.rpc("save_workflow_material_list_from_survey_revision", {
      p_organization_id: parsed.data.organizationId,
      p_survey_id: source.surveyId,
      p_survey_revision_id: source.surveyRevisionId,
      p_allow_stale_source: source.allowStaleSource,
      p_name: parsed.data.name,
      p_items: parsed.data.items,
      p_request_key: parsed.data.requestKey,
    })
    : await db.rpc("save_workflow_material_list_revision", {
      p_organization_id: parsed.data.organizationId, p_list_id: parsed.data.listId,
      p_execution_plan_id: parsed.data.executionPlanId, p_name: parsed.data.name,
      p_items: parsed.data.items.map((item) => ({
        ...Object.fromEntries(Object.entries(item).filter(([key]) => key !== "sourceRef")), sourceRefs: [],
      })),
      p_expected_version: parsed.data.expectedVersion, p_request_key: parsed.data.requestKey,
    });
  if (error || !data?.[0]) {
    if (error?.code === "40001" && source) return { ok: false, error: "A felmérés az áttekintés óta újabb változatot kapott, vagy a forráshivatkozás eltér. Nyisd meg újra a kiválasztott felmérés-revíziót, és ellenőrizd a figyelmeztetést." };
    if (error?.code === "40001") return { ok: false, error: "Az anyaglista időközben megváltozott. Töltsd újra, majd ellenőrizd a módosításokat." };
    return { ok: false, error: userFacingActionError(error, "Az anyaglista mentése nem sikerült.") };
  }
  revalidatePath("/anyaglistak");
  revalidatePath("/kivitelezes");
  if (parsed.data.executionPlanId) revalidatePath(`/kivitelezes/${parsed.data.executionPlanId}`);
  return { ok: true, listId: data[0].list_id, version: data[0].version };
}

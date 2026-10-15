"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { preparationListSaveSchema } from "@/domain/material-preparations/contracts";
import { userFacingActionError } from "@/lib/user-facing-action-error";

export type MaterialPreparationActionState = Readonly<{
  ok: boolean;
  error?: string;
  listId?: string;
  version?: number;
}>;

const emptyState: MaterialPreparationActionState = { ok: false };
const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export async function saveMaterialPreparationAction(
  _previous: MaterialPreparationActionState = emptyState,
  data: FormData,
): Promise<MaterialPreparationActionState> {
  void _previous;
  const rawItems = text(data, "items");
  const rawSources = text(data, "sourceTakeoffIds");
  let items: unknown;
  let sourceTakeoffIds: unknown;
  try {
    items = JSON.parse(rawItems);
    sourceTakeoffIds = JSON.parse(rawSources || "[]");
  } catch {
    return { ok: false, error: "A lista adatai hibásak. Frissítsd az oldalt, és próbáld újra." };
  }
  const preparationId = text(data, "preparationId");
  const parsed = preparationListSaveSchema.safeParse({
    organizationId: text(data, "organizationId"),
    projectId: text(data, "projectId"),
    preparationId: preparationId || null,
    name: text(data, "name"),
    sourceTakeoffIds,
    items,
    expectedVersion: Number(text(data, "expectedVersion")),
    requestKey: text(data, "requestKey"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ellenőrizd az előkészítési lista adatait." };

  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === parsed.data.organizationId)) {
    return { ok: false, error: "Nincs aktív hozzáférésed ehhez a műhelyhez." };
  }

  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("save_material_preparation_revision", {
    p_organization_id: parsed.data.organizationId,
    p_project_id: parsed.data.projectId,
    p_list_id: parsed.data.preparationId,
    p_name: parsed.data.name,
    p_source_takeoff_ids: parsed.data.sourceTakeoffIds,
    p_items: parsed.data.items as never,
    p_expected_version: parsed.data.expectedVersion,
    p_request_key: parsed.data.requestKey,
  });
  if (error || !result?.[0]) {
    if (error?.code === "40001") return { ok: false, error: "Egy másik mentés frissítette a listát. Töltsd újra, és ellenőrizd a változásokat." };
    return { ok: false, error: userFacingActionError(error, "Az előkészítési lista mentése nem sikerült.") };
  }
  revalidatePath(`/projektek/${parsed.data.projectId}`);
  revalidatePath(`/projektek/${parsed.data.projectId}/beszerzes`);
  return { ok: true, listId: result[0].list_id, version: result[0].version };
}

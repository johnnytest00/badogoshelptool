"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { userFacingActionError } from "@/lib/user-facing-action-error";

export type TakeoffWorkflowResult = { ok: true; listId?: string } | { ok: false; error: string };

const approveSchema = z.object({ organizationId: z.string().uuid(), takeoffId: z.string().uuid() });
const listSchema = approveSchema.extend({ requestKey: z.string().uuid() });

async function organizationRole(organizationId: string) {
  return (await getAuthContext())?.organizations.find((organization) => organization.id === organizationId)?.role ?? null;
}

/** Approves a project-less takeoff draft; the RPC re-checks role, source freshness and version. */
export async function approveStandaloneTakeoffAction(input: z.input<typeof approveSchema>): Promise<TakeoffWorkflowResult> {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Érvénytelen kérés." };
  const role = await organizationRole(parsed.data.organizationId);
  if (!role) return { ok: false, error: "Nincs hozzáférésed ehhez a műhelyhez." };
  if (role !== "owner" && role !== "admin") return { ok: false, error: "Jóváhagyáshoz admin vagy tulajdonos jogosultság kell." };
  const supabase = await createClient();
  const { data: takeoff } = await supabase.from("material_takeoffs").select("version").eq("id", parsed.data.takeoffId)
    .eq("organization_id", parsed.data.organizationId).is("project_id", null).maybeSingle();
  if (!takeoff) return { ok: false, error: "Az anyagkimutatás nem található." };
  const { error } = await supabase.rpc("approve_material_takeoff", { p_organization_id: parsed.data.organizationId, p_takeoff_id: parsed.data.takeoffId, p_expected_version: takeoff.version });
  if (error) return { ok: false, error: "A jóváhagyás nem sikerült: a forrásprofil időközben megváltozhatott, vagy a kimutatás már jóvá lett hagyva. Töltsd újra az oldalt." };
  revalidatePath("/anyagkimutatasok");
  revalidatePath(`/anyagkimutatasok/${parsed.data.takeoffId}`);
  return { ok: true };
}

/** Creates (or returns the already existing) standalone material list from an approved takeoff. */
export async function createMaterialListFromTakeoffAction(input: z.input<typeof listSchema>): Promise<TakeoffWorkflowResult> {
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Érvénytelen kérés." };
  if (!await organizationRole(parsed.data.organizationId)) return { ok: false, error: "Nincs hozzáférésed ehhez a műhelyhez." };
  const supabase = await createClient();
  const { data: takeoff } = await supabase.from("material_takeoffs").select("name").eq("id", parsed.data.takeoffId)
    .eq("organization_id", parsed.data.organizationId).is("project_id", null).maybeSingle();
  if (!takeoff) return { ok: false, error: "Az anyagkimutatás nem található." };
  const { data, error } = await supabase.rpc("save_workflow_material_list_from_takeoff", {
    p_organization_id: parsed.data.organizationId, p_takeoff_id: parsed.data.takeoffId,
    p_name: `${takeoff.name} · anyaglista`.slice(0, 120), p_request_key: parsed.data.requestKey,
  });
  if (error || !data?.[0]) {
    if (error?.code === "40001") return { ok: false, error: "A forrásprofil időközben új revíziót kapott. Készíts új anyagkimutatást az aktuális profilból." };
    return { ok: false, error: userFacingActionError(error, "Az anyaglista létrehozása nem sikerült.") };
  }
  revalidatePath("/anyaglistak");
  revalidatePath(`/anyagkimutatasok/${parsed.data.takeoffId}`);
  return { ok: true, listId: data[0].list_id };
}

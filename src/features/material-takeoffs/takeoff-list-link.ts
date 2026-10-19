import { createClient } from "@/infrastructure/supabase/server";

/** The one material list already created from a takeoff (RLS: creator only), or null. */
export async function getTakeoffListLink(organizationId: string, takeoffId: string): Promise<{ listId: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("material_preparation_takeoff_sources").select("material_list_id")
    .eq("organization_id", organizationId).eq("takeoff_id", takeoffId).maybeSingle();
  if (error) throw new Error("Az anyaglista-kapcsolat nem tölthető be.");
  return data ? { listId: data.material_list_id } : null;
}

export type ListTakeoffSource = Readonly<{ takeoffId: string; takeoffName: string; takeoffVersion: number }>;

export async function getListTakeoffSource(organizationId: string, listId: string): Promise<ListTakeoffSource | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("material_preparation_takeoff_sources").select("takeoff_id, takeoff_version")
    .eq("organization_id", organizationId).eq("material_list_id", listId).maybeSingle();
  if (error) throw new Error("A lista forrás-anyagkimutatása nem tölthető be.");
  if (!data) return null;
  const { data: takeoff } = await supabase.from("material_takeoffs").select("name").eq("id", data.takeoff_id).eq("organization_id", organizationId).maybeSingle();
  return { takeoffId: data.takeoff_id, takeoffName: takeoff?.name ?? "Anyagkimutatás", takeoffVersion: data.takeoff_version };
}

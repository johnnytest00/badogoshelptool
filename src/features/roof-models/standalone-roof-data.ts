import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { roofGeometryInputSchema, roofGeometryOutputSchema, type RoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";

export type StandaloneRoofRecord = Readonly<{
  id: string; name: string; input: RoofGeometryInput; output: RoofGeometry;
  revisionId: string; revisionNumber: number;
  revisions: readonly Readonly<{ id: string; revisionNumber: number; input: RoofGeometryInput; createdAt: string }>[];
}>;

export async function getStandaloneRoofGeometry(organizationId: string, calculationId: string): Promise<StandaloneRoofRecord | null> {
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return null;
  const client = await createClient();
  const { data: calculation, error } = await client.from("calculations")
    .select("id,display_name,current_revision_id,calculator_type")
    .eq("id", calculationId).eq("organization_id", organizationId)
    .eq("ownership_scope", "standalone").eq("created_by", auth.userId).maybeSingle();
  if (error || !calculation || !calculation.calculator_type.startsWith("roof.geometry.") || !calculation.current_revision_id) return null;
  const { data: revision } = await client.from("calculation_revisions")
    .select("id,revision_number,input_snapshot,output_snapshot,validation_status")
    .eq("id", calculation.current_revision_id).eq("calculation_id", calculation.id)
    .eq("organization_id", organizationId).maybeSingle();
  if (!revision || revision.validation_status !== "verified") return null;
  const input = roofGeometryInputSchema.safeParse(revision.input_snapshot);
  const output = roofGeometryOutputSchema.safeParse(revision.output_snapshot);
  if (!input.success || input.data.type === "gable" || !output.success || calculation.calculator_type !== `roof.geometry.${input.data.type}`
    || output.data.type !== input.data.type) return null;
  const { data: history, error: historyError } = await client.from("calculation_revisions")
    .select("id,revision_number,input_snapshot,created_at,validation_status")
    .eq("calculation_id", calculation.id).eq("organization_id", organizationId)
    .order("revision_number", { ascending: false });
  if (historyError) return null;
  const revisions = (history ?? []).flatMap((item) => {
    const parsed = roofGeometryInputSchema.safeParse(item.input_snapshot);
    return item.validation_status === "verified" && parsed.success && parsed.data.type === input.data.type
      ? [{ id: item.id, revisionNumber: item.revision_number, input: parsed.data, createdAt: item.created_at }] : [];
  });
  return { id: calculation.id, name: calculation.display_name, input: input.data, output: output.data, revisionId: revision.id, revisionNumber: revision.revision_number, revisions };
}

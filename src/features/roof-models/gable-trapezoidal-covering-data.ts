import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import { GABLE_TRAPEZOIDAL_COVERING_ID, calculateCoveringSnapshot } from "./gable-trapezoidal-covering-persistence";

export type SavedGableCoveringRevision = Readonly<{
  revisionId: string;
  revisionNumber: number;
  scope: "project" | "standalone";
  input: unknown;
  output: unknown;
  provenance: unknown;
  validationStatus: string;
  createdAt: string;
}>;

export type SavedGableCovering = Readonly<{
  calculationId: string;
  organizationId: string;
  projectId: string | null;
  roofModelId: string | null;
  displayName: string;
  currentRevisionId: string | null;
  currentRevisionNumber: number;
  revisions: readonly SavedGableCoveringRevision[];
}>;

const stable = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : item);

async function authorized(organizationId: string) {
  const auth = await getAuthContext();
  return auth?.organizations.some((organization) => organization.id === organizationId) ?? false;
}

function validatedRevision(row: { id: string; revision_number: number; input_snapshot: unknown; output_snapshot: unknown; data_provenance: unknown; validation_status: string; created_at: string }): SavedGableCoveringRevision | null {
  const input = row.input_snapshot as { source?: { geometryInput?: unknown }; coveringInput?: unknown; scope?: "project" | "standalone" };
  const calculated = calculateCoveringSnapshot(input?.source?.geometryInput, input?.coveringInput);
  if (!calculated) return null;
  const expected = { geometry: calculated.geometry, covering: calculated.output };
  if (stable(expected) !== stable(row.output_snapshot)) return null;
  if (input.scope !== "project" && input.scope !== "standalone") return null;
  return { revisionId: row.id, revisionNumber: row.revision_number, scope: input.scope, input: row.input_snapshot, output: expected, provenance: row.data_provenance, validationStatus: row.validation_status, createdAt: row.created_at };
}

export async function listGableTrapezoidalCoverings(organizationId: string, projectId?: string): Promise<SavedGableCovering[]> {
  if (!await authorized(organizationId)) return [];
  const supabase = await createClient();
  let query = supabase.from("calculations").select("id, organization_id, project_id, roof_model_id, display_name, current_revision_id, created_at, updated_at")
    .eq("organization_id", organizationId).eq("calculator_type", GABLE_TRAPEZOIDAL_COVERING_ID).order("updated_at", { ascending: false }).limit(100);
  query = projectId ? query.eq("ownership_scope", "project").eq("project_id", projectId) : query.eq("ownership_scope", "standalone");
  const { data: calculations, error } = await query;
  if (error) throw new Error("A mentett trapézlemez-fedések listája nem tölthető be.");
  if (!calculations?.length) return [];
  const revisionsByCalculation = new Map<string, Array<Parameters<typeof validatedRevision>[0]>>();
  let offset = 0;
  while (true) {
    const { data, error: revisionError } = await supabase.from("calculation_revisions")
      .select("id, calculation_id, revision_number, input_snapshot, output_snapshot, data_provenance, validation_status, created_at, input_schema_version, calculator_implementation_version")
      .eq("organization_id", organizationId).in("calculation_id", calculations.map(({ id }) => id))
      .eq("input_schema_version", "1.0.0").eq("calculator_implementation_version", "1.0.0")
      .order("calculation_id", { ascending: true }).order("revision_number", { ascending: false }).range(offset, offset + 999);
    if (revisionError) throw new Error("A trapézlemez-fedés revíziói nem tölthetők be.");
    for (const row of data ?? []) {
      const rows = revisionsByCalculation.get(row.calculation_id) ?? [];
      if (rows.length < 100) rows.push(row);
      revisionsByCalculation.set(row.calculation_id, rows);
    }
    if (!data || data.length < 1000) break;
    offset += 1000;
  }
  return calculations.map((calculation) => {
    const revisions = (revisionsByCalculation.get(calculation.id) ?? []).flatMap((row) => { const revision = validatedRevision(row); return revision ? [revision] : []; });
    const current = revisions.find((revision) => revision.revisionId === calculation.current_revision_id);
    return { calculationId: calculation.id, organizationId, projectId: calculation.project_id, roofModelId: calculation.roof_model_id,
      displayName: calculation.display_name, currentRevisionId: calculation.current_revision_id, currentRevisionNumber: current?.revisionNumber ?? 0, revisions };
  });
}

export async function getGableTrapezoidalCovering(organizationId: string, calculationId: string, revisionNumber?: number): Promise<SavedGableCovering | null> {
  if (!await authorized(organizationId)) return null;
  const supabase = await createClient();
  const { data: calculation, error } = await supabase.from("calculations")
    .select("id, organization_id, project_id, roof_model_id, ownership_scope, display_name, current_revision_id")
    .eq("organization_id", organizationId).eq("id", calculationId).eq("calculator_type", GABLE_TRAPEZOIDAL_COVERING_ID).maybeSingle();
  if (error || !calculation) return null;
  const { data: rows, error: revisionError } = await supabase.from("calculation_revisions")
    .select("id, revision_number, input_snapshot, output_snapshot, data_provenance, validation_status, created_at, input_schema_version, calculator_implementation_version")
    .eq("organization_id", organizationId).eq("calculation_id", calculationId)
    .eq("input_schema_version", "1.0.0").eq("calculator_implementation_version", "1.0.0")
    .order("revision_number", { ascending: false }).limit(100);
  if (revisionError) throw new Error("A trapézlemez-fedés revíziói nem tölthetők be.");
  const allRevisions = (rows ?? []).flatMap((row) => { const revision = validatedRevision(row); return revision ? [revision] : []; });
  const current = allRevisions.find((revision) => revision.revisionId === calculation.current_revision_id);
  const revisions = revisionNumber === undefined ? allRevisions : allRevisions.filter((revision) => revision.revisionNumber === revisionNumber);
  if (!revisions.length) return null;
  return { calculationId, organizationId, projectId: calculation.project_id, roofModelId: calculation.roof_model_id,
    displayName: calculation.display_name, currentRevisionId: calculation.current_revision_id,
    currentRevisionNumber: current?.revisionNumber ?? 0, revisions };
}

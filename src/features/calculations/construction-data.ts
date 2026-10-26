import { getAuthContext } from "@/features/auth/auth.server";
import { constructionInputSnapshotSchema, isCompleteConstructionOutput, isSaveableConstructionCalculator, normalizedConstructionInput, type ConstructionInputSnapshot, type ConstructionOutputSnapshot } from "@/features/calculators/construction-computation";
import { rafterJointTransferValues } from "@/features/calculators/rafter-connection-fields";
import { createClient } from "@/infrastructure/supabase/server";

export type SavedConstructionRevision = Readonly<{ revisionId: string; revisionNumber: number; createdAt: string; input: ConstructionInputSnapshot; output: ConstructionOutputSnapshot }>;
export const CONSTRUCTION_REVISION_PAGE_SIZE = 50;
export type ConstructionRevisionPage = Readonly<{
  revisions: readonly SavedConstructionRevision[];
  hasOlderRevisions: boolean;
  nextBeforeRevisionNumber: number | null;
}>;
export type SavedConstructionCalculation = Readonly<{
  calculationId: string; calculatorId: string; displayName: string; currentRevisionNumber: number;
  revisions: readonly SavedConstructionRevision[];
  hasOlderRevisions: boolean;
  nextBeforeRevisionNumber: number | null;
}>;

type ConstructionRevisionRow = Readonly<{ id: string; revision_number: number; created_at: string; input_snapshot: unknown; output_snapshot: unknown }>;

function revisionFromRow(row: ConstructionRevisionRow, calculatorId: string): SavedConstructionRevision | null {
  const input = constructionInputSnapshotSchema.safeParse(row.input_snapshot);
  return input.success && input.data.calculatorId === calculatorId
    ? { revisionId: row.id, revisionNumber: row.revision_number, createdAt: row.created_at, input: normalizedConstructionInput(input.data), output: row.output_snapshot as unknown as ConstructionOutputSnapshot }
    : null;
}

function revisionPageFromRows(rows: readonly ConstructionRevisionRow[], calculatorId: string): ConstructionRevisionPage {
  const hasOlderRevisions = rows.length > CONSTRUCTION_REVISION_PAGE_SIZE;
  const pageRows = rows.slice(0, CONSTRUCTION_REVISION_PAGE_SIZE);
  return {
    revisions: pageRows.flatMap((row) => { const revision = revisionFromRow(row, calculatorId); return revision ? [revision] : []; }),
    hasOlderRevisions,
    nextBeforeRevisionNumber: hasOlderRevisions ? pageRows.at(-1)?.revision_number ?? null : null,
  };
}

/** Read-side guard for downstream actions; immutable revision output makes the decision stable. */
export async function isCompleteConstructionRevision(organizationId: string, revisionId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: revision, error } = await supabase.from("calculation_revisions").select("calculation_id, output_snapshot")
    .eq("id", revisionId).eq("organization_id", organizationId).maybeSingle();
  if (error || !revision) return false;
  const { data: calculation, error: calculationError } = await supabase.from("calculations").select("calculator_type")
    .eq("id", revision.calculation_id).eq("organization_id", organizationId).eq("ownership_scope", "standalone").maybeSingle();
  const calculatorId = calculation?.calculator_type.replace(/^construction\./, "") ?? "";
  return !calculationError && isSaveableConstructionCalculator(calculatorId) && isCompleteConstructionOutput(revision.output_snapshot);
}

/** Creator-scoped (RLS) saved suite calculation with its readable revisions, newest first. */
export async function getConstructionCalculation(organizationId: string, calculationId: string): Promise<SavedConstructionCalculation | null> {
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return null;
  const supabase = await createClient();
  const { data: calculation, error } = await supabase.from("calculations")
    .select("id, calculator_type, display_name, current_revision_id")
    .eq("id", calculationId).eq("organization_id", organizationId).eq("ownership_scope", "standalone").like("calculator_type", "construction.%").maybeSingle();
  if (error) throw new Error("A mentett kalkuláció nem tölthető be.");
  const calculatorId = calculation?.calculator_type.slice("construction.".length) ?? "";
  if (!calculation || !isSaveableConstructionCalculator(calculatorId)) return null;
  const { data: rows, error: revisionError } = await supabase.from("calculation_revisions")
    .select("id, revision_number, created_at, input_snapshot, output_snapshot")
    .eq("calculation_id", calculationId).eq("organization_id", organizationId)
    // revision_number is unique within a calculation; id keeps the order deterministic if legacy data violates that invariant.
    .order("revision_number", { ascending: false }).order("id", { ascending: false }).limit(CONSTRUCTION_REVISION_PAGE_SIZE + 1);
  if (revisionError) throw new Error("A kalkuláció revíziói nem tölthetők be.");
  const page = revisionPageFromRows((rows ?? []) as ConstructionRevisionRow[], calculatorId);
  const revisions = page.revisions;
  const current = revisions.find((revision) => revision.revisionId === calculation.current_revision_id);
  if (!current) return null;
  return { calculationId: calculation.id, calculatorId, displayName: calculation.display_name, currentRevisionNumber: current.revisionNumber, ...page };
}

/** Loads one older page without widening the initial saved-calculation query. */
export async function getConstructionRevisionPage(organizationId: string, calculationId: string, beforeRevisionNumber?: number): Promise<ConstructionRevisionPage | null> {
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return null;
  const supabase = await createClient();
  const { data: calculation, error: calculationError } = await supabase.from("calculations")
    .select("id, calculator_type").eq("id", calculationId).eq("organization_id", organizationId).eq("ownership_scope", "standalone").like("calculator_type", "construction.%").maybeSingle();
  if (calculationError) throw new Error("A mentett kalkuláció nem tölthető be.");
  const calculatorId = calculation?.calculator_type.slice("construction.".length) ?? "";
  if (!calculation || !isSaveableConstructionCalculator(calculatorId)) return null;
  let query = supabase.from("calculation_revisions").select("id, revision_number, created_at, input_snapshot, output_snapshot")
    .eq("calculation_id", calculationId).eq("organization_id", organizationId);
  if (beforeRevisionNumber !== undefined) query = query.lt("revision_number", beforeRevisionNumber);
  const { data: rows, error: revisionError } = await query.order("revision_number", { ascending: false }).order("id", { ascending: false }).limit(CONSTRUCTION_REVISION_PAGE_SIZE + 1);
  if (revisionError) throw new Error("A kalkuláció régebbi revíziói nem tölthetők be.");
  return revisionPageFromRows((rows ?? []) as ConstructionRevisionRow[], calculatorId);
}

export type RafterCutTransferSource = Readonly<{
  calculationId: string; displayName: string; revisionId: string; revisionNumber: number;
  fields: Readonly<Record<string, string>>;
  /** M10 Fázis 1: csak a gable geometriai konverzióhoz szükséges forrásmezők, nem a teljes szűretlen snapshot. */
  geometry: Readonly<{ horizontalHalfSpanMm?: string; riseMm?: string; seatCutHeightMm?: string }>;
}>;
/** Distinguishes "no compatible source" from "could not load" so the UI never shows a misleading empty list. */
export type RafterCutTransferSourcesResult = Readonly<{ ok: true; sources: readonly RafterCutTransferSource[] }> | Readonly<{ ok: false }>;

/**
 * M10 Fázis 0: creator-scoped (RLS) saved roof.rafter-cut calculations whose current revision has at least one
 * HAP/ridge-connection field to offer for explicit "Adatok átvétele" transfer into roof.material-takeoff or
 * roof.timber-cutlist. Only the current revision is considered, same as the rest of the standalone suite.
 */
export async function listRafterCutTransferSources(organizationId: string): Promise<RafterCutTransferSourcesResult> {
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false };
  const supabase = await createClient();
  const { data: calculations, error } = await supabase.from("calculations")
    .select("id, display_name, current_revision_id")
    .eq("organization_id", organizationId).eq("ownership_scope", "standalone").eq("calculator_type", "construction.roof.rafter-cut")
    .eq("created_by", auth.userId).order("updated_at", { ascending: false }).limit(20);
  if (error) return { ok: false };
  if (!calculations?.length) return { ok: true, sources: [] };
  const revisionIds = calculations.flatMap((calculation) => calculation.current_revision_id ? [calculation.current_revision_id] : []);
  if (!revisionIds.length) return { ok: true, sources: [] };
  const { data: revisions, error: revisionError } = await supabase.from("calculation_revisions").select("id, revision_number, input_snapshot")
    .eq("organization_id", organizationId).in("id", revisionIds);
  if (revisionError) return { ok: false };
  const revisionById = new Map((revisions ?? []).map((row) => [row.id, row]));
  const sources = calculations.flatMap((calculation) => {
    const revision = calculation.current_revision_id ? revisionById.get(calculation.current_revision_id) : undefined;
    const input = revision ? constructionInputSnapshotSchema.safeParse(revision.input_snapshot) : null;
    if (!revision || !input?.success) return [];
    const fields = rafterJointTransferValues(input.data.fields);
    const geometry = { horizontalHalfSpanMm: input.data.fields.horizontalHalfSpanMm, riseMm: input.data.fields.riseMm, seatCutHeightMm: input.data.fields.seatCutHeightMm };
    return Object.keys(fields).length > 0 ? [{ calculationId: calculation.id, displayName: calculation.display_name, revisionId: revision.id, revisionNumber: revision.revision_number, fields, geometry }] : [];
  });
  return { ok: true, sources };
}

/** Direct immutable revision lookup for downstream links; independent of the visible history page. */
export async function getConstructionRevision(organizationId: string, calculationId: string, revisionId: string): Promise<{ calculation: Pick<SavedConstructionCalculation, "calculationId" | "calculatorId" | "displayName">; revision: SavedConstructionRevision } | null> {
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return null;
  const supabase = await createClient();
  const { data: calculation, error: calculationError } = await supabase.from("calculations")
    .select("id, calculator_type, display_name").eq("id", calculationId).eq("organization_id", organizationId).eq("ownership_scope", "standalone").like("calculator_type", "construction.%").maybeSingle();
  if (calculationError) throw new Error("A mentett kalkuláció nem tölthető be.");
  const calculatorId = calculation?.calculator_type.slice("construction.".length) ?? "";
  if (!calculation || !isSaveableConstructionCalculator(calculatorId)) return null;
  const { data: row, error: revisionError } = await supabase.from("calculation_revisions")
    .select("id, revision_number, created_at, input_snapshot, output_snapshot").eq("id", revisionId).eq("calculation_id", calculationId).eq("organization_id", organizationId).maybeSingle();
  if (revisionError) throw new Error("A kalkulációs revízió nem tölthető be.");
  const revision = row ? revisionFromRow(row as ConstructionRevisionRow, calculatorId) : null;
  return revision ? { calculation: { calculationId: calculation.id, calculatorId, displayName: calculation.display_name }, revision } : null;
}

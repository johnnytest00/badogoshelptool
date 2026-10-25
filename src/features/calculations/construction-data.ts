import { getAuthContext } from "@/features/auth/auth.server";
import { constructionInputSnapshotSchema, isSaveableConstructionCalculator, normalizedConstructionInput, type ConstructionInputSnapshot, type ConstructionOutputSnapshot } from "@/features/calculators/construction-computation";
import { createClient } from "@/infrastructure/supabase/server";

export type SavedConstructionRevision = Readonly<{ revisionId: string; revisionNumber: number; createdAt: string; input: ConstructionInputSnapshot; output: ConstructionOutputSnapshot }>;
export type SavedConstructionCalculation = Readonly<{
  calculationId: string; calculatorId: string; displayName: string; currentRevisionNumber: number;
  revisions: readonly SavedConstructionRevision[];
}>;

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
    .eq("calculation_id", calculationId).eq("organization_id", organizationId).order("revision_number", { ascending: false }).limit(50);
  if (revisionError) throw new Error("A kalkuláció revíziói nem tölthetők be.");
  // A revision whose stored input no longer matches the contract stays in the database but is not reopened for editing.
  const revisions = (rows ?? []).flatMap((row) => {
    const input = constructionInputSnapshotSchema.safeParse(row.input_snapshot);
    return input.success && input.data.calculatorId === calculatorId
      ? [{ revisionId: row.id, revisionNumber: row.revision_number, createdAt: row.created_at, input: normalizedConstructionInput(input.data), output: row.output_snapshot as unknown as ConstructionOutputSnapshot }]
      : [];
  });
  const current = revisions.find((revision) => revision.revisionId === calculation.current_revision_id);
  if (!current) return null;
  return { calculationId: calculation.id, calculatorId, displayName: calculation.display_name, currentRevisionNumber: current.revisionNumber, revisions };
}

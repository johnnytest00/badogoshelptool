import { createClient } from "@/infrastructure/supabase/server";
import { gutterMaterialInputSchema, gutterMaterialCalculator, type GutterMaterialInput, type GutterMaterialOutput } from "@/domain/calculations/gutter-material";
import { executeCalculator } from "@/domain/calculations/engine";
import { gableRoofCalculator } from "@/domain/calculations/gable-roof";

export type GutterGeometrySuggestion = { id: string; label: string; lengthMm: number; roofModelId: string; roofModelRevisionId: string; calculationId: string; calculationRevisionId: string };
export type GutterCalculationRevision = { revisionId: string; revisionNumber: number; input: GutterMaterialInput; output: GutterMaterialOutput; createdAt: string };
export type GutterCalculationRecord = { calculationId: string; displayName: string; revisionId: string; revisionNumber: number; input: GutterMaterialInput; output: GutterMaterialOutput; sourceRoofRevisionId: string | null; revisions: GutterCalculationRevision[] };

function parse(value: unknown): GutterMaterialInput | null { const result = gutterMaterialInputSchema.safeParse(value); return result.success ? result.data : null; }
function output(value: unknown): GutterMaterialOutput | null { return value && typeof value === "object" ? value as GutterMaterialOutput : null; }

export async function getGutterGeometrySuggestions(organizationId: string, projectId: string): Promise<GutterGeometrySuggestion[]> {
  const supabase = await createClient();
  const { data: models, error } = await supabase.from("roof_models").select("id, name, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("roof_type", "gable");
  if (error) throw new Error("A tetőadatok betöltése nem sikerült.");
  if (!models?.length) return [];
  const { data: calculations, error: calculationsError } = await supabase.from("calculations").select("id, roof_model_id, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("calculator_type", "roof.gable").in("roof_model_id", models.map((model) => model.id));
  if (calculationsError) throw new Error("A mentett tetőszámítások betöltése nem sikerült.");
  const calculationsByModel = new Map((calculations ?? []).map((calculation) => [calculation.roof_model_id, calculation]));
  const revisionIds = (calculations ?? []).flatMap((calculation) => calculation.current_revision_id ? [calculation.current_revision_id] : []);
  const { data: revisions, error: revisionsError } = revisionIds.length ? await supabase.from("calculation_revisions").select("id, calculation_id, input_snapshot, output_snapshot, validation_status").in("id", revisionIds).eq("organization_id", organizationId) : { data: [], error: null };
  if (revisionsError) throw new Error("A tetőrevíziók betöltése nem sikerült.");
  const [{ data: modelRevisions, error: modelError }, { data: dependencies, error: dependencyError }] = await Promise.all([
    supabase.from("roof_model_revisions").select("id, roof_model_id, validation_status").eq("organization_id", organizationId).in("roof_model_id", models.map((model) => model.id)),
    revisionIds.length ? supabase.from("calculation_dependencies").select("downstream_calculation_revision_id, upstream_roof_model_revision_id").eq("organization_id", organizationId).in("downstream_calculation_revision_id", revisionIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (modelError || dependencyError) throw new Error("A tetőgeometria forráskapcsolatai nem tölthetők be.");
  return models.flatMap((model) => {
    const calculation = calculationsByModel.get(model.id);
    const revision = (revisions ?? []).find((item) => item.id === calculation?.current_revision_id && item.calculation_id === calculation?.id && item.validation_status === "verified");
    if (!model.current_revision_id || !modelRevisions?.some((item) => item.id === model.current_revision_id && item.roof_model_id === model.id && item.validation_status === "verified") || !revision || !dependencies?.some((item) => item.downstream_calculation_revision_id === revision.id && item.upstream_roof_model_revision_id === model.current_revision_id)) return [];
    const geometry = executeCalculator(gableRoofCalculator, revision.input_snapshot);
    const stored = gableRoofCalculator.outputSchema.safeParse(revision.output_snapshot);
    if (!geometry.ok || !stored.success || stored.data.lengths.eachEaveEdgeMm !== geometry.output.lengths.eachEaveEdgeMm) return [];
    const length = geometry.output.lengths.eachEaveEdgeMm;
    if (!Number.isSafeInteger(length) || length <= 0) return [];
    return [
      { id: "left-eave", label: `${model.name} · bal eresz`, lengthMm: length, roofModelId: model.id, roofModelRevisionId: model.current_revision_id, calculationId: calculation!.id, calculationRevisionId: revision.id },
      { id: "right-eave", label: `${model.name} · jobb eresz`, lengthMm: length, roofModelId: model.id, roofModelRevisionId: model.current_revision_id, calculationId: calculation!.id, calculationRevisionId: revision.id },
    ];
  });
}

export async function getGutterCalculation(organizationId: string, projectId: string): Promise<GutterCalculationRecord | null> {
  const supabase = await createClient();
  const { data: calculation, error: calculationError } = await supabase.from("calculations").select("id, current_revision_id, display_name").eq("organization_id", organizationId).eq("project_id", projectId).is("roof_model_id", null).eq("calculator_type", "gutters.material-estimate").maybeSingle();
  if (calculationError) throw new Error("A mentett ereszkalkuláció betöltése nem sikerült.");
  if (!calculation?.current_revision_id) return null;
  const { data: rows, error } = await supabase.from("calculation_revisions").select("id, revision_number, input_snapshot, output_snapshot, created_at").eq("calculation_id", calculation.id).eq("organization_id", organizationId).order("revision_number", { ascending: false });
  if (error) throw new Error("Az ereszkalkuláció revíziói nem tölthetők be.");
  if (!rows?.length) throw new Error("A mentett ereszkalkuláció revíziója nem található.");
  const revisions = rows.flatMap((row) => {
    const input = parse(row.input_snapshot); const result = output(row.output_snapshot);
    return input && result ? [{ revisionId: row.id, revisionNumber: row.revision_number, input, output: result, createdAt: row.created_at }] : [];
  });
  const current = revisions.find((revision) => revision.revisionId === calculation.current_revision_id) ?? revisions[0];
  if (!current) return null;
  const sourceRoofRevisionId = current.input.runs.find((run) => run.roofEdge)?.roofEdge?.revisionId ?? null;
  return { calculationId: calculation.id, displayName: calculation.display_name, ...current, sourceRoofRevisionId, revisions };
}

export function calculateGutterInput(input: GutterMaterialInput) { return executeCalculator(gutterMaterialCalculator, input); }

import { createClient } from "@/infrastructure/supabase/server";
import { gutterMaterialInputSchema, gutterMaterialCalculator, type GutterMaterialInput, type GutterMaterialOutput } from "@/domain/calculations/gutter-material";
import { executeCalculator } from "@/domain/calculations/engine";

export type GutterGeometrySuggestion = { id: string; label: string; lengthMm: number; roofModelRevisionId: string };
export type GutterCalculationRevision = { revisionId: string; revisionNumber: number; input: GutterMaterialInput; output: GutterMaterialOutput; createdAt: string };
export type GutterCalculationRecord = { calculationId: string; revisionId: string; revisionNumber: number; input: GutterMaterialInput; output: GutterMaterialOutput; sourceRoofRevisionId: string | null; revisions: GutterCalculationRevision[] };

function parse(value: unknown): GutterMaterialInput | null { const result = gutterMaterialInputSchema.safeParse(value); return result.success ? result.data : null; }
function output(value: unknown): GutterMaterialOutput | null { return value && typeof value === "object" ? value as GutterMaterialOutput : null; }

export async function getGutterGeometrySuggestions(organizationId: string, projectId: string): Promise<GutterGeometrySuggestion[]> {
  const supabase = await createClient();
  const { data: models, error } = await supabase.from("roof_models").select("id, name, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("roof_type", "gable");
  if (error || !models?.length) return [];
  const { data: calculations } = await supabase.from("calculations").select("roof_model_id, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("calculator_type", "roof.gable").in("roof_model_id", models.map((model) => model.id));
  const revisionsByModel = new Map((calculations ?? []).flatMap((calculation) => calculation.current_revision_id ? [[calculation.roof_model_id, calculation.current_revision_id] as const] : []));
  const revisionIds = [...revisionsByModel.values()];
  const { data: revisions } = revisionIds.length ? await supabase.from("calculation_revisions").select("id, output_snapshot").in("id", revisionIds).eq("organization_id", organizationId) : { data: [] };
  return models.flatMap((model) => {
    const revision = (revisions ?? []).find((item) => item.id === revisionsByModel.get(model.id));
    const data = revision?.output_snapshot as { lengths?: { eachEaveEdgeMm?: number } } | null;
    const length = data?.lengths?.eachEaveEdgeMm;
    if (!revision || typeof length !== "number" || !Number.isFinite(length) || length <= 0) return [];
    return [
      ...(model.current_revision_id ? [
        { id: `${model.id}:left-eave`, label: `${model.name} · bal eresz`, lengthMm: length, roofModelRevisionId: model.current_revision_id },
        { id: `${model.id}:right-eave`, label: `${model.name} · jobb eresz`, lengthMm: length, roofModelRevisionId: model.current_revision_id },
      ] : []),
    ];
  });
}

export async function getGutterCalculation(organizationId: string, projectId: string): Promise<GutterCalculationRecord | null> {
  const supabase = await createClient();
  const { data: calculation } = await supabase.from("calculations").select("id, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).is("roof_model_id", null).eq("calculator_type", "gutters.material-estimate").maybeSingle();
  if (!calculation?.current_revision_id) return null;
  const { data: rows, error } = await supabase.from("calculation_revisions").select("id, revision_number, input_snapshot, output_snapshot, created_at").eq("calculation_id", calculation.id).eq("organization_id", organizationId).order("revision_number", { ascending: false });
  if (error || !rows?.length) return null;
  const revisions = rows.flatMap((row) => {
    const input = parse(row.input_snapshot); const result = output(row.output_snapshot);
    return input && result ? [{ revisionId: row.id, revisionNumber: row.revision_number, input, output: result, createdAt: row.created_at }] : [];
  });
  const current = revisions.find((revision) => revision.revisionId === calculation.current_revision_id) ?? revisions[0];
  if (!current) return null;
  const sourceRoofRevisionId = current.input.runs.find((run) => run.roofEdge)?.roofEdge?.revisionId ?? null;
  return { calculationId: calculation.id, ...current, sourceRoofRevisionId, revisions };
}

export function calculateGutterInput(input: GutterMaterialInput) { return executeCalculator(gutterMaterialCalculator, input); }

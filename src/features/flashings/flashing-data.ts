import { executeCalculator } from "@/domain/calculations/engine";
import { gableRoofCalculator } from "@/domain/calculations/gable-roof";
import { flashingMaterialInputSchema, flashingMaterialCalculator, type FlashingMaterialInput, type FlashingMaterialOutput } from "@/domain/calculations/flashing-material";
import { mapGableRoofToFlashingSuggestions } from "@/domain/calculations/flashing-geometry";
import { createClient } from "@/infrastructure/supabase/server";

export type FlashingGeometrySuggestion = {
  id: string;
  label: string;
  category: "verge" | "eaves" | "ridge";
  lengthMm: number;
  reference: NonNullable<FlashingMaterialInput["runs"][number]["roofEdgeReference"]>;
};

export type FlashingSavedRevision = { revisionId: string; revisionNumber: number; displayName: string; input: FlashingMaterialInput; output: FlashingMaterialOutput; createdAt: string; stale: boolean };
export type FlashingCalculationRecord = FlashingSavedRevision & { calculationId: string; revisions: FlashingSavedRevision[] };

const parseInput = (value: unknown) => { const result = flashingMaterialInputSchema.safeParse(value); return result.success ? result.data : null; };
const parseOutput = (value: unknown) => { const parsed = flashingMaterialCalculator.outputSchema.safeParse(value); return parsed.success ? parsed.data as FlashingMaterialOutput : null; };

export async function getFlashingGeometrySuggestions(organizationId: string, projectId: string): Promise<FlashingGeometrySuggestion[]> {
  const supabase = await createClient();
  const { data: models, error: modelError } = await supabase.from("roof_models").select("id, name, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("roof_type", "gable");
  if (modelError || !models?.length) return [];
  const modelIds = models.map((model) => model.id);
  const [{ data: modelRevisions }, { data: calculations, error: calcError }] = await Promise.all([
    supabase.from("roof_model_revisions").select("id, roof_model_id, validation_status").eq("organization_id", organizationId).in("roof_model_id", modelIds),
    supabase.from("calculations").select("id, roof_model_id, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("calculator_type", "roof.gable").in("roof_model_id", modelIds),
  ]);
  if (calcError || !modelRevisions?.length || !calculations?.length) return [];
  const currentCalculationIds = calculations.flatMap((item) => item.current_revision_id ? [item.current_revision_id] : []);
  const { data: results, error: resultError } = currentCalculationIds.length
    ? await supabase.from("calculation_revisions").select("id, calculation_id, input_snapshot, output_snapshot, validation_status").eq("organization_id", organizationId).in("id", currentCalculationIds)
    : { data: [], error: null };
  if (resultError) return [];
  const resultIds = (results ?? []).map((item) => item.id);
  const { data: dependencies, error: dependencyError } = resultIds.length
    ? await supabase.from("calculation_dependencies").select("downstream_calculation_revision_id, upstream_roof_model_revision_id").in("downstream_calculation_revision_id", resultIds)
    : { data: [], error: null };
  if (dependencyError) return [];
  const currentCalcByModel = new Map(calculations.map((item) => [item.roof_model_id, item]));
  return models.flatMap((model) => {
    const modelRevision = modelRevisions.find((item) => item.id === model.current_revision_id && item.roof_model_id === model.id && item.validation_status === "verified");
    const calculation = currentCalcByModel.get(model.id);
    const result = results?.find((item) => item.id === calculation?.current_revision_id && item.calculation_id === calculation?.id && item.validation_status === "verified");
    if (!modelRevision || !calculation?.current_revision_id || !result || !dependencies?.some((dependency) => dependency.downstream_calculation_revision_id === result.id && dependency.upstream_roof_model_revision_id === modelRevision.id)) return [];
    const calculated = executeCalculator(gableRoofCalculator, result.input_snapshot);
    if (!calculated.ok) return [];
    const output = calculated.output;
    const storedOutput = result.output_snapshot as { lengths?: Record<string, unknown> } | null;
    if (storedOutput?.lengths?.eachEaveEdgeMm !== output.lengths.eachEaveEdgeMm || storedOutput.lengths.ridgeLineMm !== output.lengths.ridgeLineMm || storedOutput.lengths.eachSlopingGableEdgeMm !== output.lengths.eachSlopingGableEdgeMm) return [];
    return mapGableRoofToFlashingSuggestions({ roofModelId: model.id, roofModelName: model.name, roofModelRevisionId: modelRevision.id, calculationId: calculation.id, calculationRevisionId: result.id }, output);
  });
}

export async function getFlashingCalculation(organizationId: string, projectId: string): Promise<FlashingCalculationRecord | null> {
  const supabase = await createClient();
  const { data: calculation, error } = await supabase.from("calculations").select("id, display_name, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).is("roof_model_id", null).eq("calculator_type", flashingMaterialCalculator.id).maybeSingle();
  if (error || !calculation?.current_revision_id) return null;
  const { data: rows, error: revisionsError } = await supabase.from("calculation_revisions").select("id, revision_number, input_snapshot, output_snapshot, data_provenance, created_at").eq("organization_id", organizationId).eq("calculation_id", calculation.id).order("revision_number", { ascending: false });
  if (revisionsError || !rows?.length) return null;
  const modelIds = [...new Set(rows.flatMap((row) => { const input = parseInput(row.input_snapshot); return input ? input.runs.flatMap((run) => run.roofEdgeReference ? [run.roofEdgeReference.roofModelId] : []) : []; }))];
  const [{ data: models }, { data: geometryCalculations }] = modelIds.length ? await Promise.all([
    supabase.from("roof_models").select("id, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).in("id", modelIds),
    supabase.from("calculations").select("id, roof_model_id, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("calculator_type", "roof.gable").in("roof_model_id", modelIds),
  ]) : [{ data: [] }, { data: [] }];
  const currentModelRevision = new Map((models ?? []).map((model) => [model.id, model.current_revision_id]));
  const currentGeometryCalculationRevision = new Map((geometryCalculations ?? []).map((calculation) => [calculation.id, calculation.current_revision_id]));
  const revisions = rows.flatMap((row) => {
    const input = parseInput(row.input_snapshot); const output = parseOutput(row.output_snapshot);
    if (!input || !output) return [];
    const stale = input.runs.some((run) => run.roofEdgeReference && (currentModelRevision.get(run.roofEdgeReference.roofModelId) !== run.roofEdgeReference.roofModelRevisionId || currentGeometryCalculationRevision.get(run.roofEdgeReference.calculationId) !== run.roofEdgeReference.calculationRevisionId));
    const provenance = row.data_provenance as { displayName?: unknown } | null;
    const displayName = typeof provenance?.displayName === "string" ? provenance.displayName : calculation.display_name;
    return [{ revisionId: row.id, revisionNumber: row.revision_number, displayName, input, output, createdAt: row.created_at, stale }];
  });
  const current = revisions.find((item) => item.revisionId === calculation.current_revision_id);
  return current ? { ...current, calculationId: calculation.id, revisions } : null;
}

export function calculateFlashingInput(input: FlashingMaterialInput) { return executeCalculator(flashingMaterialCalculator, input); }

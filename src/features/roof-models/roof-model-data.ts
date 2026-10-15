import { createClient } from "@/infrastructure/supabase/server";
import { gableRoofInputSchema, type GableRoofInput, type GableRoofOutput } from "@/domain/calculations/gable-roof";
import { roofGeometryInputSchema, roofGeometryOutputSchema, type RoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";

export type RoofModelRevisionRecord = {
  id: string;
  revisionNumber: number;
  input: GableRoofInput | RoofGeometryInput | null;
  createdAt: string;
};

export type RoofModelRecord = {
  id: string;
  projectId: string;
  name: string;
  roofType: "gable" | "shed" | "hip" | "pyramid" | "halfHip" | "lShape" | "tShape" | "other";
  currentRevisionId: string | null;
  currentRevisionNumber: number;
  currentInput: GableRoofInput | null;
  currentOutput: GableRoofOutput | null;
  currentMultiRoofInput?: RoofGeometryInput | null;
  currentMultiRoofOutput?: RoofGeometry | null;
  currentCalculationId: string | null;
  currentCalculationRevisionId: string | null;
  revisions: RoofModelRevisionRecord[];
};

function parseInput(value: unknown): GableRoofInput | null {
  const parsed = gableRoofInputSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseOutput(value: unknown): GableRoofOutput | null {
  return value && typeof value === "object" ? value as GableRoofOutput : null;
}
function parseMultiRoofInput(value: unknown): RoofGeometryInput | null {
  const parsed = roofGeometryInputSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
function parseMultiRoofOutput(value: unknown): RoofGeometry | null {
  const parsed = roofGeometryOutputSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function getRoofModelsForProject(organizationId: string, projectId: string) {
  const supabase = await createClient();
  const { data: models, error: modelError } = await supabase
    .from("roof_models")
    .select("id, project_id, name, roof_type, current_revision_id")
    .eq("organization_id", organizationId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  if (modelError) throw new Error("A tetőmodellek betöltése nem sikerült.");
  if (!models?.length) return [] as RoofModelRecord[];

  const modelIds = models.map((model) => model.id);
  const { data: revisions, error: revisionError } = await supabase
    .from("roof_model_revisions")
    .select("id, roof_model_id, revision_number, input_data, created_at")
    .eq("organization_id", organizationId)
    .in("roof_model_id", modelIds)
    .order("revision_number", { ascending: false });
  if (revisionError) throw new Error("A tetőmodell-revíziók betöltése nem sikerült.");

  const calculationIds = models.map((model) => model.id);
  const { data: calculations, error: calculationError } = await supabase
    .from("calculations")
    .select("id, roof_model_id, current_revision_id, calculator_type")
    .eq("organization_id", organizationId)
    .in("roof_model_id", calculationIds)
    .in("calculator_type", ["roof.gable", "roof.geometry.shed", "roof.geometry.hip", "roof.geometry.pyramid", "roof.geometry.halfHip", "roof.geometry.lShape", "roof.geometry.tShape"]);
  if (calculationError) throw new Error("A tető-kalkulációk betöltése nem sikerült.");
  const currentCalculationRevisionIds = (calculations ?? []).flatMap((calculation) => calculation.current_revision_id ? [calculation.current_revision_id] : []);
  const { data: calculationRevisions, error: resultError } = currentCalculationRevisionIds.length
    ? await supabase.from("calculation_revisions").select("id, output_snapshot").eq("organization_id", organizationId).in("id", currentCalculationRevisionIds)
    : { data: [], error: null };
  if (resultError) throw new Error("A mentett kalkulációs eredmények betöltése nem sikerült.");

  return models.map((model) => {
    const modelRevisions = (revisions ?? []).filter((revision) => revision.roof_model_id === model.id);
    const currentRevision = modelRevisions.find((revision) => revision.id === model.current_revision_id) ?? modelRevisions[0];
    const calculation = (calculations ?? []).find((item) => item.roof_model_id === model.id && item.calculator_type === (model.roof_type === "gable" ? "roof.gable" : `roof.geometry.${model.roof_type}`));
    const calculationRevision = calculation?.current_revision_id ? (calculationRevisions ?? []).find((item) => item.id === calculation.current_revision_id) : undefined;
    return {
      id: model.id,
      projectId: model.project_id,
      name: model.name,
      roofType: model.roof_type as RoofModelRecord["roofType"],
      currentRevisionId: model.current_revision_id,
      currentRevisionNumber: currentRevision?.revision_number ?? 0,
      currentInput: model.roof_type === "gable" && currentRevision ? parseInput(currentRevision.input_data) : null,
      currentOutput: model.roof_type === "gable" ? parseOutput(calculationRevision?.output_snapshot) : null,
      currentMultiRoofInput: model.roof_type !== "gable" && currentRevision ? parseMultiRoofInput(currentRevision.input_data) : null,
      currentMultiRoofOutput: model.roof_type !== "gable" ? parseMultiRoofOutput(calculationRevision?.output_snapshot) : null,
      currentCalculationId: calculation?.id ?? null,
      currentCalculationRevisionId: calculation?.current_revision_id ?? null,
      revisions: modelRevisions.map((revision) => ({ id: revision.id, revisionNumber: revision.revision_number,
        input: model.roof_type === "gable" ? parseInput(revision.input_data) : parseMultiRoofInput(revision.input_data), createdAt: revision.created_at })),
    } satisfies RoofModelRecord;
  });
}

export async function getRoofModelForProject(organizationId: string, projectId: string, roofModelId: string) {
  const models = await getRoofModelsForProject(organizationId, projectId);
  return models.find((model) => model.id === roofModelId) ?? null;
}

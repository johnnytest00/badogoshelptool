import { calculateRoofGeometry, type RoofGeometry } from "@/domain/calculations/roof-geometry";
import { createClient } from "@/infrastructure/supabase/server";
import { getRoofModelsForProject } from "./roof-model-data";

export type VerifiedMultiRoofSource = Readonly<{
  roofModelId: string; roofModelName: string; roofModelRevisionId: string;
  calculationId: string; calculationRevisionId: string; geometry: RoofGeometry;
}>;

export async function getVerifiedMultiRoofSources(organizationId: string, projectId: string): Promise<VerifiedMultiRoofSource[]> {
  const models = (await getRoofModelsForProject(organizationId, projectId)).filter((model) => model.roofType !== "gable" && model.roofType !== "other" && model.currentMultiRoofInput && model.currentMultiRoofOutput && model.currentRevisionId && model.currentCalculationId && model.currentCalculationRevisionId);
  if (!models.length) return [];
  const client = await createClient();
  const { data: dependencies, error } = await client.from("calculation_dependencies")
    .select("downstream_calculation_revision_id,upstream_roof_model_revision_id")
    .eq("organization_id", organizationId)
    .in("downstream_calculation_revision_id", models.map((model) => model.currentCalculationRevisionId!));
  if (error) throw new Error("A tetőgeometria forráskapcsolatai nem tölthetők be.");
  return models.flatMap((model) => {
    const input = model.currentMultiRoofInput!, output = model.currentMultiRoofOutput!;
    if (input.type !== model.roofType || output.type !== model.roofType
      || !dependencies?.some((dependency) => dependency.downstream_calculation_revision_id === model.currentCalculationRevisionId && dependency.upstream_roof_model_revision_id === model.currentRevisionId)) return [];
    const recalculated = calculateRoofGeometry(input);
    if (Math.abs(recalculated.totalAreaMm2 - output.totalAreaMm2) > 1e-6
      || recalculated.edges.length !== output.edges.length
      || recalculated.edges.some((edge) => !output.edges.some((stored) => stored.id === edge.id && stored.kind === edge.kind && Math.abs(stored.lengthMm - edge.lengthMm) < 1e-6))) return [];
    return [{ roofModelId: model.id, roofModelName: model.name, roofModelRevisionId: model.currentRevisionId!, calculationId: model.currentCalculationId!, calculationRevisionId: model.currentCalculationRevisionId!, geometry: output }];
  });
}

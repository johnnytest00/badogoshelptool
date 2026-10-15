"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculateGableRoof, gableRoofInputSchema, type GableRoofInput, type GableRoofOutput } from "@/domain/calculations/gable-roof";
import { mapFieldSurveyToCalculator } from "@/domain/field-surveys/calculator-handoff";
import { completeSectionMeasurements, surveySections } from "@/domain/field-surveys/workspace";
import { getAuthContext } from "@/features/auth/auth.server";
import { getFieldSurvey, getFieldSurveyRevision } from "./field-survey-data";
import { getRoofModelsForProject } from "@/features/roof-models/roof-model-data";
import { getFlashingGeometrySuggestions } from "@/features/flashings/flashing-data";
import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database.types";

const sourceSchema = z.object({ organizationId: z.string().uuid(), surveyId: z.string().uuid(), version: z.number().int().positive(), sectionId: z.string().uuid() });
const saveSchema = sourceSchema.extend({ roofModelId: z.string().uuid().nullable(), expectedRevisionNumber: z.number().int().nonnegative(), name: z.string().trim().min(1).max(200) });

export type VerifiedSurveyRoof = Readonly<{
  roofModelId: string; roofModelRevisionId: string; roofModelRevisionNumber: number;
  calculationId: string; calculationRevisionId: string; name: string;
  input: GableRoofInput; output: GableRoofOutput; matchesCurrentSurvey: boolean;
}>;

async function authorized(organizationId: string) {
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) throw new Error("A munkamenet lejárt, vagy nincs hozzáférésed a műhelyhez.");
}

async function exactSurveySource(input: z.infer<typeof sourceSchema>) {
  await authorized(input.organizationId);
  const [survey, revision] = await Promise.all([
    getFieldSurvey(input.organizationId, input.surveyId),
    getFieldSurveyRevision(input.organizationId, input.surveyId, input.version),
  ]);
  if (!survey || !revision || survey.version !== input.version || revision.projectId !== survey.projectId) throw new Error("Aktuális felmérésrevízió szükséges.");
  const client = await createClient();
  const { data: followup, error: followupError } = revision.projectId ? { data: null, error: null } : await client.from("field_survey_followups").select("project_id").eq("survey_id", input.surveyId).eq("organization_id", input.organizationId).eq("kind", "project").maybeSingle();
  if (followupError) throw new Error("A felmérés projektkapcsolata nem tölthető be.");
  const projectId = revision.projectId ?? followup?.project_id;
  if (!projectId) throw new Error("Mentett tetőmodellhez előbb kapcsolj vagy hozz létre projektet.");
  const section = surveySections(revision).find((item) => item.id === input.sectionId && item.workType === "roof");
  if (!section) throw new Error("A forrásrevízióban nincs ilyen tetőmunkaszakasz.");
  return { revision, section, projectId };
}

function geometryFromSection(revision: Awaited<ReturnType<typeof getFieldSurveyRevision>>, section: ReturnType<typeof surveySections>[number]) {
  if (!revision) return null;
  const handoff = mapFieldSurveyToCalculator({ surveyId: revision.surveyId, revisionId: revision.id, version: revision.version, workType: "roof", measurements: completeSectionMeasurements(section) });
  if (!handoff.ok || handoff.calculator !== "roof" || handoff.missing.length) return null;
  const raw = handoff.input;
  const parsed = gableRoofInputSchema.safeParse({ inputMode: raw.inputMode, buildingLengthMm: Number(raw.buildingLengthMm), buildingWidthMm: Number(raw.buildingWidthMm), eaveOverhangMm: Number(raw.eaveOverhangMm), frontGableOverhangMm: Number(raw.frontGableOverhangMm), rearGableOverhangMm: Number(raw.rearGableOverhangMm), ...(raw.inputMode === "height" ? { roofRiseMm: Number(raw.roofRiseMm) } : { roofPitchDegrees: Number(raw.roofPitchDegrees) }) });
  return parsed.success ? parsed.data : null;
}

export async function listVerifiedSurveyRoofs(raw: z.infer<typeof sourceSchema>): Promise<VerifiedSurveyRoof[]> {
  const input = sourceSchema.parse(raw);
  const { projectId, revision, section } = await exactSurveySource(input);
  const currentSurveyInput = geometryFromSection(revision, section);
  const [models, edges] = await Promise.all([
    getRoofModelsForProject(input.organizationId, projectId),
    getFlashingGeometrySuggestions(input.organizationId, projectId),
  ]);
  return models.flatMap((model) => {
    if (model.roofType !== "gable" || !model.currentRevisionId || !model.currentInput || !model.currentCalculationId || !model.currentCalculationRevisionId) return [];
    const linked = edges.filter((edge) => edge.reference.roofModelId === model.id && edge.reference.roofModelRevisionId === model.currentRevisionId && edge.reference.calculationId === model.currentCalculationId && edge.reference.calculationRevisionId === model.currentCalculationRevisionId);
    if (linked.length !== 7) return [];
    const output = calculateGableRoof(model.currentInput);
    if (linked.some((edge) => edge.reference.suggestedLengthMm !== (edge.category === "verge" ? output.lengths.eachSlopingGableEdgeMm : edge.category === "ridge" ? output.lengths.ridgeLineMm : output.lengths.eachEaveEdgeMm))) return [];
    return [{ roofModelId: model.id, roofModelRevisionId: model.currentRevisionId, roofModelRevisionNumber: model.currentRevisionNumber, calculationId: model.currentCalculationId, calculationRevisionId: model.currentCalculationRevisionId, name: model.name, input: model.currentInput, output, matchesCurrentSurvey: Boolean(currentSurveyInput && JSON.stringify(currentSurveyInput) === JSON.stringify(model.currentInput)) }];
  });
}

export async function saveSurveyRoofGeometry(raw: z.infer<typeof saveSchema>): Promise<{ ok: true; source: VerifiedSurveyRoof; linked: boolean; linkError?: string } | { ok: false; error: string }> {
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Érvénytelen tetőmodell- vagy felmérésadat." };
  try {
    const input = parsed.data;
    const { revision, section, projectId } = await exactSurveySource(input);
    const handoff = mapFieldSurveyToCalculator({ surveyId: revision.surveyId, revisionId: revision.id, version: revision.version, workType: "roof", measurements: completeSectionMeasurements(section) });
    if (!handoff.ok || handoff.calculator !== "roof") return { ok: false, error: handoff.ok ? "Nem tetőgeometria érkezett." : handoff.error };
    if (handoff.missing.length) return { ok: false, error: `Hiányzó tetőmérések: ${handoff.missing.join(", ")}. A nem mért túlnyúlás sem vehető automatikusan nullának.` };
    const geometry = geometryFromSection(revision, section);
    if (!geometry) return { ok: false, error: "A felmért tetőméretek nem alkotnak érvényes nyeregtetőt." };
    const client = await createClient();
    if (input.roofModelId) {
      const { data: model } = await client.from("roof_models").select("id,current_revision_id").eq("id", input.roofModelId).eq("organization_id", input.organizationId).eq("project_id", projectId).eq("roof_type", "gable").maybeSingle();
      if (!model) return { ok: false, error: "A kijelölt tetőmodell nem ehhez a projekthez tartozik." };
    }
    const output = calculateGableRoof(geometry);
    const { data, error } = await client.rpc("save_gable_roof_calculation", {
      p_organization_id: input.organizationId, p_project_id: projectId, p_roof_model_id: input.roofModelId as string,
      p_name: input.name, p_input_data: geometry, p_output_data: output as unknown as Json,
      p_data_provenance: { input: "survey_measurement", output: "verified", surveySource: { surveyId: input.surveyId, revisionId: revision.id, sectionId: section.id, version: revision.version } },
      p_warnings: [], p_expected_revision_number: input.expectedRevisionNumber,
    });
    if (error || !data?.[0]) return { ok: false, error: error?.code === "40001" ? "A tetőmodell időközben megváltozott. Frissítsd a forrást." : "A tetőgeometria mentése nem sikerült." };
    const saved = data[0];
    const source: VerifiedSurveyRoof = { roofModelId: saved.roof_model_id, roofModelRevisionId: saved.roof_model_revision_id, roofModelRevisionNumber: saved.revision_number, calculationId: saved.calculation_id, calculationRevisionId: saved.calculation_revision_id, name: input.name, input: geometry, output, matchesCurrentSurvey: true };
    const { error: linkError } = await client.rpc("link_field_survey_calculation", { p_survey_id: input.surveyId, p_revision_id: revision.id, p_section_id: section.id, p_calculation_id: saved.calculation_id, p_calculation_revision_id: saved.calculation_revision_id });
    revalidatePath(`/felmeresek/${input.surveyId}`); revalidatePath(`/projektek/${projectId}`); revalidatePath(`/projektek/${projectId}/tetomodellek/${saved.roof_model_id}`);
    return { ok: true, source, linked: !linkError, ...(linkError ? { linkError: "A tetőgeometria mentve, de a felméréskapcsolatot újra kell próbálni." } : {}) };
  } catch (cause) { return { ok: false, error: cause instanceof Error ? cause.message : "A tetőgeometria mentése nem sikerült." }; }
}

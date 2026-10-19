"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculateGableRoof, type GableRoofInput, type GableRoofOutput } from "@/domain/calculations/gable-roof";
import { mapFieldSurveyToCalculator } from "@/domain/field-surveys/calculator-handoff";
import { completeSectionMeasurements, surveySections } from "@/domain/field-surveys/workspace";
import { getAuthContext } from "@/features/auth/auth.server";
import { getFieldSurvey, getFieldSurveyRevision } from "./field-survey-data";
import { getRoofModelsForProject } from "@/features/roof-models/roof-model-data";
import { createClient } from "@/infrastructure/supabase/server";
import { persistGableRoof } from "@/infrastructure/supabase/gable-roof-writer";
import { calculateRoofGeometry, type RoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { geometryFromSurveyMeasurements } from "@/domain/field-surveys/roof-geometry";
import { gableGeometryFromSurveySection } from "@/domain/field-surveys/gable-section-geometry";
import { persistRoofGeometry, registerSurveyMultiRoofSource } from "@/infrastructure/supabase/roof-geometry-writer";
import { getVerifiedMultiRoofSources } from "@/features/roof-models/multi-roof-source-data";

const sourceSchema = z.object({ organizationId: z.string().uuid(), surveyId: z.string().uuid(), version: z.number().int().positive(), sectionId: z.string().uuid() });
const saveSchema = sourceSchema.extend({ roofModelId: z.string().uuid().nullable(), newRoofModelId: z.string().uuid(), operationId: z.string().uuid(), expectedRevisionNumber: z.number().int().nonnegative(), name: z.string().trim().min(1).max(200) });

export type VerifiedSurveyRoof = Readonly<{
  roofModelId: string; roofModelRevisionId: string; roofModelRevisionNumber: number;
  calculationId: string; calculationRevisionId: string; name: string;
  input: GableRoofInput; output: GableRoofOutput; matchesCurrentSurvey: boolean;
}>;
export type VerifiedSurveyMultiRoof = Readonly<{
  roofModelId: string; roofModelRevisionId: string; roofModelRevisionNumber: number;
  calculationId: string; calculationRevisionId: string; name: string;
  input: RoofGeometryInput; output: RoofGeometry; matchesCurrentSurvey: boolean;
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
  return revision ? gableGeometryFromSurveySection(revision, section) : null;
}

export async function listVerifiedSurveyRoofs(raw: z.infer<typeof sourceSchema>): Promise<VerifiedSurveyRoof[]> {
  const input = sourceSchema.parse(raw);
  const { projectId, revision, section } = await exactSurveySource(input);
  const currentSurveyInput = geometryFromSection(revision, section);
  const models = await getRoofModelsForProject(input.organizationId, projectId);
  const client = await createClient();
  return (await Promise.all(models.map(async (model) => {
    if (model.roofType !== "gable" || !model.currentRevisionId || !model.currentInput || !model.currentCalculationId || !model.currentCalculationRevisionId) return [];
    // Ellenőrzött forrás: verified tetőmodell-revízió, verified számításrevízió, köztük tárolt függőség, és a tárolt eredmény megegyezik a motor eredményével.
    const [{ data: modelRevision }, { data: result }, { data: dependency }] = await Promise.all([
      client.from("roof_model_revisions").select("id").eq("organization_id", input.organizationId).eq("id", model.currentRevisionId).eq("roof_model_id", model.id).eq("validation_status", "verified").maybeSingle(),
      client.from("calculation_revisions").select("id, output_snapshot").eq("organization_id", input.organizationId).eq("id", model.currentCalculationRevisionId).eq("calculation_id", model.currentCalculationId).eq("validation_status", "verified").maybeSingle(),
      client.from("calculation_dependencies").select("id").eq("downstream_calculation_revision_id", model.currentCalculationRevisionId).eq("upstream_roof_model_revision_id", model.currentRevisionId).maybeSingle(),
    ]);
    if (!modelRevision || !result || !dependency) return [];
    const output = calculateGableRoof(model.currentInput);
    const stored = result.output_snapshot as { lengths?: Record<string, unknown> } | null;
    if (stored?.lengths?.eachEaveEdgeMm !== output.lengths.eachEaveEdgeMm || stored.lengths.ridgeLineMm !== output.lengths.ridgeLineMm || stored.lengths.eachSlopingGableEdgeMm !== output.lengths.eachSlopingGableEdgeMm) return [];
    return [{ roofModelId: model.id, roofModelRevisionId: model.currentRevisionId, roofModelRevisionNumber: model.currentRevisionNumber, calculationId: model.currentCalculationId, calculationRevisionId: model.currentCalculationRevisionId, name: model.name, input: model.currentInput, output, matchesCurrentSurvey: Boolean(currentSurveyInput && JSON.stringify(currentSurveyInput) === JSON.stringify(model.currentInput)) }];
  }))).flat();
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
    const auth = await getAuthContext();
    if (!auth) return { ok: false, error: "A munkamenet lejárt." };
    const saved = await persistGableRoof({ organizationId: input.organizationId, projectId, roofModelId: input.roofModelId ?? input.newRoofModelId,
      operationId: input.operationId, expectedRevisionNumber: input.expectedRevisionNumber, name: input.name, input: geometry, output,
      provenance: { input: "survey_measurement", output: "verified", surveySource: { surveyId: input.surveyId, revisionId: revision.id, sectionId: section.id, version: revision.version } }, actorId: auth.userId });
    const source: VerifiedSurveyRoof = { roofModelId: saved.roof_model_id, roofModelRevisionId: saved.roof_model_revision_id, roofModelRevisionNumber: saved.revision_number, calculationId: saved.calculation_id, calculationRevisionId: saved.calculation_revision_id, name: input.name, input: geometry, output, matchesCurrentSurvey: true };
    const { error: linkError } = await client.rpc("link_field_survey_calculation", { p_survey_id: input.surveyId, p_revision_id: revision.id, p_section_id: section.id, p_calculation_id: saved.calculation_id, p_calculation_revision_id: saved.calculation_revision_id });
    revalidatePath(`/felmeresek/${input.surveyId}`); revalidatePath(`/projektek/${projectId}`); revalidatePath(`/projektek/${projectId}/tetomodellek/${saved.roof_model_id}`);
    return { ok: true, source, linked: !linkError, ...(linkError ? { linkError: "A tetőgeometria mentve, de a felméréskapcsolatot újra kell próbálni." } : {}) };
  } catch (cause) { return { ok: false, error: cause instanceof Error ? cause.message : "A tetőgeometria mentése nem sikerült." }; }
}

export async function listVerifiedSurveyMultiRoofs(raw: z.infer<typeof sourceSchema>): Promise<VerifiedSurveyMultiRoof[]> {
  const input = sourceSchema.parse(raw);
  const { projectId, section } = await exactSurveySource(input);
  if (!section.roofType || section.roofType === "gable") return [];
  const current = geometryFromSurveyMeasurements(section.roofType, completeSectionMeasurements(section));
  const [models, verified] = await Promise.all([getRoofModelsForProject(input.organizationId, projectId), getVerifiedMultiRoofSources(input.organizationId, projectId)]);
  return models.flatMap((model) => {
    const source = verified.find((item) => item.roofModelId === model.id);
    if (!source || model.roofType !== section.roofType || !model.currentMultiRoofInput || !model.currentRevisionId) return [];
    return [{ roofModelId: model.id, roofModelRevisionId: source.roofModelRevisionId, roofModelRevisionNumber: model.currentRevisionNumber,
      calculationId: source.calculationId, calculationRevisionId: source.calculationRevisionId, name: model.name,
      input: model.currentMultiRoofInput, output: source.geometry, matchesCurrentSurvey: Boolean(current && JSON.stringify(current) === JSON.stringify(model.currentMultiRoofInput)) }];
  });
}

const multiSaveSchema = sourceSchema.extend({ roofModelId: z.string().uuid().nullable(), operationId: z.string().uuid(),
  expectedRevisionNumber: z.number().int().nonnegative(), name: z.string().trim().min(1).max(200),
  roofType: z.enum(["shed", "hip", "pyramid", "halfHip", "lShape", "tShape"]) });
export async function saveSurveyMultiRoofGeometry(raw: z.infer<typeof multiSaveSchema>): Promise<{ ok: true; source: VerifiedSurveyMultiRoof; linked: boolean; linkError?: string } | { ok: false; error: string }> {
  const parsed = multiSaveSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Érvénytelen tetőmodell- vagy felmérésadat." };
  try {
    const input = parsed.data;
    const { revision, section, projectId } = await exactSurveySource(input);
    if (section.roofType !== input.roofType) return { ok: false, error: "A mentett felmérés tetőtípusa eltér." };
    const geometryInput = geometryFromSurveyMeasurements(input.roofType, completeSectionMeasurements(section));
    if (!geometryInput) return { ok: false, error: "A felmért méretek hiányosak vagy nem alkotnak érvényes tetőt." };
    const roofModelId = input.roofModelId ?? crypto.randomUUID();
    if (input.roofModelId && input.expectedRevisionNumber > 0) {
      const models = await getRoofModelsForProject(input.organizationId, projectId);
      if (!models.some((model) => model.id === input.roofModelId && model.roofType === input.roofType && model.currentRevisionNumber === input.expectedRevisionNumber)) return { ok: false, error: "A kijelölt tetőmodell már megváltozott vagy más típusú." };
    }
    const auth = await getAuthContext();
    if (!auth) return { ok: false, error: "A munkamenet lejárt." };
    const output = calculateRoofGeometry(geometryInput);
    const saved = await persistRoofGeometry({ organizationId: input.organizationId, projectId, roofModelId, operationId: input.operationId,
      expectedRevisionNumber: input.expectedRevisionNumber, name: input.name, input: geometryInput, output, actorId: auth.userId });
    let linked = false;
    try {
      await registerSurveyMultiRoofSource({ organizationId: input.organizationId, surveyId: input.surveyId, surveyRevisionId: revision.id,
        sectionId: section.id, roofModelRevisionId: saved.roof_model_revision_id, calculationRevisionId: saved.calculation_revision_id, actorId: auth.userId });
      const client = await createClient();
      const { error } = await client.rpc("link_field_survey_calculation", { p_survey_id: input.surveyId, p_revision_id: revision.id,
        p_section_id: section.id, p_calculation_id: saved.calculation_id, p_calculation_revision_id: saved.calculation_revision_id });
      linked = !error;
    } catch { /* The saved revision remains retryable with the same operation ID. */ }
    revalidatePath(`/felmeresek/${input.surveyId}`); revalidatePath(`/projektek/${projectId}`);
    const source: VerifiedSurveyMultiRoof = { roofModelId, roofModelRevisionId: saved.roof_model_revision_id, roofModelRevisionNumber: saved.revision_number,
      calculationId: saved.calculation_id, calculationRevisionId: saved.calculation_revision_id, name: input.name, input: geometryInput, output, matchesCurrentSurvey: true };
    return { ok: true, source, linked, ...(linked ? {} : { linkError: "A geometria mentve, de a felméréskapcsolatot ugyanazzal a mentéssel újra kell próbálni." }) };
  } catch (cause) {
    return { ok: false, error: cause && typeof cause === "object" && "code" in cause && cause.code === "40001" ? "A tetőmodell időközben megváltozott." : "A felmért tetőgeometria mentése nem sikerült." };
  }
}

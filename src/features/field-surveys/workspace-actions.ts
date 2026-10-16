"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import { getFieldSurveyRevision } from "./field-survey-data";
import { mapFieldSurveyToCalculator } from "@/domain/field-surveys/calculator-handoff";
import { surveySections, completeSectionMeasurements, type SavedSurveyCalculation, type SurveyFollowup } from "@/domain/field-surveys/workspace";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getFlashingCatalogVariants } from "@/features/flashings/flashing-data";
import { getFlashingCalculation, getFlashingGeometrySuggestions } from "@/features/flashings/flashing-data";
import { getGutterCalculation, getGutterGeometrySuggestions } from "@/features/gutters/gutter-data";
import { gutterInputFromSelectedEaves } from "@/features/gutters/gutter-handoff";
import { gableRoofInputSchema } from "@/domain/calculations/gable-roof";
import { roofGeometryInputSchema } from "@/domain/calculations/roof-geometry";
import { geometryFromSurveyMeasurements } from "@/domain/field-surveys/roof-geometry";

const ids = z.object({ organizationId: z.string().uuid(), surveyId: z.string().uuid(), version: z.number().int().positive() });
async function authorized(organizationId: string) {
  const auth = await getAuthContext();
  if (!auth?.organizations.some((org) => org.id === organizationId)) throw new Error("A munkamenet lejárt, vagy nincs hozzáférésed a műhelyhez.");
}
function failure(error?: { code?: string } | null) {
  return error?.code === "40001" ? "A felmérés időközben megváltozott. Frissítsd az adatokat; a már létrejött kapcsolatok megmaradnak."
    : error?.code === "42501" ? "A kiválasztott felméréshez, revízióhoz vagy kapcsolathoz nincs hozzáférésed."
    : error?.code === "22023" ? "A kapcsolat adatai nem egyeznek a mentett forrással. Ellenőrizd a kiválasztást."
    : "A művelet nem sikerült. Azonos adatokkal biztonságosan újrapróbálható.";
}

export async function loadSurveyCalculator(raw: { organizationId: string; surveyId: string; version: number; sectionId: string; selectedRoof?: { roofModelId: string; roofModelRevisionId: string; edgeIds: string[] } }) {
  const input = ids.extend({ sectionId: z.string().uuid(), selectedRoof: z.object({ roofModelId: z.string().uuid(), roofModelRevisionId: z.string().uuid(), edgeIds: z.array(z.string()).min(1).max(100) }).optional() }).parse(raw);
  await authorized(input.organizationId);
  const revision = await getFieldSurveyRevision(input.organizationId, input.surveyId, input.version);
  if (!revision) throw new Error("A pontos forrásrevízió nem érhető el.");
  const section = surveySections(revision).find((item) => item.id === input.sectionId);
  if (!section) throw new Error("A munkaszakasz nincs a forrásrevízióban.");
  let handoff = mapFieldSurveyToCalculator({ surveyId: revision.surveyId, revisionId: revision.id, version: revision.version, workType: section.workType, measurements: completeSectionMeasurements(section) });
  if (!handoff.ok) throw new Error(handoff.error);
  let projectId: string | null = null;
  let selectedGutter: Awaited<ReturnType<typeof getGutterGeometrySuggestions>> = [];
  let selectedFlashing: Awaited<ReturnType<typeof getFlashingGeometrySuggestions>> = [];
  let availableGutter: Awaited<ReturnType<typeof getGutterGeometrySuggestions>> = [];
  let availableFlashing: Awaited<ReturnType<typeof getFlashingGeometrySuggestions>> = [];
  if (input.selectedRoof) {
    if (!["gutter", "flashing"].includes(section.workType) || new Set(input.selectedRoof.edgeIds).size !== input.selectedRoof.edgeIds.length) throw new Error("A kiválasztott tetőélek nem adhatók át ebbe a munkaszakaszba.");
    const client = await createClient();
    const { data: followup } = revision.projectId ? { data: null } : await client.from("field_survey_followups").select("project_id").eq("organization_id", input.organizationId).eq("survey_id", input.surveyId).eq("kind", "project").maybeSingle();
    projectId = revision.projectId ?? followup?.project_id ?? null;
    if (!projectId) throw new Error("A felméréshez nincs kapcsolt projekt.");
    const { data: roofModel } = await client.from("roof_models").select("id,current_revision_id,roof_type").eq("id", input.selectedRoof.roofModelId).eq("organization_id", input.organizationId).eq("project_id", projectId).maybeSingle();
    const { data: roofRevision } = await client.from("roof_model_revisions").select("id,input_data,validation_status").eq("id", input.selectedRoof.roofModelRevisionId).eq("roof_model_id", input.selectedRoof.roofModelId).eq("organization_id", input.organizationId).maybeSingle();
    const { data: roofCalculation } = await client.from("calculations").select("id,current_revision_id").eq("organization_id", input.organizationId).eq("project_id", projectId).eq("roof_model_id", input.selectedRoof.roofModelId).eq("calculator_type", roofModel?.roof_type === "gable" ? "roof.gable" : `roof.geometry.${roofModel?.roof_type}`).maybeSingle();
    const { data: roofLinks } = roofCalculation?.current_revision_id ? await client.from("field_survey_calculation_links").select("section_id,calculation_revision_id,survey_revision_id").eq("organization_id", input.organizationId).eq("survey_id", input.surveyId).eq("calculation_id", roofCalculation.id).eq("calculation_revision_id", roofCalculation.current_revision_id) : { data: [] };
    const currentRoofInput = gableRoofInputSchema.safeParse(roofRevision?.input_data);
    const linkedRoofSection = surveySections(revision).find((item) => item.workType === "roof" && roofLinks?.some((link) => link.section_id === item.id));
    const roofHandoff = linkedRoofSection ? mapFieldSurveyToCalculator({ surveyId: revision.surveyId, revisionId: revision.id, version: revision.version, workType: "roof", measurements: completeSectionMeasurements(linkedRoofSection) }) : null;
    const rawRoof = roofHandoff?.ok && roofHandoff.calculator === "roof" && roofHandoff.missing.length === 0 ? roofHandoff.input : null;
    const matchingRoofInput = rawRoof ? gableRoofInputSchema.safeParse({ inputMode: rawRoof.inputMode, buildingLengthMm: Number(rawRoof.buildingLengthMm), buildingWidthMm: Number(rawRoof.buildingWidthMm), eaveOverhangMm: Number(rawRoof.eaveOverhangMm), frontGableOverhangMm: Number(rawRoof.frontGableOverhangMm), rearGableOverhangMm: Number(rawRoof.rearGableOverhangMm), ...(rawRoof.inputMode === "height" ? { roofRiseMm: Number(rawRoof.roofRiseMm) } : { roofPitchDegrees: Number(rawRoof.roofPitchDegrees) }) }) : null;
    const multiRoofInput = roofGeometryInputSchema.safeParse(roofRevision?.input_data);
    const matchingMultiRoofInput = linkedRoofSection?.roofType && linkedRoofSection.roofType !== "gable" ? geometryFromSurveyMeasurements(linkedRoofSection.roofType, completeSectionMeasurements(linkedRoofSection)) : null;
    const exactRoofInput = roofModel?.roof_type === "gable"
      ? currentRoofInput.success && matchingRoofInput?.success && JSON.stringify(currentRoofInput.data) === JSON.stringify(matchingRoofInput.data)
      : multiRoofInput.success && matchingMultiRoofInput && JSON.stringify(multiRoofInput.data) === JSON.stringify(matchingMultiRoofInput);
    if (!roofModel || roofModel.current_revision_id !== input.selectedRoof.roofModelRevisionId || roofRevision?.validation_status !== "verified" || !exactRoofInput || !linkedRoofSection) throw new Error("A tetőgeometria nincs az aktuális felmérési tetőadatokhoz kapcsolva.");
    if (section.workType === "gutter") {
      const suggestions = await getGutterGeometrySuggestions(input.organizationId, projectId);
      availableGutter = suggestions.filter((item) => item.roofModelId === input.selectedRoof!.roofModelId && item.roofModelRevisionId === input.selectedRoof!.roofModelRevisionId);
      selectedGutter = input.selectedRoof.edgeIds.flatMap((edgeId) => suggestions.find((item) => item.roofModelId === input.selectedRoof!.roofModelId && item.roofModelRevisionId === input.selectedRoof!.roofModelRevisionId && item.id === edgeId) ? [suggestions.find((item) => item.roofModelId === input.selectedRoof!.roofModelId && item.roofModelRevisionId === input.selectedRoof!.roofModelRevisionId && item.id === edgeId)!] : []);
      if (selectedGutter.length !== input.selectedRoof.edgeIds.length) throw new Error("A kiválasztott ereszél már nem aktuális, vagy nem ehhez a projekthez tartozik.");
      if (handoff.calculator !== "gutter") throw new Error("A munkaszakasz nem ereszcsatorna-típusú.");
      handoff = { ...handoff, input: { ...gutterInputFromSelectedEaves(selectedGutter), gutterStockLengthMm: handoff.input.gutterStockLengthMm }, missing: handoff.input.gutterStockLengthMm > 0 ? [] : ["A kiválasztott ereszcsatorna-szál hossza"] };
    } else {
      const suggestions = await getFlashingGeometrySuggestions(input.organizationId, projectId);
      availableFlashing = suggestions.filter((item) => item.reference.roofModelId === input.selectedRoof!.roofModelId && item.reference.roofModelRevisionId === input.selectedRoof!.roofModelRevisionId);
      selectedFlashing = input.selectedRoof.edgeIds.flatMap((edgeId) => suggestions.find((item) => item.reference.roofModelId === input.selectedRoof!.roofModelId && item.reference.roofModelRevisionId === input.selectedRoof!.roofModelRevisionId && item.reference.edgeId === edgeId) ? [suggestions.find((item) => item.reference.roofModelId === input.selectedRoof!.roofModelId && item.reference.roofModelRevisionId === input.selectedRoof!.roofModelRevisionId && item.reference.edgeId === edgeId)!] : []);
      if (selectedFlashing.length !== input.selectedRoof.edgeIds.length) throw new Error("A kiválasztott tetőél már nem aktuális, vagy nem ehhez a projekthez tartozik.");
    }
  }
  const [products, flashingCatalog] = await Promise.all([
    section.workType === "gutter" ? getMaterialProductsForOrganization(input.organizationId, { includeArchived: false }) : Promise.resolve([]),
    section.workType === "flashing" ? getFlashingCatalogVariants(input.organizationId) : Promise.resolve([]),
  ]);
  const gutterCatalog = products.flatMap((product) => product.variants.map((variant) => ({ id: variant.id, productId: product.id, productName: product.name, category: product.category, variantName: variant.name, sku: variant.sku, purchasingUnit: variant.purchasingUnit, lengthMm: variant.lengthMm, nominalWidthMm: variant.nominalWidthMm, effectiveWidthMm: variant.effectiveWidthMm, technicalSpecs: variant.technicalSpecs, provenance: variant.provenance })));
  const [savedGutter, savedFlashing] = projectId ? await Promise.all([section.workType === "gutter" ? getGutterCalculation(input.organizationId, projectId) : Promise.resolve(null), section.workType === "flashing" ? getFlashingCalculation(input.organizationId, projectId) : Promise.resolve(null)]) : [null, null];
  return { handoff, gutterCatalog, flashingCatalog, projectId, selectedGutter, selectedFlashing, availableGutter, availableFlashing, savedGutter, savedFlashing };
}

export async function linkSurveyCalculation(raw: { organizationId: string; surveyId: string; version: number; sectionId: string; saved: SavedSurveyCalculation }): Promise<{ ok: boolean; error?: string }> {
  const parsed = ids.extend({ sectionId: z.string().uuid(), saved: z.object({ calculationId: z.string().uuid(), revisionId: z.string().uuid(), revisionNumber: z.number().int().positive() }) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Érvénytelen számításkapcsolat." };
  try {
    const input = parsed.data;
    await authorized(input.organizationId);
    const revision = await getFieldSurveyRevision(input.organizationId, input.surveyId, input.version);
    if (!revision) return { ok: false, error: "A forrásrevízió nem érhető el." };
    const client = await createClient();
    const { error } = await client.rpc("link_field_survey_calculation", { p_survey_id: input.surveyId, p_revision_id: revision.id, p_section_id: input.sectionId, p_calculation_id: input.saved.calculationId, p_calculation_revision_id: input.saved.revisionId });
    if (error) return { ok: false, error: failure(error) };
    revalidatePath(`/felmeresek/${input.surveyId}`);
    return { ok: true };
  } catch { return { ok: false, error: failure() }; }
}

export async function createSurveyFollowups(raw: { organizationId: string; surveyId: string; version: number; project: boolean; quotation: boolean; projectId: string | null; name: string }): Promise<{ ok: boolean; results: SurveyFollowup[]; error?: string }> {
  const parsed = ids.extend({ project: z.boolean(), quotation: z.boolean(), projectId: z.string().uuid().nullable(), name: z.string().trim().min(1).max(200) }).safeParse(raw);
  const results: SurveyFollowup[] = [];
  if (!parsed.success) return { ok: false, results, error: "Adj meg érvényes nevet és projektet." };
  try {
    const input = parsed.data;
    await authorized(input.organizationId);
    const revision = await getFieldSurveyRevision(input.organizationId, input.surveyId, input.version);
    if (!revision) return { ok: false, results, error: "A forrásrevízió nem érhető el." };
    const client = await createClient();
    let projectId = input.projectId;
    for (const kind of [...(input.project ? ["project"] : []), ...(input.quotation ? ["quotation"] : [])]) {
      const { data, error } = await client.rpc("create_field_survey_followup", { p_survey_id: input.surveyId, p_revision_id: revision.id, p_kind: kind, p_project_id: kind === "quotation" && !input.project ? null : projectId, p_name: input.name });
      if (error || !data?.[0]) return { ok: false, results, error: failure(error) };
      const row = data[0];
      if (kind === "project") projectId = row.project_id;
      results.push({ id: row.id, kind: row.kind as SurveyFollowup["kind"], projectId: row.project_id, quotationId: row.quotation_id, quotationRevisionId: row.quotation_revision_id, surveyRevisionId: row.survey_revision_id });
    }
    revalidatePath(`/felmeresek/${input.surveyId}`); revalidatePath("/"); revalidatePath("/ajanlatok"); revalidatePath("/projektek");
    return { ok: true, results };
  } catch { return { ok: false, results, error: failure() }; }
}

const executionPlanLinkInput = ids.extend({
  executionPlanId: z.string().uuid(),
  requestKey: z.string().uuid(),
});

export async function createExecutionPlanFromSurvey(raw: { organizationId: string; surveyId: string; version: number; title: string; requestKey: string }): Promise<{ ok: boolean; planId?: string; linkId?: string; error?: string }> {
  const parsed = ids.extend({ title: z.string().trim().min(1).max(200), requestKey: z.string().uuid() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Adj meg egy érvényes tervnevet." };
  try {
    const input = parsed.data;
    await authorized(input.organizationId);
    const revision = await getFieldSurveyRevision(input.organizationId, input.surveyId, input.version);
    if (!revision) return { ok: false, error: "A kiválasztott felmérésrevízió nem érhető el." };
    const client = await createClient();
    const { data, error } = await (client as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ plan_id: string; link_id: string }> | null; error: { code?: string; message?: string } | null }> }).rpc("create_execution_plan_from_survey", {
      p_organization_id: input.organizationId,
      p_survey_id: input.surveyId,
      p_survey_revision_id: revision.id,
      p_title: input.title,
      p_request_key: input.requestKey,
    });
    if (error || !data?.[0]) return { ok: false, error: failure(error) };
    revalidatePath(`/felmeresek/${input.surveyId}`);
    revalidatePath("/kivitelezes");
    revalidatePath(`/kivitelezes/${data[0].plan_id}`);
    return { ok: true, planId: data[0].plan_id, linkId: data[0].link_id };
  } catch { return { ok: false, error: failure() }; }
}

export async function linkSurveyToExecutionPlan(raw: { organizationId: string; surveyId: string; version: number; executionPlanId: string; requestKey: string }): Promise<{ ok: boolean; linkId?: string; error?: string }> {
  const parsed = ids.extend(executionPlanLinkInput.shape).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Válassz egy érvényes kivitelezési tervet." };
  try {
    const input = parsed.data;
    await authorized(input.organizationId);
    const revision = await getFieldSurveyRevision(input.organizationId, input.surveyId, input.version);
    if (!revision) return { ok: false, error: "A kiválasztott felmérésrevízió nem érhető el." };
    const client = await createClient();
    const { data, error } = await (client as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ link_id: string }> | null; error: { code?: string; message?: string } | null }> }).rpc("link_field_survey_execution_plan", {
      p_organization_id: input.organizationId,
      p_survey_id: input.surveyId,
      p_survey_revision_id: revision.id,
      p_execution_plan_id: input.executionPlanId,
      p_request_key: input.requestKey,
    });
    if (error || !data?.[0]) return { ok: false, error: failure(error) };
    revalidatePath(`/felmeresek/${input.surveyId}`);
    revalidatePath("/kivitelezes");
    revalidatePath(`/kivitelezes/${input.executionPlanId}`);
    return { ok: true, linkId: data[0].link_id };
  } catch { return { ok: false, error: failure() }; }
}

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

export async function loadSurveyCalculator(raw: { organizationId: string; surveyId: string; version: number; sectionId: string }) {
  const input = ids.extend({ sectionId: z.string().uuid() }).parse(raw);
  await authorized(input.organizationId);
  const revision = await getFieldSurveyRevision(input.organizationId, input.surveyId, input.version);
  if (!revision) throw new Error("A pontos forrásrevízió nem érhető el.");
  const section = surveySections(revision).find((item) => item.id === input.sectionId);
  if (!section) throw new Error("A munkaszakasz nincs a forrásrevízióban.");
  const handoff = mapFieldSurveyToCalculator({ surveyId: revision.surveyId, revisionId: revision.id, version: revision.version, workType: section.workType, measurements: completeSectionMeasurements(section) });
  if (!handoff.ok) throw new Error(handoff.error);
  const [products, flashingCatalog] = await Promise.all([
    section.workType === "gutter" ? getMaterialProductsForOrganization(input.organizationId, { includeArchived: false }) : Promise.resolve([]),
    section.workType === "flashing" ? getFlashingCatalogVariants(input.organizationId) : Promise.resolve([]),
  ]);
  const gutterCatalog = products.flatMap((product) => product.variants.map((variant) => ({ id: variant.id, productId: product.id, productName: product.name, category: product.category, variantName: variant.name, sku: variant.sku, purchasingUnit: variant.purchasingUnit, lengthMm: variant.lengthMm, nominalWidthMm: variant.nominalWidthMm, effectiveWidthMm: variant.effectiveWidthMm, technicalSpecs: variant.technicalSpecs, provenance: variant.provenance })));
  return { handoff, gutterCatalog, flashingCatalog };
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

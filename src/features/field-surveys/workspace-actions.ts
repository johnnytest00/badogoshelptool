"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import { getFieldSurveyRevision } from "./field-survey-data";
import { type SavedSurveyCalculation, type SurveyFollowup } from "@/domain/field-surveys/workspace";

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
  if (!parsed.success) return { ok: false, error: "Válassz egy érvényes munkanaplót." };
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

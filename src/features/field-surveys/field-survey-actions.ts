"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { surveySectionsSchema } from "@/domain/field-surveys/workspace";
import { fieldSurveyInputSchema, fieldSurveyMeasurementSchema } from "@/domain/field-surveys/contracts";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database.types";

export type FieldSurveySaveResult = {
  ok: boolean;
  surveyId?: string;
  version?: number;
  error?: string;
  fieldErrors?: Record<string, string>;
  conflict?: boolean;
};

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function saveFieldSurveyAction(data: FormData): Promise<FieldSurveySaveResult> {
  const organizationId = text(data, "organizationId");
  const surveyId = text(data, "surveyId") || null;
  const projectId = text(data, "projectId") || null;
  const expectedVersion = Number(text(data, "expectedVersion"));
  if (!uuid(organizationId) || (surveyId && !uuid(surveyId)) || (projectId && !uuid(projectId))
    || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || (!surveyId && expectedVersion !== 0)) {
    return { ok: false, error: "A felmérés azonosítója vagy verziója érvénytelen." };
  }

  const auth = await getAuthContext();
  if (!auth) return { ok: false, error: "A munkamenet lejárt. Jelentkezz be újra." };
  if (!auth.organizations.some((organization) => organization.id === organizationId)) {
    return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  }

  let measurements: unknown;
  try { measurements = JSON.parse(text(data, "measurements")); }
  catch { return { ok: false, error: "A mérések formátuma hibás." }; }
  let sections;
  if (data.has("sections")) {
    try { sections = surveySectionsSchema.parse(JSON.parse(text(data, "sections"))); }
    catch { return { ok: false, error: "Ellenőrizd a munkaszakaszok adatait." }; }
  }
  const schema = sections ? fieldSurveyInputSchema.extend({ measurements: z.array(fieldSurveyMeasurementSchema).max(100) }) : fieldSurveyInputSchema;
  const parsed = schema.safeParse({
    organizationId, projectId, workType: text(data, "workType"), measurements,
    notes: text(data, "notes") || null,
  });
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join(".") || "measurements", issue.message]));
    return { ok: false, error: "Ellenőrizd a felmérés adatait.", fieldErrors };
  }

  try {
    const supabase = await createClient();
    const saveSurveyRpc = supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ survey_id: string; updated_at: string; version: number }> | null; error: { code?: string } | null }>;
    const { data: saved, error } = await saveSurveyRpc(sections ? "save_field_survey_workspace" : "save_field_survey", {
      ...(sections ? { p_sections: sections as unknown as Json } : {}),
      p_survey_id: surveyId, p_organization_id: organizationId, p_project_id: parsed.data.projectId,
      p_work_type: parsed.data.workType, p_measurements: parsed.data.measurements as unknown as Json,
      p_notes: parsed.data.notes, p_expected_version: expectedVersion,
    });
    if (error || !saved?.[0]) {
      if (error?.code === "40001") return { ok: false, conflict: true, error: "Ezt a felmérést időközben más is módosította. Frissítsd az oldalt, és ellenőrizd a legújabb adatokat." };
      if (error?.code === "42501" || error?.code === "P0002") return { ok: false, error: "A felmérés vagy a projekt nem érhető el ebben a műhelyben." };
      if (error?.code === "22023") return { ok: false, error: "A felmérés adatai érvénytelenek, vagy a projektkapcsolat nem módosítható." };
      return { ok: false, error: "A felmérés mentése nem sikerült. Ellenőrizd a kapcsolatot, majd próbáld újra." };
    }
    revalidatePath("/felmeresek");
    if (parsed.data.projectId) revalidatePath(`/projektek/${parsed.data.projectId}`);
    return { ok: true, surveyId: saved[0].survey_id, version: saved[0].version };
  } catch {
    return { ok: false, error: "A felmérés mentése nem érte el a szervert. Ellenőrizd a kapcsolatot." };
  }
}

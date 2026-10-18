"use server";

import { z } from "zod";
import { getAuthContext } from "@/features/auth/auth.server";
import { getFieldSurvey, getFieldSurveyRevision } from "./field-survey-data";
import { recordSurveyRoofGeometrySources } from "./survey-geometry-source";

const schema = z.object({ organizationId: z.string().uuid(), surveyId: z.string().uuid(), version: z.number().int().positive() });

/** Idempotent: derives the verified roof area for the exact saved revision (also for revisions saved before F9.42.6). */
export async function ensureSurveyRoofGeometryAction(raw: z.infer<typeof schema>): Promise<{ ok: boolean; recorded?: number; error?: string }> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Érvénytelen felmérésforrás." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === parsed.data.organizationId)) return { ok: false, error: "A munkamenet lejárt, vagy nincs hozzáférésed a műhelyhez." };
  const [survey, revision] = await Promise.all([
    getFieldSurvey(parsed.data.organizationId, parsed.data.surveyId),
    getFieldSurveyRevision(parsed.data.organizationId, parsed.data.surveyId, parsed.data.version),
  ]);
  if (!survey || !revision) return { ok: false, error: "A felmérésrevízió nem érhető el." };
  const result = await recordSurveyRoofGeometrySources(parsed.data.organizationId, revision, auth.userId);
  if (result.failed > 0) return { ok: false, error: "A tetőfelület ellenőrzése nem sikerült. Próbáld újra." };
  return { ok: true, recorded: result.recorded };
}

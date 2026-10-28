import "server-only";
import { Client } from "pg";

type WriterResult = { rows: Record<string, unknown>[] };

async function withWriter<T>(run: (query: (sql: string, values: unknown[]) => Promise<WriterResult>) => Promise<T>): Promise<T> {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("COVERING_WRITER_DATABASE_URL is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    return await run((sql, values) => client.query(sql, values));
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function reserveFieldSurveyPhoto(input: {
  surveyId: string; organizationId: string; photoId: string; objectKey: string;
  filename: string; mimeType: string; fileSize: number; sha256: string;
  description: string | null; requestKey: string; expectedVersion: number; actorId: string;
}) {
  return withWriter(async (query) => {
    const result = await query(`select * from public.reserve_field_survey_photo_upload(
      $1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::bigint,$8::text,$9::text,$10::uuid,$11::integer,$12::uuid
    )`, [input.surveyId,input.organizationId,input.photoId,input.objectKey,input.filename,input.mimeType,input.fileSize,input.sha256,input.description,input.requestKey,input.expectedVersion,input.actorId]);
    if (!result.rows[0]) throw new Error("Photo reservation returned no row");
    return result.rows[0] as { photo_id: string; version: number; reused: boolean };
  });
}

export async function attachFieldSurveyPhoto(input: { surveyId: string; organizationId: string; photoId: string; expectedVersion: number; actorId: string }) {
  return withWriter(async (query) => {
    const result = await query("select * from public.attach_field_survey_photo($1::uuid,$2::uuid,$3::uuid,$4::integer,$5::uuid)", [input.surveyId,input.organizationId,input.photoId,input.expectedVersion,input.actorId]);
    if (!result.rows[0]) throw new Error("Photo attachment returned no row");
    return result.rows[0] as { photo_id: string; version: number };
  });
}

export async function cancelFieldSurveyPhotoUpload(photoId: string, actorId: string) {
  return withWriter((query) => query("select public.cancel_field_survey_photo_upload($1::uuid,$2::uuid)", [photoId,actorId]));
}

export async function removeFieldSurveyPhoto(input: { surveyId: string; photoId: string; expectedVersion: number; actorId: string }) {
  return withWriter(async (query) => {
    const result = await query("select * from public.remove_field_survey_photo($1::uuid,$2::uuid,$3::integer,$4::uuid)", [input.surveyId,input.photoId,input.expectedVersion,input.actorId]);
    if (!result.rows[0]) throw new Error("Photo removal returned no row");
    return result.rows[0] as { version: number };
  });
}

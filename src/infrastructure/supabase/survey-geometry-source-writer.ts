import "server-only";
import { Client } from "pg";
import type { GableRoofInput, GableRoofOutput } from "@/domain/calculations/gable-roof";
import type { RoofGeometry, RoofGeometryInput } from "@/domain/calculations/roof-geometry";

async function withWriterClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("COVERING_WRITER_DATABASE_URL is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  try {
    await client.connect();
    return await run(client);
  } finally { await client.end().catch(() => undefined); }
}

/** Restricted writer: the database re-checks the input against the exact survey revision section. */
export async function persistSurveyRoofGeometrySource(write: Readonly<{
  organizationId: string; surveyId: string; surveyRevisionId: string; sectionId: string;
  input: GableRoofInput; output: GableRoofOutput; actorId: string;
}>) {
  return withWriterClient(async (client) => {
    const { rows } = await client.query<{ source_id: string; combined_roof_m2: string; reused: boolean }>(
      "select * from public.save_survey_roof_geometry_source_secure($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::jsonb,$6::jsonb,$7::uuid)",
      [write.organizationId, write.surveyId, write.surveyRevisionId, write.sectionId, JSON.stringify(write.input), JSON.stringify(write.output), write.actorId],
    );
    if (!rows[0]) throw new Error("Survey roof geometry write returned no source");
    return rows[0];
  });
}

/** F9.42.7: parallel restricted writer for the non-gable shapes of the general roof geometry engine. */
export async function persistSurveyMultiRoofGeometrySource(write: Readonly<{
  organizationId: string; surveyId: string; surveyRevisionId: string; sectionId: string; roofType: string;
  input: RoofGeometryInput; output: RoofGeometry; actorId: string;
}>) {
  return withWriterClient(async (client) => {
    const { rows } = await client.query<{ source_id: string; combined_roof_m2: string; reused: boolean }>(
      "select * from public.save_survey_multi_roof_geometry_source_secure($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::jsonb,$7::jsonb,$8::uuid)",
      [write.organizationId, write.surveyId, write.surveyRevisionId, write.sectionId, write.roofType, JSON.stringify(write.input), JSON.stringify(write.output), write.actorId],
    );
    if (!rows[0]) throw new Error("Survey multi-roof geometry write returned no source");
    return rows[0];
  });
}

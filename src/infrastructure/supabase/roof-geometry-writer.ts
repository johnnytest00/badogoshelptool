import "server-only";
import { Client } from "pg";
import type { RoofGeometry, RoofGeometryInput } from "@/domain/calculations/roof-geometry";

export async function persistRoofGeometry(write: Readonly<{
  organizationId: string; projectId: string; roofModelId: string; operationId: string;
  expectedRevisionNumber: number; name: string; input: RoofGeometryInput;
  output: RoofGeometry; actorId: string;
}>) {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("COVERING_WRITER_DATABASE_URL is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const { rows } = await client.query<{ roof_model_id: string; roof_model_revision_id: string; calculation_id: string; calculation_revision_id: string; revision_number: number; reused: boolean }>(
      "select * from public.save_roof_geometry_calculation($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::integer,$6::text,$7::jsonb,$8::jsonb,$9::uuid)",
      [write.organizationId, write.projectId, write.roofModelId, write.operationId, write.expectedRevisionNumber, write.name, JSON.stringify(write.input), JSON.stringify(write.output), write.actorId],
    );
    if (!rows[0]) throw new Error("Roof geometry write returned no revision");
    return rows[0];
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function persistStandaloneRoofGeometry(write: Readonly<{
  organizationId: string; calculationId: string; operationId: string;
  expectedRevisionNumber: number; name: string; input: RoofGeometryInput;
  output: RoofGeometry; actorId: string;
}>) {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("COVERING_WRITER_DATABASE_URL is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const { rows } = await client.query<{ calculation_id: string; calculation_revision_id: string; revision_number: number; reused: boolean }>(
      "select * from public.save_standalone_roof_geometry_calculation($1::uuid,$2::uuid,$3::uuid,$4::integer,$5::text,$6::jsonb,$7::jsonb,$8::uuid)",
      [write.organizationId, write.calculationId, write.operationId, write.expectedRevisionNumber, write.name, JSON.stringify(write.input), JSON.stringify(write.output), write.actorId],
    );
    if (!rows[0]) throw new Error("Standalone roof geometry write returned no revision");
    return rows[0];
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function registerSurveyMultiRoofSource(source: Readonly<{
  organizationId: string; surveyId: string; surveyRevisionId: string; sectionId: string;
  roofModelRevisionId: string; calculationRevisionId: string; actorId: string;
}>) {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("COVERING_WRITER_DATABASE_URL is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query("select public.register_survey_multi_roof_source($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid)",
      [source.organizationId, source.surveyId, source.surveyRevisionId, source.sectionId,
        source.roofModelRevisionId, source.calculationRevisionId, source.actorId]);
  } finally { await client.end().catch(() => undefined); }
}

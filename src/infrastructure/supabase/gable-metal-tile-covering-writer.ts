import "server-only";
import { Client } from "pg";

type MetalTileWrite = {
  organizationId: string;
  calculationId: string;
  operationId: string;
  expectedRevisionNumber: number;
  name: string;
  projectId: string | null;
  roofModelId: string | null;
  sourceRoofRevisionId: string | null;
  input: unknown;
  output: unknown;
  provenance: unknown;
  actorId: string;
};

export async function persistGableMetalTileCovering(write: MetalTileWrite) {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("COVERING_WRITER_DATABASE_URL is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  try {
    await client.connect();
    const { rows } = await client.query<{
      calculation_id: string;
      calculation_revision_id: string;
      revision_number: number;
      reused: boolean;
    }>(`select * from public.save_gable_metal_tile_covering_calculation(
      $1::uuid, $2::uuid, $3::uuid, $4::integer, $5::text, $6::uuid,
      $7::uuid, $8::uuid, $9::jsonb, $10::jsonb, $11::jsonb, $12::uuid
    )`, [
      write.organizationId, write.calculationId, write.operationId, write.expectedRevisionNumber,
      write.name, write.projectId, write.roofModelId, write.sourceRoofRevisionId,
      JSON.stringify(write.input), JSON.stringify(write.output), JSON.stringify(write.provenance), write.actorId,
    ]);
    if (!rows[0]) throw new Error("Metal tile write returned no revision");
    return rows[0];
  } finally {
    await client.end().catch(() => undefined);
  }
}

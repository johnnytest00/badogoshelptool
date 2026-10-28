import "server-only";
import { Client } from "pg";

export type GableMetalTileTakeoffWrite = Readonly<{
  organizationId: string; projectId: string; calculationId: string; revisionId: string;
  variantId: string; name: string; operationId: string; actorId: string;
}>;

export async function createGableMetalTileTakeoffDraft(write: GableMetalTileTakeoffWrite) {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("Restricted covering writer is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const { rows } = await client.query<{
      takeoff_id: string; takeoff_item_id: string; draft_created: boolean; stale_source: boolean;
    }>(`select * from public.create_gable_metal_tile_takeoff_draft(
      $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::text, $7::uuid, $8::uuid
    )`, [write.organizationId, write.projectId, write.calculationId, write.revisionId,
      write.variantId, write.name, write.operationId, write.actorId]);
    if (!rows[0]) throw new Error("Metal tile takeoff writer returned no draft");
    return rows[0];
  } finally {
    await client.end().catch(() => undefined);
  }
}

import "server-only";
import { Client } from "pg";
import type { GableRoofInput, GableRoofOutput } from "@/domain/calculations/gable-roof";

export async function persistGableRoof(write: Readonly<{
  organizationId: string; projectId: string; roofModelId: string; operationId: string;
  expectedRevisionNumber: number; name: string; input: GableRoofInput;
  output: GableRoofOutput; provenance: Record<string, unknown>; actorId: string;
}>) {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("COVERING_WRITER_DATABASE_URL is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const { rows } = await client.query<{ roof_model_id: string; roof_model_revision_id: string; calculation_id: string; calculation_revision_id: string; revision_number: number; reused: boolean }>(
      "select * from public.save_gable_roof_calculation_secure($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::integer,$6::text,$7::jsonb,$8::jsonb,$9::jsonb,$10::uuid)",
      [write.organizationId, write.projectId, write.roofModelId, write.operationId, write.expectedRevisionNumber, write.name,
        JSON.stringify(write.input), JSON.stringify(write.output), JSON.stringify(write.provenance), write.actorId],
    );
    if (!rows[0]) throw new Error("Gable roof write returned no revision");
    return rows[0];
  } finally { await client.end().catch(() => undefined); }
}

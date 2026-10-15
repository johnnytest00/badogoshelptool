import "server-only";
import { Client } from "pg";
import type { FlashingMaterialInput, FlashingMaterialOutput } from "@/domain/calculations/flashing-material";

export async function persistMultiRoofFlashing(write: Readonly<{
  organizationId: string; projectId: string; name: string; input: FlashingMaterialInput;
  output: FlashingMaterialOutput; expectedRevisionNumber: number; operationId: string; actorId: string;
}>) {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("COVERING_WRITER_DATABASE_URL is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  try {
    await client.connect();
    const { rows } = await client.query<{ calculation_id: string; calculation_revision_id: string; revision_number: number; reused: boolean }>(
      "select * from public.save_multi_roof_flashing_calculation($1::uuid,$2::uuid,$3::text,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::integer,$9::uuid,$10::uuid)",
      [write.organizationId, write.projectId, write.name, JSON.stringify(write.input), JSON.stringify(write.output),
        JSON.stringify({ input: "user_provided", output: "server_calculation", calculator: "sheet_metal.flashings.material-estimate", displayName: write.name }),
        JSON.stringify(write.output.warnings), write.expectedRevisionNumber, write.operationId, write.actorId],
    );
    if (!rows[0]) throw new Error("Flashing save returned no revision");
    return rows[0];
  } finally { await client.end().catch(() => undefined); }
}

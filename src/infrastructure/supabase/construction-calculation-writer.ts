import "server-only";
import { Client } from "pg";

export async function persistStandaloneConstructionCalculation(write: Readonly<{
  organizationId: string; calculationId: string; operationId: string; expectedRevisionNumber: number;
  calculatorType: string; name: string; input: unknown; output: unknown; actorId: string;
  /** M10 Fázis 0: the roof.rafter-cut revision whose fields were transferred in, recorded in calculation_dependencies. */
  sourceCalculationRevisionId?: string;
}>) {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("COVERING_WRITER_DATABASE_URL is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  try {
    await client.connect();
    const { rows } = await client.query<{ calculation_id: string; calculation_revision_id: string; revision_number: number; reused: boolean }>(
      "select * from public.save_standalone_construction_calculation($1::uuid,$2::uuid,$3::uuid,$4::integer,$5::text,$6::text,$7::jsonb,$8::jsonb,$9::uuid,$10::uuid)",
      [write.organizationId, write.calculationId, write.operationId, write.expectedRevisionNumber, write.calculatorType, write.name, JSON.stringify(write.input), JSON.stringify(write.output), write.actorId, write.sourceCalculationRevisionId ?? null],
    );
    if (!rows[0]) throw new Error("Standalone construction write returned no revision");
    return rows[0];
  } finally {
    await client.end().catch(() => undefined);
  }
}

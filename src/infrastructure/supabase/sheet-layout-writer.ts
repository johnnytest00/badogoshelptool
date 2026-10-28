import "server-only";
import { Client } from "pg";

export async function persistSheetLayout(write: Readonly<{
  organizationId: string;
  projectId: string;
  roofModelId: string;
  sourceRoofRevisionId: string;
  sourceGeometryCalculationRevisionId: string;
  layoutCalculationId: string | null;
  materialVariantId: string;
  displayName: string;
  input: unknown;
  output: unknown;
  provenance: unknown;
  warnings: unknown;
  expectedRevisionNumber: number;
  operationId: string;
  actorId: string;
}>) {
  const connectionString = process.env.COVERING_WRITER_DATABASE_URL;
  if (!connectionString) throw new Error("COVERING_WRITER_DATABASE_URL is not configured");
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const { rows } = await client.query<{
      calculation_id: string;
      calculation_revision_id: string;
      revision_number: number;
      revision_created: boolean;
    }>(
      "select * from public.save_metal_sheet_layout_secure($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid,$8::text,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::integer,$14::uuid,$15::uuid)",
      [write.organizationId, write.projectId, write.roofModelId, write.sourceRoofRevisionId,
        write.sourceGeometryCalculationRevisionId, write.layoutCalculationId, write.materialVariantId,
        write.displayName, JSON.stringify(write.input), JSON.stringify(write.output), JSON.stringify(write.provenance),
        JSON.stringify(write.warnings), write.expectedRevisionNumber, write.operationId, write.actorId],
    );
    if (!rows[0]) throw new Error("Sheet layout save returned no revision");
    return rows[0];
  } finally {
    await client.end().catch(() => undefined);
  }
}

/* global console, process */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { URL, fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const organizationId = "00000000-0000-4000-8000-000000000010";
const projectId = "1340d579-d1b1-496c-a3c5-1f7e75019413";
const calculationId = "6771199b-9e61-4c60-a81e-80242073359b";
const revisionId = "15d60e59-b0a9-461d-92e0-3111ba3bff4d";
const actorId = "00000000-0000-4000-8000-000000000001";
const [productId, variantId, requestKey] = [randomUUID(), randomUUID(), randomUUID()];
const temp = await mkdtemp(join(tmpdir(), "metal-tile-takeoff-concurrency-"));
const lit = (value) => `'${String(value).replaceAll("'", "''")}'`;
const parse = (stdout) => JSON.parse(stdout.slice(stdout.indexOf("{")));
async function query(sql) {
  const file = join(temp, `${randomUUID()}.sql`);
  await writeFile(file, sql, "utf8");
  try {
    return await execFileAsync("supabase", ["db", "query", "--local", "--output-format", "json", "--file", file],
      { cwd: root, timeout: 30_000, maxBuffer: 2_000_000, env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } });
  } finally { await rm(file, { force: true }); }
}
try {
  const source = parse((await query(`select c.organization_id,cr.input_snapshot #>> '{productInput,nominalSheetWidthMm}' nominal,
    cr.input_snapshot #>> '{productInput,effectiveCoveringWidthMm}' effective,cr.input_snapshot #>> '{productInput,physicalSheetLengthMm}' length
    from public.calculations c join public.calculation_revisions cr on cr.calculation_id=c.id
    where c.id=${lit(calculationId)} and cr.id=${lit(revisionId)} and c.project_id=${lit(projectId)} and c.organization_id=${lit(organizationId)}`)).stdout).rows[0];
  if (!source) throw new Error("Required saved project metal-tile fixture is missing; run the F9.7.7.4b.2 local fixture first.");
  await query(`insert into public.material_products(id,organization_id,category,name,status,data_provenance,created_by)
    values(${lit(productId)},${lit(organizationId)},'roof_covering','DEMO concurrent metal tile','active','demo',${lit(actorId)});`);
  await query(`insert into public.material_variants(id,organization_id,product_id,name,purchasing_unit,nominal_width_mm,effective_width_mm,length_mm,data_provenance,source_name,created_by)
    values(${lit(variantId)},${lit(organizationId)},${lit(productId)},'DEMO matching piece','piece',${source.nominal},${source.effective},${source.length},'demo','DEMO concurrency fixture',${lit(actorId)});`);
  const call = `select * from public.create_gable_metal_tile_takeoff_draft(${lit(organizationId)},${lit(projectId)},${lit(calculationId)},${lit(revisionId)},${lit(variantId)},'DEMO concurrent metal tile draft',${lit(requestKey)},${lit(actorId)});`;
  const responses = await Promise.all([query(call), query(call)]);
  const results = responses.map(({ stdout }) => parse(stdout).rows[0]);
  const takeoffId = results[0]?.takeoff_id;
  if (!takeoffId || results[1]?.takeoff_id !== takeoffId || results.filter((row) => row.draft_created).length !== 1 || results.filter((row) => !row.draft_created).length !== 1) {
    throw new Error(`Unexpected concurrent outcome: ${JSON.stringify(results)}`);
  }
  const integrity = parse((await query(`select json_build_object('drafts',(select count(*) from public.material_takeoffs where transfer_request_key=${lit(requestKey)}),
    'items',(select count(*) from public.material_takeoff_items where takeoff_id=${lit(takeoffId)}),
    'quantity',(select final_quantity from public.material_takeoff_items where takeoff_id=${lit(takeoffId)})) result;`)).stdout).rows[0].result;
  if (Number(integrity.drafts) !== 1 || Number(integrity.items) !== 1 || Number(integrity.quantity) !== 28) throw new Error(`Integrity mismatch: ${JSON.stringify(integrity)}`);
  console.log(JSON.stringify({ status: "PASS", independentDatabaseConnections: 2, created: 1, reused: 1, ...integrity }));
} finally {
  for (const sql of [
    `delete from public.material_takeoff_items where takeoff_id in (select id from public.material_takeoffs where transfer_request_key=${lit(requestKey)})`,
    `delete from public.material_takeoffs where transfer_request_key=${lit(requestKey)}`,
    `delete from public.material_variants where id=${lit(variantId)}`,
    `delete from public.material_products where id=${lit(productId)}`,
  ]) await query(sql).catch((error) => console.error(`cleanup failed: ${error.stderr ?? error.message}`));
  await rm(temp, { recursive: true, force: true });
}

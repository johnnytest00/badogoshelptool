/* global console */

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
const ownerId = "00000000-0000-4000-8000-000000000001";
const authenticatedDbUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres?options=-c%20role%3Dauthenticated";
const projectId = randomUUID();
const calculationId = randomUUID();
const revisionId = randomUUID();
const productId = randomUUID();
const variantId = randomUUID();
const requestKey = randomUUID();
const barrier = `__f96121_takeoff_barrier_${randomUUID().replaceAll("-", "")}`;
const callWrapper = `__f96121_takeoff_call_${randomUUID().replaceAll("-", "")}`;
const tempDirectory = await mkdtemp(join(tmpdir(), "f96121-takeoff-concurrency-"));

async function query(sql, dbUrl = null) {
  const file = join(tempDirectory, `${randomUUID()}.sql`);
  await writeFile(file, sql, "utf8");
  try {
    const args = ["db", "query", dbUrl ? "--db-url" : "--local", ...(dbUrl ? [dbUrl] : []), "--output-format", "json", "--file", file];
    return await execFileAsync("supabase", args, { cwd: root, timeout: 30_000, maxBuffer: 2_000_000 });
  } finally {
    await rm(file, { force: true });
  }
}

function sqlLiteral(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function parseQueryJson(stdout) { const start = stdout.indexOf("{"); return JSON.parse(stdout.slice(start)); }

const input = JSON.stringify({ gutterStockLengthMm: 4000, runs: [{ id: "front", name: "DEMO első eresz", lengthMm: 8500, measurementSource: "demo", roofEdge: null, bracketSpacingMm: null }], downpipes: [], manualComponents: [] });
const output = JSON.stringify({ gutterRuns: [{ id: "front", name: "DEMO első eresz", lengthMm: 8500, stockSections: 3, remainderMm: 500, bracketEstimate: null, bracketBasis: null }], downpipeRuns: [], componentQuantities: [], totals: { gutterStockSections: 3, downpipeStockSections: 0, totalManualComponents: 0 }, assumptions: [], warnings: [] });
const mappings = JSON.stringify([{ candidateId: "gutter-section:front", variantId }]);

const setupStatements = [
  `create table public."${barrier}" (slot smallint primary key, ready boolean not null default false)`,
  `grant select, update on public."${barrier}" to authenticated`,
  `insert into public."${barrier}" (slot) values (1), (2)`,
  `insert into public.projects (id, organization_id, name, project_type, status, created_by) values (${sqlLiteral(projectId)}, ${sqlLiteral(organizationId)}, 'DEMO F9.6.1.2.1 concurrent takeoff', 'gutter_work', 'draft', ${sqlLiteral(ownerId)})`,
  `insert into public.calculations (id, organization_id, project_id, calculator_type, display_name, status) values (${sqlLiteral(calculationId)}, ${sqlLiteral(organizationId)}, ${sqlLiteral(projectId)}, 'gutters.material-estimate', 'DEMO concurrent takeoff', 'current')`,
  `insert into public.calculation_revisions (id, organization_id, calculation_id, revision_number, input_schema_version, calculator_implementation_version, input_snapshot, output_snapshot, data_provenance, validation_status, warnings, created_by) values (${sqlLiteral(revisionId)}, ${sqlLiteral(organizationId)}, ${sqlLiteral(calculationId)}, 1, '1.0.0', '1.0.0', ${sqlLiteral(input)}::jsonb, ${sqlLiteral(output)}::jsonb, '{"test":"F9.6.1.2.1"}'::jsonb, 'verified', '[]'::jsonb, ${sqlLiteral(ownerId)})`,
  `update public.calculations set current_revision_id = ${sqlLiteral(revisionId)} where id = ${sqlLiteral(calculationId)}`,
  `insert into public.material_products (id, organization_id, category, name, status, data_provenance, created_by) values (${sqlLiteral(productId)}, ${sqlLiteral(organizationId)}, 'gutter', 'DEMO concurrent gutter', 'active', 'demo', ${sqlLiteral(ownerId)})`,
  `insert into public.material_variants (id, organization_id, product_id, name, purchasing_unit, length_mm, technical_specs, data_provenance, created_by) values (${sqlLiteral(variantId)}, ${sqlLiteral(organizationId)}, ${sqlLiteral(productId)}, 'DEMO 4 m darab', 'piece', 4000, '{}', 'demo', ${sqlLiteral(ownerId)})`,
  `create function public."${callWrapper}"() returns table(takeoff_id uuid, draft_created boolean) language plpgsql security invoker as $function$ begin return query select result.takeoff_id, result.draft_created from public.create_gutter_takeoff_draft(${sqlLiteral(organizationId)}, ${sqlLiteral(projectId)}, ${sqlLiteral(calculationId)}, ${sqlLiteral(revisionId)}, 'DEMO concurrent draft', ${sqlLiteral(requestKey)}, ${sqlLiteral(mappings)}::jsonb) result; end; $function$`,
  `grant execute on function public."${callWrapper}"() to authenticated`,
];

const markReady = (slot) => `with auth as materialized (select set_config('request.jwt.claim.sub', ${sqlLiteral(ownerId)}, false)) update public."${barrier}" set ready = true from auth where slot = ${slot}`;
const concurrentCall = `with auth as materialized (select set_config('request.jwt.claim.sub', ${sqlLiteral(ownerId)}, false)), pause as materialized (select pg_sleep(0.5)) select call.* from auth cross join pause cross join lateral public."${callWrapper}"() call`;

try {
  for (const statement of setupStatements) await query(statement);
  await Promise.all([query(markReady(1), authenticatedDbUrl), query(markReady(2), authenticatedDbUrl)]);
  const readyCount = parseQueryJson((await query(`select count(*)::integer as ready_count from public."${barrier}" where ready`)).stdout).rows[0]?.ready_count;
  if (readyCount !== 2) throw new Error(`independent connections did not reach the start barrier: ${readyCount}`);
  const calls = await Promise.all([query(concurrentCall, authenticatedDbUrl), query(concurrentCall, authenticatedDbUrl)]);
  const rows = calls.map((result) => parseQueryJson(result.stdout).rows[0]);
  if (!rows[0]?.takeoff_id || rows[0].takeoff_id !== rows[1]?.takeoff_id) throw new Error(`concurrent calls returned different drafts: ${JSON.stringify(rows)}`);
  if (rows.filter((row) => row.draft_created === true).length !== 1 || rows.filter((row) => row.draft_created === false).length !== 1) throw new Error(`expected one create and one reuse: ${JSON.stringify(rows)}`);
  const validation = parseQueryJson((await query(`select json_build_object('draft_count',(select count(*) from public.material_takeoffs where transfer_request_key=${sqlLiteral(requestKey)}),'item_count',(select count(*) from public.material_takeoff_items where takeoff_id=${sqlLiteral(rows[0].takeoff_id)}),'quantity',(select final_quantity from public.material_takeoff_items where takeoff_id=${sqlLiteral(rows[0].takeoff_id)})) as result`)).stdout).rows[0].result;
  if (validation.draft_count !== 1 || validation.item_count !== 1 || Number(validation.quantity) !== 3) throw new Error(`concurrent integrity assertion failed: ${JSON.stringify(validation)}`);
  console.log(JSON.stringify({ status: "PASS", independentConnections: 2, created: 1, reused: 1, draftCount: validation.draft_count, itemCount: validation.item_count, quantity: Number(validation.quantity), sameTakeoffId: true }));
} finally {
  const cleanup = `do $$ begin
    drop function if exists public."${callWrapper}"();
    delete from public.material_takeoff_items where takeoff_id in (select id from public.material_takeoffs where organization_id=${sqlLiteral(organizationId)} and project_id=${sqlLiteral(projectId)});
    delete from public.material_takeoffs where organization_id=${sqlLiteral(organizationId)} and project_id=${sqlLiteral(projectId)};
    delete from public.material_variants where id=${sqlLiteral(variantId)};
    delete from public.material_products where id=${sqlLiteral(productId)};
    update public.calculations set current_revision_id=null where id=${sqlLiteral(calculationId)};
    alter table public.calculation_revisions disable trigger calculation_revisions_immutable;
    delete from public.calculation_revisions where calculation_id=${sqlLiteral(calculationId)};
    alter table public.calculation_revisions enable trigger calculation_revisions_immutable;
    delete from public.calculations where id=${sqlLiteral(calculationId)};
    delete from public.projects where id=${sqlLiteral(projectId)};
    drop table if exists public."${barrier}";
  end $$;`;
  await query(cleanup).catch((error) => console.error(`cleanup failed: ${error.stdout ?? ""}\n${error.stderr ?? error.message}`));
  await rm(tempDirectory, { recursive: true, force: true });
}

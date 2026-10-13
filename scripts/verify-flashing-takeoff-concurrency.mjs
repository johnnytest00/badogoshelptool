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
const ownerId = "00000000-0000-4000-8000-000000000001";
const authDbUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres?options=-c%20role%3Dauthenticated";
const [projectId, calculationId, revisionId, productId, variantId, requestKey] = Array.from({ length: 6 }, randomUUID);
const barrier = `__f9623_flashing_barrier_${randomUUID().replaceAll("-", "")}`;
const wrapper = `__f9623_flashing_call_${randomUUID().replaceAll("-", "")}`;
const temp = await mkdtemp(join(tmpdir(), "f9623-flashing-concurrency-"));

async function query(sql, dbUrl = null) {
  const file = join(temp, `${randomUUID()}.sql`);
  await writeFile(file, sql, "utf8");
  try {
    const args = ["db", "query", dbUrl ? "--db-url" : "--local", ...(dbUrl ? [dbUrl] : []), "--output-format", "json", "--file", file];
    return await execFileAsync("supabase", args, { cwd: root, timeout: 30_000, maxBuffer: 2_000_000, env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } });
  } finally { await rm(file, { force: true }); }
}
const lit = (value) => `'${String(value).replaceAll("'", "''")}'`;
const parse = (stdout) => JSON.parse(stdout.slice(stdout.indexOf("{")));
const mappings = JSON.stringify([{ candidateId: "run-linear:front", variantId }]);
const input = JSON.stringify({ sectionSpec: { nominalLengthMm: 2000 }, runs: [{ id: "front", category: "verge", name: "DEMO concurrency orom", lengthMm: 3900, startExtensionMm: 100, endExtensionMm: 0, reserveMm: 100 }], manualComponents: [] });
const output = JSON.stringify({ runs: [{ id: "front", category: "verge", name: "DEMO concurrency orom", lengthMm: 3900, requiredCoverageLengthMm: 4000, reserveMm: 100, planningTargetLengthMm: 4100, nominalSectionLengthMm: 2000, estimatedSectionCount: null }], manualComponents: [], warnings: [] });
const setup = [
  `create table public."${barrier}" (slot smallint primary key, ready boolean not null default false)`,
  `grant select,update on public."${barrier}" to authenticated`,
  `insert into public."${barrier}"(slot) values(1),(2)`,
  `insert into public.projects(id,organization_id,name,project_type,status,created_by) values(${lit(projectId)},${lit(organizationId)},'DEMO F9.6.2.3 concurrency','roof_renovation','draft',${lit(ownerId)})`,
  `insert into public.calculations(id,organization_id,project_id,calculator_type,display_name,status) values(${lit(calculationId)},${lit(organizationId)},${lit(projectId)},'sheet_metal.flashings.material-estimate','DEMO flashing concurrency','current')`,
  `insert into public.calculation_revisions(id,organization_id,calculation_id,revision_number,input_schema_version,calculator_implementation_version,input_snapshot,output_snapshot,data_provenance,validation_status,warnings,created_by) values(${lit(revisionId)},${lit(organizationId)},${lit(calculationId)},1,'1.0.0','1.0.0',${lit(input)}::jsonb,${lit(output)}::jsonb,'{"test":"DEMO F9.6.2.3"}'::jsonb,'verified','[]'::jsonb,${lit(ownerId)})`,
  `update public.calculations set current_revision_id=${lit(revisionId)} where id=${lit(calculationId)}`,
  `insert into public.material_products(id,organization_id,category,name,status,data_provenance,created_by) values(${lit(productId)},${lit(organizationId)},'flashing','DEMO concurrency flashing','active','demo',${lit(ownerId)})`,
  `insert into public.material_variants(id,organization_id,product_id,name,purchasing_unit,data_provenance,created_by) values(${lit(variantId)},${lit(organizationId)},${lit(productId)},'DEMO linear meter','linear_meter','demo',${lit(ownerId)})`,
  `create function public."${wrapper}"() returns table(takeoff_id uuid,draft_created boolean) language plpgsql security invoker as $fn$ begin return query select x.takeoff_id,x.draft_created from public.create_flashing_takeoff_draft(${lit(organizationId)},${lit(projectId)},${lit(calculationId)},${lit(revisionId)},'DEMO concurrent flashing draft',${lit(requestKey)},${lit(mappings)}::jsonb) x; end $fn$`,
  `grant execute on function public."${wrapper}"() to authenticated`,
];
const ready = (slot) => `with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) update public."${barrier}" set ready=true from auth where slot=${slot}`;
const call = `with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)), pause as materialized(select pg_sleep(0.5)) select x.* from auth cross join pause cross join lateral public."${wrapper}"() x`;

try {
  for (const statement of setup) await query(statement);
  await Promise.all([query(ready(1), authDbUrl), query(ready(2), authDbUrl)]);
  const barrierCount = parse((await query(`select count(*)::integer as n from public."${barrier}" where ready`)).stdout).rows[0]?.n;
  if (barrierCount !== 2) throw new Error(`authenticated sessions missed start barrier: ${barrierCount}`);
  const responses = await Promise.all([query(call, authDbUrl), query(call, authDbUrl)]);
  const results = responses.map(({ stdout }) => parse(stdout).rows[0]);
  if (!results[0]?.takeoff_id || results[0].takeoff_id !== results[1]?.takeoff_id || results.filter((x) => x.draft_created).length !== 1 || results.filter((x) => !x.draft_created).length !== 1) throw new Error(`duplicate concurrency outcome: ${JSON.stringify(results)}`);
  const result = parse((await query(`select json_build_object('drafts',(select count(*) from public.material_takeoffs where transfer_request_key=${lit(requestKey)}),'items',(select count(*) from public.material_takeoff_items where takeoff_id=${lit(results[0].takeoff_id)}),'quantity',(select final_quantity from public.material_takeoff_items where takeoff_id=${lit(results[0].takeoff_id)})) as result`)).stdout).rows[0].result;
  if (result.drafts !== 1 || result.items !== 1 || Number(result.quantity) !== 4.1) throw new Error(`integrity mismatch: ${JSON.stringify(result)}`);
  console.log(JSON.stringify({ status: "PASS", independentAuthenticatedConnections: 2, create: 1, reuse: 1, draftCount: result.drafts, itemCount: result.items, quantity: Number(result.quantity), takeoffIdEqual: true }));
} finally {
  const cleanup = `do $cleanup$ begin
    drop function if exists public."${wrapper}"();
    delete from public.material_takeoff_items where takeoff_id in (select id from public.material_takeoffs where project_id=${lit(projectId)} and organization_id=${lit(organizationId)});
    delete from public.material_takeoffs where project_id=${lit(projectId)} and organization_id=${lit(organizationId)};
    delete from public.material_variants where id=${lit(variantId)};
    delete from public.material_products where id=${lit(productId)};
    update public.calculations set current_revision_id=null where id=${lit(calculationId)};
    alter table public.calculation_revisions disable trigger calculation_revisions_immutable;
    delete from public.calculation_revisions where id=${lit(revisionId)};
    alter table public.calculation_revisions enable trigger calculation_revisions_immutable;
    delete from public.calculations where id=${lit(calculationId)};
    delete from public.projects where id=${lit(projectId)};
    drop table if exists public."${barrier}";
  end $cleanup$`;
  await query(cleanup).catch((error) => console.error(`cleanup failed: ${error.stderr ?? error.message}`));
  await rm(temp, { recursive: true, force: true });
}

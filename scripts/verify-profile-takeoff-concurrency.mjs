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
const [projectId, calculationId, productId, variantId, requestKey] = Array.from({ length: 5 }, randomUUID);
const wrapper = `__f96342_profile_call_${randomUUID().replaceAll("-", "")}`;
const barrier = `__f96342_profile_barrier_${randomUUID().replaceAll("-", "")}`;
const temp = await mkdtemp(join(tmpdir(), "f96342-profile-concurrency-"));
const lit = (value) => `'${String(value).replaceAll("'", "''")}'`;
const parse = (stdout) => JSON.parse(stdout.slice(stdout.indexOf("{")));
async function query(sql, dbUrl = null) {
  const file = join(temp, `${randomUUID()}.sql`);
  await writeFile(file, sql, "utf8");
  try {
    const args = ["db", "query", dbUrl ? "--db-url" : "--local", ...(dbUrl ? [dbUrl] : []), "--output-format", "json", "--file", file];
    return await execFileAsync("supabase", args, { cwd: root, timeout: 30_000, maxBuffer: 2_000_000, env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } });
  } finally { await rm(file, { force: true }); }
}
const input = JSON.stringify({ schemaVersion: "1.0.0", profileId: calculationId, profileType: "l", label: "DEMO concurrent profile", coordinateConvention: "x-right-y-up", dimensionConvention: "finished_tangent", thicknessMm: 1, straights: [{ id: "s1", tangentLengthMm: 60 }, { id: "s2", tangentLengthMm: 40 }], bends: [{ id: "b1", signedTurnDeg: 90, insideRadiusMm: 2, allowance: { mode: "explicit_ba", baMm: 3, source: { kind: "user_provided", label: "DEMO BA" } } }], formedRunLengthMm: 2000, pieceCount: 3, material: { catalogVariantId: variantId, materialSpec: "DEMO-A", provenance: { kind: "catalog_snapshot", label: "DEMO" } } });
let revisionId = null;
try {
  for (const sql of [
    `create table public."${barrier}" (slot smallint primary key, ready boolean not null default false)`,
    `grant select,update on public."${barrier}" to authenticated`,
    `insert into public."${barrier}"(slot) values(1),(2)`,
    `insert into public.projects(id,organization_id,name,project_type,status,created_by) values(${lit(projectId)},${lit(organizationId)},'DEMO profile transfer concurrency','roof_renovation','draft',${lit(ownerId)})`,
    `insert into public.material_products(id,organization_id,category,name,status,data_provenance,created_by) values(${lit(productId)},${lit(organizationId)},'sheet_metal','DEMO concurrent sheet','active','demo',${lit(ownerId)})`,
    `insert into public.material_variants(id,organization_id,product_id,name,purchasing_unit,thickness_mm,technical_specs,source_name,data_provenance,created_by) values(${lit(variantId)},${lit(organizationId)},${lit(productId)},'DEMO m²','square_meter',1,'{"profileMaterialSpec":"DEMO-A"}','DEMO source','demo',${lit(ownerId)})`,
  ]) await query(sql);
  const save = parse((await query(`with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) select x.* from auth cross join lateral public.save_sheet_metal_profile_calculation(${lit(organizationId)},${lit(projectId)},${lit(calculationId)},'DEMO concurrent profile',${lit(input)}::jsonb,0) x`, authDbUrl)).stdout).rows[0];
  revisionId = save?.calculation_revision_id;
  if (!revisionId) throw new Error("authenticated profile save failed");
  await query(`create function public."${wrapper}"() returns table(takeoff_id uuid,draft_created boolean) language plpgsql security invoker as $fn$ begin return query select x.takeoff_id,x.draft_created from public.create_profile_takeoff_draft(${lit(organizationId)},${lit(projectId)},${lit(calculationId)},${lit(revisionId)},${lit(variantId)},'DEMO concurrent profile draft',${lit(requestKey)}) x; end $fn$`);
  await query(`grant execute on function public."${wrapper}"() to authenticated`);
  const ready = (slot) => `with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) update public."${barrier}" set ready=true from auth where slot=${slot}`;
  await Promise.all([query(ready(1), authDbUrl), query(ready(2), authDbUrl)]);
  const readyCount = parse((await query(`select count(*)::integer as n from public."${barrier}" where ready`)).stdout).rows[0]?.n;
  if (readyCount !== 2) throw new Error(`independent authenticated connections missed barrier: ${readyCount}`);
  const call = `with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)), pause as materialized(select pg_sleep(0.5)) select x.* from auth cross join pause cross join lateral public."${wrapper}"() x`;
  const responses = await Promise.all([query(call, authDbUrl), query(call, authDbUrl)]);
  const results = responses.map(({ stdout }) => parse(stdout).rows[0]);
  if (!results[0]?.takeoff_id || results[0].takeoff_id !== results[1]?.takeoff_id || results.filter((item) => item.draft_created).length !== 1 || results.filter((item) => !item.draft_created).length !== 1) throw new Error(`unexpected concurrent outcome: ${JSON.stringify(results)}`);
  const integrity = parse((await query(`select json_build_object('drafts',(select count(*) from public.material_takeoffs where transfer_request_key=${lit(requestKey)}),'items',(select count(*) from public.material_takeoff_items where takeoff_id=${lit(results[0].takeoff_id)}),'quantity',(select final_quantity from public.material_takeoff_items where takeoff_id=${lit(results[0].takeoff_id)})) as result`)).stdout).rows[0].result;
  if (integrity.drafts !== 1 || integrity.items !== 1 || Number(integrity.quantity) !== 0.618) throw new Error(`integrity mismatch: ${JSON.stringify(integrity)}`);
  console.log(JSON.stringify({ status: "PASS", independentAuthenticatedConnections: 2, create: 1, reuse: 1, drafts: integrity.drafts, items: integrity.items, quantitySqM: Number(integrity.quantity) }));
} finally {
  const cleanup = `do $cleanup$ begin
    drop function if exists public."${wrapper}"();
    delete from public.material_takeoff_items where takeoff_id in (select id from public.material_takeoffs where project_id=${lit(projectId)} and organization_id=${lit(organizationId)});
    delete from public.material_takeoffs where project_id=${lit(projectId)} and organization_id=${lit(organizationId)};
    if ${lit(revisionId)} <> '' then
      update public.calculations set current_revision_id=null where id=${lit(calculationId)};
      alter table public.calculation_revisions disable trigger calculation_revisions_immutable;
      delete from public.calculation_revisions where calculation_id=${lit(calculationId)};
      alter table public.calculation_revisions enable trigger calculation_revisions_immutable;
      delete from public.calculations where id=${lit(calculationId)};
    end if;
    delete from public.material_variants where id=${lit(variantId)};
    delete from public.material_products where id=${lit(productId)};
    delete from public.projects where id=${lit(projectId)};
    drop table if exists public."${barrier}";
  end $cleanup$`;
  await query(cleanup).catch((error) => console.error(`cleanup failed: ${error.stderr ?? error.message}`));
  await rm(temp, { recursive: true, force: true });
}

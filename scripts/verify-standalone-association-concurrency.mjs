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
const projectId = randomUUID(), calculationId = randomUUID(), operationId = randomUUID();
const authenticatedDbUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres?options=-c%20role%3Dauthenticated";
const barrier = `__f97651_association_barrier_${randomUUID().replaceAll("-", "")}`;
const wrapper = `__f97651_associate_${randomUUID().replaceAll("-", "")}`;
const tempDirectory = await mkdtemp(join(tmpdir(), "f97651-association-concurrency-"));
const lit = (value) => `'${String(value).replaceAll("'", "''")}'`;
const parse = (stdout) => JSON.parse(stdout.slice(stdout.indexOf("{")));

async function query(sql, dbUrl = null) {
  const file = join(tempDirectory, `${randomUUID()}.sql`);
  await writeFile(file, sql, "utf8");
  try {
    const args = ["db", "query", dbUrl ? "--db-url" : "--local", ...(dbUrl ? [dbUrl] : []), "--output-format", "json", "--file", file];
    return await execFileAsync("supabase", args, { cwd: root, timeout: 30_000, maxBuffer: 2_000_000, env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } });
  } finally { await rm(file, { force: true }); }
}

const sourceInput = JSON.stringify({ gutterStockLengthMm: 3000, runs: [{ id: "r1", name: "DEMO párhuzamos eresz", lengthMm: 6000, measurementSource: "demo", roofEdge: null, bracketSpacingMm: null }], downpipes: [], manualComponents: [] });
const sourceOutput = JSON.stringify({ gutterRuns: [{ id: "r1", name: "DEMO párhuzamos eresz", lengthMm: 6000, stockSections: 2, remainderMm: null, bracketEstimate: null, bracketBasis: null }], downpipeRuns: [], componentQuantities: [{ category: "gutter_section", quantity: 2, source: "calculated", basis: "DEMO ellenőrző fixture" }], totals: { gutterStockSections: 2, downpipeStockSections: 0, totalManualComponents: 0 }, assumptions: [], warnings: [] });

try {
  await query(`insert into public.projects(id,organization_id,name,project_type,status,created_by) values (${lit(projectId)},${lit(organizationId)},'DEMO F9.7.6.5.1 concurrency','roof_renovation','draft',${lit(ownerId)})`);
  await query(`with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) select x.* from auth cross join lateral public.save_standalone_gutter_calculation(${lit(organizationId)},${lit(calculationId)},'DEMO párhuzamos eresz',${lit(sourceInput)}::jsonb,${lit(sourceOutput)}::jsonb,0) x`, authenticatedDbUrl);
  await query(`create table public."${barrier}"(slot smallint primary key,ready boolean not null default false)`);
  await query(`grant select,update on public."${barrier}" to authenticated`);
  await query(`insert into public."${barrier}"(slot) values(1),(2)`);
  await query(`create function public."${wrapper}"() returns table(association_id uuid,project_calculation_id uuid,project_revision_id uuid,revision_number integer,reused boolean) language plpgsql security invoker as $fn$
    declare v_input jsonb; v_output jsonb; v_revision uuid;
    begin perform pg_sleep(0.5); select current_revision_id into v_revision from public.calculations where id=${lit(calculationId)};
      select input_snapshot,output_snapshot into v_input,v_output from public.calculation_revisions where id=v_revision;
      return query select * from public.associate_standalone_calculation_to_project(${lit(organizationId)},${lit(projectId)},${lit(calculationId)},v_revision,${lit(operationId)},'DEMO párhuzamos projekt eresz',0,null,v_input,v_output);
    end $fn$`);
  await query(`grant execute on function public."${wrapper}"() to authenticated`);
  const ready = (slot) => `with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) update public."${barrier}" set ready=true from auth where slot=${slot}`;
  await Promise.all([query(ready(1), authenticatedDbUrl), query(ready(2), authenticatedDbUrl)]);
  const readyCount = parse((await query(`select count(*)::integer as n from public."${barrier}" where ready`)).stdout).rows[0]?.n;
  if (readyCount !== 2) throw new Error(`authenticated sessions missed start barrier: ${readyCount}`);
  const call = `with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) select x.* from auth cross join lateral public."${wrapper}"() x`;
  const attempts = await Promise.all([query(call, authenticatedDbUrl), query(call, authenticatedDbUrl)]);
  const results = attempts.map(({ stdout }) => parse(stdout).rows[0]);
  const stored = parse((await query(`select json_build_object(
    'associations',(select count(*) from public.calculation_project_associations where operation_id=${lit(operationId)}),
    'revisions',(select count(*) from public.calculation_revisions where calculation_id=(select project_calculation_id from public.calculation_project_associations where operation_id=${lit(operationId)})),
    'targetRevision',(select max(revision_number) from public.calculation_revisions where calculation_id=(select project_calculation_id from public.calculation_project_associations where operation_id=${lit(operationId)}))) as result`)).stdout).rows[0]?.result;
  if (results.length !== 2 || results[0].association_id !== results[1].association_id
    || results[0].project_revision_id !== results[1].project_revision_id
    || results.map((row) => row.reused).sort().join(",") !== "false,true"
    || stored.associations !== 1 || stored.revisions !== 1 || stored.targetRevision !== 1) {
    throw new Error(`expected one association and identical reused target: results=${JSON.stringify(results)}, stored=${JSON.stringify(stored)}`);
  }
  console.log(JSON.stringify({ status: "PASS", independentAuthenticatedConnections: 2, sameOperationId: true, oneAssociation: stored.associations, oneProjectRevision: stored.revisions, reusedFlags: results.map((row) => row.reused) }));
} finally {
  await query(`do $cleanup$ begin
    drop function if exists public."${wrapper}"(); drop table if exists public."${barrier}";
    update public.calculations set current_revision_id=null where id=${lit(calculationId)} or project_id=${lit(projectId)};
    alter table public.calculation_project_associations disable trigger calculation_project_associations_immutable;
    delete from public.calculation_project_associations where operation_id=${lit(operationId)};
    alter table public.calculation_project_associations enable trigger calculation_project_associations_immutable;
    alter table public.calculation_revisions disable trigger calculation_revisions_immutable;
    delete from public.calculation_revisions where calculation_id=${lit(calculationId)} or calculation_id in (select id from public.calculations where project_id=${lit(projectId)});
    alter table public.calculation_revisions enable trigger calculation_revisions_immutable;
    delete from public.calculations where id=${lit(calculationId)} or project_id=${lit(projectId)};
    delete from public.projects where id=${lit(projectId)};
  end $cleanup$`).catch((error) => console.error(`cleanup failed: ${error.stderr ?? error.message}`));
  await rm(tempDirectory, { recursive: true, force: true });
}

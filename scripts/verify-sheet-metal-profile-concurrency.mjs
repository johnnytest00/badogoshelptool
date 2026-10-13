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
const authenticatedDbUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres?options=-c%20role%3Dauthenticated";
const projectId = randomUUID(), calculationId = randomUUID();
const barrier = `__f9633_profile_barrier_${randomUUID().replaceAll("-", "")}`;
const tempDirectory = await mkdtemp(join(tmpdir(), "f9633-profile-concurrency-"));
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

const input = (length) => JSON.stringify({ schemaVersion: "1.0.0", profileId: calculationId, profileType: "l", label: "DEMO párhuzamos profil", coordinateConvention: "x-right-y-up", dimensionConvention: "finished_tangent", thicknessMm: 1,
  straights: [{ id: "s1", tangentLengthMm: length }, { id: "s2", tangentLengthMm: 40 }], bends: [{ id: "b1", signedTurnDeg: 90, insideRadiusMm: 2, allowance: { mode: "k_factor", kFactor: 0.4 } }] });
const wrapper = `__f9633_save_profile_${randomUUID().replaceAll("-", "")}`;

try {
  for (const statement of [
    `create table public."${barrier}" (slot smallint primary key, ready boolean not null default false)`,
    `grant select,update on public."${barrier}" to authenticated`,
    `insert into public."${barrier}"(slot) values(1),(2)`,
    `insert into public.projects(id,organization_id,name,project_type,status,created_by) values(${lit(projectId)},${lit(organizationId)},'DEMO F9.6.3.3 profil konkurencia','roof_renovation','draft',${lit(ownerId)})`,
    `create function public."${wrapper}"(p_length numeric) returns table(calculation_revision_id uuid,revision_number integer) language plpgsql security invoker as $fn$
    begin perform pg_sleep(0.5); return query select x.calculation_revision_id,x.revision_number from public.save_sheet_metal_profile_calculation(${lit(organizationId)},${lit(projectId)},${lit(calculationId)},'DEMO párhuzamos profil',
      jsonb_set(${lit(input(60))}::jsonb,'{straights,0,tangentLengthMm}',to_jsonb(p_length)),1) x; end $fn$;`,
    `grant execute on function public."${wrapper}"(numeric) to authenticated`,
  ]) await query(statement);
  await query(`with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) select x.* from auth cross join lateral public.save_sheet_metal_profile_calculation(${lit(organizationId)},${lit(projectId)},${lit(calculationId)},'DEMO párhuzamos profil',${lit(input(60))}::jsonb,0) x`, authenticatedDbUrl);
  const ready = (slot) => `with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) update public."${barrier}" set ready=true from auth where slot=${slot}`;
  await Promise.all([query(ready(1), authenticatedDbUrl), query(ready(2), authenticatedDbUrl)]);
  const readyCount = parse((await query(`select count(*)::integer as n from public."${barrier}" where ready`)).stdout).rows[0]?.n;
  if (readyCount !== 2) throw new Error(`authenticated sessions missed start barrier: ${readyCount}`);
  const attempts = await Promise.allSettled([
    query(`with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) select x.* from auth cross join lateral public."${wrapper}"(65) x`, authenticatedDbUrl),
    query(`with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) select x.* from auth cross join lateral public."${wrapper}"(70) x`, authenticatedDbUrl),
  ]);
  const fulfilled = attempts.filter((item) => item.status === "fulfilled");
  const rejected = attempts.filter((item) => item.status === "rejected");
  const stored = parse((await query(`select json_build_object('revisions',(select count(*) from public.calculation_revisions where calculation_id=${lit(calculationId)}),'max_revision',(select max(revision_number) from public.calculation_revisions where calculation_id=${lit(calculationId)})) as result`)).stdout);
  const conflictText = rejected[0]?.reason ? `${rejected[0].reason.stdout ?? ""} ${rejected[0].reason.stderr ?? ""} ${rejected[0].reason.message ?? ""}` : "";
  const staleConflict = conflictText.includes("időközben új revíziót kapott");
  if (fulfilled.length !== 1 || rejected.length !== 1 || !staleConflict || stored.rows[0].result.revisions !== 2 || stored.rows[0].result.max_revision !== 2) {
    throw new Error(`expected exactly one V2 save and one stale conflict; success=${fulfilled.length}, conflict=${rejected.length}, staleConflict=${staleConflict}, stored=${JSON.stringify(stored.rows[0])}`);
  }
  console.log(JSON.stringify({ status: "PASS", independentAuthenticatedConnections: 2, v1Retained: true, v2Created: 1, staleExpectedRevisionRejected: true, revisionCount: stored.rows[0].result.revisions }));
} finally {
  await query(`do $cleanup$ begin drop function if exists public."${wrapper}"(numeric); update public.calculations set current_revision_id=null where id=${lit(calculationId)};
    alter table public.calculation_revisions disable trigger calculation_revisions_immutable; delete from public.calculation_revisions where calculation_id=${lit(calculationId)}; alter table public.calculation_revisions enable trigger calculation_revisions_immutable;
    delete from public.calculations where id=${lit(calculationId)}; delete from public.projects where id=${lit(projectId)}; drop table if exists public."${barrier}"; end $cleanup$`).catch((error) => console.error(`cleanup failed: ${error.stderr ?? error.message}`));
  await rm(tempDirectory, { recursive: true, force: true });
}

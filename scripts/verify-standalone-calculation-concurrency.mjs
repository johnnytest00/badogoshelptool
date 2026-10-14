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
const calculationId = randomUUID();
const barrier = `__f9633_standalone_barrier_${randomUUID().replaceAll("-", "")}`;
const wrapper = `__f9633_save_standalone_${randomUUID().replaceAll("-", "")}`;
const tempDirectory = await mkdtemp(join(tmpdir(), "f9633-standalone-concurrency-"));
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

const input = (length) => JSON.stringify({ gutterStockLengthMm: 3000, runs: [{ id: "r1", name: "DEMO párhuzamos eresz", lengthMm: length, measurementSource: "demo", roofEdge: null, bracketSpacingMm: null }], downpipes: [], manualComponents: [] });
const output = (length) => JSON.stringify({ gutterRuns: [{ id: "r1", name: "DEMO párhuzamos eresz", lengthMm: length, stockSections: Math.ceil(length / 3000), remainderMm: length % 3000 || null, bracketEstimate: null, bracketBasis: null }], downpipeRuns: [], componentQuantities: [{ category: "gutter_section", quantity: Math.ceil(length / 3000), source: "calculated", basis: "Független ereszszakaszonként ceil(hossz / kereskedelmi szálhossz)." }], totals: { gutterStockSections: Math.ceil(length / 3000), downpipeStockSections: 0, totalManualComponents: 0 }, assumptions: [], warnings: [] });

try {
  await query(`create table public."${barrier}" (slot smallint primary key, ready boolean not null default false)`);
  await query(`grant select,update on public."${barrier}" to authenticated`);
  await query(`insert into public."${barrier}"(slot) values(1),(2)`);
  await query(`create function public."${wrapper}"(p_length numeric,p_remainder numeric) returns table(calculation_revision_id uuid,revision_number integer) language plpgsql security invoker as $fn$
    begin perform pg_sleep(0.5); return query select x.calculation_revision_id,x.revision_number from public.save_standalone_gutter_calculation(${lit(organizationId)},${lit(calculationId)},'DEMO párhuzamos eresz',
      jsonb_set(${lit(input(6000))}::jsonb,'{runs,0,lengthMm}',to_jsonb(p_length)),
      jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(${lit(output(6000))}::jsonb,'{gutterRuns,0,lengthMm}',to_jsonb(p_length)),'{gutterRuns,0,stockSections}','3'::jsonb),'{gutterRuns,0,remainderMm}',to_jsonb(p_remainder)),'{totals,gutterStockSections}','3'::jsonb),'{componentQuantities,0,quantity}','3'::jsonb),1) x; end $fn$`);
  await query(`grant execute on function public."${wrapper}"(numeric,numeric) to authenticated`);
  await query(`with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) select x.* from auth cross join lateral public.save_standalone_gutter_calculation(${lit(organizationId)},${lit(calculationId)},'DEMO párhuzamos eresz',${lit(input(6000))}::jsonb,${lit(output(6000))}::jsonb,0) x`, authenticatedDbUrl);
  const ready = (slot) => `with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) update public."${barrier}" set ready=true from auth where slot=${slot}`;
  await Promise.all([query(ready(1), authenticatedDbUrl), query(ready(2), authenticatedDbUrl)]);
  const readyCount = parse((await query(`select count(*)::integer as n from public."${barrier}" where ready`)).stdout).rows[0]?.n;
  if (readyCount !== 2) throw new Error(`authenticated sessions missed start barrier: ${readyCount}`);
  const calls = [[6500, 500], [7000, 1000]].map(([length, remainder]) =>
    query(`with auth as materialized(select set_config('request.jwt.claim.sub',${lit(ownerId)},false)) select x.* from auth cross join lateral public."${wrapper}"(${length},${remainder}) x`, authenticatedDbUrl));
  const attempts = await Promise.allSettled(calls);
  const fulfilled = attempts.filter((item) => item.status === "fulfilled");
  const rejected = attempts.filter((item) => item.status === "rejected");
  const stored = parse((await query(`select json_build_object('revisions',(select count(*) from public.calculation_revisions where calculation_id=${lit(calculationId)}),'max_revision',(select max(revision_number) from public.calculation_revisions where calculation_id=${lit(calculationId)}),'v1',(select input_snapshot #>> '{runs,0,lengthMm}' from public.calculation_revisions where calculation_id=${lit(calculationId)} and revision_number=1),'v2',(select input_snapshot #>> '{runs,0,lengthMm}' from public.calculation_revisions where calculation_id=${lit(calculationId)} and revision_number=2)) as result`)).stdout).rows[0]?.result;
  const conflictText = rejected[0]?.reason ? `${rejected[0].reason.stdout ?? ""} ${rejected[0].reason.stderr ?? ""} ${rejected[0].reason.message ?? ""}` : "";
  const staleConflict = conflictText.includes("időközben új revíziót kapott");
  if (fulfilled.length !== 1 || rejected.length !== 1 || !staleConflict || stored?.revisions !== 2 || stored?.max_revision !== 2 || stored?.v1 !== "6000" || !["6500", "7000"].includes(stored?.v2)) {
    const failures = rejected.map((item) => ({ stdout: item.reason?.stdout, stderr: item.reason?.stderr, message: item.reason?.message }));
    throw new Error(`expected one V2 and one stale conflict; success=${fulfilled.length}, conflict=${rejected.length}, staleConflict=${staleConflict}, stored=${JSON.stringify(stored)}, failures=${JSON.stringify(failures)}`);
  }
  console.log(JSON.stringify({ status: "PASS", independentAuthenticatedConnections: 2, v1Retained: stored.v1, v2Created: stored.v2, staleExpectedRevisionRejected: true, revisionCount: stored.revisions }));
} finally {
  await query(`do $cleanup$ begin drop function if exists public."${wrapper}"(numeric,numeric); update public.calculations set current_revision_id=null where id=${lit(calculationId)};
    alter table public.calculation_revisions disable trigger calculation_revisions_immutable; delete from public.calculation_revisions where calculation_id=${lit(calculationId)}; alter table public.calculation_revisions enable trigger calculation_revisions_immutable;
    delete from public.calculations where id=${lit(calculationId)}; drop table if exists public."${barrier}"; end $cleanup$`).catch((error) => console.error(`cleanup failed: ${error.stderr ?? error.message}`));
  await rm(tempDirectory, { recursive: true, force: true });
}

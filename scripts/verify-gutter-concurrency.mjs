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
const initialRevisionId = randomUUID();
const barrier = `__f96112_gutter_barrier_${randomUUID().replaceAll("-", "")}`;
const callWrapper = `__f96112_gutter_call_${randomUUID().replaceAll("-", "")}`;
const tempDirectory = await mkdtemp(join(tmpdir(), "f96112-gutter-concurrency-"));

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

function sqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function parseQueryJson(stdout) {
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) throw new Error(`database query returned no JSON: ${stdout}`);
  return JSON.parse(stdout.slice(jsonStart));
}

const initialInput = JSON.stringify({ gutterStockLengthMm: 4000, runs: [{ id: "initial", name: "Kezdő eresz", lengthMm: 8000, measurementSource: "demo", roofEdge: null, bracketSpacingMm: null }], downpipes: [], manualComponents: [] });
const output = JSON.stringify({ totals: { gutterStockSections: 2, downpipeStockSections: 0 }, gutterRuns: [], downpipeRuns: [], componentQuantities: [], assumptions: [], warnings: [] });

const setupStatements = [
  `create table public."${barrier}" (slot smallint primary key, ready boolean not null default false)`,
  `grant select, update on public."${barrier}" to authenticated`,
  `insert into public."${barrier}" (slot) values (1), (2)`,
  `insert into public.projects (id, organization_id, name, project_type, status, created_by) values (${sqlLiteral(projectId)}, ${sqlLiteral(organizationId)}, 'F9.6.1.1.2 concurrency fixture', 'gutter_work', 'draft', ${sqlLiteral(ownerId)})`,
  `insert into public.calculations (id, organization_id, project_id, calculator_type, display_name, status) values (${sqlLiteral(calculationId)}, ${sqlLiteral(organizationId)}, ${sqlLiteral(projectId)}, 'gutters.material-estimate', 'F9.6.1.1.2 concurrency fixture', 'current')`,
  `insert into public.calculation_revisions (id, organization_id, calculation_id, revision_number, input_schema_version, calculator_implementation_version, input_snapshot, output_snapshot, data_provenance, validation_status, warnings, created_by) values (${sqlLiteral(initialRevisionId)}, ${sqlLiteral(organizationId)}, ${sqlLiteral(calculationId)}, 1, '1.0.0', '1.0.0', ${sqlLiteral(initialInput)}::jsonb, ${sqlLiteral(output)}::jsonb, '{"test":"F9.6.1.1.2"}'::jsonb, 'verified', '[]'::jsonb, ${sqlLiteral(ownerId)})`,
  `update public.calculations set current_revision_id = ${sqlLiteral(initialRevisionId)} where id = ${sqlLiteral(calculationId)}`,
  `create function public."${callWrapper}"(p_length integer, p_label text) returns table(success boolean, sqlstate text, error_message text, revision_number integer) language plpgsql security invoker as $function$ begin return query select true, null::text, null::text, result.revision_number from public.save_gutter_material_calculation(${sqlLiteral(organizationId)}, ${sqlLiteral(projectId)}, p_label, jsonb_build_object('gutterStockLengthMm', 4000, 'runs', jsonb_build_array(jsonb_build_object('id', 'updated', 'name', p_label, 'lengthMm', p_length, 'measurementSource', 'demo', 'roofEdge', null, 'bracketSpacingMm', null)), 'downpipes', '[]'::jsonb, 'manualComponents', '[]'::jsonb), ${sqlLiteral(output)}::jsonb, '{"test":"F9.6.1.1.2"}'::jsonb, '[]'::jsonb, null, 1) as result; exception when others then return query select false, SQLSTATE, SQLERRM, null::integer; end; $function$`,
  `grant execute on function public."${callWrapper}"(integer, text) to authenticated`,
];

const markReady = (slot) => `update public."${barrier}" set ready = true where slot = ${slot}`;

const concurrentCall = (length, label) => `with auth as materialized (select set_config('request.jwt.claim.sub', ${sqlLiteral(ownerId)}, false), pg_sleep(0.5)) select call.* from auth cross join lateral public."${callWrapper}"(${length}, ${sqlLiteral(label)}) as call`;

let resultA;
let resultB;
try {
  for (const statement of setupStatements) await query(statement);
  await Promise.all([query(markReady(1), authenticatedDbUrl), query(markReady(2), authenticatedDbUrl)]);
  [resultA, resultB] = await Promise.allSettled([query(concurrentCall(9100, "Párhuzamos A"), authenticatedDbUrl), query(concurrentCall(9200, "Párhuzamos B"), authenticatedDbUrl)]);

  const fulfilled = [resultA, resultB].filter((result) => result.status === "fulfilled");
  const rejected = [resultA, resultB].filter((result) => result.status === "rejected");
  if (fulfilled.length !== 2 || rejected.length !== 0) {
    const diagnostics = [resultA, resultB].map((result) => result.status === "rejected" ? `${result.reason.stdout ?? ""}\n${result.reason.stderr ?? ""}` : result.value.stdout).join("\n--- connection boundary ---\n");
    throw new Error(`expected one success and one failure, got ${fulfilled.length} successes and ${rejected.length} failures:\n${diagnostics}`);
  }

  const concurrentRows = [resultA, resultB].map((result) => parseQueryJson(result.value.stdout).rows[0]);
  const winners = concurrentRows.filter((row) => row.success === true);
  const losers = concurrentRows.filter((row) => row.success === false);
  if (winners.length !== 1 || losers.length !== 1 || losers[0].sqlstate !== "40001") throw new Error(`unexpected concurrent RPC outcomes: ${JSON.stringify(concurrentRows)}`);

  const validation = await query(`
    select json_build_object(
      'revision_count', (select count(*) from public.calculation_revisions where calculation_id = ${sqlLiteral(calculationId)}),
      'max_revision', (select max(revision_number) from public.calculation_revisions where calculation_id = ${sqlLiteral(calculationId)}),
      'current_revision', (select current_revision_id from public.calculations where id = ${sqlLiteral(calculationId)}),
      'initial_length', (select input_snapshot #>> '{runs,0,lengthMm}' from public.calculation_revisions where id = ${sqlLiteral(initialRevisionId)}),
      'updated_lengths', (select json_agg(input_snapshot #>> '{runs,0,lengthMm}' order by revision_number) from public.calculation_revisions where calculation_id = ${sqlLiteral(calculationId)})
    ) as result;
  `);
  const parsed = parseQueryJson(validation.stdout).rows[0].result;
  if (parsed.revision_count !== 2 || parsed.max_revision !== 2 || parsed.initial_length !== "8000" || parsed.updated_lengths?.length !== 2 || parsed.updated_lengths[0] !== "8000" || !["9100", "9200"].includes(parsed.updated_lengths[1])) {
    throw new Error(`revision integrity assertion failed: ${JSON.stringify(parsed)}`);
  }
  console.log(JSON.stringify({ status: "PASS", independentConnections: 2, successfulRevision: 2, conflictSqlState: "40001", revisionCount: parsed.revision_count, maxRevision: parsed.max_revision, initialLength: parsed.initial_length, successfulLength: parsed.updated_lengths[1], committedLengths: parsed.updated_lengths }));
} finally {
  const cleanup = `do $$ begin
    drop function if exists public."${callWrapper}"(integer, text);
    update public.calculations set current_revision_id = null where id = ${sqlLiteral(calculationId)};
    delete from public.calculation_dependencies where downstream_calculation_revision_id in (select id from public.calculation_revisions where calculation_id = ${sqlLiteral(calculationId)});
    alter table public.calculation_revisions disable trigger calculation_revisions_immutable;
    delete from public.calculation_revisions where calculation_id = ${sqlLiteral(calculationId)};
    alter table public.calculation_revisions enable trigger calculation_revisions_immutable;
    delete from public.calculations where id = ${sqlLiteral(calculationId)};
    delete from public.projects where id = ${sqlLiteral(projectId)};
    drop table if exists public."${barrier}";
  end $$;`;
  await query(cleanup).catch((error) => console.error(`cleanup failed: ${error.stdout ?? ""}\n${error.stderr ?? error.message}`));
  await rm(tempDirectory, { recursive: true, force: true });
}

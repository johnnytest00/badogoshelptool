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
const actorId = "00000000-0000-4000-8000-000000000001";
const measurementId = randomUUID();
const temp = await mkdtemp(join(tmpdir(), "field-survey-concurrency-"));
let surveyId = null;
const lit = (value) => `'${String(value).replaceAll("'", "''")}'`;
const parse = (stdout) => JSON.parse(stdout.slice(stdout.indexOf("{")));

async function query(sql) {
  const file = join(temp, `${randomUUID()}.sql`);
  await writeFile(file, sql, "utf8");
  try {
    return await execFileAsync("supabase", ["db", "query", "--local", "--output-format", "json", "--file", file], {
      cwd: root, timeout: 30_000, maxBuffer: 1_000_000,
      env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
    });
  } finally { await rm(file, { force: true }); }
}

try {
  const createSql = `with actor as materialized (select set_config('request.jwt.claim.sub',${lit(actorId)},false) as configured)
    select saved.* from actor cross join lateral public.save_field_survey(null,${lit(organizationId)},null,'gutter',
      jsonb_build_array(jsonb_build_object('id',${lit(measurementId)},'label','DEMO ereszszakasz','value',8.5,'unit','m')),
      'DEMO concurrency base',0) saved where actor.configured is not null;`;
  const created = parse((await query(createSql)).stdout).rows[0];
  surveyId = created?.survey_id;
  if (!surveyId || Number(created.version) !== 1) throw new Error(`Initial survey create failed: ${JSON.stringify(created)}`);

  const update = (value, note) => `with pause as materialized (select pg_sleep(0.25)),
    actor as materialized (select set_config('request.jwt.claim.sub',${lit(actorId)},false) as configured from pause)
    select saved.* from actor cross join lateral public.save_field_survey(${lit(surveyId)},${lit(organizationId)},null,'gutter',
      jsonb_build_array(jsonb_build_object('id',${lit(measurementId)},'label','DEMO ereszszakasz','value',${value},'unit','m')),
      ${lit(note)},1) saved where actor.configured is not null;`;
  const outcomes = await Promise.allSettled([query(update(9.25, "DEMO versenyző A")), query(update(10.5, "DEMO versenyző B"))]);
  const successful = outcomes.filter((result) => result.status === "fulfilled");
  const failed = outcomes.filter((result) => result.status === "rejected");
  const rejectedText = failed.length ? `${failed[0].reason?.stdout ?? ""} ${failed[0].reason?.stderr ?? failed[0].reason}` : "";
  if (successful.length !== 1 || failed.length !== 1 || !rejectedText.includes("Survey changed since it was opened")) {
    throw new Error(`Expected one V2 update and one 40001 conflict from independent DB sessions: ${JSON.stringify(outcomes.map((result) => result.status === "fulfilled" ? parse(result.value.stdout).rows[0] : `${result.reason?.stdout ?? ""} ${result.reason?.stderr ?? result.reason}`))}`);
  }
  const final = parse((await query(`select version, measurements->0->>'value' value from public.field_surveys where id=${lit(surveyId)};`)).stdout).rows[0];
  if (Number(final.version) !== 2 || !["9.25", "10.5"].includes(final.value)) throw new Error(`Unexpected persisted result: ${JSON.stringify(final)}`);
  console.log(JSON.stringify({ status: "PASS", independentDatabaseConnections: 2, updated: 1, conflicted: 1, finalVersion: Number(final.version) }));
} finally {
  if (surveyId) await query(`delete from public.field_surveys where id=${lit(surveyId)};`).catch(() => {});
  await rm(temp, { recursive: true, force: true });
}

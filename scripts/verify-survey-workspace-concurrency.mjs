/* global console, process, setTimeout */
import { URL } from "node:url";
import { Client } from "pg";
import { randomUUID } from "node:crypto";
const dbUrl = process.env.LOCAL_SURVEY_TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!new URL(dbUrl).hostname.match(/^(127\.0\.0\.1|localhost)$/)) throw new Error("Local DB required");
const actor = "00000000-0000-4000-8000-000000000001", org = "00000000-0000-4000-8000-000000000010";
const surveyId = randomUUID(), sectionId = randomUUID(), measurementId = randomUUID();
const first = new Client({ connectionString: dbUrl, application_name: "DEMO survey concurrency first" });
const second = new Client({ connectionString: dbUrl, application_name: "DEMO survey concurrency second" });
const monitor = new Client({ connectionString: dbUrl, application_name: "DEMO survey concurrency monitor" });
const section = (notes) => [{ id: sectionId, name: "DEMO konkurencia", workType: "gutter", measurements: [{ id: measurementId, label: "DEMO eresz", value: 8.5, unit: "m", semanticType: "gutter_run_length" }], photoIds: [], notes }];
const saveArgs = (notes, version) => [surveyId, org, null, "gutter", JSON.stringify(section(notes)[0].measurements), "DEMO F9.7.9 concurrency", version, JSON.stringify(section(notes))];
const saveSql = "select * from public.save_field_survey_workspace($1,$2,$3,$4,$5,$6,$7,$8)";
let lockEvidence = 0;
async function transaction(client) {
  await client.query("begin"); await client.query("set local role authenticated"); await client.query("select set_config('request.jwt.claim.sub',$1,true)", [actor]);
}
async function contest(sql, argsA, argsB, expectConflict = false) {
  await transaction(first); await transaction(second);
  const a = await first.query(sql, argsA);
  const bPromise = second.query(sql, argsB).then((result) => ({ result }), (error) => ({ error }));
  await new Promise((resolve) => setTimeout(resolve, 100));
  const blocked = await monitor.query("select cardinality(pg_blocking_pids($1)) blockers", [second.processID]);
  if (blocked.rows[0].blockers < 1) throw new Error("Second transaction did not actually contend on a held database lock");
  lockEvidence++;
  await first.query("commit");
  const b = await bPromise;
  if (expectConflict) { if (b.error?.code !== "40001") throw new Error(`Expected 40001, got ${b.error?.code}`); await second.query("rollback"); }
  else { if (b.error) throw b.error; await second.query("commit"); }
  return [a.rows[0], b.result?.rows[0]];
}
try {
  await Promise.all([first.connect(), second.connect(), monitor.connect()]);
  const created = await contest(saveSql, saveArgs("DEMO V1", 0), saveArgs("DEMO V1", 0));
  if (created[0].survey_id !== created[1].survey_id || created[1].version !== 1) throw new Error("Create retry duplicated survey");
  await contest(saveSql, saveArgs("DEMO V2 A", 1), saveArgs("DEMO V2 B", 1), true);
  const revision = await monitor.query("select id from public.field_survey_revisions where survey_id=$1 and version=2", [surveyId]);
  const followSql = "select * from public.create_field_survey_followup($1,$2,$3,$4,$5)";
  const project = await contest(followSql, [surveyId, revision.rows[0].id, "project", null, "DEMO concurrency project"], [surveyId, revision.rows[0].id, "project", null, "DEMO concurrency project"]);
  if (project[0].project_id !== project[1].project_id) throw new Error("Duplicate project");
  const quote = await contest(followSql, [surveyId, revision.rows[0].id, "quotation", project[0].project_id, "DEMO concurrency quotation"], [surveyId, revision.rows[0].id, "quotation", project[0].project_id, "DEMO concurrency quotation"]);
  if (quote[0].quotation_id !== quote[1].quotation_id) throw new Error("Duplicate quotation");
  const calcId = randomUUID(), calcRevisionId = randomUUID();
  await monitor.query("insert into public.calculations(id,organization_id,created_by,ownership_scope,calculator_type,display_name) values($1,$2,$3,'standalone','gutters.material-estimate','DEMO concurrency identity fixture')", [calcId,org,actor]);
  await monitor.query("insert into public.calculation_revisions(id,organization_id,calculation_id,revision_number,input_schema_version,calculator_implementation_version,created_by) values($1,$2,$3,1,'1','1',$4)", [calcRevisionId,org,calcId,actor]);
  const linked = await contest("select public.link_field_survey_calculation($1,$2,$3,$4,$5) link_id", [surveyId,revision.rows[0].id,sectionId,calcId,calcRevisionId], [surveyId,revision.rows[0].id,sectionId,calcId,calcRevisionId]);
  if (linked[0].link_id !== linked[1].link_id) throw new Error("Duplicate calculation link");
  const count = await monitor.query("select (select count(*) from public.field_survey_followups where survey_id=$1) links,(select count(*) from public.field_survey_revisions where survey_id=$1) revisions", [surveyId]);
  if (count.rows[0].links !== "2" || count.rows[0].revisions !== "2") throw new Error("Unexpected persisted record count");
  console.log(JSON.stringify({ status: "PASS", authenticatedConnections: 2, observedLockContentions: lockEvidence, staleConflict: "40001", revisions: 2, projects: 1, quotations: 1, surveyId }));
} finally {
  await Promise.allSettled([first.end(), second.end(), monitor.end()]);
}

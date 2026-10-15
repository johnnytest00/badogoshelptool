/* global console, process */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_LOCAL_MATERIAL_PREPARATION_VALIDATION !== "1") throw new Error("Set RUN_LOCAL_MATERIAL_PREPARATION_VALIDATION=1 to run against local Supabase.");
const envText = execFileSync("supabase", ["status", "--output", "env"], { encoding: "utf8", env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } });
const status = Object.fromEntries(envText.split("\n").flatMap((line) => {
  const match = line.match(/^(?:export )?([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
}));
if (!status.API_URL?.startsWith("http://127.0.0.1:") || !status.PUBLISHABLE_KEY || !status.SERVICE_ROLE_KEY) throw new Error("Local Supabase is required.");
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const runId = randomUUID();
const organizationId = randomUUID();
const projectId = randomUUID();
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const check = (condition, message) => assert.ok(condition, message);
async function createUser(label) {
  const email = `preparation-${label}-${runId}@local.test`;
  const password = `Local-${randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { validation_fixture: "DEMO F9.8.1" } });
  if (error) throw error;
  const client = createClient(status.API_URL, status.PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("Local Auth session missing.");
  return { id: data.user.id, client };
}
const owner = await createUser("owner");
const outsider = await createUser("outsider");
const { error: organizationError } = await admin.from("organizations").insert({ id: organizationId, name: `DEMO beszerzés ${runId}` });
if (organizationError) throw organizationError;
const { error: projectError } = await admin.from("projects").insert({ id: projectId, organization_id: organizationId, name: `DEMO tetőfelújítás ${runId}`, created_by: owner.id });
if (projectError) throw projectError;
const { error: memberError } = await admin.from("organization_members").insert({ organization_id: organizationId, user_id: owner.id, role: "owner" });
if (memberError) throw memberError;

const listRequestKey = randomUUID();
const item = (description, quantity) => ({
  id: randomUUID(), category: "workshop", status: "prepare", description, quantity: String(quantity), unit: "piece",
  sourceItemIds: [], manualTechnicalData: { profileDescription: "DEMO kézi próba", lengthMm: "1200", materialSpec: "DEMO" },
  supplier: "", notes: "",
});
const createArgs = {
  p_organization_id: organizationId, p_project_id: projectId, p_list_id: null, p_name: "DEMO előkészítés",
  p_source_takeoff_ids: [], p_items: [item("DEMO kézi műhelytétel", 2)], p_expected_version: 0, p_request_key: listRequestKey,
};
const [createdA, createdB] = await Promise.all([owner.client.rpc("save_material_preparation_revision", createArgs), owner.client.rpc("save_material_preparation_revision", createArgs)]);
if (createdA.error) throw createdA.error;
if (createdB.error) throw createdB.error;
const initial = createdA.data[0];
check(createdA.data[0].list_id === createdB.data[0].list_id && createdA.data[0].revision_id === createdB.data[0].revision_id, "Authenticated same-key retries reuse one list and revision.");
const ownerRead = await owner.client.from("material_preparation_lists").select("id, version").eq("id", initial.list_id);
if (ownerRead.error) throw ownerRead.error;
check(ownerRead.data.length === 1 && ownerRead.data[0].version === 1, "Organization member can read saved preparation list through RLS.");
const outsiderRead = await outsider.client.from("material_preparation_lists").select("id").eq("id", initial.list_id);
if (outsiderRead.error) throw outsiderRead.error;
check(outsiderRead.data.length === 0, "Nonmember cannot read another organization’s list through RLS.");
const directInsert = await owner.client.from("material_preparation_lists").insert({ organization_id: organizationId, project_id: projectId, name: "DEMO direct", version: 0, creation_request_key: randomUUID(), created_by: owner.id }).select("id");
check(directInsert.error?.code === "42501", "Authenticated client cannot bypass revision RPC with a direct parent insert.");
const deniedRpc = await outsider.client.rpc("save_material_preparation_revision", { ...createArgs, p_request_key: randomUUID(), p_items: [item("DEMO illetéktelen", 1)] });
check(deniedRpc.error?.code === "42501", "Nonmember cannot create a preparation list through the RPC.");

const first = new Client({ connectionString: databaseUrl, application_name: "DEMO preparation concurrency first" });
const second = new Client({ connectionString: databaseUrl, application_name: "DEMO preparation concurrency second" });
try {
  await Promise.all([first.connect(), second.connect()]);
  for (const client of [first, second]) {
    await client.query("set role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,false)", [owner.id]);
  }
  const updateArgs = (description) => [organizationId, projectId, initial.list_id, "DEMO előkészítés", [], JSON.stringify([item(description, 3)]), 1, randomUUID()];
  const updateSql = "select * from public.save_material_preparation_revision($1,$2,$3,$4,$5,$6::jsonb,$7,$8)";
  const updates = await Promise.allSettled([first.query(updateSql, updateArgs("DEMO versengő A")), second.query(updateSql, updateArgs("DEMO versengő B"))]);
  const successes = updates.filter((result) => result.status === "fulfilled");
  const conflicts = updates.filter((result) => result.status === "rejected" && result.reason?.code === "40001");
  check(successes.length === 1 && conflicts.length === 1, "Concurrent authenticated updates produce one V2 and one stale-version conflict.");
} finally {
  await Promise.allSettled([first.end(), second.end()]);
}
const { data: revisions, error: revisionError } = await admin.from("material_preparation_revisions").select("revision_number").eq("list_id", initial.list_id).order("revision_number");
if (revisionError) throw revisionError;
check(revisions.length === 2 && revisions[0].revision_number === 1 && revisions[1].revision_number === 2, "Database retains exactly two immutable revisions after the conflict.");
console.log(JSON.stringify({ status: "PASS", authRlsChecks: 4, concurrentUpdates: "one V2, one 40001", persistedRevisions: revisions.length, localDemoListId: initial.list_id }));

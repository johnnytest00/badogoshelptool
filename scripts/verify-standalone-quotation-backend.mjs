/* global console, process, setTimeout */

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_LOCAL_STANDALONE_QUOTATION_VALIDATION !== "1") {
  throw new Error("Set RUN_LOCAL_STANDALONE_QUOTATION_VALIDATION=1 to run against local Supabase.");
}

const envText = execFileSync("supabase", ["status", "--output", "env"], {
  encoding: "utf8",
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
});
const status = Object.fromEntries(envText.split("\n").flatMap((line) => {
  const match = line.match(/^(?:export )?([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
}));
const url = status.API_URL;
if (!url?.startsWith("http://127.0.0.1:") || !status.PUBLISHABLE_KEY || !status.SERVICE_ROLE_KEY) {
  throw new Error("Refusing to run unless Supabase status provides a local URL and keys.");
}

const admin = createClient(url, status.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const publicKey = status.PUBLISHABLE_KEY;
const runId = randomUUID();
const dbContainer = "supabase_db_badogos-helptool";
const organizationId = randomUUID();
let passed = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  passed += 1;
  console.log(`PASS ${passed}: ${message}`);
};
const createAuthenticatedUser = async (label) => {
  const email = `standalone-${label}-${runId}@local.test`;
  const password = `Local-${randomUUID()}!`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { validation_fixture: "DEMO F9.7.6.6.1a" },
  });
  if (createError) throw createError;
  const client = createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError || !signedIn.session) throw signInError ?? new Error("Local Auth did not issue a session.");
  return { id: created.user.id, client };
};
const createFixture = async (table, row) => {
  const { data, error } = await admin.from(table).insert(row).select("*").single();
  if (error) throw error;
  return data;
};
const rpc = async (client, operationId, quotationId, expectedVersion, lines, name = "DEMO önálló próba", targetOrganizationId = organizationId) => client.rpc(
  "save_standalone_quotation_draft",
  {
    p_organization_id: targetOrganizationId,
    p_operation_id: operationId,
    p_quotation_id: quotationId,
    p_name: name,
    p_client_id: null,
    p_lines: lines,
    p_expected_version: expectedVersion,
  },
);
const laborLines = [
  { type: "LABOR", description: "DEMO bádogos munkadíj", quantity: "2.5", unit: "óra", unitPrice: "5.25", priceClass: "net" },
  { type: "OTHER", description: "DEMO nulla összegű tétel", quantity: "1", unit: "db", unitPrice: "0.00", priceClass: "net" },
];
const dbQuery = (sql) => execFileSync("docker", [
  "exec", dbContainer, "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-c", sql,
], { encoding: "utf8" }).trim();
const acquireLock = async (sql) => {
  const child = spawn("docker", ["exec", "-i", dbContainer, "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  let errors = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
  child.stdin.write(`begin;\n${sql}\nselect 'LOCK_HELD';\n`);
  const started = Date.now();
  while (!output.includes("LOCK_HELD") && Date.now() - started < 5000) {
    if (child.exitCode !== null) throw new Error(errors || `psql exited ${child.exitCode}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!output.includes("LOCK_HELD")) {
    child.kill("SIGTERM");
    throw new Error(`Could not acquire the test lock: ${errors}`);
  }
  return {
    async release() {
      child.stdin.write("rollback;\nselect 'LOCK_RELEASED';\n\\q\n");
      const releaseStarted = Date.now();
      while (!output.includes("LOCK_RELEASED") && Date.now() - releaseStarted < 5000) await new Promise((resolve) => setTimeout(resolve, 25));
      child.kill("SIGTERM");
      if (!output.includes("LOCK_RELEASED")) throw new Error(`Test lock release failed: ${errors}`);
    },
  };
};
const waitForBackendWaiters = async (minimum) => {
  const started = Date.now();
  let observed = 0;
  while (Date.now() - started < 7000) {
    observed = Number(dbQuery("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like '%save_standalone_quotation_draft%';"));
    if (observed >= minimum) return observed;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return observed;
};

const first = await createAuthenticatedUser("owner");
const second = await createAuthenticatedUser("member");
await createFixture("organizations", { id: organizationId, name: `DEMO standalone validation ${runId}` });
const foreignOrganizationId = randomUUID();
await createFixture("organizations", { id: foreignOrganizationId, name: `DEMO foreign validation ${runId}` });
const { data: acceptedProjectQuote, error: acceptedQuoteError } = await admin.from("quotations")
  .select("id,organization_id,project_id,status,version,finalized_revision_id")
  .eq("ownership_scope", "project").eq("status", "accepted").limit(1).maybeSingle();
if (acceptedQuoteError) throw acceptedQuoteError;
const memberships = [
  { organization_id: organizationId, user_id: first.id, role: "owner" },
  { organization_id: organizationId, user_id: second.id, role: "member" },
  { organization_id: "00000000-0000-4000-8000-000000000010", user_id: first.id, role: "member" },
  { organization_id: "00000000-0000-4000-8000-000000000010", user_id: second.id, role: "member" },
];
if (acceptedProjectQuote && acceptedProjectQuote.organization_id !== "00000000-0000-4000-8000-000000000010") {
  memberships.push(
    { organization_id: acceptedProjectQuote.organization_id, user_id: first.id, role: "member" },
    { organization_id: acceptedProjectQuote.organization_id, user_id: second.id, role: "member" },
  );
}
const { error: membershipError } = await admin.from("organization_members").upsert(memberships, { onConflict: "organization_id,user_id" });
if (membershipError) throw membershipError;
const concurrentOwner = createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: ownerSession, error: ownerSessionError } = await first.client.auth.getSession();
if (ownerSessionError || !ownerSession.session) throw ownerSessionError ?? new Error("Owner session missing.");
const { error: restoreError } = await concurrentOwner.auth.setSession({
  access_token: ownerSession.session.access_token,
  refresh_token: ownerSession.session.refresh_token,
});
if (restoreError) throw restoreError;

// A. Hold the exact advisory key while two real authenticated requests enter the RPC.
const createOperationId = randomUUID();
const lockText = `${organizationId}:${first.id}:${createOperationId}`;
const createLock = await acquireLock(`select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('${lockText}',0));`);
const createRequests = [
  rpc(first.client, createOperationId, null, 0, laborLines),
  rpc(concurrentOwner, createOperationId, null, 0, laborLines),
];
try {
  const waiters = await waitForBackendWaiters(2);
  check(waiters >= 2, `same-operation retry had ${waiters} simultaneous PostgreSQL waiters`);
} finally {
  await createLock.release();
}
const creationResults = await Promise.all(createRequests);
for (const result of creationResults) if (result.error) throw result.error;
const firstSave = creationResults[0].data[0];
check(creationResults.every((result) => result.data[0].quotation_id === firstSave.quotation_id), "concurrent retry reused one quotation ID");
check(creationResults.every((result) => result.data[0].revision_id === firstSave.revision_id), "concurrent retry reused one revision ID");
check(creationResults.filter((result) => result.data[0].revision_created).length === 1, "concurrent retry created exactly one revision");

const { data: v1 } = await first.client.rpc("get_standalone_quotation_revision", {
  p_organization_id: organizationId, p_quotation_id: firstSave.quotation_id, p_revision_id: null,
});
check(v1?.[0]?.revision_number === 1 && Number(v1[0].subtotal) === 13.13, "authenticated owner reads V1 and DB half-up subtotal is HUF 13.13");
const { data: ownList, error: ownListError } = await first.client.from("quotations").select("id")
  .eq("organization_id", organizationId).eq("ownership_scope", "standalone");
if (ownListError) throw ownListError;
check(ownList.length === 1 && ownList[0].id === firstSave.quotation_id, "owner list is scoped to own standalone quotations");
const { data: otherList, error: otherListError } = await second.client.from("quotations").select("id")
  .eq("organization_id", organizationId).eq("ownership_scope", "standalone");
if (otherListError) throw otherListError;
check(otherList.length === 0, "same-organization noncreator cannot list creator standalone quote");
const otherRead = await second.client.rpc("get_standalone_quotation_revision", {
  p_organization_id: organizationId, p_quotation_id: firstSave.quotation_id, p_revision_id: firstSave.revision_id,
});
check(otherRead.error?.code === "23503", "same-organization noncreator cannot read historical revision");
const otherWrite = await rpc(second.client, randomUUID(), firstSave.quotation_id, 1, laborLines);
check(otherWrite.error?.code === "23503", "same-organization noncreator cannot save creator quote");

const directInsert = await first.client.from("quotations").insert({
  organization_id: organizationId, project_id: null, ownership_scope: "standalone", name: "DEMO forged",
  created_by: first.id,
}).select("id");
check(directInsert.error?.code === "42501", "direct standalone parent insert is denied despite authenticated creator identity");
const { data: directUpdate, error: directUpdateError } = await first.client.from("quotations").update({ name: "DEMO forged" })
  .eq("id", firstSave.quotation_id).select("id");
if (directUpdateError) throw directUpdateError;
check(directUpdate.length === 0, "direct standalone parent update is denied by RLS");
const forgedLedger = await first.client.from("standalone_quotation_operations").insert({
  organization_id: organizationId, operation_id: randomUUID(), created_by: first.id,
  request_snapshot: {}, quotation_id: firstSave.quotation_id, revision_id: firstSave.revision_id,
});
check(forgedLedger.error?.code === "42501", "authenticated user cannot forge idempotency ledger row");
const forgedRevision = await first.client.from("quotation_revisions").insert({
  organization_id: organizationId, quotation_id: firstSave.quotation_id, revision_number: 2,
  currency: "HUF", price_class: "net", input_snapshot: {}, line_items_snapshot: [], subtotal: 0,
  totals_snapshot: {}, created_by: first.id,
});
check(forgedRevision.error?.code === "42501", "authenticated user cannot insert standalone revision directly");
const forgedCreator = await first.client.from("quotations").insert({
  organization_id: organizationId, project_id: null, ownership_scope: "standalone", name: "DEMO forged creator",
  created_by: second.id,
});
check(forgedCreator.error?.code === "42501", "forged standalone creator is rejected");
const foreignOrganizationWrite = await rpc(first.client, randomUUID(), null, 0, laborLines, "DEMO cross-organization", foreignOrganizationId);
check(foreignOrganizationWrite.error?.code === "42501", "cross-organization standalone write is denied");

const changedPayload = await rpc(first.client, createOperationId, null, 0, [], "DEMO altered retry");
check(changedPayload.error?.code === "22023", "same operation ID with changed payload is rejected");
const distinctOperation = await rpc(first.client, randomUUID(), null, 0, laborLines, "DEMO distinct operation");
if (distinctOperation.error) throw distinctOperation.error;
check(distinctOperation.data[0].quotation_id !== firstSave.quotation_id, "different legitimate operation ID creates a distinct draft");

const v2LinesA = [{ type: "LABOR", description: "DEMO V2 A", quantity: "1", unit: "óra", unitPrice: "22.22", priceClass: "net" }];
const v2LinesB = [{ type: "LABOR", description: "DEMO V2 B", quantity: "1", unit: "óra", unitPrice: "33.33", priceClass: "net" }];
const v2Lock = await acquireLock(`select id from public.quotations where id='${firstSave.quotation_id}' for update;`);
const v2Requests = [
  rpc(first.client, randomUUID(), firstSave.quotation_id, 1, v2LinesA, "DEMO concurrent V2 A"),
  rpc(concurrentOwner, randomUUID(), firstSave.quotation_id, 1, v2LinesB, "DEMO concurrent V2 B"),
];
try {
  const waiters = await waitForBackendWaiters(2);
  check(waiters >= 2, `same-V1 update had ${waiters} simultaneous PostgreSQL waiters`);
} finally {
  await v2Lock.release();
}
const v2Results = await Promise.all(v2Requests);
check(v2Results.filter((result) => !result.error).length === 1, "exactly one concurrent V2 save succeeds");
check(v2Results.filter((result) => result.error?.code === "40001").length === 1, "losing concurrent V2 save receives stale-version 40001");
const { data: oldRevision } = await first.client.rpc("get_standalone_quotation_revision", {
  p_organization_id: organizationId, p_quotation_id: firstSave.quotation_id, p_revision_id: firstSave.revision_id,
});
const { data: currentRevision } = await first.client.rpc("get_standalone_quotation_revision", {
  p_organization_id: organizationId, p_quotation_id: firstSave.quotation_id, p_revision_id: null,
});
check(oldRevision?.[0]?.revision_number === 1 && Number(oldRevision[0].subtotal) === 13.13, "V1 snapshot remains unchanged after concurrent V2");
check(currentRevision?.[0]?.revision_number === 2, "current revision advances once to V2");

const product = await createFixture("material_products", {
  organization_id: organizationId, category: "other", name: `DEMO validation product ${runId}`,
  status: "active", data_provenance: "demo", created_by: first.id,
});
const variant = await createFixture("material_variants", {
  organization_id: organizationId, product_id: product.id, name: `DEMO validation variant ${runId}`,
  purchasing_unit: "piece", data_provenance: "demo", created_by: first.id,
});
const price = await createFixture("material_prices", {
  organization_id: organizationId, variant_id: variant.id, amount: 12.5, currency: "HUF",
  purchasing_unit: "piece", price_kind: "net", effective_date: new Date().toISOString().slice(0, 10),
  data_provenance: "demo", created_by: first.id,
});
const catalogLines = [
  { type: "MATERIAL", description: "DEMO katalogusanyag", quantity: "2.5", unit: "piece", unitPrice: "12.50", priceClass: "net", variantId: variant.id, priceId: price.id },
  ...laborLines,
];
const catalogSave = await rpc(first.client, randomUUID(), null, 0, catalogLines, "DEMO catalog and labor");
if (catalogSave.error) throw catalogSave.error;
check(catalogSave.data[0].totals_snapshot.subtotal === "44.38"
  && catalogSave.data[0].totals_snapshot.priceClass === "net"
  && !("vatAmount" in catalogSave.data[0].totals_snapshot), "catalog, LABOR, OTHER, decimal quantity, zero, and explicit net HUF totals are server-calculated without VAT");
const catalogRevisionId = catalogSave.data[0].revision_id;
const { data: catalogRevision } = await first.client.rpc("get_standalone_quotation_revision", {
  p_organization_id: organizationId, p_quotation_id: catalogSave.data[0].quotation_id, p_revision_id: catalogRevisionId,
});
check(Number(catalogRevision?.[0]?.line_items_snapshot?.[0]?.materialSnapshot?.price?.amount) === 12.5, "selected catalog price is stored in immutable revision snapshot");
const { error: laterPriceError } = await admin.from("material_prices").insert({
  organization_id: organizationId, variant_id: variant.id, amount: 19.99, currency: "HUF",
  purchasing_unit: "piece", price_kind: "net", effective_date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  data_provenance: "demo", created_by: first.id,
});
if (laterPriceError) throw laterPriceError;
const { data: historicalCatalogRevision } = await first.client.rpc("get_standalone_quotation_revision", {
  p_organization_id: organizationId, p_quotation_id: catalogSave.data[0].quotation_id, p_revision_id: catalogRevisionId,
});
check(Number(historicalCatalogRevision?.[0]?.line_items_snapshot?.[0]?.materialSnapshot?.price?.amount) === 12.5, "later catalog price cannot mutate historical price snapshot");
const manualCatalogOverride = await rpc(first.client, randomUUID(), null, 0, [{
  type: "MATERIAL", description: "DEMO kézi ár", quantity: "1", unit: "piece", unitPrice: "14.50",
  priceClass: "net", variantId: variant.id,
}], "DEMO manual material override");
if (manualCatalogOverride.error) throw manualCatalogOverride.error;
const { data: overrideRevision } = await first.client.rpc("get_standalone_quotation_revision", {
  p_organization_id: organizationId, p_quotation_id: manualCatalogOverride.data[0].quotation_id,
  p_revision_id: manualCatalogOverride.data[0].revision_id,
});
check(overrideRevision?.[0]?.line_items_snapshot?.[0]?.materialSnapshot?.manualPriceOverride === true, "manual catalog price override is explicitly snapshotted");
const foreignCatalog = await createFixture("material_products", {
  organization_id: foreignOrganizationId, category: "other", name: `DEMO foreign product ${runId}`,
  status: "active", data_provenance: "demo", created_by: first.id,
});
const foreignVariant = await createFixture("material_variants", {
  organization_id: foreignOrganizationId, product_id: foreignCatalog.id, name: `DEMO foreign variant ${runId}`,
  purchasing_unit: "piece", data_provenance: "demo", created_by: first.id,
});
const unauthorizedCatalog = await rpc(first.client, randomUUID(), null, 0, [{
  type: "MATERIAL", description: "DEMO foreign catalog", quantity: "1", unit: "piece", unitPrice: "12.50",
  priceClass: "net", variantId: foreignVariant.id,
}], "DEMO unauthorized catalog");
check(unauthorizedCatalog.error?.code === "23503", "catalog item from another organization is denied");

const invalidCases = [
  [{ type: "LABOR", description: "DEMO negative", quantity: "1", unit: "óra", unitPrice: "-1", priceClass: "net" }, "negative unit price"],
  [{ type: "LABOR", description: "DEMO missing unit", quantity: "1", unit: "", unitPrice: "1.00", priceClass: "net" }, "missing unit"],
  [{ type: "LABOR", description: "DEMO precision", quantity: "1", unit: "óra", unitPrice: "1.001", priceClass: "net" }, "excess unit-price precision"],
  [{ type: "LABOR", description: "DEMO quantity precision", quantity: "0.0000001", unit: "óra", unitPrice: "1.00", priceClass: "net" }, "excess quantity precision"],
  [{ type: "LABOR", description: "DEMO maximum", quantity: "1000000000000", unit: "óra", unitPrice: "1.00", priceClass: "net" }, "excessive quantity"],
  [{ type: "LABOR", description: "DEMO amount maximum", quantity: "1", unit: "óra", unitPrice: "1000000000000000000.00", priceClass: "net" }, "excessive unit price"],
  [{ type: "MATERIAL", description: "DEMO wrong catalog unit", quantity: "1", unit: "box", unitPrice: "12.50", priceClass: "net", variantId: variant.id }, "catalog unit mismatch"],
];
for (const [line, label] of invalidCases) {
  const result = await rpc(first.client, randomUUID(), null, 0, [line]);
  check(result.error?.code === "22023", `${label} is rejected by the database`);
}
const mixedPriceClasses = await rpc(first.client, randomUUID(), null, 0, [
  { type: "LABOR", description: "DEMO net", quantity: "1", unit: "óra", unitPrice: "1.00", priceClass: "net" },
  { type: "OTHER", description: "DEMO gross", quantity: "1", unit: "db", unitPrice: "1.00", priceClass: "gross" },
]);
check(mixedPriceClasses.error?.code === "22023", "net and gross line classes cannot be mixed");

const projectSave = await first.client.rpc("save_quotation_draft", {
  p_organization_id: "00000000-0000-4000-8000-000000000010",
  p_project_id: "00000000-0000-4000-8000-000000000030",
  p_quotation_id: null,
  p_name: `DEMO project quotation regression ${runId}`,
  p_client_id: "00000000-0000-4000-8000-000000000020",
  p_currency: "HUF",
  p_input_snapshot: { name: `DEMO project quotation regression ${runId}`, version: 1 },
  p_line_items_snapshot: [{ type: "LABOR", description: "DEMO projektmunka", quantity: "1", unit: "óra", unitPrice: "5.25", priceClass: "net" }],
  p_totals_snapshot: { priceClass: "net", subtotal: "5.25" },
  p_subtotal: 5.25,
  p_expected_version: 0,
});
if (projectSave.error) throw projectSave.error;
const projectQuoteId = projectSave.data[0].quotation_id;
const { data: projectScope, error: projectScopeError } = await first.client.from("quotations").select("ownership_scope,status")
  .eq("id", projectQuoteId).single();
if (projectScopeError) throw projectScopeError;
check(projectScope.ownership_scope === "project" && projectScope.status === "draft", "authenticated project quote creation retains project scope and draft state");
const projectV2 = await first.client.rpc("save_quotation_draft", {
  p_organization_id: "00000000-0000-4000-8000-000000000010",
  p_project_id: "00000000-0000-4000-8000-000000000030",
  p_quotation_id: projectQuoteId,
  p_name: `DEMO project quotation regression ${runId} V2`,
  p_client_id: "00000000-0000-4000-8000-000000000020",
  p_currency: "HUF",
  p_input_snapshot: { name: `DEMO project quotation regression ${runId} V2`, version: 2 },
  p_line_items_snapshot: [{ type: "LABOR", description: "DEMO projektmunka", quantity: "1", unit: "óra", unitPrice: "9.99", priceClass: "net" }],
  p_totals_snapshot: { priceClass: "net", subtotal: "9.99" },
  p_subtotal: 9.99,
  p_expected_version: 1,
});
if (projectV2.error) throw projectV2.error;
check(projectV2.data[0].revision_number === 2, "existing project quotation RPC advances to V2 under scoped RLS");
const { data: projectHistory, error: projectHistoryError } = await first.client.from("quotation_revisions")
  .select("revision_number,subtotal").eq("quotation_id", projectQuoteId).order("revision_number");
if (projectHistoryError) throw projectHistoryError;
check(projectHistory.length === 2 && Number(projectHistory[0].subtotal) === 5.25, "project V1 remains immutable after V2");
const { data: memberProjectRead, error: memberProjectReadError } = await second.client.from("quotations").select("id")
  .eq("id", projectQuoteId).single();
if (memberProjectReadError) throw memberProjectReadError;
check(memberProjectRead.id === projectQuoteId, "existing organization members retain project quotation visibility");

if (acceptedProjectQuote) {
  const { data: acceptedBefore, error: acceptedBeforeError } = await first.client.from("quotations")
    .select("id,status,version,finalized_revision_id").eq("id", acceptedProjectQuote.id).single();
  if (acceptedBeforeError) throw acceptedBeforeError;
  const { data: acceptedRevisionBefore, error: acceptedRevisionError } = await first.client.from("quotation_revisions")
    .select("id,revision_number,subtotal,totals_snapshot,line_items_snapshot")
    .eq("id", acceptedProjectQuote.finalized_revision_id).single();
  if (acceptedRevisionError) throw acceptedRevisionError;
  check(acceptedBefore.status === "accepted" && acceptedRevisionBefore.revision_number > 0, "existing accepted project history is readable to an organization member");
  const acceptedMutation = await first.client.from("quotations").update({ name: "DEMO forged accepted edit" })
    .eq("id", acceptedProjectQuote.id).select("id");
  check(acceptedMutation.error?.code === "55000", "accepted project quotation header remains immutable");
  const acceptedRevisionMutation = await first.client.from("quotation_revisions").update({ subtotal: 0 })
    .eq("id", acceptedProjectQuote.finalized_revision_id).select("id");
  check(acceptedRevisionMutation.error?.code === "42501"
    || (!acceptedRevisionMutation.error && acceptedRevisionMutation.data.length === 0), "accepted project revision cannot be directly mutated");
  const { data: acceptedAfter, error: acceptedAfterError } = await first.client.from("quotations")
    .select("id,status,version,finalized_revision_id").eq("id", acceptedProjectQuote.id).single();
  if (acceptedAfterError) throw acceptedAfterError;
  const { data: acceptedRevisionAfter, error: acceptedRevisionAfterError } = await first.client.from("quotation_revisions")
    .select("id,revision_number,subtotal,totals_snapshot,line_items_snapshot")
    .eq("id", acceptedProjectQuote.finalized_revision_id).single();
  if (acceptedRevisionAfterError) throw acceptedRevisionAfterError;
  check(JSON.stringify(acceptedBefore) === JSON.stringify(acceptedAfter)
    && JSON.stringify(acceptedRevisionBefore) === JSON.stringify(acceptedRevisionAfter), "accepted project header and historical snapshot remain unchanged after denied mutations");
}

console.log(`Completed ${passed} authenticated checks. Local-only DEMO users, organizations, catalog fixtures, and immutable quote revisions remain in the local database.`);

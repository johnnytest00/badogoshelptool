/* global console, process */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (process.env.RUN_LOCAL_QUOTATION_DOCUMENT_VALIDATION !== "1") throw new Error("Set RUN_LOCAL_QUOTATION_DOCUMENT_VALIDATION=1 to run against local Supabase.");
const envText = execFileSync("supabase", ["status", "--output", "env"], { encoding: "utf8", env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } });
const status = Object.fromEntries(envText.split("\n").flatMap((line) => {
  const match = line.match(/^(?:export )?([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
}));
const { API_URL: url, PUBLISHABLE_KEY: publicKey, SERVICE_ROLE_KEY: serviceKey } = status;
if (!url?.startsWith("http://127.0.0.1:") || !publicKey || !serviceKey) throw new Error("Refusing to run unless Supabase status provides a local URL and keys.");
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const fixture = randomUUID();
const createUser = async (role) => {
  const email = `quotation-document-${role}-${fixture}@local.test`;
  const password = `Local-${randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { validation_fixture: "DEMO F9.7.6.6.3.2a" } });
  if (error) throw error;
  const client = createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
};
const owner = await createUser("owner");
const member = await createUser("member");
const organizationId = randomUUID();
const clientId = randomUUID();
const { error: organizationError } = await admin.from("organizations").insert({ id: organizationId, name: `DEMO dokumentum szervezet ${fixture}` });
if (organizationError) throw organizationError;
const { error: customerError } = await admin.from("clients").insert({ id: clientId, organization_id: organizationId, name: `DEMO címzett ${fixture}`, billing_address: "DEMO cím" });
if (customerError) throw customerError;
const { error: membershipError } = await admin.from("organization_members").insert([
  { organization_id: organizationId, user_id: owner.id, role: "owner" },
  { organization_id: organizationId, user_id: member.id, role: "member" },
]);
if (membershipError) throw membershipError;
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); console.log(`PASS ${++passed}: ${message}`); };

const profileUpdate = await owner.client.from("organizations").update({ business_name: "DEMO Kibocsátó", business_address: "DEMO kibocsátói cím", tax_identifier: "DEMO adat" }).eq("id", organizationId).select("business_name").single();
if (profileUpdate.error) throw profileUpdate.error;
check(profileUpdate.data.business_name === "DEMO Kibocsátó", "authenticated owner updates organization-scoped issuer profile");
const deniedProfileUpdate = await member.client.from("organizations").update({ business_name: "DEMO illetéktelen" }).eq("id", organizationId).select("business_name");
check(!deniedProfileUpdate.error && deniedProfileUpdate.data.length === 0, "authenticated member cannot change issuer profile under RLS");

const manualDocument = { recipientSource: "manual", recipientName: "DEMO kézi címzett", recipientAddress: "DEMO cím", reference: "DEMO-REF", validUntil: "2027-01-31", notes: "DEMO V1", terms: "DEMO feltételek" };
const saved = await owner.client.rpc("save_standalone_quotation_draft_with_document", {
  p_organization_id: organizationId, p_operation_id: randomUUID(), p_quotation_id: null, p_name: "DEMO dokumentum V1",
  p_client_id: null, p_lines: [], p_expected_version: 0, p_document: manualDocument,
});
if (saved.error) throw saved.error;
const quotationId = saved.data[0].quotation_id;
const revisionId = saved.data[0].revision_id;
check(saved.data[0].revision_number === 1, "authenticated owner saves initial standalone document draft");
const revision = await owner.client.rpc("get_standalone_quotation_revision", { p_organization_id: organizationId, p_quotation_id: quotationId, p_revision_id: revisionId });
if (revision.error) throw revision.error;
check(revision.data[0].input_snapshot.document.recipient.address === "DEMO cím" && revision.data[0].input_snapshot.document.issuer.businessName === "DEMO Kibocsátó", "saved revision contains manual recipient and server-derived issuer snapshots");
const forbiddenRead = await member.client.rpc("get_standalone_quotation_revision", { p_organization_id: organizationId, p_quotation_id: quotationId, p_revision_id: revisionId });
check(forbiddenRead.error?.code === "23503", "same-organization noncreator cannot read standalone document revision");
const profileV2 = await owner.client.from("organizations").update({ business_name: "DEMO Kibocsátó V2" }).eq("id", organizationId).select("business_name").single();
if (profileV2.error) throw profileV2.error;
const linked = await owner.client.rpc("save_standalone_quotation_draft_with_document", {
  p_organization_id: organizationId, p_operation_id: randomUUID(), p_quotation_id: quotationId, p_name: "DEMO dokumentum V2",
  p_client_id: clientId, p_lines: [], p_expected_version: 1, p_document: { recipientSource: "client", notes: "DEMO V2" },
});
if (linked.error) throw linked.error;
const historical = await owner.client.rpc("get_standalone_quotation_revision", { p_organization_id: organizationId, p_quotation_id: quotationId, p_revision_id: revisionId });
if (historical.error) throw historical.error;
check(linked.data[0].revision_number === 2 && historical.data[0].input_snapshot.document.notes === "DEMO V1", "linked customer source creates V2 and keeps V1 immutable");
check(historical.data[0].input_snapshot.document.issuer.businessName === "DEMO Kibocsátó", "later issuer profile changes do not rewrite historical issuer snapshot");
const sequence = await admin.from("quotation_document_sequences").select("last_issued_number").eq("organization_id", organizationId);
if (sequence.error) throw sequence.error;
check(sequence.data.length === 0, "draft revisions do not allocate a final document number");
const directSequenceRead = await owner.client.from("quotation_document_sequences").select("last_issued_number");
check(directSequenceRead.error?.code === "42501", "authenticated client cannot read sequence state directly");
console.log(`Completed ${passed} authenticated document checks. Local-only DEMO fixtures remain in local Supabase.`);

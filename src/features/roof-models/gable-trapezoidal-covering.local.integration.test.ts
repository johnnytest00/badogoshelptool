/* global process */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Database, Json } from "@/infrastructure/supabase/database.types";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateCoveringSnapshot } from "./gable-trapezoidal-covering-persistence";

const state = vi.hoisted(() => ({ client: null as unknown, auth: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => state.client }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));

import { saveGableRoofAction } from "./roof-model-actions";
import { saveGableTrapezoidalCovering } from "./gable-trapezoidal-covering-actions";
import { getGableTrapezoidalCovering, listGableTrapezoidalCoverings } from "./gable-trapezoidal-covering-data";
import { persistGableCovering } from "@/infrastructure/supabase/covering-writer";

const localDescribe = process.env.RUN_LOCAL_COVERING_TESTS === "1" ? describe : describe.skip;
const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const coveringInput = { nominalSheetWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, selectedSheetLengthMm: 5_000, minimumSheetLengthMm: null, maximumSheetLengthMm: null, endAllowanceMm: null, longitudinalOverlapMm: null, lapCompatibilityConfirmed: false, maximumSheetCount: 100_000 };
const fixture = randomUUID();
const org = randomUUID();
const otherOrg = randomUUID();
const project = randomUUID();
const standaloneId = randomUUID();
const projectCalculationId = randomUUID();
let admin: SupabaseClient<Database>;
let owner: { id: string; client: SupabaseClient<Database> };
let peer: { id: string; client: SupabaseClient<Database> };
let outsider: { id: string; client: SupabaseClient<Database> };
let roofModelId: string;
let roofRevisionId: string;

function localStatus() {
  const output = execFileSync("supabase", ["status", "--output", "env"], { encoding: "utf8", env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } });
  const values = Object.fromEntries(output.split("\n").flatMap((line) => {
    const match = line.match(/^(?:export )?([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }));
  if (!values.API_URL?.startsWith("http://127.0.0.1:") || !values.PUBLISHABLE_KEY || !values.SERVICE_ROLE_KEY
    || !process.env.COVERING_WRITER_DATABASE_URL?.includes("@127.0.0.1:54322/")) throw new Error("Only configured local Supabase may be tested");
  return { url: values.API_URL, publicKey: values.PUBLISHABLE_KEY, serviceKey: values.SERVICE_ROLE_KEY };
}

function asActor(user: { id: string; client: SupabaseClient<Database> }, organizations: string[]) {
  state.client = user.client;
  state.auth = { userId: user.id, organizations: organizations.map((id) => ({ id, role: "member" })) };
}

function saveRequest(scope: { kind: "standalone" } | { kind: "project"; projectId: string; roofModelId: string; roofModelRevisionId: string },
  calculationId: string, expectedRevisionNumber: number, operationId = randomUUID(), name = "DEMO fedés") {
  return { organizationId: org, calculationId, operationId, expectedRevisionNumber, name, scope, geometryInput, coveringInput };
}

async function writerCall(write: Parameters<typeof persistGableCovering>[0]) {
  const client = new Client({ connectionString: process.env.COVERING_WRITER_DATABASE_URL, application_name: "covering-concurrency-test" });
  await client.connect();
  try {
    const result = await client.query(`select * from public.save_gable_trapezoidal_covering_calculation(
      $1::uuid,$2::uuid,$3::uuid,$4::integer,$5::text,$6::uuid,$7::uuid,$8::uuid,$9::jsonb,$10::jsonb,$11::jsonb,$12::uuid)`,
    [write.organizationId, write.calculationId, write.operationId, write.expectedRevisionNumber, write.name,
      write.projectId, write.roofModelId, write.sourceRoofRevisionId, JSON.stringify(write.input),
      JSON.stringify(write.output), JSON.stringify(write.provenance), write.actorId]);
    return result.rows[0];
  } finally { await client.end(); }
}

localDescribe("F9.7.7.2a.1 local authenticated covering persistence", () => {
  beforeAll(async () => {
    const status = localStatus();
    admin = createSupabaseClient<Database>(status.url, status.serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const makeUser = async (label: string) => {
      const email = `covering-${label}-${fixture}@local.test`;
      const password = `Local-${randomUUID()}-Aa1`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { fixture: "DEMO F9.7.7.2a.1" } });
      if (created.error || !created.data.user) throw created.error ?? new Error("fixture user missing");
      const client = createSupabaseClient<Database>(status.url, status.publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const signed = await client.auth.signInWithPassword({ email, password });
      if (signed.error) throw signed.error;
      return { id: created.data.user.id, client };
    };
    [owner, peer, outsider] = await Promise.all([makeUser("owner"), makeUser("peer"), makeUser("outsider")]);
    const organizations = await admin.from("organizations").insert([
      { id: org, name: `DEMO covering ${fixture}` }, { id: otherOrg, name: `DEMO covering other ${fixture}` },
    ]);
    if (organizations.error) throw organizations.error;
    const memberships = await admin.from("organization_members").insert([
      { organization_id: org, user_id: owner.id, role: "owner" },
      { organization_id: org, user_id: peer.id, role: "member" },
      { organization_id: otherOrg, user_id: outsider.id, role: "owner" },
    ]);
    if (memberships.error) throw memberships.error;
    const madeProject = await admin.from("projects").insert({ id: project, organization_id: org,
      name: `DEMO covering project ${fixture}`, project_type: "roof_renovation", status: "draft", created_by: owner.id });
    if (madeProject.error) throw madeProject.error;
    asActor(owner, [org]);
    const form = new FormData();
    for (const [key, value] of Object.entries({ organizationId: org, projectId: project, name: "DEMO roof", expectedRevisionNumber: "0", ...geometryInput })) form.set(key, String(value));
    const roof = await saveGableRoofAction(form);
    if (!roof.ok || !roof.roofModelId) throw new Error(`roof fixture failed: ${roof.error}`);
    roofModelId = roof.roofModelId;
    const revision = await owner.client.from("roof_model_revisions").select("id").eq("roof_model_id", roofModelId).order("revision_number", { ascending: false }).limit(1).single();
    if (revision.error) throw revision.error;
    roofRevisionId = revision.data.id;
  });

  it("saves both scopes, rejects forged writes, retains history and enforces ownership", async () => {
    const standalone = saveRequest({ kind: "standalone" }, standaloneId, 0);
    const first = await saveGableTrapezoidalCovering(standalone);
    expect(first).toMatchObject({ ok: true, revisionNumber: 1, reused: false });
    expect(await saveGableTrapezoidalCovering(standalone)).toMatchObject({ ok: true, revisionNumber: 1, reused: true });
    expect(await saveGableTrapezoidalCovering({ ...standalone, name: "DEMO changed" })).toMatchObject({ ok: false });
    expect((await getGableTrapezoidalCovering(org, standaloneId))?.revisions[0]?.input).toMatchObject({ source: { geometrySource: "manual_user_input" } });

    const forgedOutput = { geometry: calculateGableRoof(geometryInput), covering: { ...calculateCoveringSnapshot(geometryInput, coveringInput)!.output, totalSheetCount: 999999 } };
    const direct = await owner.client.rpc("save_gable_trapezoidal_covering_calculation", {
      p_actor_id: owner.id, p_organization_id: org, p_calculation_id: randomUUID(), p_operation_id: randomUUID(),
      p_expected_revision_number: 0, p_name: "DEMO forged", p_project_id: null, p_roof_model_id: null,
      p_source_roof_revision_id: null, p_input_data: {}, p_output_data: JSON.parse(JSON.stringify(forgedOutput)) as Json, p_data_provenance: {},
    });
    expect(direct.error?.code).toBe("42501");
    const forgedRows = await admin.from("calculations").select("id").eq("organization_id", org).eq("display_name", "DEMO forged");
    expect(forgedRows.data).toEqual([]);
    const tableForgery = await owner.client.from("calculations").insert({ id: randomUUID(), organization_id: org,
      project_id: project, calculator_type: "roof.gable.trapezoidal-covering", display_name: "DEMO forged table" });
    expect(tableForgery.error).not.toBeNull();

    const second = await saveGableTrapezoidalCovering(saveRequest({ kind: "standalone" }, standaloneId, 1));
    expect(second).toMatchObject({ ok: true, revisionNumber: 2, reused: false });
    expect(await saveGableTrapezoidalCovering(saveRequest({ kind: "standalone" }, standaloneId, 1))).toMatchObject({ ok: false });
    const history = await getGableTrapezoidalCovering(org, standaloneId);
    expect(history?.revisions.map((revision) => revision.revisionNumber)).toEqual([2, 1]);
    expect((await getGableTrapezoidalCovering(org, standaloneId, 1))?.revisions[0]?.revisionId).toBe(first.revisionId);
    const mutation = await owner.client.from("calculation_revisions").update({ output_snapshot: JSON.parse(JSON.stringify(forgedOutput)) as NonNullable<Json> }).eq("id", first.revisionId!);
    expect(mutation.error).toBeNull();
    const unchanged = await owner.client.from("calculation_revisions").select("output_snapshot").eq("id", first.revisionId!).single();
    expect((unchanged.data?.output_snapshot as { covering?: { totalSheetCount?: number } })?.covering?.totalSheetCount).toBe(20);
    const stored = await admin.from("calculation_revisions").select("input_snapshot,output_snapshot").eq("id", first.revisionId!).single();
    if (stored.error) throw stored.error;
    const forgedActorWrite = { organizationId: org, calculationId: standaloneId, operationId: randomUUID(),
      expectedRevisionNumber: 2, name: "DEMO forged actor", projectId: null, roofModelId: null,
      sourceRoofRevisionId: null, input: stored.data.input_snapshot, output: stored.data.output_snapshot,
      provenance: { geometry: "manual_user_provided" }, actorId: peer.id };
    await expect(writerCall(forgedActorWrite)).rejects.toMatchObject({ code: "42501" });
    await expect(writerCall({ ...forgedActorWrite, organizationId: otherOrg, actorId: owner.id,
      calculationId: randomUUID(), operationId: randomUUID(), expectedRevisionNumber: 0 })).rejects.toMatchObject({ code: "42501" });

    const projectScope = { kind: "project" as const, projectId: project, roofModelId, roofModelRevisionId: roofRevisionId };
    const projectSave = await saveGableTrapezoidalCovering(saveRequest(projectScope, projectCalculationId, 0));
    expect(projectSave).toMatchObject({ ok: true, revisionNumber: 1 });
    const projectRead = await getGableTrapezoidalCovering(org, projectCalculationId);
    expect(projectRead?.revisions[0]?.input).toMatchObject({ source: { roofModelRevisionId: roofRevisionId } });
    const dependency = await owner.client.from("calculation_dependencies").select("id,upstream_roof_model_revision_id")
      .eq("downstream_calculation_revision_id", projectSave.revisionId!).single();
    expect(dependency.data?.upstream_roof_model_revision_id).toBe(roofRevisionId);
    await owner.client.from("calculation_dependencies").delete().eq("id", dependency.data!.id);
    const preservedDependency = await owner.client.from("calculation_dependencies").select("id").eq("id", dependency.data!.id).single();
    expect(preservedDependency.data?.id).toBe(dependency.data!.id);
    const forgedRevision = await owner.client.from("calculation_revisions").insert({ organization_id: org,
      calculation_id: projectCalculationId, revision_number: 2, input_schema_version: "1.0.0",
      calculator_implementation_version: "1.0.0", input_snapshot: {}, output_snapshot: JSON.parse(JSON.stringify(forgedOutput)) as NonNullable<Json>,
      created_by: owner.id });
    expect(forgedRevision.error).not.toBeNull();
    const adminMutation = await admin.from("calculation_revisions").update({ output_snapshot: JSON.parse(JSON.stringify(forgedOutput)) as NonNullable<Json> }).eq("id", first.revisionId!);
    expect(adminMutation.error?.message).toContain("immutable");
    const projectStored = await admin.from("calculation_revisions").select("input_snapshot,output_snapshot").eq("id", projectSave.revisionId!).single();
    if (projectStored.error) throw projectStored.error;
    const projectWrite = { organizationId: org, calculationId: randomUUID(), operationId: randomUUID(),
      expectedRevisionNumber: 0, name: "DEMO forged source", projectId: project, roofModelId,
      sourceRoofRevisionId: randomUUID(), input: projectStored.data.input_snapshot,
      output: projectStored.data.output_snapshot, provenance: { geometry: "saved_verified_roof_model_revision" }, actorId: owner.id };
    await expect(writerCall(projectWrite)).rejects.toMatchObject({ code: "22023" });
    await expect(writerCall({ ...projectWrite, projectId: randomUUID(), operationId: randomUUID() })).rejects.toMatchObject({ code: "22023" });
    const forgedGeometryRef = JSON.parse(JSON.stringify(projectStored.data.input_snapshot)) as { source: { geometryCalculationRevisionId: string } };
    forgedGeometryRef.source.geometryCalculationRevisionId = randomUUID();
    await expect(writerCall({ ...projectWrite, sourceRoofRevisionId: roofRevisionId, input: forgedGeometryRef,
      operationId: randomUUID() })).rejects.toMatchObject({ code: "42501" });
    expect(await saveGableTrapezoidalCovering(saveRequest({ ...projectScope, projectId: randomUUID() }, randomUUID(), 0))).toMatchObject({ ok: false });
    expect(await saveGableTrapezoidalCovering(saveRequest({ ...projectScope, roofModelRevisionId: randomUUID() }, randomUUID(), 0))).toMatchObject({ ok: false });

    asActor(peer, [org]);
    expect(await getGableTrapezoidalCovering(org, standaloneId)).toBeNull();
    expect(await listGableTrapezoidalCoverings(org)).toEqual([]);
    const peerRaw = await peer.client.from("calculation_revisions").select("id").eq("calculation_id", standaloneId);
    expect(peerRaw.data).toEqual([]);
    expect(await saveGableTrapezoidalCovering(saveRequest({ kind: "standalone" }, standaloneId, 2))).toMatchObject({ ok: false });
    asActor(outsider, [otherOrg]);
    expect(await getGableTrapezoidalCovering(org, projectCalculationId)).toBeNull();
    const outsiderRaw = await outsider.client.from("calculations").select("id").eq("id", projectCalculationId);
    expect(outsiderRaw.data).toEqual([]);
    expect(await saveGableTrapezoidalCovering(saveRequest(projectScope, randomUUID(), 0))).toMatchObject({ ok: false });
    const crossOrgMutation = await outsider.client.from("calculation_revisions").insert({ organization_id: org,
      calculation_id: projectCalculationId, revision_number: 2, input_schema_version: "1.0.0",
      calculator_implementation_version: "1.0.0", input_snapshot: {}, output_snapshot: {}, created_by: outsider.id });
    expect(crossOrgMutation.error).not.toBeNull();
    const revoked = await admin.from("organization_members").delete().eq("organization_id", org).eq("user_id", peer.id);
    if (revoked.error) throw revoked.error;
    asActor(peer, []);
    expect(await getGableTrapezoidalCovering(org, projectCalculationId)).toBeNull();
    expect(await saveGableTrapezoidalCovering(saveRequest(projectScope, randomUUID(), 0))).toMatchObject({ ok: false });
    await expect(writerCall({ ...forgedActorWrite, calculationId: randomUUID(), operationId: randomUUID(),
      expectedRevisionNumber: 0 })).rejects.toMatchObject({ code: "42501" });
    asActor(owner, [org]);
  });

  it("serializes genuinely overlapping V2 writes and concurrent identical retries", async () => {
    const id = randomUUID();
    const v1 = await saveGableTrapezoidalCovering(saveRequest({ kind: "standalone" }, id, 0));
    expect(v1).toMatchObject({ ok: true, revisionNumber: 1 });
    const snapshot = calculateCoveringSnapshot(geometryInput, coveringInput)!;
    const input = { calculatorType: "roof.gable.trapezoidal-covering", scope: "standalone", source: { mode: "standalone", geometrySource: "manual_user_input", geometryInput: snapshot.geometryInput }, coveringInput: snapshot.coveringInput };
    const write = (operationId: string, expectedRevisionNumber = 1) => ({ organizationId: org, calculationId: id, operationId,
      expectedRevisionNumber, name: "DEMO concurrent", projectId: null, roofModelId: null, sourceRoofRevisionId: null,
      input, output: { geometry: snapshot.geometry, covering: snapshot.output },
      provenance: { geometry: "manual_user_provided", coveringParameters: "user_provided", calculation: "server_recomputed", professionalApproval: false }, actorId: owner.id });
    const lockKey = `${org}:gable-covering-calculation:${id}`;
    const blocker = new Client({ connectionString: process.env.COVERING_WRITER_DATABASE_URL, application_name: "covering-lock-coordinator" });
    await blocker.connect();
    try {
      await blocker.query("select pg_advisory_lock(hashtextextended($1,0))", [lockKey]);
      const attempts = [writerCall(write(randomUUID())), writerCall(write(randomUUID()))];
      let waiters = 0;
      for (let i = 0; i < 20 && waiters < 2; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const waiting = await blocker.query<{ count: string }>("select count(*) from pg_stat_activity where application_name='covering-concurrency-test' and wait_event_type='Lock'");
        waiters = Number(waiting.rows[0].count);
      }
      expect(waiters).toBe(2);
      await blocker.query("select pg_advisory_unlock(hashtextextended($1,0))", [lockKey]);
      const settled = await Promise.allSettled(attempts);
      expect(settled.filter((item) => item.status === "fulfilled")).toHaveLength(1);
      expect(settled.filter((item) => item.status === "rejected" && (item.reason as { code?: string }).code === "40001")).toHaveLength(1);
      const rows = await owner.client.from("calculation_revisions").select("revision_number,input_snapshot").eq("calculation_id", id).order("revision_number");
      expect(rows.data?.map((row) => row.revision_number)).toEqual([1, 2]);
      expect(rows.data?.[0]?.input_snapshot).toMatchObject({ source: { geometrySource: "manual_user_input" } });
      const operationId = randomUUID();
      await blocker.query("select pg_advisory_lock(hashtextextended($1,0))", [lockKey]);
      const retries = [writerCall(write(operationId, 2)), writerCall(write(operationId, 2))];
      let retryWaiters = 0;
      for (let i = 0; i < 20 && retryWaiters < 2; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const waiting = await blocker.query<{ count: string }>("select count(*) from pg_stat_activity where application_name='covering-concurrency-test' and wait_event_type='Lock'");
        retryWaiters = Number(waiting.rows[0].count);
      }
      expect(retryWaiters).toBe(2);
      await blocker.query("select pg_advisory_unlock(hashtextextended($1,0))", [lockKey]);
      const retryResults = await Promise.all(retries);
      expect(retryResults.map((result) => result.reused).sort()).toEqual([false, true]);
      expect(new Set(retryResults.map((result) => result.calculation_revision_id)).size).toBe(1);
      const all = await owner.client.from("calculation_revisions").select("revision_number").eq("calculation_id", id).order("revision_number");
      expect(all.data?.map((row) => row.revision_number)).toEqual([1, 2, 3]);
    } finally { await blocker.end(); }
  });
});

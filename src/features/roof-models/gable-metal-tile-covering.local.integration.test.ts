/* global process */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Database, Json } from "@/infrastructure/supabase/database";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import type { GableMetalTileCoveringInput } from "@/domain/calculations/gable-metal-tile-covering";
import { calculateMetalTileSnapshot } from "./gable-metal-tile-covering-persistence";

const state = vi.hoisted(() => ({ client: null as unknown, auth: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => state.client }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));

import { saveGableRoofAction } from "./roof-model-actions";
import { saveGableMetalTileCovering } from "./gable-metal-tile-covering-actions";
import { getGableMetalTileCovering, listGableMetalTileCoverings } from "./gable-metal-tile-covering-data";

const localDescribe = process.env.RUN_LOCAL_METAL_TILE_TESTS === "1" ? describe : describe.skip;
const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const productInput: GableMetalTileCoveringInput = {
  nominalSheetWidthMm: 1_200, effectiveCoveringWidthMm: 1_000, physicalSheetLengthMm: 5_100, effectiveCoveringLengthMm: 5_000,
  minimumPhysicalLengthMm: null, maximumPhysicalLengthMm: null, eaveEndAllowanceMm: 0, ridgeEndAllowanceMm: 0,
  longitudinalOverlapMm: 0, lengthCompatibilityConfirmed: true, lengthDataSource: "DEMO kézi termékspecifikáció",
  isModular: false, moduleBaseLengthMm: null, modulePitchMm: null, moduleCount: null,
};
const fixture = randomUUID();
const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const projectId = randomUUID();
const standaloneCalculationId = randomUUID();
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
  const writerUrl = process.env.COVERING_WRITER_DATABASE_URL;
  if (!values.API_URL?.startsWith("http://127.0.0.1:") || !values.PUBLISHABLE_KEY || !values.SERVICE_ROLE_KEY || !writerUrl?.includes("@127.0.0.1:54322/")) {
    throw new Error("Only configured local Supabase may be tested");
  }
  return { url: values.API_URL, publicKey: values.PUBLISHABLE_KEY, serviceKey: values.SERVICE_ROLE_KEY, writerUrl };
}

function asActor(user: { id: string; client: SupabaseClient<Database> }, organizations: string[]) {
  state.client = user.client;
  state.auth = { userId: user.id, organizations: organizations.map((id) => ({ id, role: "member" })) };
}

function saveRequest(scope: { kind: "standalone" } | { kind: "project"; projectId: string; roofModelId: string; roofModelRevisionId: string }, calculationId: string, expectedRevisionNumber: number, operationId = randomUUID(), product = productInput) {
  return { organizationId, calculationId, operationId, expectedRevisionNumber, scope, geometryInput, productInput: product };
}

async function writerCall(write: { organizationId: string; calculationId: string; operationId: string; expectedRevisionNumber: number; name: string; projectId: string | null; roofModelId: string | null; sourceRoofRevisionId: string | null; input: unknown; output: unknown; provenance: unknown; actorId: string }) {
  const client = new Client({ connectionString: process.env.COVERING_WRITER_DATABASE_URL, application_name: "metal-tile-covering-concurrency-test" });
  await client.connect();
  try {
    const result = await client.query(`select * from public.save_gable_metal_tile_covering_calculation(
      $1::uuid,$2::uuid,$3::uuid,$4::integer,$5::text,$6::uuid,$7::uuid,$8::uuid,$9::jsonb,$10::jsonb,$11::jsonb,$12::uuid)`,
    [write.organizationId, write.calculationId, write.operationId, write.expectedRevisionNumber, write.name,
      write.projectId, write.roofModelId, write.sourceRoofRevisionId, JSON.stringify(write.input), JSON.stringify(write.output), JSON.stringify(write.provenance), write.actorId]);
    return result.rows[0] as { calculation_id: string; calculation_revision_id: string; revision_number: number; reused: boolean };
  } finally { await client.end(); }
}

localDescribe("F9.7.7.4b.1 local Auth/RLS cserepeslemez-persistencia", () => {
  beforeAll(async () => {
    const status = localStatus();
    admin = createSupabaseClient<Database>(status.url, status.serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const makeUser = async (label: string) => {
      const email = `metal-tile-${label}-${fixture}@local.test`;
      const password = `Local-${randomUUID()}-Aa1`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { fixture: "DEMO F9.7.7.4b.1" } });
      if (created.error || !created.data.user) throw created.error ?? new Error("local test user missing");
      const client = createSupabaseClient<Database>(status.url, status.publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const signed = await client.auth.signInWithPassword({ email, password });
      if (signed.error) throw signed.error;
      return { id: created.data.user.id, client };
    };
    [owner, peer, outsider] = await Promise.all([makeUser("owner"), makeUser("peer"), makeUser("outsider")]);
    const organizations = await admin.from("organizations").insert([
      { id: organizationId, name: `DEMO metal tile ${fixture}` }, { id: otherOrganizationId, name: `DEMO other metal tile ${fixture}` },
    ]);
    if (organizations.error) throw organizations.error;
    const memberships = await admin.from("organization_members").insert([
      { organization_id: organizationId, user_id: owner.id, role: "owner" },
      { organization_id: organizationId, user_id: peer.id, role: "member" },
      { organization_id: otherOrganizationId, user_id: outsider.id, role: "owner" },
    ]);
    if (memberships.error) throw memberships.error;
    const project = await admin.from("projects").insert({ id: projectId, organization_id: organizationId,
      name: `DEMO metal tile project ${fixture}`, project_type: "roof_renovation", status: "draft", created_by: owner.id });
    if (project.error) throw project.error;
    asActor(owner, [organizationId]);
    const form = new FormData();
    for (const [key, value] of Object.entries({ organizationId, projectId, name: "DEMO roof", expectedRevisionNumber: "0", ...geometryInput })) form.set(key, String(value));
    const roof = await saveGableRoofAction(form);
    if (!roof.ok || !roof.roofModelId) throw new Error(`local roof fixture failed: ${roof.error}`);
    roofModelId = roof.roofModelId;
    const revision = await owner.client.from("roof_model_revisions").select("id").eq("roof_model_id", roofModelId).order("revision_number", { ascending: false }).limit(1).single();
    if (revision.error) throw revision.error;
    roofRevisionId = revision.data.id;
    if (!status.writerUrl.includes("127.0.0.1:54322")) throw new Error("writer connection must target local Supabase");
  });

  it("saves V1/V2, reads immutable history and proves server-side recalculation", async () => {
    asActor(owner, [organizationId]);
    const request = saveRequest({ kind: "standalone" }, standaloneCalculationId, 0);
    const v1 = await saveGableMetalTileCovering({ ...request, output: { forged: true } });
    expect(v1).toMatchObject({ ok: true, revisionNumber: 1, reused: false });
    const retry = await saveGableMetalTileCovering({ ...request, output: { forged: true } });
    expect(retry).toMatchObject({ ok: true, revisionNumber: 1, reused: true, revisionId: v1.revisionId });
    const invalidModule = await saveGableMetalTileCovering(saveRequest({ kind: "standalone" }, randomUUID(), 0, randomUUID(), {
      ...productInput, isModular: true, moduleBaseLengthMm: 1_000, modulePitchMm: 1_000, moduleCount: 3,
    }));
    expect(invalidModule).toMatchObject({ ok: false });
    const v2 = await saveGableMetalTileCovering(saveRequest({ kind: "standalone" }, standaloneCalculationId, 1, randomUUID(), { ...productInput, effectiveCoveringWidthMm: 500 }));
    expect(v2).toMatchObject({ ok: true, revisionNumber: 2, reused: false });
    const historical = await getGableMetalTileCovering(organizationId, standaloneCalculationId, 1);
    expect(historical?.revisions[0]).toMatchObject({ revisionId: v1.revisionId, revisionNumber: 1, output: { covering: { status: "VALID", totalSheetCount: 20 } } });
    const current = await getGableMetalTileCovering(organizationId, standaloneCalculationId);
    expect(current?.revisions.map((row) => row.revisionNumber)).toEqual([2, 1]);
    expect(current?.revisions[0]?.output).toMatchObject({ covering: { totalSheetCount: 40 } });
    expect(await listGableMetalTileCoverings(organizationId)).toHaveLength(1);
    const stored = await owner.client.from("calculation_revisions").select("input_snapshot, output_snapshot").eq("id", v1.revisionId!).single();
    expect(stored.data?.input_snapshot).toMatchObject({ productInput: { physicalSheetLengthMm: 5_100, effectiveCoveringLengthMm: 5_000 }, source: { mode: "standalone" } });
    expect(stored.data?.output_snapshot).toMatchObject({ geometry: { dimensions: { overallRoofLengthMm: 10_000 } }, covering: { totalSheetCount: 20 } });
    const directRpc = owner.client as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { code?: string } | null }> };
    const forged = await directRpc.rpc("save_gable_metal_tile_covering_calculation", {
      p_actor_id: owner.id, p_organization_id: organizationId, p_calculation_id: randomUUID(), p_operation_id: randomUUID(),
      p_expected_revision_number: 0, p_name: "DEMO forged", p_project_id: null, p_roof_model_id: null, p_source_roof_revision_id: null,
      p_input_data: {}, p_output_data: { geometry: calculateGableRoof(geometryInput), covering: { status: "VALID", totalSheetCount: 999_999 } } as unknown as Exclude<Json, null>,
      p_data_provenance: { calculation: "forged" },
    });
    expect(forged.error?.code).toBe("42501");
    const directTableWrite = await owner.client.from("calculations").insert({ id: randomUUID(), organization_id: organizationId,
      calculator_type: "roof.gable.metal-tile-covering", display_name: "DEMO forged table" });
    expect(directTableWrite.error).not.toBeNull();
    const immutable = await owner.client.from("calculation_revisions").update({ output_snapshot: { forged: true } as unknown as Exclude<Json, null> }).eq("id", v1.revisionId!).select("id");
    expect(immutable.error).toBeNull();
    expect(immutable.data).toEqual([]);
    const adminMutation = await admin.from("calculation_revisions").update({ output_snapshot: { forged: true } as unknown as Exclude<Json, null> }).eq("id", v1.revisionId!);
    expect(adminMutation.error?.message).toContain("immutable");
    expect((await getGableMetalTileCovering(organizationId, standaloneCalculationId, 1))?.revisions[0]?.output).toMatchObject({ covering: { totalSheetCount: 20 } });
  });

  it("binds project snapshots to exact saved roof revision and isolates authorization", async () => {
    asActor(owner, [organizationId]);
    const projectScope = { kind: "project" as const, projectId, roofModelId, roofModelRevisionId: roofRevisionId };
    const request = saveRequest(projectScope, projectCalculationId, 0);
    const saved = await saveGableMetalTileCovering({ ...request, geometryInput: { ...geometryInput, buildingLengthMm: 12_345 } });
    expect(saved).toMatchObject({ ok: true, revisionNumber: 1 });
    const current = await getGableMetalTileCovering(organizationId, projectCalculationId);
    expect(current?.revisions[0]?.input).toMatchObject({ scope: "project", source: { roofModelRevisionId: roofRevisionId, geometryCalculationRevisionId: expect.any(String), geometryInput } });
    expect(current?.revisions[0]?.output).toMatchObject({ geometry: { dimensions: { overallRoofLengthMm: 10_000 } } });
    const dependency = await owner.client.from("calculation_dependencies").select("upstream_roof_model_revision_id, dependency_type")
      .eq("downstream_calculation_revision_id", saved.revisionId!).single();
    expect(dependency.data).toMatchObject({ upstream_roof_model_revision_id: roofRevisionId, dependency_type: "roof_geometry_input" });

    asActor(peer, [organizationId]);
    expect(await getGableMetalTileCovering(organizationId, standaloneCalculationId)).toBeNull();
    expect(await listGableMetalTileCoverings(organizationId)).toEqual([]);
    const peerRead = await peer.client.from("calculation_revisions").select("id").eq("calculation_id", standaloneCalculationId);
    expect(peerRead.data).toEqual([]);
    expect(await getGableMetalTileCovering(organizationId, projectCalculationId)).not.toBeNull();

    asActor(outsider, [otherOrganizationId]);
    expect(await getGableMetalTileCovering(organizationId, projectCalculationId)).toBeNull();
    expect(await saveGableMetalTileCovering(request)).toMatchObject({ ok: false });
    const outsiderRead = await outsider.client.from("calculations").select("id").eq("id", projectCalculationId);
    expect(outsiderRead.data).toEqual([]);
    const snapshot = calculateMetalTileSnapshot(geometryInput, productInput)!;
    const outsiderWriterPayload = { organizationId, calculationId: randomUUID(), operationId: randomUUID(), expectedRevisionNumber: 0,
      name: "Cserepeslemez-fedés", projectId: null, roofModelId: null, sourceRoofRevisionId: null,
      input: { calculatorType: "roof.gable.metal-tile-covering", scope: "standalone", source: { mode: "standalone", geometrySource: "manual_user_input", geometryInput: snapshot.geometryInput }, productInput: snapshot.productInput },
      output: { geometry: snapshot.geometry, covering: snapshot.output },
      provenance: { calculation: "server_recomputed" }, actorId: outsider.id };
    await expect(writerCall(outsiderWriterPayload)).rejects.toMatchObject({ code: "42501" });
    await admin.from("organization_members").delete().eq("organization_id", organizationId).eq("user_id", peer.id);
    asActor(peer, []);
    expect(await getGableMetalTileCovering(organizationId, projectCalculationId)).toBeNull();
    expect(await saveGableMetalTileCovering(request)).toMatchObject({ ok: false });
    await expect(writerCall({ ...outsiderWriterPayload, calculationId: randomUUID(), operationId: randomUUID(), actorId: peer.id })).rejects.toMatchObject({ code: "42501" });
  });

  it("serializes conflicting revisions and concurrent idempotent retry on separate DB connections", async () => {
    asActor(owner, [organizationId]);
    const calculationId = randomUUID();
    const first = await saveGableMetalTileCovering(saveRequest({ kind: "standalone" }, calculationId, 0));
    expect(first).toMatchObject({ ok: true, revisionNumber: 1 });
    const snapshot = calculateMetalTileSnapshot(geometryInput, productInput)!;
    const input = { calculatorType: "roof.gable.metal-tile-covering", scope: "standalone", source: { mode: "standalone", geometrySource: "manual_user_input", geometryInput: snapshot.geometryInput }, productInput: snapshot.productInput };
    const provenance = { geometry: "manual_user_provided", productParameters: "user_provided", lengthCompatibility: "user_confirmed_from_provided_reference", lengthDataSource: productInput.lengthDataSource, manufacturerCertification: false, calculation: "server_recomputed" };
    const write = (operationId: string, expectedRevisionNumber: number, product = productInput) => {
      const result = calculateMetalTileSnapshot(geometryInput, product)!;
      return { organizationId, calculationId, operationId, expectedRevisionNumber, name: "Cserepeslemez-fedés", projectId: null, roofModelId: null, sourceRoofRevisionId: null,
        input: { ...input, productInput: result.productInput }, output: { geometry: result.geometry, covering: result.output }, provenance, actorId: owner.id };
    };
    const lockKey = `${organizationId}:gable-metal-tile-calculation:${calculationId}`;
    const blocker = new Client({ connectionString: process.env.COVERING_WRITER_DATABASE_URL, application_name: "metal-tile-covering-lock-coordinator" });
    await blocker.connect();
    try {
      await blocker.query("select pg_advisory_lock(hashtextextended($1,0))", [lockKey]);
      const conflictWrites = [writerCall(write(randomUUID(), 1, productInput)), writerCall(write(randomUUID(), 1, { ...productInput, effectiveCoveringWidthMm: 500 }))];
      let waiting = 0;
      for (let index = 0; index < 40 && waiting < 2; index++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const rows = await blocker.query<{ count: string }>("select count(*) from pg_stat_activity where application_name='metal-tile-covering-concurrency-test' and wait_event_type='Lock'");
        waiting = Number(rows.rows[0].count);
      }
      expect(waiting).toBe(2);
      await blocker.query("select pg_advisory_unlock(hashtextextended($1,0))", [lockKey]);
      const results = await Promise.allSettled(conflictWrites);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((result) => result.status === "rejected" && (result.reason as { code?: string }).code === "40001")).toHaveLength(1);
      const afterConflict = await getGableMetalTileCovering(organizationId, calculationId);
      expect(afterConflict?.revisions.map((revision) => revision.revisionNumber)).toEqual([2, 1]);

      const operationId = randomUUID();
      await blocker.query("select pg_advisory_lock(hashtextextended($1,0))", [lockKey]);
      const retries = [writerCall(write(operationId, 2)), writerCall(write(operationId, 2))];
      waiting = 0;
      for (let index = 0; index < 40 && waiting < 2; index++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const rows = await blocker.query<{ count: string }>("select count(*) from pg_stat_activity where application_name='metal-tile-covering-concurrency-test' and wait_event_type='Lock'");
        waiting = Number(rows.rows[0].count);
      }
      expect(waiting).toBe(2);
      await blocker.query("select pg_advisory_unlock(hashtextextended($1,0))", [lockKey]);
      const retryResults = await Promise.all(retries);
      expect(retryResults.map((result) => result.reused).sort()).toEqual([false, true]);
      expect(new Set(retryResults.map((result) => result.calculation_revision_id)).size).toBe(1);
      expect((await getGableMetalTileCovering(organizationId, calculationId))?.revisions.map((revision) => revision.revisionNumber)).toEqual([3, 2, 1]);
    } finally { await blocker.end(); }
  });
});

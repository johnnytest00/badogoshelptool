/* global process */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";

const serverState = vi.hoisted(() => ({ client: null as unknown, auth: null as unknown }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => serverState.client }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => serverState.auth }));

import { getStandaloneCalculation, listStandaloneCalculations } from "./standalone-data";
import { associateStandaloneCalculationAction, saveStandaloneCalculationAction } from "./standalone-actions";

const runLocal = process.env.RUN_LOCAL_SUPABASE_ACTION_TESTS === "1";
const localDescribe = runLocal ? describe : describe.skip;
const ids = { organization: randomUUID(), project: randomUUID(), owner: "" as string, other: "" as string };
const password = `Local-${randomUUID()}-Aa1`;
const email = (label: string) => `f9763-standalone-${label}-${randomUUID()}@local.test`;
let admin: SupabaseClient<Database>;
let ownerClient: SupabaseClient<Database>;
let otherClient: SupabaseClient<Database>;
let ownerUser: User;
let otherUser: User;

function localStatus() {
  const output = execFileSync("supabase", ["status", "--output", "env"], { encoding: "utf8", env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } });
  const values = Object.fromEntries(output.split("\n").flatMap((line) => {
    const match = line.match(/^(?:export )?([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }));
  if (!values.API_URL?.startsWith("http://127.0.0.1:") || !values.PUBLISHABLE_KEY || !values.SERVICE_ROLE_KEY) throw new Error("A teszt kizárólag helyi Supabase példányon futhat.");
  return { url: values.API_URL, publishableKey: values.PUBLISHABLE_KEY, serviceRoleKey: values.SERVICE_ROLE_KEY };
}

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const context = (id: string) => ({ userId: id, organizations: [{ id: ids.organization, role: id === ownerUser?.id ? "owner" : "member" }] });
const gutterInput = (lengthMm: number) => ({ gutterStockLengthMm: 3000, runs: [{ id: "r1", name: "DEMO eresz", lengthMm, measurementSource: "user_provided", roofEdge: null, bracketSpacingMm: null }], downpipes: [], manualComponents: [] });
const flashingInput = { sectionSpec: { nominalLengthMm: 3000, nominalLengthSource: { kind: "user_provided", label: "Kézi", sourceUrl: null, sourceDate: null, catalogVariantId: null, manuallyOverridden: false }, connection: { mode: "unknown" } }, runs: [{ id: "s1", category: "custom", name: "Kézi szegély", lengthMm: 1500, lengthSource: "user_provided", roofEdgeReference: null, startExtensionMm: 0, endExtensionMm: 0, reserveMm: 0, installationNotes: [] }], manualComponents: [] };
const profileInput = { schemaVersion: "1.0.0", profileType: "l", label: "DEMO L profil", coordinateConvention: "x-right-y-up", dimensionConvention: "finished_tangent", thicknessMm: 1, straights: [{ id: "s1", tangentLengthMm: 50, dimensionSource: { kind: "user_provided", label: "Kézi" } }, { id: "s2", tangentLengthMm: 40, dimensionSource: { kind: "user_provided", label: "Kézi" } }], bends: [{ id: "b1", signedTurnDeg: 90, insideRadiusMm: 2, allowance: { mode: "unknown" } }] };

localDescribe("F9.7.6.3 local authenticated standalone actions", () => {
  beforeAll(async () => {
    const status = localStatus();
    admin = createSupabaseClient<Database>(status.url, status.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const owner = await admin.auth.admin.createUser({ email: email("owner"), password, email_confirm: true });
    const other = await admin.auth.admin.createUser({ email: email("member"), password, email_confirm: true });
    if (owner.error || !owner.data.user || other.error || !other.data.user) throw owner.error ?? other.error ?? new Error("A helyi tesztidentitás létrehozása sikertelen.");
    ownerUser = owner.data.user; otherUser = other.data.user;
    ids.owner = ownerUser.id; ids.other = otherUser.id;
    const { error: orgError } = await admin.from("organizations").insert({ id: ids.organization, name: "DEMO F9.7.6.3 standalone" });
    if (orgError) throw orgError;
    const { error: membershipError } = await admin.from("organization_members").insert([
      { organization_id: ids.organization, user_id: ownerUser.id, role: "owner" },
      { organization_id: ids.organization, user_id: otherUser.id, role: "member" },
    ]);
    if (membershipError) throw membershipError;
    const { error: projectError } = await admin.from("projects").insert({
      id: ids.project, organization_id: ids.organization, name: "DEMO F9.7.6.5 association",
      project_type: "roof_renovation", status: "draft", created_by: ownerUser.id,
    });
    if (projectError) throw projectError;
    ownerClient = createSupabaseClient<Database>(status.url, status.publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    otherClient = createSupabaseClient<Database>(status.url, status.publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const ownerSignIn = await ownerClient.auth.signInWithPassword({ email: ownerUser.email!, password });
    const otherSignIn = await otherClient.auth.signInWithPassword({ email: otherUser.email!, password });
    if (ownerSignIn.error || otherSignIn.error) throw ownerSignIn.error ?? otherSignIn.error;
    serverState.client = ownerClient;
    serverState.auth = context(ownerUser.id);
  });

  afterAll(async () => {
    if (!admin) return;
    execFileSync("supabase", ["db", "query", "--local", `do $$ begin
      alter table public.calculation_project_associations disable trigger calculation_project_associations_immutable;
      delete from public.calculation_project_associations where organization_id='${ids.organization}';
      alter table public.calculation_project_associations enable trigger calculation_project_associations_immutable;
      update public.calculations set current_revision_id=null where organization_id='${ids.organization}';
      alter table public.calculation_revisions disable trigger calculation_revisions_immutable;
      delete from public.calculation_revisions where organization_id='${ids.organization}';
      delete from public.calculations where organization_id='${ids.organization}';
      delete from public.projects where organization_id='${ids.organization}';
      delete from public.organization_members where organization_id='${ids.organization}';
      delete from public.organizations where id='${ids.organization}';
      alter table public.calculation_revisions enable trigger calculation_revisions_immutable;
    end $$;`], { encoding: "utf8", env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } });
    if (ownerUser) await admin.auth.admin.deleteUser(ownerUser.id);
    if (otherUser) await admin.auth.admin.deleteUser(otherUser.id);
  });

  it("recalculates all three engines, preserves history, and isolates same-organization members", async () => {
    const gutterId = randomUUID();
    const save = (calculatorType: string, calculationId: string, name: string, input: unknown, expected: number) => saveStandaloneCalculationAction(form({
      organizationId: ids.organization, calculationId, calculatorType, name,
      input: JSON.stringify(input), expectedRevisionNumber: String(expected),
    }));

    expect(await save("gutters.material-estimate", gutterId, "DEMO eresz", gutterInput(6500), 0)).toMatchObject({ ok: true, revisionNumber: 1 });
    expect(await save("gutters.material-estimate", gutterId, "DEMO eresz", gutterInput(7000), 1)).toMatchObject({ ok: true, revisionNumber: 2 });
    expect(await save("gutters.material-estimate", gutterId, "DEMO eresz", gutterInput(7500), 1)).toMatchObject({ ok: false });
    const gutter = await getStandaloneCalculation(ids.organization, gutterId);
    expect(gutter?.revisions.map((revision) => revision.revisionNumber)).toEqual([2, 1]);
    expect(gutter?.revisions[1]?.input).toMatchObject(gutterInput(6500));
    expect(gutter?.revisions[1]?.output).toMatchObject({ totals: { gutterStockSections: 3 } });
    expect((await listStandaloneCalculations(ids.organization)).some((item) => item.calculationId === gutterId)).toBe(true);
    expect(await getStandaloneCalculation(ids.organization, gutterId, 1)).toMatchObject({ currentRevisionNumber: 2, revisions: [{ revisionNumber: 1 }] });

    const currentGutter = await getStandaloneCalculation(ids.organization, gutterId);
    const associationRequest = form({
      organizationId: ids.organization, projectId: ids.project, sourceCalculationId: gutterId,
      sourceRevisionId: currentGutter!.currentRevisionId!, operationId: randomUUID(), name: "DEMO projekt eresz",
      expectedProjectRevisionNumber: "0",
    });
    const firstAssociation = await associateStandaloneCalculationAction(associationRequest);
    expect(firstAssociation).toMatchObject({ ok: true, revisionNumber: 1, reused: false });
    expect(await associateStandaloneCalculationAction(associationRequest)).toMatchObject({ ok: true, revisionNumber: 1, reused: true });
    const mismatchRequest = form({
      organizationId: ids.organization, projectId: ids.project, sourceCalculationId: gutterId,
      sourceRevisionId: currentGutter!.currentRevisionId!, operationId: (associationRequest.get("operationId") as string),
      name: "DEMO másik név", expectedProjectRevisionNumber: "0",
    });
    expect(await associateStandaloneCalculationAction(mismatchRequest)).toMatchObject({ ok: false });

    const flashingId = randomUUID();
    expect(await save("sheet_metal.flashings.material-estimate", flashingId, "DEMO szegély", flashingInput, 0)).toMatchObject({ ok: true, revisionNumber: 1 });
    const flashing = await getStandaloneCalculation(ids.organization, flashingId);
    expect((flashing?.revisions[0]?.output as { runs: { status: string; estimatedSectionCount: number | null }[] }).runs[0]).toMatchObject({ status: "incomplete", estimatedSectionCount: null });

    const profileId = randomUUID();
    expect(await save("sheet_metal.profiles.flat-pattern", profileId, "DEMO L profil", profileInput, 0)).toMatchObject({ ok: true, revisionNumber: 1 });
    const profile = await getStandaloneCalculation(ids.organization, profileId);
    expect((profile?.revisions[0]?.output as { flatPattern: { widthMm: number | null } }).flatPattern.widthMm).toBeNull();

    serverState.client = otherClient;
    serverState.auth = context(otherUser.id);
    expect(await listStandaloneCalculations(ids.organization)).toEqual([]);
    expect(await getStandaloneCalculation(ids.organization, gutterId)).toBeNull();
    expect(await associateStandaloneCalculationAction(associationRequest)).toMatchObject({ ok: false });
  });
});

/* global process */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database";

const serverState = vi.hoisted(() => ({ client: null as unknown, auth: null as unknown }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => serverState.client }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => serverState.auth }));

import { getStandaloneCalculation, listStandaloneCalculations } from "./standalone-data";
import { saveStandaloneCalculationAction } from "./standalone-actions";

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

  it("recalculates the profile engine, preserves history, and isolates same-organization members", async () => {
    const save = (calculatorType: string, calculationId: string, name: string, input: unknown, expected: number) => saveStandaloneCalculationAction(form({
      organizationId: ids.organization, calculationId, calculatorType, name,
      input: JSON.stringify(input), expectedRevisionNumber: String(expected),
    }));

    const profileId = randomUUID();
    expect(await save("sheet_metal.profiles.flat-pattern", profileId, "DEMO L profil", profileInput, 0)).toMatchObject({ ok: true, revisionNumber: 1 });
    expect(await save("sheet_metal.profiles.flat-pattern", profileId, "DEMO L profil", profileInput, 1)).toMatchObject({ ok: true, revisionNumber: 2 });
    expect(await save("sheet_metal.profiles.flat-pattern", profileId, "DEMO L profil", profileInput, 1)).toMatchObject({ ok: false });
    const profile = await getStandaloneCalculation(ids.organization, profileId);
    expect(profile?.revisions.map((revision) => revision.revisionNumber)).toEqual([2, 1]);
    expect((profile?.revisions[1]?.output as { flatPattern: { widthMm: number | null } }).flatPattern.widthMm).toBeNull();
    expect((await listStandaloneCalculations(ids.organization)).some((item) => item.calculationId === profileId)).toBe(true);
    expect(await getStandaloneCalculation(ids.organization, profileId, 1)).toMatchObject({ currentRevisionNumber: 2, revisions: [{ revisionNumber: 1 }] });

    expect(await save("gutters.material-estimate", randomUUID(), "DEMO eresz", {}, 0)).toMatchObject({ ok: false });

    serverState.client = otherClient;
    serverState.auth = context(otherUser.id);
    expect(await listStandaloneCalculations(ids.organization)).toEqual([]);
    expect(await getStandaloneCalculation(ids.organization, profileId)).toBeNull();
  });
});

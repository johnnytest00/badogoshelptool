/* global process */

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";

const serverState = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => serverState.client }));

import { createGutterTakeoffDraftAction } from "./gutter-actions";
import { addMaterialTakeoffItemAction } from "@/features/material-takeoffs/takeoff-actions";

const runLocal = process.env.RUN_LOCAL_SUPABASE_ACTION_TESTS === "1";
const ids = {
  organization: randomUUID(), otherOrganization: randomUUID(), project: randomUUID(), otherProject: randomUUID(), foreignProject: randomUUID(),
  calculation: randomUUID(), otherCalculation: randomUUID(), foreignCalculation: randomUUID(), revision: randomUUID(), otherRevision: randomUUID(), foreignRevision: randomUUID(),
  product: randomUUID(), foreignProduct: randomUUID(), variant: randomUUID(), linearVariant: randomUUID(), foreignVariant: randomUUID(),
};
const password = `Local-${randomUUID()}-Aa1`;
const email = (label: string) => `f96121-${label}-${randomUUID()}@local.test`;
let admin: SupabaseClient<Database>;
let ownerClient: SupabaseClient<Database>;
let otherClient: SupabaseClient<Database>;
let ownerUser: User;
let otherUser: User;
let createdTakeoffId = "";

function localStatus() {
  const output = execFileSync("supabase", ["status", "--output", "env"], { encoding: "utf8" });
  const values = Object.fromEntries(output.split("\n").flatMap((line) => {
    const match = line.match(/^(?:export )?([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }));
  if (!values.API_URL?.startsWith("http://127.0.0.1:") || !values.PUBLISHABLE_KEY || !values.SERVICE_ROLE_KEY) throw new Error("A teszt kizárólag helyi Supabase példányon futhat.");
  return { url: values.API_URL, publishableKey: values.PUBLISHABLE_KEY, serviceRoleKey: values.SERVICE_ROLE_KEY };
}

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function transferForm(overrides: Partial<Record<string, string>> = {}) {
  return form({
    organizationId: ids.organization, projectId: ids.project, calculationId: ids.calculation, sourceRevisionId: ids.revision,
    requestKey: randomUUID(), name: "DEMO action boundary draft", mappings: JSON.stringify([{ candidateId: "gutter-section:front", variantId: ids.variant }]),
    ...overrides,
  });
}

async function requireSuccess(result: PromiseLike<{ error: unknown }>) {
  const { error } = await result;
  if (error) throw error;
}

const localDescribe = runLocal ? describe : describe.skip;

localDescribe("F9.6.1.2.1 local authenticated Server Action boundary", () => {
  beforeAll(async () => {
    const status = localStatus();
    admin = createSupabaseClient<Database>(status.url, status.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const ownerCreated = await admin.auth.admin.createUser({ email: email("owner"), password, email_confirm: true });
    const otherCreated = await admin.auth.admin.createUser({ email: email("other"), password, email_confirm: true });
    if (ownerCreated.error || !ownerCreated.data.user || otherCreated.error || !otherCreated.data.user) throw ownerCreated.error ?? otherCreated.error ?? new Error("A helyi tesztidentitás létrehozása sikertelen.");
    ownerUser = ownerCreated.data.user; otherUser = otherCreated.data.user;

    await requireSuccess(admin.from("organizations").insert([{ id: ids.organization, name: "DEMO F9.6.1.2.1 Action A" }, { id: ids.otherOrganization, name: "DEMO F9.6.1.2.1 Action B" }]));
    await requireSuccess(admin.from("organization_members").insert([{ organization_id: ids.organization, user_id: ownerUser.id, role: "owner" }, { organization_id: ids.otherOrganization, user_id: otherUser.id, role: "owner" }]));
    await requireSuccess(admin.from("projects").insert([
      { id: ids.project, organization_id: ids.organization, name: "DEMO action project", project_type: "gutter_work", status: "draft", created_by: ownerUser.id },
      { id: ids.otherProject, organization_id: ids.organization, name: "DEMO action other project", project_type: "gutter_work", status: "draft", created_by: ownerUser.id },
      { id: ids.foreignProject, organization_id: ids.otherOrganization, name: "DEMO action foreign project", project_type: "gutter_work", status: "draft", created_by: otherUser.id },
    ]));
    await requireSuccess(admin.from("calculations").insert([
      { id: ids.calculation, organization_id: ids.organization, project_id: ids.project, calculator_type: "gutters.material-estimate", display_name: "DEMO action calc", status: "current" },
      { id: ids.otherCalculation, organization_id: ids.organization, project_id: ids.otherProject, calculator_type: "gutters.material-estimate", display_name: "DEMO action other calc", status: "current" },
      { id: ids.foreignCalculation, organization_id: ids.otherOrganization, project_id: ids.foreignProject, calculator_type: "gutters.material-estimate", display_name: "DEMO action foreign calc", status: "current" },
    ]));
    const input = { gutterStockLengthMm: 4000, runs: [{ id: "front", name: "DEMO első eresz", lengthMm: 8500, measurementSource: "demo", roofEdge: null, bracketSpacingMm: null }], downpipes: [], manualComponents: [] };
    const output = { gutterRuns: [{ id: "front", name: "DEMO első eresz", lengthMm: 8500, stockSections: 3, remainderMm: 500, bracketEstimate: null, bracketBasis: null }], downpipeRuns: [], componentQuantities: [], totals: { gutterStockSections: 3, downpipeStockSections: 0, totalManualComponents: 0 }, assumptions: [], warnings: [] };
    await requireSuccess(admin.from("calculation_revisions").insert([
      { id: ids.revision, organization_id: ids.organization, calculation_id: ids.calculation, revision_number: 1, input_schema_version: "1.0.0", calculator_implementation_version: "1.0.0", input_snapshot: input, output_snapshot: output, data_provenance: { test: "F9.6.1.2.1" }, validation_status: "verified", warnings: [], created_by: ownerUser.id },
      { id: ids.otherRevision, organization_id: ids.organization, calculation_id: ids.otherCalculation, revision_number: 1, input_schema_version: "1.0.0", calculator_implementation_version: "1.0.0", input_snapshot: input, output_snapshot: output, data_provenance: { test: "F9.6.1.2.1" }, validation_status: "verified", warnings: [], created_by: ownerUser.id },
      { id: ids.foreignRevision, organization_id: ids.otherOrganization, calculation_id: ids.foreignCalculation, revision_number: 1, input_schema_version: "1.0.0", calculator_implementation_version: "1.0.0", input_snapshot: input, output_snapshot: output, data_provenance: { test: "F9.6.1.2.1" }, validation_status: "verified", warnings: [], created_by: otherUser.id },
    ]));
    await requireSuccess(admin.from("calculations").update({ current_revision_id: ids.revision }).eq("id", ids.calculation));
    await requireSuccess(admin.from("calculations").update({ current_revision_id: ids.otherRevision }).eq("id", ids.otherCalculation));
    await requireSuccess(admin.from("calculations").update({ current_revision_id: ids.foreignRevision }).eq("id", ids.foreignCalculation));
    await requireSuccess(admin.from("material_products").insert([
      { id: ids.product, organization_id: ids.organization, category: "gutter", name: "DEMO action gutter", status: "active", data_provenance: "demo", created_by: ownerUser.id },
      { id: ids.foreignProduct, organization_id: ids.otherOrganization, category: "gutter", name: "DEMO foreign gutter", status: "active", data_provenance: "demo", created_by: otherUser.id },
    ]));
    await requireSuccess(admin.from("material_variants").insert([
      { id: ids.variant, organization_id: ids.organization, product_id: ids.product, name: "DEMO action piece", purchasing_unit: "piece", length_mm: 4000, technical_specs: {}, data_provenance: "demo", created_by: ownerUser.id },
      { id: ids.linearVariant, organization_id: ids.organization, product_id: ids.product, name: "DEMO action linear", purchasing_unit: "linear_meter", technical_specs: {}, data_provenance: "demo", created_by: ownerUser.id },
      { id: ids.foreignVariant, organization_id: ids.otherOrganization, product_id: ids.foreignProduct, name: "DEMO foreign piece", purchasing_unit: "piece", length_mm: 4000, technical_specs: {}, data_provenance: "demo", created_by: otherUser.id },
    ]));

    ownerClient = createSupabaseClient<Database>(status.url, status.publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    otherClient = createSupabaseClient<Database>(status.url, status.publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const ownerSignIn = await ownerClient.auth.signInWithPassword({ email: ownerUser.email!, password });
    const otherSignIn = await otherClient.auth.signInWithPassword({ email: otherUser.email!, password });
    if (ownerSignIn.error || otherSignIn.error) throw ownerSignIn.error ?? otherSignIn.error;
    serverState.client = ownerClient;
  });

  afterAll(async () => {
    if (!admin) return;
    const cleanup = `do $$ begin
      alter table public.material_takeoff_items disable trigger material_takeoff_items_approved_immutable;
      alter table public.material_takeoffs disable trigger material_takeoffs_approved_immutable;
      alter table public.calculation_revisions disable trigger calculation_revisions_immutable;
      delete from public.material_takeoff_items where organization_id in ('${ids.organization}','${ids.otherOrganization}');
      delete from public.material_takeoffs where organization_id in ('${ids.organization}','${ids.otherOrganization}');
      delete from public.material_variants where organization_id in ('${ids.organization}','${ids.otherOrganization}');
      delete from public.material_products where organization_id in ('${ids.organization}','${ids.otherOrganization}');
      update public.calculations set current_revision_id=null where organization_id in ('${ids.organization}','${ids.otherOrganization}');
      delete from public.calculation_revisions where organization_id in ('${ids.organization}','${ids.otherOrganization}');
      delete from public.calculations where organization_id in ('${ids.organization}','${ids.otherOrganization}');
      delete from public.projects where organization_id in ('${ids.organization}','${ids.otherOrganization}');
      delete from public.organization_members where organization_id in ('${ids.organization}','${ids.otherOrganization}');
      delete from public.organizations where id in ('${ids.organization}','${ids.otherOrganization}');
      alter table public.calculation_revisions enable trigger calculation_revisions_immutable;
      alter table public.material_takeoffs enable trigger material_takeoffs_approved_immutable;
      alter table public.material_takeoff_items enable trigger material_takeoff_items_approved_immutable;
    end $$;`;
    execFileSync("supabase", ["db", "query", "--local", cleanup], { encoding: "utf8" });
    if (ownerUser) await admin.auth.admin.deleteUser(ownerUser.id);
    if (otherUser) await admin.auth.admin.deleteUser(otherUser.id);
  });

  it("A: creates an atomic draft for a valid authenticated owner", async () => {
    serverState.client = ownerClient;
    const result = await createGutterTakeoffDraftAction(transferForm());
    expect(result.ok).toBe(true); expect(result.takeoffId).toMatch(/^[0-9a-f-]{36}$/i);
    createdTakeoffId = result.takeoffId!;
  });

  it("B: rejects a calculation from another organization", async () => {
    const result = await createGutterTakeoffDraftAction(transferForm({ calculationId: ids.foreignCalculation, sourceRevisionId: ids.foreignRevision }));
    expect(result.ok).toBe(false);
  });

  it("C: rejects a catalog variant from another organization", async () => {
    const result = await createGutterTakeoffDraftAction(transferForm({ mappings: JSON.stringify([{ candidateId: "gutter-section:front", variantId: ids.foreignVariant }]) }));
    expect(result.ok).toBe(false);
  });

  it("D: rejects a calculation from another project", async () => {
    const result = await createGutterTakeoffDraftAction(transferForm({ calculationId: ids.otherCalculation, sourceRevisionId: ids.otherRevision }));
    expect(result.ok).toBe(false);
  });

  it("E: rejects a nonexistent revision", async () => {
    const result = await createGutterTakeoffDraftAction(transferForm({ sourceRevisionId: randomUUID() }));
    expect(result.ok).toBe(false);
  });

  it("F: rejects an incompatible purchasing unit", async () => {
    const result = await createGutterTakeoffDraftAction(transferForm({ mappings: JSON.stringify([{ candidateId: "gutter-section:front", variantId: ids.linearVariant }]) }));
    expect(result.ok).toBe(false);
  });

  it("G: rejects create and add attempts by another authenticated organization member", async () => {
    serverState.client = otherClient;
    expect((await createGutterTakeoffDraftAction(transferForm())).ok).toBe(false);
    expect((await addMaterialTakeoffItemAction(form({ organizationId: ids.organization, projectId: ids.project, takeoffId: createdTakeoffId, variantId: ids.variant }))).ok).toBe(false);
    serverState.client = ownerClient;
  });

  it("H: rejects item changes after the transferred draft is approved", async () => {
    const { error } = await ownerClient.rpc("approve_material_takeoff", { p_organization_id: ids.organization, p_takeoff_id: createdTakeoffId, p_expected_version: 1 });
    expect(error).toBeNull();
    const result = await addMaterialTakeoffItemAction(form({ organizationId: ids.organization, projectId: ids.project, takeoffId: createdTakeoffId, variantId: ids.variant }));
    expect(result.ok).toBe(false); expect(result.error).toBe("Csak piszkozat módosítható.");
  });
});

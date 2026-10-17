/* global process */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";

const state = vi.hoisted(() => ({ client: null as unknown, auth: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => state.client }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));

import { saveGableRoofAction } from "./roof-model-actions";
import { saveSheetLayoutAction } from "./sheet-layout-actions";

const localDescribe = process.env.RUN_LOCAL_SHEET_LAYOUT_TESTS === "1" ? describe : describe.skip;
const fixture = randomUUID();
const organizationId = randomUUID(), projectId = randomUUID(), productId = randomUUID(), variantId = randomUUID();
let admin: SupabaseClient<Database>;
let owner: { id: string; client: SupabaseClient<Database> };
let outsider: { id: string; client: SupabaseClient<Database> };
let roofModelId = "";
let roofRevisionId = "";
let geometryRevisionId = "";
let layoutCalculationId = "";

function localStatus() {
  const output = execFileSync("supabase", ["status", "--output", "env"], { encoding: "utf8", env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" } });
  const values = Object.fromEntries(output.split("\n").flatMap((line) => {
    const match = line.match(/^(?:export )?([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }));
  const writerLine = readFileSync(".env.local", "utf8").split("\n").find((line) => line.startsWith("COVERING_WRITER_DATABASE_URL="));
  if (writerLine) process.env.COVERING_WRITER_DATABASE_URL = writerLine.slice(writerLine.indexOf("=") + 1).replace(/^['"]|['"]$/g, "");
  if (!values.API_URL?.startsWith("http://127.0.0.1:") || !values.PUBLISHABLE_KEY || !values.SERVICE_ROLE_KEY
      || !process.env.COVERING_WRITER_DATABASE_URL?.includes("@127.0.0.1:54322/")) throw new Error("Only configured local Supabase may be tested");
  return { url: values.API_URL, publishableKey: values.PUBLISHABLE_KEY, serviceRoleKey: values.SERVICE_ROLE_KEY };
}

function asActor(user: { id: string; client: SupabaseClient<Database> }, member = true) {
  state.client = user.client;
  state.auth = { userId: user.id, organizations: member ? [{ id: organizationId, role: "owner" }] : [] };
}

function roofForm() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    organizationId, projectId, roofModelId: "", newRoofModelId: randomUUID(), operationId: randomUUID(), expectedRevisionNumber: "0",
    inputMode: "height", name: `DEMO F9.31 nyeregtető ${fixture}`, buildingLengthMm: "10000", buildingWidthMm: "6000",
    roofRiseMm: "4000", eaveOverhangMm: "0", frontGableOverhangMm: "0", rearGableOverhangMm: "0",
  })) data.set(key, value);
  return data;
}

function layoutForm(operationId = randomUUID(), expectedRevisionNumber = 0, alignment: "left" | "right" = "left", endAllowanceMm = "") {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    organizationId, projectId, roofModelId, variantId, operationId, layoutCalculationId, expectedRevisionNumber: String(expectedRevisionNumber),
    displayName: `DEMO lemezkiosztás ${fixture}`, alignment, effectiveCoveringWidthMm: "", nominalSheetWidthMm: "",
    minimumSheetLengthMm: "", maximumSheetLengthMm: "", endAllowanceMm,
  })) data.set(key, value);
  return data;
}

localDescribe("F9.31 local Auth/RLS sheet-layout writer", () => {
  beforeAll(async () => {
    const status = localStatus();
    admin = createSupabaseClient<Database>(status.url, status.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const createUser = async (label: string) => {
      const email = `sheet-layout-${label}-${fixture}@local.test`, password = `Local-${randomUUID()}-Aa1`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { fixture: "DEMO F9.31 sheet layout" } });
      if (created.error || !created.data.user) throw created.error ?? new Error("local test user missing");
      const client = createSupabaseClient<Database>(status.url, status.publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const signedIn = await client.auth.signInWithPassword({ email, password });
      if (signedIn.error) throw signedIn.error;
      return { id: created.data.user.id, client };
    };
    [owner, outsider] = await Promise.all([createUser("owner"), createUser("outsider")]);
    const organization = await admin.from("organizations").insert({ id: organizationId, name: `DEMO F9.31 sheet layout ${fixture}` });
    if (organization.error) throw organization.error;
    const member = await admin.from("organization_members").insert({ organization_id: organizationId, user_id: owner.id, role: "owner" });
    if (member.error) throw member.error;
    const project = await admin.from("projects").insert({ id: projectId, organization_id: organizationId, name: `DEMO project ${fixture}`, project_type: "roof_renovation", status: "draft", created_by: owner.id });
    if (project.error) throw project.error;
    const category = await admin.from("material_categories").select("id").eq("organization_id", organizationId).eq("legacy_category", "roof_covering").eq("is_default", true).single();
    if (category.error || !category.data) throw category.error ?? new Error("local roof-covering category missing");
    const product = await admin.from("material_products").insert({ id: productId, organization_id: organizationId, category_id: category.data.id, category: "roof_covering", name: `DEMO sheet product ${fixture}`, status: "active", data_provenance: "demo", created_by: owner.id });
    if (product.error) throw product.error;
    const variant = await admin.from("material_variants").insert({ id: variantId, organization_id: organizationId, product_id: productId, name: "DEMO 1000/900", purchasing_unit: "square_meter", nominal_width_mm: 1000, effective_width_mm: 900, technical_specs: { end_allowance_mm: "0" }, data_provenance: "demo", created_by: owner.id });
    if (variant.error) throw variant.error;
    asActor(owner);
    const savedRoof = await saveGableRoofAction(roofForm());
    if (!savedRoof.ok || !savedRoof.roofModelId) throw new Error(`local roof fixture failed: ${savedRoof.error}`);
    roofModelId = savedRoof.roofModelId;
    const model = await owner.client.from("roof_models").select("current_revision_id").eq("id", roofModelId).single();
    const geometry = await owner.client.from("calculations").select("id,current_revision_id").eq("roof_model_id", roofModelId).eq("calculator_type", "roof.gable").single();
    if (model.error || geometry.error || !model.data.current_revision_id || !geometry.data.current_revision_id) throw model.error ?? geometry.error ?? new Error("saved geometry source missing");
    roofRevisionId = model.data.current_revision_id;
    geometryRevisionId = geometry.data.current_revision_id;
  });

  it("persists V1 through the restricted writer, retries idempotently, and preserves revisions under two concurrent V2 writes", async () => {
    asActor(owner);
    const operationId = randomUUID();
    const first = await saveSheetLayoutAction({ ok: false }, layoutForm(operationId));
    expect(first).toMatchObject({ ok: true, revisionNumber: 1, revisionCreated: true });
    const sameRequest = await saveSheetLayoutAction({ ok: false }, layoutForm(operationId));
    expect(sameRequest).toEqual(first);

    const layout = await owner.client.from("calculations").select("id,current_revision_id").eq("roof_model_id", roofModelId).eq("calculator_type", "covering.metal-sheets.layout").single();
    if (layout.error) throw layout.error;
    layoutCalculationId = layout.data.id;
    const historyBefore = await owner.client.from("calculation_revisions").select("id,revision_number,input_snapshot,output_snapshot").eq("calculation_id", layoutCalculationId).order("revision_number");
    if (historyBefore.error) throw historyBefore.error;
    expect(historyBefore.data).toHaveLength(1);
    expect(historyBefore.data[0]).toMatchObject({ revision_number: 1, input_snapshot: { source: { roofRevisionId, geometryCalculationRevisionId: geometryRevisionId }, material: { catalogSnapshot: { variantId } } } });

    const writes = await Promise.all([
      saveSheetLayoutAction({ ok: false }, layoutForm(randomUUID(), 1, "left", "25")),
      saveSheetLayoutAction({ ok: false }, layoutForm(randomUUID(), 1, "right")),
    ]);
    expect(writes.filter((write) => write.ok)).toHaveLength(1);
    expect(writes.filter((write) => !write.ok)).toHaveLength(1);
    expect(writes.find((write) => !write.ok)?.error).toContain("időközben megváltozott");

    const historyAfter = await owner.client.from("calculation_revisions").select("id,revision_number,input_snapshot").eq("calculation_id", layoutCalculationId).order("revision_number");
    if (historyAfter.error) throw historyAfter.error;
    expect(historyAfter.data.map((revision) => revision.revision_number)).toEqual([1, 2]);
    expect(historyAfter.data[0]?.id).toBe(historyBefore.data[0]?.id);
  });

  it("rejects unauthorized action and direct authenticated execution while keeping the restricted writer private", async () => {
    asActor(outsider, false);
    expect(await saveSheetLayoutAction({ ok: false }, layoutForm())).toMatchObject({ ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." });
    const direct = await (owner.client as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { code?: string } | null }> }).rpc("save_metal_sheet_layout_secure", {});
    expect(direct.error).not.toBeNull();

    const adminConnection = new Client({ host: "127.0.0.1", port: 54322, user: "postgres", password: "postgres", database: "postgres" });
    await adminConnection.connect();
    try {
      const privileges = await adminConnection.query(`select
        has_function_privilege('authenticated','public.save_metal_sheet_layout_secure(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer,uuid,uuid)','EXECUTE') as authenticated_can_write,
        has_function_privilege('tetopro_covering_writer','public.save_metal_sheet_layout_secure(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer,uuid,uuid)','EXECUTE') as writer_can_call,
        has_function_privilege('authenticated','public.save_metal_sheet_layout(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer)','EXECUTE') as legacy_authenticated_can_write`);
      expect(privileges.rows[0]).toEqual({ authenticated_can_write: false, writer_can_call: true, legacy_authenticated_can_write: false });
    } finally { await adminConnection.end(); }
  });
});

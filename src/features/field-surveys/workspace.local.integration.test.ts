/* global process */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { savedQuantitySummary, type SurveySection } from "@/domain/field-surveys/workspace";
const state = vi.hoisted(() => ({ client: null as unknown, auth: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => state.client }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));
import { saveFieldSurveyAction } from "./field-survey-actions";
import { getFieldSurvey, getFieldSurveyRevision } from "./field-survey-data";
import { createSurveyFollowups, linkSurveyCalculation, loadSurveyCalculator } from "./workspace-actions";
import { getSurveyRelationships } from "./workspace-data";
import { saveStandaloneCalculationAction } from "@/features/calculations/standalone-actions";
import { getStandaloneQuotationHeaderAction, readStandaloneQuotationAction } from "@/features/quotations/standalone-quotation-actions";
import { saveGableTrapezoidalCovering } from "@/features/roof-models/gable-trapezoidal-covering-actions";
import { saveGableMetalTileCovering } from "@/features/roof-models/gable-metal-tile-covering-actions";
import { reserveFieldSurveyPhoto, attachFieldSurveyPhoto, removeFieldSurveyPhoto } from "@/infrastructure/supabase/field-survey-photo-writer";
import { getQuotationWorkspace } from "@/features/quotations/quotation-data";

const run = process.env.RUN_LOCAL_SURVEY_WORKSPACE_TESTS === "1" ? describe : describe.skip;
const org = randomUUID(), foreignOrg = randomUUID();
let admin: SupabaseClient<Database>;
let owner: { id: string; client: SupabaseClient<Database> }, peer: typeof owner, outsider: typeof owner;
function act(user: typeof owner, organization = org) { state.client = user.client; state.auth = { userId: user.id, organizations: [{ id: organization, role: "owner" }] }; }
function section(type: SurveySection["workType"], values: { semanticType: SurveySection["measurements"][number]["semanticType"]; value: number; unit: "m" | "mm" }[]): SurveySection {
  return { id: randomUUID(), name: `DEMO ${type}`, workType: type, notes: "DEMO F9.7.9", photoIds: [], measurements: values.map((value) => ({ id: randomUUID(), label: `DEMO ${value.semanticType}`, ...value })) };
}
function save(sections: SurveySection[], surveyId: string = randomUUID(), version = 0) {
  const data = new FormData(); Object.entries({ organizationId: org, surveyId, expectedVersion: String(version), projectId: "", workType: sections[0].workType, measurements: JSON.stringify(sections.flatMap((item) => item.measurements.filter((m) => m.value !== null))), sections: JSON.stringify(sections), notes: sections[0].notes }).forEach(([key, value]) => data.set(key, value));
  return saveFieldSurveyAction(data);
}
const gutter = () => section("gutter", [{ semanticType: "gutter_run_length", value: 8.5, unit: "m" }, { semanticType: "gutter_stock_length", value: 4000, unit: "mm" }]);
run("F9.7.9 real local Auth/RLS complete application workflows", () => {
  beforeAll(async () => {
    const status = JSON.parse(execFileSync("supabase", ["status", "--output", "json"], { encoding: "utf8" }));
    if (!status.API_URL.startsWith("http://127.0.0.1:")) throw new Error("Local database required");
    const writer = readFileSync(".env.local", "utf8").split("\n").find((line) => line.startsWith("COVERING_WRITER_DATABASE_URL="));
    if (writer) process.env.COVERING_WRITER_DATABASE_URL = writer.slice(writer.indexOf("=") + 1).replace(/^['"]|['"]$/g, "");
    admin = createSupabaseClient<Database>(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    async function user(label: string) {
      const email = `survey-${label}-${randomUUID()}@local.test`, password = `Local-${randomUUID()}-Aa1`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { fixture: "DEMO F9.7.9" } });
      if (created.error || !created.data.user) throw created.error;
      const client = createSupabaseClient<Database>(status.API_URL, status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const signed = await client.auth.signInWithPassword({ email, password }); if (signed.error) throw signed.error;
      return { id: created.data.user.id, client };
    }
    [owner, peer, outsider] = await Promise.all([user("owner"), user("peer"), user("outsider")]);
    const organizations = await admin.from("organizations").insert([{ id: org, name: "DEMO F9.7.9 integration" }, { id: foreignOrg, name: "DEMO F9.7.9 foreign" }]); if (organizations.error) throw organizations.error;
    const memberships = await admin.from("organization_members").insert([{ organization_id: org, user_id: owner.id, role: "owner" }, { organization_id: org, user_id: peer.id, role: "member" }, { organization_id: foreignOrg, user_id: outsider.id, role: "owner" }]); if (memberships.error) throw memberships.error;
    act(owner);
  });
  it("A: standalone gutter saves/reopens measurements and actual private photo, runs and links existing calculator", async () => {
    act(owner);
    const sections = [gutter()];
    const saved = await save(sections); expect(saved.ok, saved.error).toBe(true);
    const photoId = randomUUID(), key = `${org}/${saved.surveyId}/${photoId}.png`;
    const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1cAAAAASUVORK5CYII=", "base64"));
    const { createHash } = await import("node:crypto");
    await reserveFieldSurveyPhoto({ surveyId: saved.surveyId!, organizationId: org, photoId, objectKey: key, filename: "DEMO helyszín.png", mimeType: "image/png", fileSize: png.length, sha256: createHash("sha256").update(png).digest("hex"), description: "DEMO", requestKey: photoId, expectedVersion: 1, actorId: owner.id });
    const upload = await owner.client.storage.from("field-survey-photos").upload(key, png, { contentType: "image/png" }); expect(upload.error).toBeNull();
    const attached = await attachFieldSurveyPhoto({ surveyId: saved.surveyId!, organizationId: org, photoId, expectedVersion: 1, actorId: owner.id }); expect(attached.version).toBe(2);
    sections[0].photoIds = [photoId]; expect((await save(sections, saved.surveyId, 2)).ok).toBe(true);
    const reopened = await getFieldSurvey(org, saved.surveyId!); expect(reopened?.sections?.[0].photoIds).toEqual([photoId]);
    const context = await loadSurveyCalculator({ organizationId: org, surveyId: saved.surveyId!, version: 3, sectionId: sections[0].id }); expect(context.handoff.calculator).toBe("gutter");
    if (context.handoff.calculator !== "gutter") throw new Error("wrong handoff");
    const data = new FormData(); Object.entries({ organizationId: org, calculationId: randomUUID(), calculatorType: "gutters.material-estimate", name: "DEMO F9.7.9 eresz", input: JSON.stringify(context.handoff.input), expectedRevisionNumber: "0" }).forEach(([key, value]) => data.set(key, value));
    const calculation = await saveStandaloneCalculationAction(data); expect(calculation.ok).toBe(true); if (!calculation.ok) throw new Error(calculation.error);
    expect(await linkSurveyCalculation({ organizationId: org, surveyId: saved.surveyId!, version: 3, sectionId: sections[0].id, saved: calculation })).toEqual({ ok: true });
    const relationships = await getSurveyRelationships(org, saved.surveyId!); expect(relationships.calculations[0]).toMatchObject({ revisionId: calculation.revisionId, surveyVersion: 3 });
    expect(relationships.calculations[0].output).toMatchObject({ totals: { gutterStockSections: 3 } });
    await removeFieldSurveyPhoto({ surveyId: saved.surveyId!, photoId, expectedVersion: 3, actorId: owner.id });
    expect((await getFieldSurveyRevision(org, saved.surveyId!, 3))?.sections?.[0].photoIds).toEqual([photoId]);
    expect((await getFieldSurvey(org, saved.surveyId!))?.sections?.[0].photoIds).toEqual([]);
    expect((await owner.client.storage.from("field-survey-photos").download(key)).error).toBeNull();
  });
  it("preserves the committed project when a later quotation request fails, then retries safely", async () => {
    act(owner);
    const saved = await save([gutter()]); expect(saved.ok).toBe(true);
    const rpc = owner.client.rpc.bind(owner.client);
    const spy = vi.spyOn(owner.client, "rpc").mockImplementation((...args) => {
      if (args[0] === "create_field_survey_followup" && (args[1] as { p_kind?: string })?.p_kind === "quotation") throw new Error("DEMO interrupted quotation response");
      return rpc(...args);
    });
    const input = { organizationId: org, surveyId: saved.surveyId!, version: 1, project: true, quotation: true, projectId: null, name: "DEMO recovery" };
    const partial = await createSurveyFollowups(input); spy.mockRestore();
    expect(partial.ok).toBe(false); expect(partial.results).toHaveLength(1); expect(partial.results[0].projectId).toBeTruthy();
    const recovered = await createSurveyFollowups(input); expect(recovered.ok, recovered.error).toBe(true); expect(recovered.results).toHaveLength(2); expect(recovered.results[0].projectId).toBe(partial.results[0].projectId);
  });
  it("B–E: multi-section workspace, independent project/quotation options, retry and immutable source", async () => {
    act(owner);
    const sections = [section("roof", [{ semanticType: "roof_building_length", value: 10, unit: "m" }, { semanticType: "roof_building_width", value: 6, unit: "m" }, { semanticType: "roof_rise", value: 4, unit: "m" }]), gutter(), section("flashing", [{ semanticType: "flashing_run_length", value: 10, unit: "m" }])];
    const saved = await save(sections); expect(saved.ok).toBe(true);
    for (const item of sections) { const context = await loadSurveyCalculator({ organizationId: org, surveyId: saved.surveyId!, version: 1, sectionId: item.id }); expect(context.handoff.calculator).toBe(item.workType); }
    const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10000, buildingWidthMm: 6000, roofRiseMm: 4000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
    const covering = await saveGableTrapezoidalCovering({ organizationId: org, calculationId: randomUUID(), operationId: randomUUID(), expectedRevisionNumber: 0, name: "DEMO survey trapéz", scope: { kind: "standalone" }, geometryInput, coveringInput: { nominalSheetWidthMm: 1100, effectiveCoveringWidthMm: 1000, selectedSheetLengthMm: 5000, minimumSheetLengthMm: null, maximumSheetLengthMm: null, endAllowanceMm: null, longitudinalOverlapMm: null, lapCompatibilityConfirmed: false } });
    expect(covering.ok, covering.error).toBe(true);
    expect((await linkSurveyCalculation({ organizationId: org, surveyId: saved.surveyId!, version: 1, sectionId: sections[0].id, saved: { calculationId: covering.calculationId!, revisionId: covering.revisionId!, revisionNumber: covering.revisionNumber! } })).ok).toBe(true);
    const metal = await saveGableMetalTileCovering({ organizationId: org, calculationId: randomUUID(), operationId: randomUUID(), expectedRevisionNumber: 0, name: "DEMO survey cserepeslemez", scope: { kind: "standalone" }, geometryInput, productInput: { nominalSheetWidthMm: 1200, effectiveCoveringWidthMm: 1000, physicalSheetLengthMm: 5100, effectiveCoveringLengthMm: 5000, minimumPhysicalLengthMm: null, maximumPhysicalLengthMm: null, eaveEndAllowanceMm: 0, ridgeEndAllowanceMm: 0, longitudinalOverlapMm: 0, lengthCompatibilityConfirmed: true, lengthDataSource: "DEMO feltételes termékadat", isModular: false, moduleBaseLengthMm: null, modulePitchMm: null, moduleCount: null } });
    expect(metal.ok, metal.error).toBe(true);
    expect((await linkSurveyCalculation({ organizationId: org, surveyId: saved.surveyId!, version: 1, sectionId: sections[0].id, saved: { calculationId: metal.calculationId!, revisionId: metal.revisionId!, revisionNumber: metal.revisionNumber! } })).ok).toBe(true);
    const source = { kind: "demo", label: "DEMO megadott hossz" };
    const flashingForm = new FormData();
    Object.entries({ organizationId: org, calculationId: randomUUID(), calculatorType: "sheet_metal.flashings.material-estimate", expectedRevisionNumber: "0", name: "DEMO survey szegély", input: JSON.stringify({ sectionSpec: { nominalLengthMm: 2000, nominalLengthSource: source, connection: { mode: "explicit_overlap", overlapMm: 100, source } }, runs: [{ id: randomUUID(), name: "DEMO szegélyszakasz", category: "custom", lengthMm: 10000, lengthSource: "site_measurement" }], manualComponents: [] }) }).forEach(([key, value]) => flashingForm.set(key, value));
    const flashing = await saveStandaloneCalculationAction(flashingForm); expect(flashing.ok).toBe(true); if (!flashing.ok) throw new Error(flashing.error);
    expect((await linkSurveyCalculation({ organizationId: org, surveyId: saved.surveyId!, version: 1, sectionId: sections[2].id, saved: flashing })).ok).toBe(true);
    const savedLinks = (await getSurveyRelationships(org, saved.surveyId!)).calculations;
    expect(savedLinks).toHaveLength(3);
    expect(savedLinks.flatMap((link) => savedQuantitySummary(link.calculatorType, link.output)).map((quantity) => quantity.value).sort((a,b) => a-b)).toEqual([6,20,20]);
    const input = { organizationId: org, surveyId: saved.surveyId!, version: 1, project: false, quotation: false, projectId: null, name: "DEMO F9.7.9 felújítás" };
    expect((await createSurveyFollowups(input)).results).toEqual([]);
    const standalone = await createSurveyFollowups({ ...input, quotation: true }); expect(standalone.ok, standalone.error).toBe(true);
    const header = await getStandaloneQuotationHeaderAction(org, standalone.results[0].quotationId!); expect(header.ok && header.data.status).toBe("draft");
    expect((await readStandaloneQuotationAction(org, standalone.results[0].quotationId!, standalone.results[0].quotationRevisionId!)).ok).toBe(true);
    const project = await createSurveyFollowups({ ...input, project: true }); expect(project.ok, project.error).toBe(true);
    const existingSurvey = await save([gutter()]); expect(existingSurvey.ok).toBe(true);
    const existingLink = await createSurveyFollowups({ ...input, surveyId: existingSurvey.surveyId!, project: true, projectId: project.results[0].projectId });
    expect(existingLink.ok, existingLink.error).toBe(true); expect(existingLink.results[0].projectId).toBe(project.results[0].projectId);
    expect((await getFieldSurvey(org, existingSurvey.surveyId!))?.projectId).toBeNull();
    const both = await createSurveyFollowups({ ...input, project: true, quotation: true }); expect(both.ok, both.error).toBe(true); expect(both.results[0].projectId).toBe(project.results[0].projectId);
    const retry = await createSurveyFollowups({ ...input, project: true, quotation: true }); expect(retry.results).toEqual(both.results);
    const projectQuotes = await getQuotationWorkspace(org, project.results[0].projectId!); expect(projectQuotes.quotations.find((row) => row.id === both.results[1].quotationId)?.status).toBe("draft");
    expect((await getFieldSurveyRevision(org, saved.surveyId!, 1))?.sections).toEqual(sections);
    expect((await getFieldSurvey(org, saved.surveyId!))?.projectId).toBeNull();
    act(peer); expect((await getStandaloneQuotationHeaderAction(org, standalone.results[0].quotationId!)).ok).toBe(false); expect(await getFieldSurvey(org, saved.surveyId!)).toBeNull();
    act(outsider, foreignOrg); expect(await getFieldSurvey(org, saved.surveyId!)).toBeNull();
    expect((await outsider.client.rpc("create_field_survey_followup", { p_survey_id: saved.surveyId!, p_revision_id: both.results[0].surveyRevisionId, p_kind: "project", p_project_id: null, p_name: "DEMO denied" })).error?.code).toBe("42501");
    act(owner);
  });
}, 30000);

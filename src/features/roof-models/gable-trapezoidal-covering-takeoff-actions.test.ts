import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ auth: null as unknown, saved: null as unknown, project: null as unknown }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));
vi.mock("@/features/projects/project-data", () => ({ getProjectForOrganization: async () => state.project }));
vi.mock("./gable-trapezoidal-covering-data", () => ({ getGableTrapezoidalCovering: async () => state.saved }));
vi.mock("@/infrastructure/supabase/gable-covering-takeoff-writer", () => ({ createGableCoveringTakeoffDraft: vi.fn(async () => ({ takeoff_id: "takeoff", takeoff_item_id: "item", draft_created: true, stale_source: true })) }));

import { createGableCoveringTakeoffDraft } from "@/infrastructure/supabase/gable-covering-takeoff-writer";
import { createGableCoveringTakeoffAction } from "./gable-trapezoidal-covering-takeoff-actions";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateGableTrapezoidalCovering } from "@/domain/calculations/gable-trapezoidal-covering";

const organizationId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const calculationId = "33333333-3333-4333-8333-333333333333";
const revisionId = "44444444-4444-4444-8444-444444444444";
const variantId = "55555555-5555-4555-8555-555555555555";
const operationId = "66666666-6666-4666-8666-666666666666";
const roofModelId = "77777777-7777-4777-8777-777777777777";
const roofRevisionId = "88888888-8888-4888-8888-888888888888";
const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const coveringInput = { nominalSheetWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, selectedSheetLengthMm: 5_000, minimumSheetLengthMm: null, maximumSheetLengthMm: null, endAllowanceMm: null, longitudinalOverlapMm: null, lapCompatibilityConfirmed: false, maximumSheetCount: 100_000 };
const geometry = calculateGableRoof(geometryInput);
const covering = calculateGableTrapezoidalCovering(geometry, coveringInput);
const revision = { revisionId, revisionNumber: 1, input: { scope: "project", source: { mode: "project", projectId, roofModelId, roofModelRevisionId: roofRevisionId, geometryCalculationId: calculationId, geometryCalculationRevisionId: revisionId, geometryInput }, coveringInput }, output: { geometry, covering }, validationStatus: "estimated", createdAt: "2026-10-14T00:00:00Z" };

describe("fedési revízió anyagkimutatás action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.auth = { userId: "actor", organizations: [{ id: organizationId }] };
    state.project = { id: projectId, organizationId };
    state.saved = { calculationId, projectId, roofModelId, revisions: [revision] };
  });

  it("a kért történeti forrásrevízióból ír, és a darabszámot nem fogadja a kliensből", async () => {
    const result = await createGableCoveringTakeoffAction({ organizationId, projectId, calculationId, revisionId, variantId, operationId, name: "DEMO fedés", quantity: 110 });
    expect(result).toMatchObject({ ok: true, takeoffId: "takeoff", takeoffItemId: "item", created: true, staleSource: true, source: { revisionId, roofModelRevisionId: roofRevisionId } });
    expect(vi.mocked(createGableCoveringTakeoffDraft).mock.calls[0]?.[0]).toMatchObject({
      organizationId, projectId, calculationId, revisionId, variantId, operationId, actorId: "actor",
    });
    expect(vi.mocked(createGableCoveringTakeoffDraft).mock.calls[0]?.[0]).not.toHaveProperty("quantity");
  });

  it("megtagadja a másik szervezet, projekt vagy idegen revízió kérését", async () => {
    state.auth = { userId: "actor", organizations: [] };
    expect(await createGableCoveringTakeoffAction({ organizationId, projectId, calculationId, revisionId, variantId, operationId, name: "DEMO" })).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
    expect(createGableCoveringTakeoffDraft).not.toHaveBeenCalled();
    state.auth = { userId: "actor", organizations: [{ id: organizationId }] };
    expect(await createGableCoveringTakeoffAction({ organizationId, projectId, calculationId, revisionId: "99999999-9999-4999-8999-999999999999", variantId, operationId, name: "DEMO" })).toMatchObject({ ok: false, code: "SOURCE_NOT_FOUND" });
    expect(createGableCoveringTakeoffDraft).not.toHaveBeenCalled();
  });

  it("a több soros forrást UNSUPPORTED válasszal utasítja el írás előtt", async () => {
    const multi = { ...coveringInput, selectedSheetLengthMm: 3_000, longitudinalOverlapMm: 100, lapCompatibilityConfirmed: true };
    const multiOutput = { geometry, covering: calculateGableTrapezoidalCovering(geometry, multi) };
    state.saved = { calculationId, projectId, roofModelId, revisions: [{ ...revision, input: { ...revision.input, coveringInput: multi }, output: multiOutput }] };
    expect(await createGableCoveringTakeoffAction({ organizationId, projectId, calculationId, revisionId, variantId, operationId, name: "DEMO" })).toMatchObject({ ok: false, code: "UNSUPPORTED_LAYOUT" });
    expect(createGableCoveringTakeoffDraft).not.toHaveBeenCalled();
  });
});

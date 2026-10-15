import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ auth: null as unknown, project: null as unknown, saved: null as unknown }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));
vi.mock("@/features/projects/project-data", () => ({ getProjectForOrganization: async () => state.project }));
vi.mock("./gable-metal-tile-covering-data", () => ({ getGableMetalTileCovering: async () => state.saved }));
vi.mock("@/infrastructure/supabase/gable-metal-tile-takeoff-writer", () => ({ createGableMetalTileTakeoffDraft: vi.fn(async () => ({ takeoff_id: "takeoff", takeoff_item_id: "item", draft_created: true, stale_source: false })) }));

import { createGableMetalTileTakeoffDraft } from "@/infrastructure/supabase/gable-metal-tile-takeoff-writer";
import { createGableMetalTileTakeoffAction } from "./gable-metal-tile-takeoff-actions";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateGableMetalTileCovering } from "@/domain/calculations/gable-metal-tile-covering";

const organizationId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const calculationId = "33333333-3333-4333-8333-333333333333";
const revisionId = "44444444-4444-4444-8444-444444444444";
const roofModelId = "55555555-5555-4555-8555-555555555555";
const roofRevisionId = "66666666-6666-4666-8666-666666666666";
const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const productInput = { nominalSheetWidthMm: 1100, effectiveCoveringWidthMm: 1000, physicalSheetLengthMm: 5100, effectiveCoveringLengthMm: 5100,
  minimumPhysicalLengthMm: null, maximumPhysicalLengthMm: null, eaveEndAllowanceMm: 0, ridgeEndAllowanceMm: 100, longitudinalOverlapMm: 0,
  lengthCompatibilityConfirmed: true, lengthDataSource: "DEMO: user reference", isModular: true, moduleBaseLengthMm: 300, modulePitchMm: 300, moduleCount: 16 };
const geometry = calculateGableRoof(geometryInput);
const input = { calculatorType: "roof.gable.metal-tile-covering", scope: "project", source: { mode: "project", projectId, roofModelId,
  roofModelRevisionId: roofRevisionId, geometryCalculationId: calculationId, geometryCalculationRevisionId: revisionId, geometryInput }, productInput };
const output = { geometry, covering: calculateGableMetalTileCovering(geometry, productInput) };

describe("cserepeslemez anyagkimutatás action", () => {
  beforeEach(() => {
    vi.clearAllMocks(); state.auth = { userId: "actor", organizations: [{ id: organizationId }] };
    state.project = { id: projectId, organizationId };
    state.saved = { calculationId, projectId, roofModelId, revisions: [{ revisionId, revisionNumber: 2, input, output }] };
  });
  it("a kért mentett revízióból készít darab alapú átadást, kliensmennyiséget nem vesz át", async () => {
    const result = await createGableMetalTileTakeoffAction({ organizationId, projectId, calculationId, revisionId,
      variantId: "77777777-7777-4777-8777-777777777777", operationId: "88888888-8888-4888-8888-888888888888", name: "Cserepeslemez", quantity: 999 });
    expect(result).toMatchObject({ ok: true, source: { revisionId, revisionNumber: 2, roofModelRevisionId: roofRevisionId } });
    expect(vi.mocked(createGableMetalTileTakeoffDraft).mock.calls[0]?.[0]).not.toHaveProperty("quantity");
  });
  it("nem enged át szervezetidegen vagy nem reprodukálható forrást", async () => {
    state.auth = { userId: "actor", organizations: [] };
    expect(await createGableMetalTileTakeoffAction({ organizationId, projectId, calculationId, revisionId,
      variantId: "77777777-7777-4777-8777-777777777777", operationId: "88888888-8888-4888-8888-888888888888", name: "Cserepeslemez" }))
      .toMatchObject({ ok: false, code: "UNAUTHORIZED" });
    state.auth = { userId: "actor", organizations: [{ id: organizationId }] };
    state.saved = { calculationId, projectId, roofModelId, revisions: [{ revisionId, revisionNumber: 2, input,
      output: { ...output, covering: { ...output.covering, totalSheetCount: 3 } } }] };
    expect(await createGableMetalTileTakeoffAction({ organizationId, projectId, calculationId, revisionId,
      variantId: "77777777-7777-4777-8777-777777777777", operationId: "88888888-8888-4888-8888-888888888888", name: "Cserepeslemez" }))
      .toMatchObject({ ok: false, code: "INVALID_SOURCE" });
    expect(createGableMetalTileTakeoffDraft).not.toHaveBeenCalled();
  });
});

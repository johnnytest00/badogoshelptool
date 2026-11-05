import { beforeEach, describe, expect, it, vi } from "vitest";
import { constructionInputSnapshot, computeConstruction, constructionOutputSnapshot, normalizedConstructionInput, constructionInputSnapshotSchema } from "@/features/calculators/construction-computation";
import { definitions } from "@/features/calculators/roof-calculator-definitions";
import { DEMO_MATERIAL_PROFILES } from "@/domain/calculations/roof-material-spec";

const persist = vi.fn();
const auth = vi.fn();
const savedCalculation = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: () => auth() }));
vi.mock("@/features/materials/material-data", () => ({ getCalculatorMaterialProfiles: vi.fn().mockResolvedValue([]) }));
vi.mock("./construction-data", () => ({ getConstructionCalculation: (...args: unknown[]) => savedCalculation(...args) }));
vi.mock("@/infrastructure/supabase/construction-calculation-writer", () => ({ persistStandaloneConstructionCalculation: (write: unknown) => persist(write) }));

const { saveConstructionCalculationAction } = await import("./construction-actions");

const organizationId = "00000000-0000-4000-8000-000000000010";
const request = (fields: Record<string, string>, calculatorId = "roof.rafter-cut", material: unknown = null) => ({
  organizationId, calculationId: "00000000-0000-4000-8000-000000000501", operationId: "00000000-0000-4000-8000-000000000601",
  expectedRevisionNumber: 0, name: "DEMO szarufa", input: { schemaVersion: "construction-suite.input.v1", calculatorId, geometryContractVersion: "legacy-wall", fields, material },
});
const valid = { horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "500", seatCutHeightMm: "0" };
const timberFields = { roofShape: "gable", lengthMm: "10000", widthMm: "6000", pitchDegrees: "45", eaveOverhangMm: "0" };
const timberMaterial = (layout: Record<string, number>, rafter: Record<string, number> = {}) => ({
  requested: { timber: true, underlay: false, covering: false }, layout,
  specs: {
    covering: { mode: "manual", profileId: null, entered: {} }, underlay: { mode: "manual", profileId: null, entered: {} },
    rafter: { mode: "manual", profileId: null, entered: rafter }, batten: { mode: "manual", profileId: null, entered: {} },
  },
});

describe("saveConstructionCalculationAction", () => {
  beforeEach(() => {
    persist.mockReset().mockResolvedValue({ calculation_id: "00000000-0000-4000-8000-000000000501", calculation_revision_id: "rev", revision_number: 1, reused: false });
    auth.mockReset().mockResolvedValue({ userId: "00000000-0000-4000-8000-000000000001", organizations: [{ id: organizationId }] });
    savedCalculation.mockReset().mockResolvedValue(null);
  });

  it("persists the server-recomputed output, never a client-supplied one", async () => {
    const result = await saveConstructionCalculationAction({ ...request(valid), output: { lines: [{ label: "hamis", value: 1, unit: "mm" }] } });
    expect(result).toEqual({ ok: true, calculationId: "00000000-0000-4000-8000-000000000501", revisionId: "rev", revisionNumber: 1 });
    const write = persist.mock.calls[0][0];
    expect(write.calculatorType).toBe("construction.roof.rafter-cut");
    expect(write.actorId).toBe("00000000-0000-4000-8000-000000000001");
    expect(write.output.lines.find((line: { label: string }) => line.label === "Szarufa teljes hossza").value).toBeCloseTo(4206.476, 3);
  });

  it("saves edits of sparse historical and current rafter inputs as new revisions in canonical mm", async () => {
    const historical = request({ ...valid, eaveProjectionMm: "600" });
    savedCalculation.mockResolvedValue({ revisions: [{ revisionNumber: 2, input: historical.input }] });
    const hydrated = { ...historical.input.fields, rafterDepthMm: "", ridgeJoint: "opposed", ridgeBoardThicknessMm: "", ridgePurlinWidthMm: "", ridgePurlinTopMm: "", purlinFaceMm: "", purlinTopMm: "" };
    const edited = { ...hydrated, riseMm: "2100" };
    expect(await saveConstructionCalculationAction({ ...historical, expectedRevisionNumber: 2, input: { ...historical.input, fields: edited } })).toMatchObject({ ok: true });
    expect(persist.mock.calls[0][0]).toMatchObject({ expectedRevisionNumber: 2, input: { fields: edited } });
    expect(historical.input.fields).toEqual({ ...valid, eaveProjectionMm: "600" });
    persist.mockClear();
    savedCalculation.mockResolvedValue({ revisions: [{ revisionNumber: 3, input: historical.input }] });
    expect(await saveConstructionCalculationAction({ ...historical, expectedRevisionNumber: 3, input: { ...historical.input, fields: { ...hydrated, riseMm: "2200" } } })).toMatchObject({ ok: true });
    expect(persist.mock.calls[0][0]).toMatchObject({ expectedRevisionNumber: 3, input: { fields: { ...hydrated, riseMm: "2200" } } });
  });

  it("round-trips an unversioned V1 roof revision through hydration, client recompute and server save", async () => {
    const fields = { roofShape: "gable", lengthMm: "12000", widthMm: "6000", pitchDegrees: "35", eaveOverhangMm: "500", seatCutHeightMm: "0" };
    const material = timberMaterial({ rafterMaxSpacingMm: 900 }, { sectionWidthMm: 80, sectionHeightMm: 200 });
    const oldInput = { ...request(fields, "roof.material-takeoff", material).input };
    Reflect.deleteProperty(oldInput, "geometryContractVersion");
    const immutableOriginal = structuredClone(oldInput);
    const hydrated = normalizedConstructionInput(constructionInputSnapshotSchema.parse(oldInput));
    expect(hydrated.geometryContractVersion).toBe("legacy-wall");
    const editedFields = { ...hydrated.fields, seatCutHeightMm: "50" };
    const editorDraft = { ...editedFields, __geometryContractVersion: hydrated.geometryContractVersion! };
    const nextInput = constructionInputSnapshot(definitions["roof.material-takeoff"], editorDraft, material as never);
    const client = computeConstruction(definitions["roof.material-takeoff"], editorDraft, material as never, DEMO_MATERIAL_PROFILES);
    expect(client.geometry?.projectedAreaMm2).toBe(84_000_000);
    savedCalculation.mockResolvedValue({ revisions: [{ revisionNumber: 1, input: oldInput, output: {} }] });
    const result = await saveConstructionCalculationAction({ ...request(editedFields, "roof.material-takeoff", material), expectedRevisionNumber: 1, input: nextInput });
    expect(result).toMatchObject({ ok: true, revisionNumber: 1 });
    const write = persist.mock.calls[0][0];
    expect(write.input.geometryContractVersion).toBe("legacy-wall");
    expect(write.output).toEqual(constructionOutputSnapshot("roof.material-takeoff", client));
    expect(normalizedConstructionInput(constructionInputSnapshotSchema.parse(write.input)).geometryContractVersion).toBe("legacy-wall");
    expect(oldInput).toEqual(immutableOriginal);
  });

  it("rejects a manipulated optional joint value instead of saving it as not given (CRR-07)", async () => {
    const changes: readonly Record<string, string>[] = [{ plateWidthMm: "-5" }, { plateWidthMm: "0" }, { rafterDepthMm: "NaN" }, { purlinFaceMm: "1e9" }, { ridgeJoint: "glued" }];
    for (const change of changes) {
      const result = await saveConstructionCalculationAction(request({ ...valid, seatCutHeightMm: "100", rafterDepthMm: "200", ...change }));
      expect(result).toMatchObject({ ok: false });
    }
    const negative = await saveConstructionCalculationAction(request({ ...valid, plateWidthMm: "-5" }));
    expect(negative).toEqual({ ok: false, error: "Talpszelemen szélessége · ellenőrzéshez: nem lehet negatív." });
    const roofJoint = await saveConstructionCalculationAction(request({ ...timberFields, birdsmouth: "true", seatCutHeightMm: "100", ridgeBoardThicknessMm: "-40" }, "roof.timber-cutlist", timberMaterial({ rafterMaxSpacingMm: 900 }, { sectionWidthMm: 80, sectionHeightMm: 200 })));
    expect(roofJoint).toMatchObject({ ok: false });
    expect(persist).not.toHaveBeenCalled();
  });

  it("rejects non-members, out-of-scope calculators, unknown fields and incomplete results before writing", async () => {
    auth.mockResolvedValueOnce({ userId: "u", organizations: [] });
    expect((await saveConstructionCalculationAction(request(valid))).ok).toBe(false);
    expect((await saveConstructionCalculationAction(request({}, "stair.wood.spiral"))).ok).toBe(false);
    expect((await saveConstructionCalculationAction(request({ ...valid, injected: "1" }))).ok).toBe(false);
    expect((await saveConstructionCalculationAction(request({ ...valid, riseMm: "" }))).ok).toBe(false);
    expect((await saveConstructionCalculationAction(request(timberFields, "roof.timber-cutlist", timberMaterial({})))).ok).toBe(false);
    expect((await saveConstructionCalculationAction(request(timberFields, "roof.timber-cutlist", timberMaterial({ rafterMaxSpacingMm: 900 }, { sectionWidthMm: 80 })))).ok).toBe(false);
    expect((await saveConstructionCalculationAction(request(valid, "roof.rafter-cut", { requested: { timber: true, underlay: false, covering: false }, layout: {}, specs: {} }))).ok).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });

  it("reports a stale revision as a conflict without claiming success", async () => {
    persist.mockRejectedValueOnce(Object.assign(new Error("stale"), { code: "40001" }));
    expect(await saveConstructionCalculationAction(request(valid))).toMatchObject({ ok: false, conflict: true });
  });

  it("rejects missing geometry contract and saves a server-recomputed V2 roof", async () => {
    const validRequest = request(valid);
    expect(await saveConstructionCalculationAction({ ...validRequest, input: { ...validRequest.input, geometryContractVersion: undefined } })).toMatchObject({ ok: false });
    const fields = { ...timberFields, eaveOverhangMm: "500" };
    const roof = request(fields, "roof.material-takeoff", timberMaterial({ rafterMaxSpacingMm: 900 }, { sectionWidthMm: 80, sectionHeightMm: 200 }));
    const result = await saveConstructionCalculationAction({ ...roof, input: { ...roof.input, geometryContractVersion: "outer-footprint" } });
    expect(result).toMatchObject({ ok: true });
    expect(persist.mock.calls[0][0]).toMatchObject({ input: { geometryContractVersion: "outer-footprint" } });
    const client = computeConstruction(definitions["roof.material-takeoff"], { ...fields, __geometryContractVersion: "outer-footprint" }, roof.input.material as never, DEMO_MATERIAL_PROFILES);
    expect(client.geometry?.projectedAreaMm2).toBe(60_000_000);
    expect(persist.mock.calls[0][0].output).toEqual(constructionOutputSnapshot("roof.material-takeoff", client));
  });

  it("does not allow changing the contract on an existing revision", async () => {
    const prior = request(timberFields, "roof.material-takeoff", timberMaterial({}, {}));
    savedCalculation.mockResolvedValue({ revisions: [{ revisionNumber: 4, input: prior.input }] });
    const attempted = { ...prior, expectedRevisionNumber: 4, input: { ...prior.input, geometryContractVersion: "outer-footprint" } };
    expect(await saveConstructionCalculationAction(attempted)).toMatchObject({ ok: false, error: expect.stringContaining("nem cserélhető") });
    expect(persist).not.toHaveBeenCalled();
  });

  it("reuses the saved material snapshot when the selected catalog product is no longer active", async () => {
    savedCalculation.mockResolvedValue({ calculationId: "00000000-0000-4000-8000-000000000501", calculatorId: "roof.timber-cutlist", displayName: "Történeti szarufa", currentRevisionNumber: 1, hasOlderRevisions: false, nextBeforeRevisionNumber: null, revisions: [{ revisionId: "rev-1", revisionNumber: 1, createdAt: "2026-11-04T00:00:00.000Z", input: request(timberFields, "roof.timber-cutlist", { requested: { timber: true, underlay: false, covering: false }, layout: { rafterMaxSpacingMm: 900 }, specs: { covering: { mode: "manual", profileId: null, entered: {} }, underlay: { mode: "manual", profileId: null, entered: {} }, rafter: { mode: "product", profileId: "archived-v1", entered: {} }, batten: { mode: "manual", profileId: null, entered: {} } } }).input, output: { specifications: { groups: { rafter: { group: "rafter", profile: { id: "archived-v1", label: "Szarufa 80×200", verification: "verified", sourceReference: "Anyagkezelő: Szarufa 80×200", catalog: { productId: "p1", variantId: "archived-v1", productName: "Szarufa", variantName: "80×200", manufacturerName: null, sku: null, purchasingUnit: "linear_meter", categoryId: "c1", categoryName: "Faanyag", categoryMatch: true } }, values: { sectionWidthMm: 80, sectionHeightMm: 200 }, productValues: { sectionWidthMm: 80, sectionHeightMm: 200 } } } } } }] });
    const result = await saveConstructionCalculationAction({ ...request(timberFields, "roof.timber-cutlist", { requested: { timber: true, underlay: false, covering: false }, layout: { rafterMaxSpacingMm: 900 }, specs: { covering: { mode: "manual", profileId: null, entered: {} }, underlay: { mode: "manual", profileId: null, entered: {} }, rafter: { mode: "product", profileId: "archived-v1", entered: {} }, batten: { mode: "manual", profileId: null, entered: {} } } }), expectedRevisionNumber: 1 });
    expect(result).toMatchObject({ ok: true });
    expect(persist.mock.calls[0][0].output.specifications.groups.rafter.values).toEqual({ sectionWidthMm: 80, sectionHeightMm: 200 });
  });
});

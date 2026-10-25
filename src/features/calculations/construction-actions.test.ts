import { beforeEach, describe, expect, it, vi } from "vitest";

const persist = vi.fn();
const auth = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: () => auth() }));
vi.mock("@/features/materials/material-data", () => ({ getCalculatorMaterialProfiles: vi.fn().mockResolvedValue([]) }));
vi.mock("@/infrastructure/supabase/construction-calculation-writer", () => ({ persistStandaloneConstructionCalculation: (write: unknown) => persist(write) }));

const { saveConstructionCalculationAction } = await import("./construction-actions");

const organizationId = "00000000-0000-4000-8000-000000000010";
const request = (fields: Record<string, string>, calculatorId = "roof.rafter-cut", material: unknown = null) => ({
  organizationId, calculationId: "00000000-0000-4000-8000-000000000501", operationId: "00000000-0000-4000-8000-000000000601",
  expectedRevisionNumber: 0, name: "DEMO szarufa", input: { schemaVersion: "construction-suite.input.v1", calculatorId, fields, material },
});
const valid = { horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "500", seatCutHeightMm: "0" };

describe("saveConstructionCalculationAction", () => {
  beforeEach(() => {
    persist.mockReset().mockResolvedValue({ calculation_id: "00000000-0000-4000-8000-000000000501", calculation_revision_id: "rev", revision_number: 1, reused: false });
    auth.mockReset().mockResolvedValue({ userId: "00000000-0000-4000-8000-000000000001", organizations: [{ id: organizationId }] });
  });

  it("persists the server-recomputed output, never a client-supplied one", async () => {
    const result = await saveConstructionCalculationAction({ ...request(valid), output: { lines: [{ label: "hamis", value: 1, unit: "mm" }] } });
    expect(result).toEqual({ ok: true, calculationId: "00000000-0000-4000-8000-000000000501", revisionId: "rev", revisionNumber: 1 });
    const write = persist.mock.calls[0][0];
    expect(write.calculatorType).toBe("construction.roof.rafter-cut");
    expect(write.actorId).toBe("00000000-0000-4000-8000-000000000001");
    expect(write.output.lines.find((line: { label: string }) => line.label === "Szarufa teljes hossza").value).toBeCloseTo(4206.476, 3);
  });

  it("rejects non-members, out-of-scope calculators, unknown fields and incomplete results before writing", async () => {
    auth.mockResolvedValueOnce({ userId: "u", organizations: [] });
    expect((await saveConstructionCalculationAction(request(valid))).ok).toBe(false);
    expect((await saveConstructionCalculationAction(request({}, "stair.wood.spiral"))).ok).toBe(false);
    expect((await saveConstructionCalculationAction(request({ ...valid, injected: "1" }))).ok).toBe(false);
    expect((await saveConstructionCalculationAction(request({ ...valid, riseMm: "" }))).ok).toBe(false);
    expect((await saveConstructionCalculationAction(request(valid, "roof.rafter-cut", { requested: { timber: true, underlay: false, covering: false }, layout: {}, specs: {} }))).ok).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });

  it("reports a stale revision as a conflict without claiming success", async () => {
    persist.mockRejectedValueOnce(Object.assign(new Error("stale"), { code: "40001" }));
    expect(await saveConstructionCalculationAction(request(valid))).toMatchObject({ ok: false, conflict: true });
  });
});

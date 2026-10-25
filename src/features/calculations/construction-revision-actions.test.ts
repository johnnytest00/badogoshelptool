import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConstructionRevisionPage } from "./construction-data";
import { loadConstructionRevisionPageAction } from "./construction-revision-actions";

vi.mock("./construction-data", () => ({ getConstructionRevisionPage: vi.fn() }));

const request = { organizationId: "11111111-1111-4111-8111-111111111111", calculationId: "22222222-2222-4222-8222-222222222222", beforeRevisionNumber: 76 };

describe("loadConstructionRevisionPageAction", () => {
  beforeEach(() => vi.mocked(getConstructionRevisionPage).mockReset());

  it("validates the server action input before querying", async () => {
    expect(await loadConstructionRevisionPageAction({ ...request, beforeRevisionNumber: 0 })).toEqual({ ok: false, error: "A revíziólista kérése hibás." });
    expect(getConstructionRevisionPage).not.toHaveBeenCalled();
  });

  it("passes the cursor through and returns the page", async () => {
    const page = { revisions: [], hasOlderRevisions: true, nextBeforeRevisionNumber: 26 } as const;
    vi.mocked(getConstructionRevisionPage).mockResolvedValue(page);
    expect(await loadConstructionRevisionPageAction(request)).toEqual({ ok: true, data: page });
    expect(getConstructionRevisionPage).toHaveBeenCalledWith(request.organizationId, request.calculationId, 76);
  });

  it("does not disclose an unavailable calculation or internal loader error", async () => {
    vi.mocked(getConstructionRevisionPage).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("internal"));
    expect(await loadConstructionRevisionPageAction(request)).toEqual({ ok: false, error: "A kalkuláció vagy a revíziólista nem érhető el." });
    expect(await loadConstructionRevisionPageAction(request)).toEqual({ ok: false, error: "A régebbi revíziók most nem tölthetők be. Próbáld újra." });
  });
});

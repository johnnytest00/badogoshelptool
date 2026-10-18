import { beforeEach, describe, expect, it, vi } from "vitest";

const org = "123e4567-e89b-42d3-a456-426614174000";
const listId = "123e4567-e89b-42d3-a456-426614174001";
const revisionId = "123e4567-e89b-42d3-a456-426614174002";
const operationId = "123e4567-e89b-42d3-a456-426614174003";
const itemId = "123e4567-e89b-42d3-a456-426614174004";
const state = vi.hoisted(() => ({
  auth: null as { userId: string; organizations: { id: string }[] } | null,
  lists: vi.fn(), existing: vi.fn(), save: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));
vi.mock("@/features/materials/material-data", () => ({ getMaterialProductsForOrganization: async () => [] }));
vi.mock("@/features/material-takeoffs/material-preparation-data", () => ({ getWorkflowMaterialLists: state.lists }));
vi.mock("@/features/material-takeoffs/material-list-links", () => ({ getQuotationsForMaterialLists: state.existing }));
vi.mock("./standalone-quotation-actions", () => ({ saveStandaloneQuotationDraftAction: state.save }));

import { createQuotationDraftFromMaterialListAction } from "./material-list-quotation-actions";

const list = (items: unknown[] = [{ id: itemId, kind: "manual", description: "DEMO eresz", quantity: "12.5", unit: "linear_meter", materialCategory: "gutter" }]) => ({
  id: listId, name: "DEMO lista", version: 1, currentRevisionId: revisionId,
  currentRevision: { id: revisionId, revisionNumber: 1, items },
});

describe("createQuotationDraftFromMaterialListAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.auth = { userId: "user-1", organizations: [{ id: org }] };
    state.lists.mockResolvedValue([list()]);
    state.existing.mockResolvedValue(new Map());
    state.save.mockResolvedValue({ ok: true, data: { quotation_id: "q1", revision_id: "r1", revision_number: 1, revision_created: true, totals_snapshot: {} } });
  });

  it("refuses callers without access to the organization", async () => {
    state.auth = { userId: "user-1", organizations: [] };
    expect(await createQuotationDraftFromMaterialListAction({ organizationId: org, listId, operationId })).toMatchObject({ ok: false });
    expect(state.save).not.toHaveBeenCalled();
  });

  it("creates an unpriced, source-linked draft without inventing a price", async () => {
    const result = await createQuotationDraftFromMaterialListAction({ organizationId: org, listId, operationId });
    expect(result).toEqual({ ok: true, quotationId: "q1", created: true, unpricedLines: 1, totalLines: 1 });
    const form = state.save.mock.calls[0][0] as FormData;
    expect(form.get("materialListId")).toBe(listId);
    expect(form.get("materialRevisionId")).toBe(revisionId);
    expect(form.get("operationId")).toBe(operationId);
    expect(form.get("version")).toBe("0");
    const lines = JSON.parse(String(form.get("lines")));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ type: "MATERIAL", unitPrice: "", priceProvenance: "missing", sourceMaterialItemId: itemId, quantity: "12.5" });
  });

  it("returns the existing draft for the same list revision instead of creating a duplicate", async () => {
    state.existing.mockResolvedValue(new Map([[listId, [{ quotationId: "existing-q", name: "x", status: "draft", sourceListVersion: 1, currentListVersion: 1, createdAt: "" }]]]));
    expect(await createQuotationDraftFromMaterialListAction({ organizationId: org, listId, operationId })).toMatchObject({ ok: true, quotationId: "existing-q", created: false });
    expect(state.save).not.toHaveBeenCalled();
  });

  it("creates another draft only on explicit request", async () => {
    state.existing.mockResolvedValue(new Map([[listId, [{ quotationId: "existing-q", name: "x", status: "draft", sourceListVersion: 1, currentListVersion: 1, createdAt: "" }]]]));
    expect(await createQuotationDraftFromMaterialListAction({ organizationId: org, listId, operationId, allowAdditional: true })).toMatchObject({ ok: true, quotationId: "q1", created: true });
    expect(state.save).toHaveBeenCalledTimes(1);
  });

  it("does not create a quotation from an empty list and surfaces save failures", async () => {
    state.lists.mockResolvedValue([list([])]);
    expect(await createQuotationDraftFromMaterialListAction({ organizationId: org, listId, operationId })).toMatchObject({ ok: false });
    state.lists.mockResolvedValue([list()]);
    state.save.mockResolvedValue({ ok: false, code: "VALIDATION", error: "Ellenőrizd az ajánlat tételeit." });
    expect(await createQuotationDraftFromMaterialListAction({ organizationId: org, listId, operationId })).toEqual({ ok: false, error: "Ellenőrizd az ajánlat tételeit." });
  });
});

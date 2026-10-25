import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rpc: vi.fn(), complete: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => ({ userId: "u", organizations: [{ id: "00000000-0000-4000-8000-000000000010" }] }) }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc }) }));
vi.mock("@/features/calculations/construction-data", () => ({ isCompleteConstructionRevision: (...args: unknown[]) => state.complete(...args) }));

import { saveStandaloneQuotationDraftAction } from "./standalone-quotation-actions";

const calculationRevisionId = "00000000-0000-4000-8000-000000000501";
const line = (extra: Record<string, unknown> = {}) => ({ type: "MATERIAL", description: "Szarufa · 4883 mm", quantity: "26", unit: "db", unitPrice: "", priceClass: "net", variantId: "", categoryId: "", priceId: "", takeoffItemId: "", priceProvenance: "missing", notes: "", ...extra });
const document = { recipientSource: "manual", recipientClientId: "", recipientName: "", recipientAddress: "", recipientEmail: "", recipientPhone: "", recipientTaxIdentifier: "", reference: "", validUntil: "", notes: "", terms: "" };
function form(lines: unknown[], fields: Record<string, string> = {}) {
  const data = new FormData();
  data.set("organizationId", "00000000-0000-4000-8000-000000000010"); data.set("operationId", "00000000-0000-4000-8000-000000000601"); data.set("version", "0");
  data.set("name", "DEMO M4"); data.set("clientId", ""); data.set("lines", JSON.stringify(lines)); data.set("document", JSON.stringify(document));
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("standalone quotation calculation source", () => {
  beforeEach(() => {
    state.rpc.mockReset().mockResolvedValue({ data: [{ quotation_id: "q", revision_id: "r", revision_number: 1, revision_created: true, totals_snapshot: {} }], error: null });
    state.complete.mockReset().mockResolvedValue(true);
  });

  it("routes calculation-sourced lines to the wrapper and keeps the shared line contract unchanged", async () => {
    const result = await saveStandaloneQuotationDraftAction(form([line({ calculationSourceKey: "cut/rafters/0" }), line({ description: "Kézi tétel" })], { calculationRevisionId }));
    expect(result.ok).toBe(true);
    const [name, args] = state.rpc.mock.calls[0];
    expect(name).toBe("save_standalone_quotation_from_calculation");
    expect(args.p_calculation_revision_id).toBe(calculationRevisionId);
    expect(args.p_source_line_map).toEqual([{ quotationLineIndex: 0, sourceKey: "cut/rafters/0" }]);
    expect(args.p_lines.every((entry: Record<string, unknown>) => !("calculationSourceKey" in entry))).toBe(true);
  });

  it("uses the plain draft RPC without a calculation source", async () => {
    await saveStandaloneQuotationDraftAction(form([line()], { calculationRevisionId }));
    expect(state.rpc.mock.calls[0][0]).toBe("save_standalone_quotation_draft_with_document");
  });

  it("rejects a source key without its revision, a malformed key and a mixed material/calculation source", async () => {
    expect((await saveStandaloneQuotationDraftAction(form([line({ calculationSourceKey: "cut/rafters/0" })]))).ok).toBe(false);
    expect((await saveStandaloneQuotationDraftAction(form([line({ calculationSourceKey: "lines/0" })], { calculationRevisionId }))).ok).toBe(false);
    expect((await saveStandaloneQuotationDraftAction(form([line({ calculationSourceKey: "cut/rafters/0" }), line({ sourceMaterialItemId: "00000000-0000-4000-8000-000000000701" })],
      { calculationRevisionId, materialListId: "00000000-0000-4000-8000-000000000702", materialRevisionId: "00000000-0000-4000-8000-000000000703" }))).ok).toBe(false);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("explains a calculation source the database rejects", async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: { code: "22023", message: "only layout quantities can become quotation quantities" } });
    expect(await saveStandaloneQuotationDraftAction(form([line({ calculationSourceKey: "takeoff/0/2" })], { calculationRevisionId }))).toMatchObject({ ok: false, error: expect.stringContaining("kalkulációs forrás") });
  });

  it("rejects an incomplete calculation before saving an offer", async () => {
    state.complete.mockResolvedValue(false);
    expect(await saveStandaloneQuotationDraftAction(form([line({ calculationSourceKey: "cut/rafters/0" })], { calculationRevisionId }))).toMatchObject({ ok: false, error: expect.stringContaining("teljes") });
    expect(state.rpc).not.toHaveBeenCalled();
  });
});

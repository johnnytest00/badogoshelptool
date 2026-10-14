import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: null as { userId: string; organizations: Array<{ id: string; name: string; role: string }> } | null,
  quotation: null as { id: string; organization_id: string; name: string; currency: string; status: string; current_revision_id: string | null; created_by: string } | null,
  revisionRows: [] as Array<Record<string, unknown>>,
  revisionError: null as { code?: string } | null,
  rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
}));

type MockQueryBuilder = {
  select(): MockQueryBuilder;
  eq(key: string, value: unknown): MockQueryBuilder;
  maybeSingle(): Promise<{ data: typeof state.quotation; error: null }>;
};

vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));
vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const filters: Array<[string, unknown]> = [];
      const builder: MockQueryBuilder = {
        select: () => builder,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return builder; },
        maybeSingle: async () => {
          const matches = filters.every(([key, value]) => key === "ownership_scope" ? value === "standalone" : key === "created_by" ? value === "creator-1" && state.quotation?.created_by === value : key === "id" ? state.quotation?.id === value : true);
          return { data: matches ? state.quotation : null, error: null };
        },
      };
      return builder;
    },
    rpc: async (name: string, args: Record<string, unknown>) => { state.rpcCalls.push({ name, args }); return { data: state.revisionRows, error: state.revisionError }; },
  }),
}));

import { GET } from "./[quotationId]/pdf/route";

const quotationId = "11111111-1111-4111-8111-111111111111";
const revisionId = "22222222-2222-4222-8222-222222222222";

function savedRevision(id = revisionId) {
  return {
    id, revision_number: 1, currency: "HUF", price_class: "net", subtotal: "250.00",
    input_snapshot: { name: "DEMO mentett V1", document: { issuer: { organizationName: "DEMO műhely" }, recipient: { source: "manual", name: "DEMO címzett" } } },
    line_items_snapshot: [{ type: "LABOR", description: "DEMO munkadíj", quantity: "1", unit: "óra", unitPrice: "250.00", priceClass: "net", lineTotal: "250.00" }],
    totals_snapshot: { complete: true, currency: "HUF", priceClass: "net", subtotal: "250.00" },
    financial_contract: { schemaVersion: 1, sourceVersion: "F9.7.6.6.3.2b", currency: "HUF", priceBasis: "net", netAmount: "250.00", taxTreatment: { status: "unresolved", treatmentId: null, parameters: null }, taxAmount: null, grossAmount: null, totalPayable: null, rounding: { quantityScale: 6, moneyScale: 2, mode: "half_up", scope: "line" } },
  };
}

beforeEach(() => {
  state.auth = { userId: "creator-1", organizations: [{ id: "org-1", name: "DEMO műhely", role: "member" }] };
  state.quotation = { id: quotationId, organization_id: "org-1", name: "Current name", currency: "HUF", status: "draft", current_revision_id: revisionId, created_by: "creator-1" };
  state.revisionRows = [savedRevision()]; state.revisionError = null; state.rpcCalls = [];
});

describe("standalone draft PDF route", () => {
  it("renders the exact authorized saved revision with private no-store headers", async () => {
    const response = await GET(new Request(`https://local.test/api/ajanlatok/${quotationId}/pdf?revision=${revisionId}`), { params: Promise.resolve({ quotationId }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(response.headers.get("content-disposition")).toContain(`ajanlat-piszkozat-${quotationId}.pdf`);
    expect(state.rpcCalls[0].args.p_revision_id).toBe(revisionId);
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });

  it("returns the same not-found response for a different creator and expired membership", async () => {
    state.quotation!.created_by = "other-user";
    const crossUser = await GET(new Request(`https://local.test/api/ajanlatok/${quotationId}/pdf`), { params: Promise.resolve({ quotationId }) });
    expect(crossUser.status).toBe(404);
    expect(await crossUser.text()).toBe("Az ajánlat nem található.");
    state.quotation!.created_by = "creator-1";
    state.auth!.organizations = [];
    const expired = await GET(new Request(`https://local.test/api/ajanlatok/${quotationId}/pdf`), { params: Promise.resolve({ quotationId }) });
    expect(expired.status).toBe(404);
    expect(await expired.text()).toBe("Az ajánlat nem található.");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("requires a session and hides cross-organization and forged quotation IDs", async () => {
    state.auth = null;
    const anonymous = await GET(new Request(`https://local.test/api/ajanlatok/${quotationId}/pdf`), { params: Promise.resolve({ quotationId }) });
    expect(anonymous.status).toBe(401);
    state.auth = { userId: "creator-1", organizations: [{ id: "org-1", name: "DEMO műhely", role: "member" }] };
    state.quotation!.organization_id = "org-2";
    const crossOrganization = await GET(new Request(`https://local.test/api/ajanlatok/${quotationId}/pdf`), { params: Promise.resolve({ quotationId }) });
    expect(crossOrganization.status).toBe(404);
    const forgedId = "33333333-3333-4333-8333-333333333333";
    const forgedQuotation = await GET(new Request(`https://local.test/api/ajanlatok/${forgedId}/pdf`), { params: Promise.resolve({ quotationId: forgedId }) });
    expect(forgedQuotation.status).toBe(404);
    expect(await forgedQuotation.text()).toBe("Az ajánlat nem található.");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("denies a forged revision without disclosing quotation data", async () => {
    state.revisionRows = [];
    const response = await GET(new Request(`https://local.test/api/ajanlatok/${quotationId}/pdf?revision=33333333-3333-4333-8333-333333333333`), { params: Promise.resolve({ quotationId }) });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("A kért revízió nem található.");
    expect(response.headers.get("cache-control")).toContain("private, no-store");
  });
});

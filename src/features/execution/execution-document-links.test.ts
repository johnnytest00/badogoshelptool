import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { getPlanLinkedDocuments, getStandaloneQuotationCandidates } from "./execution-document-links";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

let rows: Record<string, unknown[]>;
let queryErrors: Record<string, unknown>;
let queryLog: Array<{ table: string; filters: Array<{ column: string; value: unknown }> }>;

function makeClient() {
  return {
    from(table: string) {
      const filters: Array<{ column: string; value: unknown }> = [];
      queryLog.push({ table, filters });
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push({ column, value }); return query; },
        is: (column: string, value: null) => { filters.push({ column, value }); return query; },
        in: (column: string, value: unknown[]) => { filters.push({ column, value }); return query; },
        order: () => query,
        limit: () => query,
        then: (resolve: (response: { data: unknown[]; error: unknown }) => unknown) => Promise.resolve(resolve({
          data: queryErrors[table] ? [] : (rows[table] ?? []).filter((row) => filters.every((filter) => Array.isArray(filter.value)
            ? filter.value.includes((row as Record<string, unknown>)[filter.column])
            : (row as Record<string, unknown>)[filter.column] === filter.value)),
          error: queryErrors[table] ?? null,
        })),
      };
      return query;
    },
  };
}

beforeEach(() => {
  rows = {};
  queryErrors = {};
  queryLog = [];
  vi.mocked(createClient).mockResolvedValue(makeClient() as unknown as Awaited<ReturnType<typeof createClient>>);
});

describe("execution document reads", () => {
  it("returns same-organization linked material lists and quotations", async () => {
    rows.execution_plan_document_links = [
      { id: "list-link", execution_plan_id: "plan", document_kind: "material_list", material_list_id: "list", quotation_id: null, organization_id: "org", unlinked_at: null },
      { id: "quote-link", execution_plan_id: "plan", document_kind: "quotation", material_list_id: null, quotation_id: "quote", organization_id: "org", unlinked_at: null },
      { id: "foreign-link", execution_plan_id: "plan", document_kind: "quotation", material_list_id: null, quotation_id: "foreign-quote", organization_id: "other-org", unlinked_at: null },
    ];
    rows.material_preparation_lists = [{ id: "list", name: "Lista", version: 4, organization_id: "org" }];
    rows.quotations = [{ id: "quote", name: "Ajánlat", status: "accepted", organization_id: "org" }, { id: "foreign-quote", name: "Foreign", status: "accepted", organization_id: "other-org" }];

    await expect(getPlanLinkedDocuments("org", "plan")).resolves.toEqual({ status: "loaded", materialLists: { status: "loaded", data: [
      { kind: "material_list", documentId: "list", name: "Lista", detail: "Anyaglista · V4", linkId: "list-link", origin: "link" },
    ] }, quotations: { status: "loaded", data: [
      { kind: "quotation", documentId: "quote", name: "Ajánlat", detail: "Ajánlat · accepted", linkId: "quote-link", origin: "link" },
    ] } });
    expect(queryLog.map(({ table }) => table).sort()).toEqual(["execution_plan_document_links", "material_preparation_lists", "quotations"]);
    expect(queryLog.every(({ filters }) => filters.some((filter) => filter.column === "organization_id" && filter.value === "org"))).toBe(true);
  });

  it.each([
    ["execution_plan_document_links", { code: "42501" }, "access_denied"],
    ["material_preparation_lists", { code: "XX000" }, "unavailable"],
    ["quotations", { status: 403 }, "access_denied"],
  ] as const)("classifies %s errors without returning an empty document list", async (table, error, failure) => {
    rows.execution_plan_document_links = [
      { id: "list-link", execution_plan_id: "plan", document_kind: "material_list", material_list_id: "list", quotation_id: null, organization_id: "org", unlinked_at: null },
      { id: "quote-link", execution_plan_id: "plan", document_kind: "quotation", material_list_id: null, quotation_id: "quote", organization_id: "org", unlinked_at: null },
    ];
    queryErrors[table] = error;

    const result = await getPlanLinkedDocuments("org", "plan");
    if (table === "execution_plan_document_links") expect(result).toEqual({ status: failure });
    else if (table === "material_preparation_lists") expect(result).toMatchObject({ status: "loaded", materialLists: { status: failure } });
    else expect(result).toMatchObject({ status: "loaded", quotations: { status: failure } });
  });

  it("does not silently drop a linked record that is missing or hidden by RLS", async () => {
    rows.execution_plan_document_links = [{ id: "link", execution_plan_id: "plan", document_kind: "material_list", material_list_id: "missing-list", quotation_id: null, organization_id: "org", unlinked_at: null }];

    await expect(getPlanLinkedDocuments("org", "plan")).resolves.toMatchObject({ status: "loaded", materialLists: { status: "unavailable" } });
  });

  it("classifies quotation candidate failures and can recover on retry", async () => {
    queryErrors.quotations = { code: "08006", message: "connection failure" };
    await expect(getStandaloneQuotationCandidates("org")).rejects.toMatchObject({ name: "SupabaseReadError", failure: "unavailable" });

    queryErrors = {};
    rows.quotations = [{ id: "q", name: "Candidate", status: "draft", version: 1, updated_at: "2026-10-23", organization_id: "org", ownership_scope: "standalone" }];
    await expect(getStandaloneQuotationCandidates("org")).resolves.toEqual([
      { kind: "quotation", documentId: "q", name: "Candidate", detail: "Ajánlat · piszkozat · v1 · 2026-10-23" },
    ]);
  });
});

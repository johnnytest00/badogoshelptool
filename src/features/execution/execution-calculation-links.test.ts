import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { getPlanLinkedCalculations, getPlanLinksForCalculation } from "./execution-calculation-links";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

let rows: Record<string, Record<string, unknown>[]>;
function makeClient() {
  return {
    from(table: string) {
      const filters: Array<{ column: string; value: unknown }> = [];
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push({ column, value }); return query; },
        is: (column: string, value: null) => { filters.push({ column, value }); return query; },
        in: (column: string, value: unknown[]) => { filters.push({ column, value }); return query; },
        then: (resolve: (response: { data: unknown[]; error: unknown }) => unknown) => Promise.resolve(resolve({
          data: (rows[table] ?? []).filter((row) => filters.every((filter) => Array.isArray(filter.value) ? filter.value.includes(row[filter.column]) : row[filter.column] === filter.value)),
          error: null,
        })),
      };
      return query;
    },
  };
}

const link = { id: "link", organization_id: "org", execution_plan_id: "plan", document_kind: "calculation", calculation_id: "calc", calculation_revision_id: "rev1", unlinked_at: null };
beforeEach(() => {
  rows = {
    execution_plan_document_links: [link, { ...link, id: "other-kind", document_kind: "quotation", calculation_id: null, calculation_revision_id: null }],
    calculations: [{ id: "calc", organization_id: "org", display_name: "DEMO szarufa", calculator_type: "construction.roof.rafter-cut", created_by: "creator" }],
    calculation_revisions: [
      { id: "rev1", organization_id: "org", calculation_id: "calc", revision_number: 1, output_snapshot: { lines: [{ label: "Szarufa teljes hossza", value: 4206.476, unit: "mm" }, { bad: true }] } },
      { id: "rev2", organization_id: "org", calculation_id: "calc", revision_number: 2, output_snapshot: { lines: [] } },
    ],
    execution_plans: [{ id: "plan", organization_id: "org", title: "DEMO napló" }],
  };
  vi.mocked(createClient).mockResolvedValue(makeClient() as unknown as Awaited<ReturnType<typeof createClient>>);
});

describe("calculation work log links", () => {
  it("shows the exact linked revision with its stored result and who may edit it", async () => {
    const result = await getPlanLinkedCalculations("org", "plan", "member");
    expect(result).toEqual({ status: "loaded", data: [{ linkId: "link", calculationId: "calc", revisionId: "rev1", revisionNumber: 1, name: "DEMO szarufa", calculatorId: "roof.rafter-cut", ownedByViewer: false, lines: [{ label: "Szarufa teljes hossza", value: 4206.476, unit: "mm" }] }] });
    expect(await getPlanLinkedCalculations("org", "plan", "creator")).toMatchObject({ status: "loaded", data: [{ ownedByViewer: true }] });
  });

  it("reports a missing or mismatched linked revision instead of showing another one", async () => {
    rows.calculation_revisions = [{ ...rows.calculation_revisions[1], id: "rev1", calculation_id: "someone-else" }];
    expect(await getPlanLinkedCalculations("org", "plan", "creator")).toEqual({ status: "unavailable" });
  });

  it("returns an empty list when nothing is linked", async () => {
    rows.execution_plan_document_links = [];
    expect(await getPlanLinkedCalculations("org", "plan", "creator")).toEqual({ status: "loaded", data: [] });
  });

  it("labels each work log link of a calculation with its revision", async () => {
    expect(await getPlanLinksForCalculation("org", "calc")).toEqual([{ linkId: "link", planId: "plan", planTitle: "DEMO napló", origin: "link", documentId: "rev1", detail: "V1" }]);
  });
});

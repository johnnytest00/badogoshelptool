import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { getConstructionCalculation, getConstructionRevision, getConstructionRevisionPage, isCompleteConstructionRevision } from "./construction-data";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: vi.fn() }));

let rows: Record<string, Record<string, unknown>[]>;
function client() {
  return {
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      const orders: Array<[string, boolean]> = [];
      let maxRows: number | null = null;
      const matches = (row: Record<string, unknown>) => filters.every(([column, value]) => typeof value === "object" && value !== null && "lt" in value ? Number(row[column]) < Number(value.lt) : column === "calculator_type" && typeof value === "string" && value.endsWith("%") ? String(row[column]).startsWith(value.slice(0, -1)) : row[column] === value);
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push([column, value]); return query; },
        like: (column: string, value: string) => { filters.push([column, value]); return query; },
        lt: (column: string, value: unknown) => { filters.push([column, { lt: value }]); return query; },
        order: (column: string, options?: { ascending?: boolean }) => { orders.push([column, options?.ascending !== false]); return query; },
        limit: (value: number) => { maxRows = value; return query; },
        then: (resolve: (value: { data: Record<string, unknown>[]; error: null }) => unknown) => {
          let result = [...(rows[table] ?? [])].filter(matches);
          for (const [column, ascending] of orders.reverse()) result.sort((a, b) => (a[column] as number | string) < (b[column] as number | string) ? (ascending ? -1 : 1) : (a[column] as number | string) > (b[column] as number | string) ? (ascending ? 1 : -1) : 0);
          if (maxRows !== null) result = result.slice(0, maxRows);
          return resolve({ data: result, error: null });
        },
        maybeSingle: async () => ({ data: (rows[table] ?? []).find(matches) ?? null, error: null }),
      };
      return query;
    },
  };
}

describe("isCompleteConstructionRevision", () => {
  beforeEach(() => {
    rows = {
      calculation_revisions: [{ id: "rev", organization_id: "org", calculation_id: "calc", output_snapshot: { schemaVersion: "construction-suite.output.v1", calculatorId: "roof.rafter-cut", lines: [{ label: "Hossz", value: 1, unit: "mm" }] } }],
      calculations: [{ id: "calc", organization_id: "org", ownership_scope: "standalone", calculator_type: "construction.roof.rafter-cut" }],
    };
    vi.mocked(createClient).mockResolvedValue(client() as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  it("accepts only an accessible complete construction revision", async () => {
    expect(await isCompleteConstructionRevision("org", "rev")).toBe(true);
    rows.calculation_revisions[0].output_snapshot = { schemaVersion: "construction-suite.output.v1", calculatorId: "roof.rafter-cut", lines: [] };
    expect(await isCompleteConstructionRevision("org", "rev")).toBe(false);
    expect(await isCompleteConstructionRevision("other", "rev")).toBe(false);
  });
});

const input = { schemaVersion: "construction-suite.input.v1", calculatorId: "roof.rafter-cut", fields: {}, material: null };
const output = { schemaVersion: "construction-suite.output.v1", calculatorId: "roof.rafter-cut", lines: [{ label: "Hossz", value: 1, unit: "mm" }], takeoff: null, cutList: null, specifications: null };
const revision = (number: number, organizationId = "org", revisionId = `r${number}`) => ({ id: revisionId, calculation_id: "calc", organization_id: organizationId, revision_number: number, created_at: "2026-10-25T10:00:00Z", input_snapshot: input, output_snapshot: output });

describe("construction revision history pagination", () => {
  beforeEach(() => {
    rows = { calculations: [{ id: "calc", organization_id: "org", ownership_scope: "standalone", calculator_type: "construction.roof.rafter-cut", display_name: "DEMO kalkuláció", current_revision_id: "r125" }], calculation_revisions: [] };
    vi.mocked(createClient).mockResolvedValue(client() as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getAuthContext).mockResolvedValue({ userId: "user", organizations: [{ id: "org" }] } as never);
  });

  it("returns an empty first page when no revisions are readable", async () => {
    const page = await getConstructionRevisionPage("org", "calc");
    expect(page).toEqual({ revisions: [], hasOlderRevisions: false, nextBeforeRevisionNumber: null });
  });

  it.each([1, 49, 50, 51, 125])("returns the newest page for %i revisions and reports older pages", async (count) => {
    rows.calculation_revisions = Array.from({ length: count }, (_, index) => revision(index + 1));
    rows.calculations[0].current_revision_id = `r${count}`;
    const result = await getConstructionCalculation("org", "calc");
    expect(result?.revisions.map((item) => item.revisionNumber)).toEqual(Array.from({ length: Math.min(count, 50) }, (_, index) => count - index));
    expect(result?.hasOlderRevisions).toBe(count > 50);
  });

  it("walks 125 revisions without gaps or duplicates, including equal timestamps", async () => {
    rows.calculation_revisions = Array.from({ length: 125 }, (_, index) => revision(index + 1));
    const first = await getConstructionCalculation("org", "calc");
    const second = await getConstructionRevisionPage("org", "calc", first?.nextBeforeRevisionNumber ?? undefined);
    const third = await getConstructionRevisionPage("org", "calc", second?.nextBeforeRevisionNumber ?? undefined);
    const all = [...(first?.revisions ?? []), ...(second?.revisions ?? []), ...(third?.revisions ?? [])].map((item) => item.revisionNumber);
    expect(all).toEqual(Array.from({ length: 125 }, (_, index) => 125 - index));
    expect(new Set(all).size).toBe(125);
    expect(third?.hasOlderRevisions).toBe(false);
  });

  it("filters by organization and calculation, while direct lookup reaches V125 beyond the first page", async () => {
    rows.calculation_revisions = [...Array.from({ length: 125 }, (_, index) => revision(index + 1)), revision(999, "other", "foreign"), { ...revision(998), calculation_id: "other-calc" }];
    const direct = await getConstructionRevision("org", "calc", "r125");
    expect(direct?.revision.revisionNumber).toBe(125);
    expect((await getConstructionRevision("org", "calc", "foreign"))).toBeNull();
    expect((await getConstructionRevision("other", "calc", "r125"))).toBeNull();
  });

  it("keeps an incomplete legacy snapshot in the database but excludes it from editable history", async () => {
    rows.calculation_revisions = [revision(3), { ...revision(2), input_snapshot: { schemaVersion: "old", calculatorId: "roof.rafter-cut", fields: {}, material: null } }, revision(1)];
    rows.calculations[0].current_revision_id = "r3";
    const result = await getConstructionCalculation("org", "calc");
    expect(result?.revisions.map((item) => item.revisionNumber)).toEqual([3, 1]);
    expect(result?.hasOlderRevisions).toBe(false);
  });
});

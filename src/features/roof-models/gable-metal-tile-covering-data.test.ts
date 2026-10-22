import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { listGableMetalTileCoverings } from "./gable-metal-tile-covering-data";
import { GABLE_METAL_TILE_COVERING_ID } from "./gable-metal-tile-covering-persistence";

vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: vi.fn(async () => ({ organizations: [{ id: "org" }] })) }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./gable-metal-tile-covering-persistence", () => ({
  GABLE_METAL_TILE_COVERING_ID: "roof.covering.metal-tile", GABLE_METAL_TILE_COVERING_VERSION: "1.0.0", METAL_TILE_INPUT_SCHEMA_VERSION: "1.0.0",
  calculateMetalTileSnapshot: vi.fn(() => ({ geometry: {}, output: {} })),
}));

type Row = Record<string, unknown>;
function fakeClient(records: Record<string, Row[]>) {
  const requests: string[] = [];
  return {
    requests,
    client: { from: (table: string) => {
      requests.push(table);
      let rows = [...(records[table] ?? [])];
      let start = 0, end = Infinity, max = Infinity;
      const query: Record<string, (...args: never[]) => unknown> = {};
      query.select = (() => query) as never;
      query.eq = ((key: string, value: unknown) => { rows = rows.filter((row) => row[key] === value); return query; }) as never;
      query.in = ((key: string, values: unknown[]) => { rows = rows.filter((row) => values.includes(row[key])); return query; }) as never;
      query.order = ((key: string, { ascending }: { ascending: boolean }) => { rows.sort((a, b) => {
        const order = typeof a[key] === "number" && typeof b[key] === "number" ? Number(a[key]) - Number(b[key]) : String(a[key]).localeCompare(String(b[key]));
        return ascending ? order : -order;
      }); return query; }) as never;
      query.limit = ((value: number) => { max = value; return query; }) as never;
      query.range = ((from: number, to: number) => { start = from; end = to; return query; }) as never;
      query.then = ((resolve: (result: { data: Row[]; error: null }) => unknown) => Promise.resolve({ data: rows.slice(start, Math.min(end + 1, start + max)), error: null }).then(resolve)) as never;
      return query;
    } },
  };
}

const calculation = (id: string, currentRevisionId: string): Row => ({ id, organization_id: "org", project_id: null, roof_model_id: null, ownership_scope: "standalone", calculator_type: GABLE_METAL_TILE_COVERING_ID, display_name: id, current_revision_id: currentRevisionId, updated_at: id });
const revision = (id: string, calculationId: string, number: number): Row => ({ id, calculation_id: calculationId, revision_number: number, input_snapshot: { calculatorType: GABLE_METAL_TILE_COVERING_ID, scope: "standalone", source: { mode: "standalone", geometrySource: "manual_user_input" }, productInput: {} }, output_snapshot: { geometry: {}, covering: {} }, data_provenance: {}, validation_status: "estimated", created_at: id, input_schema_version: "1.0.0", calculator_implementation_version: "1.0.0", organization_id: "org" });

describe("mentett cserepeslemez-fedések batch betöltése", () => {
  beforeEach(() => vi.clearAllMocks());

  it("üres listánál nem kér le revíziókat", async () => {
    const fake = fakeClient({ calculations: [] });
    vi.mocked(createClient).mockResolvedValue(fake.client as never);
    expect(await listGableMetalTileCoverings("org")).toEqual([]);
    expect(fake.requests).toEqual(["calculations"]);
  });

  it("a revíziók egy batchből, kalkulációnkénti sorrendben és aktuális azonosítóval épülnek fel", async () => {
    const foreignRevision = { ...revision("foreign", "a", 999), organization_id: "other-org" };
    const fake = fakeClient({ calculations: [calculation("a", "a1"), calculation("b", "b1")], calculation_revisions: [revision("a2", "a", 2), revision("a1", "a", 1), revision("b2", "b", 2), revision("b1", "b", 1), foreignRevision] });
    vi.mocked(createClient).mockResolvedValue(fake.client as never);
    const result = await listGableMetalTileCoverings("org");
    expect(result.map(({ calculationId, currentRevisionNumber, revisions }) => ({ calculationId, currentRevisionNumber, revisions: revisions.map(({ revisionNumber }) => revisionNumber) }))).toEqual([
      { calculationId: "b", currentRevisionNumber: 1, revisions: [2, 1] }, { calculationId: "a", currentRevisionNumber: 1, revisions: [2, 1] },
    ]);
    expect(fake.requests).toEqual(["calculations", "calculation_revisions"]);
  });

  it("a nagy revízióhalmazt lapozza, kalkulációnként legfeljebb a legfrissebb 100-at tartja meg", async () => {
    const history = Array.from({ length: 1001 }, (_, index) => revision(`a${index + 1}`, "a", index + 1));
    const fake = fakeClient({ calculations: [calculation("a", "a1001")], calculation_revisions: history });
    vi.mocked(createClient).mockResolvedValue(fake.client as never);
    const [result] = await listGableMetalTileCoverings("org");
    expect(result.revisions).toHaveLength(100);
    expect(result.revisions[0].revisionNumber).toBe(1001);
    expect(result.revisions.at(-1)?.revisionNumber).toBe(902);
    expect(fake.requests).toEqual(["calculations", "calculation_revisions", "calculation_revisions"]);
  });
});

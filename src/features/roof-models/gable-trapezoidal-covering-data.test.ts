import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { listGableTrapezoidalCoverings } from "./gable-trapezoidal-covering-data";
import { calculateCoveringSnapshot, GABLE_TRAPEZOIDAL_COVERING_ID } from "./gable-trapezoidal-covering-persistence";

vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: vi.fn(async () => ({ organizations: [{ id: "org" }] })) }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./gable-trapezoidal-covering-persistence", () => ({ GABLE_TRAPEZOIDAL_COVERING_ID: "roof.covering.trapezoidal", calculateCoveringSnapshot: vi.fn(() => ({ geometry: {}, output: {} })) }));

type Row = Record<string, unknown>;
function fakeClient(records: Record<string, Row[]>) {
  const requests: string[] = [];
  return { requests, client: { from: (table: string) => {
    requests.push(table);
    let rows = [...(records[table] ?? [])], start = 0, end = Infinity, max = Infinity;
    const query: Record<string, (...args: never[]) => unknown> = {};
    query.select = (() => query) as never;
    query.eq = ((key: string, value: unknown) => { rows = rows.filter((row) => row[key] === value); return query; }) as never;
    query.in = ((key: string, values: unknown[]) => { rows = rows.filter((row) => values.includes(row[key])); return query; }) as never;
    query.order = ((key: string, { ascending }: { ascending: boolean }) => { rows.sort((a, b) => ascending ? String(a[key]).localeCompare(String(b[key])) : String(b[key]).localeCompare(String(a[key]))); return query; }) as never;
    query.limit = ((value: number) => { max = value; return query; }) as never;
    query.range = ((from: number, to: number) => { start = from; end = to; return query; }) as never;
    query.then = ((resolve: (result: { data: Row[]; error: null }) => unknown) => Promise.resolve({ data: rows.slice(start, Math.min(end + 1, start + max)), error: null }).then(resolve)) as never;
    return query;
  } } };
}

const calculation = (id: string, currentRevisionId: string): Row => ({ id, organization_id: "org", project_id: null, roof_model_id: null, ownership_scope: "standalone", calculator_type: GABLE_TRAPEZOIDAL_COVERING_ID, display_name: id, current_revision_id: currentRevisionId, updated_at: id });
const revision = (id: string, calculationId: string, number: number): Row => ({ id, calculation_id: calculationId, revision_number: number, input_snapshot: { scope: "standalone", source: {}, coveringInput: {} }, output_snapshot: { geometry: {}, covering: {} }, data_provenance: {}, validation_status: "estimated", created_at: id, input_schema_version: "1.0.0", calculator_implementation_version: "1.0.0", organization_id: "org" });

describe("mentett trapézlemez-fedések batch betöltése", () => {
  beforeEach(() => vi.clearAllMocks());

  it("üres listánál nem kér le revíziókat", async () => {
    const fake = fakeClient({ calculations: [] });
    vi.mocked(createClient).mockResolvedValue(fake.client as never);
    expect(await listGableTrapezoidalCoverings("org")).toEqual([]);
    expect(fake.requests).toEqual(["calculations"]);
  });

  it("egy revíziólekérdezéssel megőrzi kalkulációnként a történeti sorrendet", async () => {
    const fake = fakeClient({ calculations: [calculation("a", "a1"), calculation("b", "b1")], calculation_revisions: [revision("a2", "a", 2), revision("a1", "a", 1), revision("b2", "b", 2), revision("b1", "b", 1)] });
    vi.mocked(createClient).mockResolvedValue(fake.client as never);
    const result = await listGableTrapezoidalCoverings("org");
    expect(result.map(({ calculationId, currentRevisionNumber, revisions }) => ({ calculationId, currentRevisionNumber, revisions: revisions.map(({ revisionNumber }) => revisionNumber) }))).toEqual([
      { calculationId: "b", currentRevisionNumber: 1, revisions: [2, 1] }, { calculationId: "a", currentRevisionNumber: 1, revisions: [2, 1] },
    ]);
    expect(fake.requests).toEqual(["calculations", "calculation_revisions"]);
  });

  it("kulcsrendezéstől függetlenül elfogadja a meglévő snapshotot, mutáció nélkül", async () => {
    const output = {
      geometry: { dimensions: { lengthMm: 6000, widthMm: 10000 } },
      covering: { courses: [{ lengthMm: 10000, widthMm: 1200, overlapMm: 100 }] },
    };
    vi.mocked(calculateCoveringSnapshot).mockReturnValue({ geometry: output.geometry, output: output.covering } as never);
    const savedRevision = revision("a1", "a", 1);
    savedRevision.output_snapshot = {
      covering: { courses: [{ overlapMm: 100, widthMm: 1200, lengthMm: 10000 }] },
      geometry: { dimensions: { widthMm: 10000, lengthMm: 6000 } },
    };
    const snapshotBefore = structuredClone(savedRevision.output_snapshot);
    const fake = fakeClient({ calculations: [calculation("a", "a1")], calculation_revisions: [savedRevision] });
    vi.mocked(createClient).mockResolvedValue(fake.client as never);

    const [result] = await listGableTrapezoidalCoverings("org");

    expect(result.revisions).toHaveLength(1);
    expect(savedRevision.output_snapshot).toEqual(snapshotBefore);
  });
});

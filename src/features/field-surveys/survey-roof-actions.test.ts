import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { listVerifiedSurveyRoofs } from "./survey-roof-actions";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: vi.fn(async () => ({ organizations: [{ id: "11111111-1111-4111-8111-111111111111" }] })) }));
vi.mock("@/features/field-surveys/field-survey-data", () => ({ getFieldSurvey: vi.fn(async () => ({ version: 1, projectId: "project" })), getFieldSurveyRevision: vi.fn(async () => ({ projectId: "project" })) }));
vi.mock("@/domain/field-surveys/workspace", () => ({ surveySections: () => [{ id: "33333333-3333-4333-8333-333333333333", workType: "roof" }] }));
vi.mock("@/domain/field-surveys/gable-section-geometry", () => ({ gableGeometryFromSurveySection: () => null }));
vi.mock("@/features/roof-models/roof-model-data", () => ({ getRoofModelsForProject: vi.fn(async () => [
  { id: "model-a", roofType: "gable", currentRevisionId: "roof-a", currentRevisionNumber: 2, currentInput: {}, currentCalculationId: "calc-a", currentCalculationRevisionId: "calc-rev-a", name: "A" },
  { id: "model-b", roofType: "gable", currentRevisionId: "roof-b", currentRevisionNumber: 1, currentInput: {}, currentCalculationId: "calc-b", currentCalculationRevisionId: "calc-rev-b", name: "B" },
]) }));
vi.mock("@/domain/calculations/gable-roof", async (importOriginal) => ({ ...await importOriginal<typeof import("@/domain/calculations/gable-roof")>(), calculateGableRoof: () => ({ lengths: { eachEaveEdgeMm: 10, ridgeLineMm: 20, eachSlopingGableEdgeMm: 30 } }) }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

const organizationId = "11111111-1111-4111-8111-111111111111";
const surveyId = "22222222-2222-4222-8222-222222222222";
const sectionId = "33333333-3333-4333-8333-333333333333";

type Row = Record<string, unknown>;
function fakeClient(records: Record<string, Row[]>) {
  const requests: string[] = [];
  return { requests, client: { from: (table: string) => {
    requests.push(table);
    let rows = [...(records[table] ?? [])];
    const query: Record<string, (...args: never[]) => unknown> = {};
    query.select = (() => query) as never;
    query.eq = ((key: string, value: unknown) => { rows = rows.filter((row) => row[key] === value); return query; }) as never;
    query.in = ((key: string, values: unknown[]) => { rows = rows.filter((row) => values.includes(row[key])); return query; }) as never;
    query.maybeSingle = (async () => ({ data: rows[0] ?? null, error: null })) as never;
    query.then = ((resolve: (result: { data: Row[]; error: null }) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve)) as never;
    return query;
  } } };
}

describe("felmérésből ellenőrzött nyeregtetők", () => {
  beforeEach(() => vi.clearAllMocks());

  it("három batchelt olvasással csak a pontos, verified forrásláncot adja vissza", async () => {
    const fake = fakeClient({
      roof_model_revisions: [
        { id: "roof-a", roof_model_id: "model-a", organization_id: organizationId, validation_status: "verified" },
        { id: "roof-b", roof_model_id: "model-b", organization_id: organizationId, validation_status: "invalid" },
      ],
      calculation_revisions: [
        { id: "calc-rev-a", calculation_id: "calc-a", organization_id: organizationId, validation_status: "verified", output_snapshot: { lengths: { eachEaveEdgeMm: 10, ridgeLineMm: 20, eachSlopingGableEdgeMm: 30 } } },
        { id: "calc-rev-b", calculation_id: "calc-b", organization_id: organizationId, validation_status: "verified", output_snapshot: { lengths: { eachEaveEdgeMm: 10, ridgeLineMm: 20, eachSlopingGableEdgeMm: 30 } } },
      ],
      calculation_dependencies: [
        { id: "dep-a", organization_id: organizationId, downstream_calculation_revision_id: "calc-rev-a", upstream_roof_model_revision_id: "roof-a" },
        { id: "dep-b", organization_id: organizationId, downstream_calculation_revision_id: "calc-rev-b", upstream_roof_model_revision_id: "wrong-roof" },
        { id: "dep-b-foreign", organization_id: "99999999-9999-4999-8999-999999999999", downstream_calculation_revision_id: "calc-rev-b", upstream_roof_model_revision_id: "roof-b" },
      ],
    });
    vi.mocked(createClient).mockResolvedValue(fake.client as never);
    const result = await listVerifiedSurveyRoofs({ organizationId, surveyId, version: 1, sectionId });
    expect(result.map(({ roofModelId, roofModelRevisionId, calculationId, calculationRevisionId }) => ({ roofModelId, roofModelRevisionId, calculationId, calculationRevisionId }))).toEqual([
      { roofModelId: "model-a", roofModelRevisionId: "roof-a", calculationId: "calc-a", calculationRevisionId: "calc-rev-a" },
    ]);
    expect(fake.requests).toEqual(["roof_model_revisions", "calculation_revisions", "calculation_dependencies"]);
  });
});

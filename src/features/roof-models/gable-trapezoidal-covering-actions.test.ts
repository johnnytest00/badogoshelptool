import { describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { persistGableCovering } from "@/infrastructure/supabase/covering-writer";
import { saveGableTrapezoidalCovering } from "./gable-trapezoidal-covering-actions";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: vi.fn(async () => ({ userId: "actor", organizations: [{ id: "11111111-1111-4111-8111-111111111111" }] })) }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/infrastructure/supabase/covering-writer", () => ({ persistGableCovering: vi.fn(async () => ({ calculation_id: "saved", calculation_revision_id: "saved-revision", revision_number: 1, reused: false })) }));

const id = (digit: string) => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
const org = id("1"), project = id("2"), model = id("3"), roofRevision = id("4");
const layoutCalculation = id("5"), roofCalculation = id("6"), layoutRevision = id("7"), roofCalculationRevision = id("8");
const geometryInput = { inputMode: "height", buildingLengthMm: 10000, buildingWidthMm: 6000, roofRiseMm: 4000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const coveringInput = { nominalSheetWidthMm: 1100, effectiveCoveringWidthMm: 1000, selectedSheetLengthMm: 5000, minimumSheetLengthMm: null, maximumSheetLengthMm: null, endAllowanceMm: null, longitudinalOverlapMm: null, lapCompatibilityConfirmed: false, maximumSheetCount: 100000 };
const records: Record<string, Array<Record<string, unknown>>> = {
  roof_models: [{ id: model, project_id: project, organization_id: org, roof_type: "gable" }],
  roof_model_revisions: [{ id: roofRevision, roof_model_id: model, organization_id: org, validation_status: "verified", schema_version: "1.0.0", input_data: geometryInput }],
  calculation_dependencies: [{ organization_id: org, upstream_roof_model_revision_id: roofRevision, dependency_type: "roof_model_input", downstream_calculation_revision_id: layoutRevision }, { organization_id: org, upstream_roof_model_revision_id: roofRevision, dependency_type: "roof_model_input", downstream_calculation_revision_id: roofCalculationRevision }],
  calculation_revisions: [{ id: layoutRevision, calculation_id: layoutCalculation, organization_id: org, calculator_implementation_version: "1.0.0", input_schema_version: "1.0.0", validation_status: "verified" }, { id: roofCalculationRevision, calculation_id: roofCalculation, organization_id: org, calculator_implementation_version: "1.0.0", input_schema_version: "1.0.0", validation_status: "verified" }],
  calculations: [{ id: layoutCalculation, project_id: project, roof_model_id: model, organization_id: org, calculator_type: "covering.metal-sheets.layout" }, { id: roofCalculation, project_id: project, roof_model_id: model, organization_id: org, calculator_type: "roof.gable" }],
};
function table(name: string) {
  let rows = records[name];
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => { rows = rows.filter((row) => row[key] === value); return query; },
    in: (key: string, values: unknown[]) => { rows = rows.filter((row) => values.includes(row[key])); return query; },
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve: (value: { data: typeof rows; error: null }) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return query;
}

describe("projektfedés forrásválasztás", () => {
  it("a vegyes dependency találatokból a pontos roof.gable revíziót választja", async () => {
    vi.mocked(createClient).mockResolvedValue({ from: table } as never);
    const result = await saveGableTrapezoidalCovering({ organizationId: org, calculationId: id("9"), operationId: id("a"), expectedRevisionNumber: 0, name: "DEMO fedés", scope: { kind: "project", projectId: project, roofModelId: model, roofModelRevisionId: roofRevision }, geometryInput, coveringInput });
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(vi.mocked(persistGableCovering).mock.calls.at(-1)?.[0].input).toMatchObject({ source: { geometryCalculationId: roofCalculation, geometryCalculationRevisionId: roofCalculationRevision, roofModelRevisionId: roofRevision } });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { getWorkflowMaterialLists, surveyNameFromRevision } from "./material-preparation-data";
import { SupabaseReadError } from "@/infrastructure/supabase/read-error";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

let rows: Record<string, unknown[]>;
let queryErrors: Record<string, unknown>;
let queryLog: string[];

function makeClient() {
  return {
    from(table: string) {
      queryLog.push(table);
      const filters: Array<{ kind: "eq" | "is" | "in"; column: string; value: unknown }> = [];
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push({ kind: "eq", column, value }); return query; },
        is: (column: string, value: null) => { filters.push({ kind: "is", column, value }); return query; },
        in: (column: string, value: unknown[]) => { filters.push({ kind: "in", column, value }); return query; },
        order: () => query,
        limit: () => query,
        then: (resolve: (response: { data: unknown[]; error: unknown }) => unknown) => Promise.resolve(resolve({
          data: queryErrors[table] ? [] : (rows[table] ?? []).filter((row) => filters.every((filter) => {
            const value = (row as Record<string, unknown>)[filter.column];
            return filter.kind === "in" ? (filter.value as unknown[]).includes(value) : value === filter.value;
          })),
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

describe("survey source name mapping", () => {
  it("uses the exact immutable revision section names", () => {
    expect(surveyNameFromRevision("roof", [
      { id: "section-1", name: "DEMO tető", workType: "roof" },
      { id: "section-2", name: "Ereszcsatorna", workType: "gutter" },
    ])).toBe("DEMO tető · Ereszcsatorna");
  });

  it("falls back to the known work type without inventing a custom title", () => {
    expect(surveyNameFromRevision("gutter", null)).toBe("Ereszcsatorna");
    expect(surveyNameFromRevision("unknown", null)).toBe("Felmérés");
  });
});

describe("execution material-list read boundary", () => {
  it("keeps an empty organization-scoped result as a real empty state", async () => {
    await expect(getWorkflowMaterialLists("org")).resolves.toEqual([]);
  });

  it.each([
    ["material_preparation_lists", { code: "42501" }, "access_denied"],
    ["material_preparation_revisions", { code: "XX000" }, "unavailable"],
    ["material_preparation_survey_sources", { code: "08006" }, "unavailable"],
    ["field_surveys", { status: 403 }, "access_denied"],
    ["field_survey_revisions", { code: "XX000" }, "unavailable"],
  ] as const)("preserves typed failure for %s rather than returning an empty list", async (table, error, failure) => {
    rows.material_preparation_lists = [
      { id: "list", organization_id: "org", project_id: null, execution_plan_id: "plan", name: "Lista", current_revision_id: "revision", version: 1, updated_at: "2026-10-23" },
      { id: "foreign-list", organization_id: "other-org", project_id: null, execution_plan_id: "plan", name: "Foreign", current_revision_id: "foreign-revision", version: 1, updated_at: "2026-10-23" },
    ];
    rows.material_preparation_revisions = [{ id: "revision", organization_id: "org", list_id: "list", revision_number: 1, preparation_state: "ready", source_takeoffs_snapshot: [], items_snapshot: [], created_at: "2026-10-23", created_by: "user" }];
    rows.material_preparation_survey_sources = [{ organization_id: "org", material_list_id: "list", material_revision_id: "revision", survey_id: "survey", survey_revision_id: "survey-revision", survey_version: 1, source_items_snapshot: [], created_by: "user", created_at: "2026-10-23" }];
    rows.field_surveys = [{ id: "survey", organization_id: "org", version: 1 }];
    rows.field_survey_revisions = [{ id: "survey-revision", organization_id: "org", survey_id: "survey", work_type: "roof", sections: [] }];
    queryErrors[table] = error;

    await expect(getWorkflowMaterialLists("org")).rejects.toBeInstanceOf(SupabaseReadError);
    await expect(getWorkflowMaterialLists("org")).rejects.toMatchObject({ failure });
  });

  it("preserves a material-list snapshot and exact survey source association on success", async () => {
    rows.material_preparation_lists = [
      { id: "list", organization_id: "org", project_id: null, execution_plan_id: "plan", name: "Lista", current_revision_id: "revision", version: 1, updated_at: "2026-10-23" },
      { id: "foreign-list", organization_id: "other-org", project_id: null, execution_plan_id: "plan", name: "Foreign", current_revision_id: "foreign-revision", version: 1, updated_at: "2026-10-23" },
    ];
    rows.material_preparation_revisions = [{ id: "revision", organization_id: "org", list_id: "list", revision_number: 1, preparation_state: "ready", source_takeoffs_snapshot: [], items_snapshot: [{ id: "item" }], created_at: "2026-10-23", created_by: "user" }];
    rows.material_preparation_survey_sources = [{ organization_id: "org", material_list_id: "list", material_revision_id: "revision", survey_id: "survey", survey_revision_id: "survey-revision", survey_version: 1, source_items_snapshot: [{ id: "source-item" }], created_by: "user", created_at: "2026-10-23" }];
    rows.field_surveys = [{ id: "survey", organization_id: "org", version: 2 }];
    rows.field_survey_revisions = [{ id: "survey-revision", organization_id: "org", survey_id: "survey", work_type: "roof", sections: [{ id: "section", name: "DEMO tető" }] }];

    await expect(getWorkflowMaterialLists("org")).resolves.toMatchObject([{
      id: "list", currentRevisionId: "revision", currentRevision: {
        id: "revision", items: [{ id: "item" }], surveySource: {
          surveyId: "survey", surveyRevisionId: "survey-revision", surveyVersion: 1,
          surveyName: "DEMO tető", currentSurveyVersion: 2, stale: true, items: [{ id: "source-item" }],
        },
      },
    }]);
    expect(queryLog).toHaveLength(5);
  });

  it("does not substitute a survey name when the exact source revision belongs to another survey", async () => {
    rows.material_preparation_lists = [{ id: "list", organization_id: "org", project_id: null, execution_plan_id: "plan", name: "Lista", current_revision_id: "revision", version: 1, updated_at: "2026-10-23" }];
    rows.material_preparation_revisions = [{ id: "revision", organization_id: "org", list_id: "list", revision_number: 1, preparation_state: "ready", source_takeoffs_snapshot: [], items_snapshot: [], created_at: "2026-10-23", created_by: "user" }];
    rows.material_preparation_survey_sources = [{ organization_id: "org", material_list_id: "list", material_revision_id: "revision", survey_id: "survey", survey_revision_id: "other-revision", survey_version: 1, source_items_snapshot: [], created_by: "user", created_at: "2026-10-23" }];
    rows.field_surveys = [{ id: "survey", organization_id: "org", version: 1 }];
    rows.field_survey_revisions = [{ id: "other-revision", organization_id: "org", survey_id: "another-survey", work_type: "roof", sections: [{ name: "Wrong source" }] }];

    await expect(getWorkflowMaterialLists("org")).rejects.toMatchObject({
      name: "SupabaseReadError", failure: "unavailable",
    });
  });
});

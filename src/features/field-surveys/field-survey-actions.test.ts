import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ auth: { userId: "user-1", organizations: [{ id: "123e4567-e89b-42d3-a456-426614174000", name: "DEMO", role: "owner" }] }, rpc: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc }) }));

import { saveFieldSurveyAction } from "./field-survey-actions";

const values = {
  organizationId: "123e4567-e89b-42d3-a456-426614174000", surveyId: "", projectId: "", workType: "gutter",
  measurements: JSON.stringify([{ id: "123e4567-e89b-42d3-a456-426614174001", label: "Eresz hossza", value: 8.5, unit: "m" }]),
  notes: "", expectedVersion: "0",
};
const form = (overrides: Partial<typeof values> = {}) => {
  const result = new FormData();
  for (const [key, value] of Object.entries({ ...values, ...overrides })) result.set(key, value);
  return result;
}

describe("field survey server action", () => {
  beforeEach(() => { vi.clearAllMocks(); state.auth = { userId: "user-1", organizations: [{ id: "123e4567-e89b-42d3-a456-426614174000", name: "DEMO", role: "owner" }] }; state.rpc.mockResolvedValue({ data: [{ survey_id: "123e4567-e89b-42d3-a456-426614174002", version: 1 }], error: null }); });

  it("validates and saves a small standalone survey without optional data", async () => {
    expect(await saveFieldSurveyAction(form())).toMatchObject({ ok: true, version: 1 });
    expect(state.rpc).toHaveBeenCalledWith("save_field_survey", expect.objectContaining({ p_project_id: null, p_notes: null, p_expected_version: 0 }));
  });

  it("saves an incomplete workspace without coercing its missing value to zero", async () => {
    const data = form({ measurements: "[]" });
    const sections = [{ id: "123e4567-e89b-42d3-a456-426614174010", name: "DEMO eresz", workType: "gutter", measurements: [{ id: "123e4567-e89b-42d3-a456-426614174001", label: "DEMO mérés", value: null, unit: "m", semanticType: "gutter_run_length" }], notes: "", photoIds: [] }];
    data.set("sections", JSON.stringify(sections));
    expect((await saveFieldSurveyAction(data)).ok).toBe(true);
    expect(state.rpc).toHaveBeenCalledWith("save_field_survey_workspace", expect.objectContaining({ p_sections: sections, p_measurements: [] }));
  });

  it("preserves an explicitly selected project association", async () => {
    const projectId = "123e4567-e89b-42d3-a456-426614174004";
    expect(await saveFieldSurveyAction(form({ projectId }))).toMatchObject({ ok: true });
    expect(state.rpc).toHaveBeenCalledWith("save_field_survey", expect.objectContaining({ p_project_id: projectId }));
  });

  it("rejects malformed units before database mutation", async () => {
    const malformed = JSON.stringify([{ id: "123e4567-e89b-42d3-a456-426614174001", label: "Ismeretlen", value: 8, unit: "yard" }]);
    expect(await saveFieldSurveyAction(form({ measurements: malformed }))).toMatchObject({ ok: false });
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("requires organization membership before save", async () => {
    state.auth = { userId: "user-1", organizations: [] };
    expect(await saveFieldSurveyAction(form())).toMatchObject({ ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." });
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("surfaces expected-version conflicts without retrying an overwrite", async () => {
    state.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    const result = await saveFieldSurveyAction(form({ surveyId: "123e4567-e89b-42d3-a456-426614174002", expectedVersion: "1" }));
    expect(state.rpc).toHaveBeenCalled();
    expect(result.conflict).toBe(true);
  });
});

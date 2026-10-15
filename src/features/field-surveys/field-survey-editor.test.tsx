import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/features/field-surveys/field-survey-actions", () => ({ saveFieldSurveyAction: vi.fn() }));

import { FieldSurveyEditor } from "./field-survey-editor";
import type { FieldSurveyRecord } from "./field-survey-data";

const survey: FieldSurveyRecord = {
  id: "123e4567-e89b-42d3-a456-426614174002", organizationId: "123e4567-e89b-42d3-a456-426614174000",
  projectId: "123e4567-e89b-42d3-a456-426614174004", createdBy: "123e4567-e89b-42d3-a456-426614174003", workType: "gutter",
  measurements: [{ id: "123e4567-e89b-42d3-a456-426614174001", label: "Ereszszakasz", value: 8.5, unit: "m", semanticType: "gutter_run_length" }],
  notes: "DEMO nehezen hozzáférhető", version: 2, createdAt: "2026-10-15T00:00:00.000Z", updatedAt: "2026-10-15T00:00:00.000Z",
};

describe("field survey editor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the short new-survey flow with a first essential measurement and optional project", () => {
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[{ id: "project-1", name: "DEMO projekt" }]} />);
    expect(html).toContain("Új felmérés");
    expect(html).toContain("Munkatípus");
    expect(html).toContain("Tető");
    expect(html).toContain("Projekt");
    expect(html).toContain("Mérés hozzáadása");
    expect(html).toContain("Felmérés mentése");
    expect(html).toContain("opcionális");
    expect(html).toContain("value=\"roof\"");
  });

  it("reopens persisted measurements, explicit units and note for continued editing", () => {
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[{ id: survey.projectId!, name: "DEMO linked project" }]} survey={survey} />);
    expect(html).toContain("Felmérés szerkesztése");
    expect(html).toContain("V2");
    expect(html).toContain("Ereszszakasz");
    expect(html).toContain("value=\"8.5\"");
    expect(html).toContain("DEMO nehezen hozzáférhető");
    expect(html).toContain("Kapcsolt projekt");
    expect(html).toContain("DEMO linked project");
  });
});

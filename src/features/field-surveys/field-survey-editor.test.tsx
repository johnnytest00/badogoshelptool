import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/features/field-surveys/field-survey-actions", () => ({ saveFieldSurveyAction: vi.fn() }));

vi.mock("./workspace-actions", () => ({ loadSurveyCalculator: vi.fn(), createSurveyFollowups: vi.fn() }));
vi.mock("./workspace-calculator", () => ({ WorkspaceCalculator: () => null }));
vi.mock("./survey-roof-actions", () => ({ listVerifiedSurveyRoofs: vi.fn(), saveSurveyRoofGeometry: vi.fn(), listVerifiedSurveyMultiRoofs: vi.fn(), saveSurveyMultiRoofGeometry: vi.fn() }));

import { FieldSurveyEditor } from "./field-survey-editor";
import type { FieldSurveyRecord, FieldSurveyRevisionRecord } from "./field-survey-data";

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
    expect(html).toContain("Ereszcsatorna");
    expect(html).toContain("Bádogos szegély");
    expect(html).toContain("Név, munkatípus és sorrend");
    expect(html).toContain("Mérés beállításai");
    expect(html).toContain("Projekt");
    expect(html).toContain("Mérés hozzáadása");
    expect(html).toContain("Felmérés mentése");
    expect(html).toContain("opcionális");
    expect(html).toContain("value=\"roof\"");
  });

  it("keeps measurement values prominent while advanced mapping stays available", () => {
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[]} survey={survey} />);
    expect(html).toContain("Ereszszakasz · m");
    expect(html).toContain('value="8.5"');
    expect(html).toContain("Mérés beállításai");
    expect(html).toContain("Számítási szerep");
  });

  it("restores the active work section after the first save changes the URL", () => {
    const flashingId = "123e4567-e89b-42d3-a456-426614174005";
    const withSections: FieldSurveyRecord = {
      ...survey,
      sections: [
        { id: "123e4567-e89b-42d3-a456-426614174006", name: "Tető", workType: "roof", notes: "", photoIds: [], measurements: [] },
        { id: flashingId, name: "Bádogos szegély", workType: "flashing", notes: "", photoIds: [], measurements: [{ id: survey.measurements[0].id, label: "Szegélyszakasz hossza", value: 10, unit: "m", semanticType: "flashing_run_length" }] },
      ],
    };
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[]} survey={withSections} initialSectionId={flashingId} />);
    expect(html).toContain("<h2>Munkaszakasz: Bádogos szegély</h2>");
    expect(html).toContain('value="10"');
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

  it("uses touch numeric input, a collapsed optional note and a full-width save action", () => {
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[]} />);
    expect(html).toContain('inputMode="decimal"');
    expect(html).toContain('type="text"');
    expect(html).toContain('class="field-survey-note-details"');
    expect(html).toContain('class="primary-button field-survey-save"');
  });

  it("renders a historical revision with its exact measurements and calculator handoff", () => {
    const revision: FieldSurveyRevisionRecord = {
      id: "revision-1", surveyId: survey.id, organizationId: survey.organizationId, projectId: survey.projectId,
      version: 1, workType: "gutter", measurements: [{ ...survey.measurements[0], value: 7.5 }],
      notes: "DEMO V1", photosSnapshot: [], createdAt: survey.createdAt,
    };
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[]} survey={survey} revisionVersions={[2, 1]} historicalRevision={revision} />);
    expect(html).toContain("Korábbi felmérésváltozat");
    expect(html).toContain("7,5");
    expect(html).toContain("DEMO V1");
    expect(html).toContain("version=1");
  });
});

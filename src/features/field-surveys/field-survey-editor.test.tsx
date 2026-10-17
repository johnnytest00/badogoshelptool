import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/features/field-surveys/field-survey-actions", () => ({ saveFieldSurveyAction: vi.fn() }));

vi.mock("./workspace-actions", () => ({
  loadSurveyCalculator: vi.fn(),
  createSurveyFollowups: vi.fn(),
  createExecutionPlanFromSurvey: vi.fn(),
  linkSurveyToExecutionPlan: vi.fn(),
}));
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

  it("asks for the work type before showing the relevant measurements on a new survey", () => {
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[{ id: "project-1", name: "DEMO projekt" }]} />);
    expect(html).toContain("Új felmérés");
    expect(html).toContain("Mit szeretnél felmérni?");
    expect(html).toContain('aria-label="Munkatípus kiválasztása"');
    expect(html).toContain("Tető");
    expect(html).toContain("Ereszcsatorna");
    expect(html).toContain("Bádogos szegély");
    expect(html).not.toContain('<span class="survey-section-tab-name">Tető</span>');
    expect(html).not.toContain('aria-label="0 kitöltött mérés"');
    expect(html).not.toContain("field-survey-active-section-title");
    expect(html).toContain('class="glass-toolbar survey-section-add survey-work-type-chooser"');
    expect(html).not.toContain("Új tetőszakasz");
    expect(html).not.toContain("Név, munkatípus és sorrend");
    expect(html).not.toContain("Felmért tetőforma");
    expect(html).not.toContain("roof-type-illustration");
    expect(html).not.toContain('class="field-survey-measurements"');
    expect(html).toContain("Önálló felmérés mentése");
    expect(html).toContain("Munkanapló létrehozása");
    expect(html).not.toContain("Projekt létrehozása / kapcsolása");
    expect(html).toContain("A felmérés munkanapló és tetőforma nélkül is folytatható.");
  });

  it("keeps measurement values prominent while advanced mapping stays available", () => {
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[]} survey={survey} />);
    expect(html).toContain("Ereszszakasz · m");
    expect(html).toContain('value="8.5"');
    expect(html).toContain('aria-label="Beállítások: Ereszszakasz"');
    expect(html).toContain('aria-label="Ereszszakasz törlése"');
  });

  it("keeps only roof and other in the primary section toolbar while retaining specialized work types", () => {
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[]} survey={survey} />);

    expect(html.match(/>Új (?:tetőszakasz|egyéb szakasz)<\/button>/g)).toHaveLength(2);
    expect(html).not.toContain("Új ereszcsatorna-szakasz");
    expect(html).not.toContain("Új szegélyszakasz");
    expect(html).toMatch(/<option value="gutter"(?: selected="")?>Ereszcsatorna<\/option>/);
    expect(html).toContain('<option value="flashing">Bádogos szegély</option>');
    expect(html).toContain('value="8.5"');
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
    expect(html).toContain('<span class="survey-section-tab-name">Bádogos szegély</span>');
    expect(html).not.toContain("field-survey-active-section-title");
    expect(html).toContain('value="10"');
  });

  it("reopens persisted measurements, explicit units and note for continued editing", () => {
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[{ id: survey.projectId!, name: "DEMO linked project" }]} survey={survey} />);
    expect(html).toContain("Felmérés szerkesztése");
    expect(html).toContain("V2");
    expect(html).toContain("Ereszszakasz");
    expect(html).toContain("value=\"8.5\"");
    expect(html).toContain("DEMO nehezen hozzáférhető");
    expect(html).toContain("Korábbi projektkapcsolat");
    expect(html).toContain("DEMO linked project");
    expect(html).toContain("Felmérés csatolása meglévő munkanaplóhoz");
  });

  it("keeps editors hidden until work type selection and retains disabled survey actions", () => {
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[]} />);
    expect(html).not.toContain('class="field-survey-measurements"');
    expect(html).toContain("Mit szeretnél felmérni?");
    expect(html).not.toContain('class="glass-disclosure field-survey-note-details"');
    expect(html).toContain('id="field-survey-editor-form"');
    expect(html).toContain("Következő lépések");
    expect(html).not.toContain("Fotók hozzáadása");
    expect(html).toContain("Önálló felmérés mentése");
    expect(html).toContain('class="survey-workflow-tile" disabled=""');
    expect(html).not.toContain("Terv és ügyfél nélkül");
    expect(html).toContain("Munkanapló létrehozása");
    expect(html).not.toContain("Projekt létrehozása / kapcsolása");
  });

  it("keeps a roof survey's measurement grid immediately ahead of its validated drawing", () => {
    const roofSurvey: FieldSurveyRecord = {
      ...survey, workType: "roof", projectId: null,
      sections: [{
        id: "123e4567-e89b-42d3-a456-426614174010", name: "Nyeregtető", workType: "roof", roofType: "gable", notes: "", photoIds: [],
        measurements: [
          { id: "123e4567-e89b-42d3-a456-426614174011", label: "Épület hossza", value: 10000, unit: "mm", semanticType: "roof_building_length" },
          { id: "123e4567-e89b-42d3-a456-426614174012", label: "Épület szélessége", value: 8000, unit: "mm", semanticType: "roof_building_width" },
          { id: "123e4567-e89b-42d3-a456-426614174013", label: "Tetőemelkedés", value: 3000, unit: "mm", semanticType: "roof_rise" },
          { id: "123e4567-e89b-42d3-a456-426614174014", label: "Eresztúlnyúlás", value: 0, unit: "mm", semanticType: "roof_eave_overhang" },
          { id: "123e4567-e89b-42d3-a456-426614174015", label: "Első oromtúlnyúlás", value: 0, unit: "mm", semanticType: "roof_front_gable_overhang" },
          { id: "123e4567-e89b-42d3-a456-426614174016", label: "Hátsó oromtúlnyúlás", value: 0, unit: "mm", semanticType: "roof_rear_gable_overhang" },
        ],
      }],
    };
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[]} survey={roofSurvey} />);
    expect(html).toContain('class="technical-drawing is-compact"');
    const stripStart = html.indexOf('class="roof-survey-measurement-strip"');
    const drawingStart = html.indexOf('class="technical-drawing is-compact"');
    expect(html.indexOf("roof-workspace-context")).toBeLessThan(stripStart);
    expect(stripStart).toBeGreaterThan(-1);
    expect(drawingStart).toBeGreaterThan(stripStart);
    expect(html.slice(stripStart, drawingStart)).not.toContain("measurement-guidance");
    expect(html.slice(stripStart, drawingStart)).not.toContain("roof-workspace-context");
    expect(html).toContain("Tetőemelkedés");
    expect(html).toContain("Interaktív műszaki rajz");
  });

  it("preserves the reported rise and pitch but explains their conflict instead of drawing", () => {
    const conflictSurvey: FieldSurveyRecord = {
      ...survey, workType: "roof", projectId: null,
      sections: [{
        id: "123e4567-e89b-42d3-a456-426614174020", name: "Nyeregtető", workType: "roof", roofType: "gable", notes: "", photoIds: [],
        measurements: [
          { id: "123e4567-e89b-42d3-a456-426614174021", label: "Épület hossza", value: 100, unit: "m", semanticType: "roof_building_length" },
          { id: "123e4567-e89b-42d3-a456-426614174022", label: "Épület szélessége", value: 40, unit: "m", semanticType: "roof_building_width" },
          { id: "123e4567-e89b-42d3-a456-426614174023", label: "Tetőemelkedés", value: 10, unit: "m", semanticType: "roof_rise" },
          { id: "123e4567-e89b-42d3-a456-426614174024", label: "Tetőhajlásszög", value: 30, unit: "degree", semanticType: "roof_pitch" },
          { id: "123e4567-e89b-42d3-a456-426614174025", label: "Eresztúlnyúlás", value: 0, unit: "mm", semanticType: "roof_eave_overhang" },
          { id: "123e4567-e89b-42d3-a456-426614174026", label: "Első oromtúlnyúlás", value: 0, unit: "mm", semanticType: "roof_front_gable_overhang" },
          { id: "123e4567-e89b-42d3-a456-426614174027", label: "Hátsó oromtúlnyúlás", value: 0, unit: "mm", semanticType: "roof_rear_gable_overhang" },
        ],
      }],
    };
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[]} survey={conflictSurvey} />);
    expect(html).toContain("A nyeregtető rajzához vagy tetőemelkedést, vagy hajlásszöget adj meg");
    expect(html).toContain('value="10"');
    expect(html).toContain('value="30"');
    expect(html.match(/aria-invalid="true"/g)).toHaveLength(2);
    expect(html).not.toContain('class="technical-drawing is-compact"');
  });

  it("renders a historical revision with its exact measurements and calculator handoff", () => {
    const revision: FieldSurveyRevisionRecord = {
      id: "revision-1", surveyId: survey.id, organizationId: survey.organizationId, projectId: survey.projectId,
      version: 1, workType: "gutter", measurements: [{ ...survey.measurements[0], value: 7.5 }],
      notes: "DEMO V1", photosSnapshot: [], createdAt: survey.createdAt,
    };
    const html = renderToStaticMarkup(<FieldSurveyEditor organizationId={survey.organizationId} projects={[]} survey={survey} revisionVersions={[2, 1]} historicalRevision={revision} />);
    expect(html).toContain("<h1>Korábbi felmérés</h1>");
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("7,5");
    expect(html).toContain("DEMO V1");
    expect(html).toContain("version=1");
  });
});

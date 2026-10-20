import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SurveyCalculationLink, SurveySection } from "@/domain/field-surveys/workspace";

vi.mock("./workspace-actions", () => ({ createSurveyFollowups: vi.fn() }));

import { WorkspaceSummary } from "./workspace-summary";

describe("saved calculation in the survey summary", () => {
  it("keeps historic calculation provenance visible without launching a calculator", () => {
    const section: SurveySection = {
      id: "123e4567-e89b-42d3-a456-426614174101", name: "DEMO eresz", workType: "gutter", notes: "", photoIds: [],
      measurements: [{ id: "123e4567-e89b-42d3-a456-426614174102", label: "Ereszszakasz hossza", value: 8.5, unit: "m", semanticType: "gutter_run_length" }],
    };
    const linked: SurveyCalculationLink = {
      id: "link-1", sectionId: section.id, surveyRevisionId: "survey-revision-1", surveyVersion: 1,
      calculationId: "calculation-1", revisionId: "calculation-revision-1", revisionNumber: 1,
      calculatorType: "gutters.material-estimate", name: "DEMO ereszszámítás", output: { totals: { gutterStockSections: 3 } }, warnings: [], provenance: {},
      validationStatus: "verified",
    };
    const html = renderToStaticMarkup(<WorkspaceSummary organizationId="organization-1" surveyId="survey-1" version={2} sections={[section]} calculations={[linked]} initialFollowups={[]} projects={[]} originalProjectId={null} readOnly />);
    expect(html).toContain("Anyaglista készítése");
    expect(html).toContain("surveyVersion=2");
    expect(html).not.toContain("/kalkulatorok/");
    expect(html).not.toContain("Mentett számítás megnyitása");
    expect(html).toContain("Forrásfelmérés: V1");
    expect(html).toContain("korábbi forrás");
    expect(html).not.toContain("kalkulátorban pótolható");
    expect(html).toContain("calculation-revision-1");
    expect(html).toContain("3 db");

    const projectHtml = renderToStaticMarkup(<WorkspaceSummary organizationId="organization-1" surveyId="survey-1" version={2} sections={[section]} calculations={[linked]} initialFollowups={[]} projects={[]} originalProjectId="project-1" readOnly />);
    expect(projectHtml).not.toContain("/projektek/project-1/ereszcsatorna");
    expect(projectHtml).toContain("calculation-revision-1");
  });

  it("shows existing project and quotation links without offering duplicate creation", () => {
    const section: SurveySection = { id: "123e4567-e89b-42d3-a456-426614174101", name: "DEMO tető", workType: "roof", notes: "", photoIds: [], measurements: [] };
    const html = renderToStaticMarkup(<WorkspaceSummary organizationId="organization-1" surveyId="survey-1" version={2} sections={[section]} calculations={[]} initialFollowups={[
      { id: "project-link", kind: "project", projectId: "project-1", quotationId: null, quotationRevisionId: null, surveyRevisionId: "revision-1" },
      { id: "quotation-link", kind: "quotation", projectId: "project-1", quotationId: "quotation-1", quotationRevisionId: "quotation-revision-1", surveyRevisionId: "revision-1" },
    ]} projects={[]} originalProjectId={null} />);
    expect(html).toContain("Régi projekthez kapcsolt adatok megnyitása");
    expect(html).toContain("Árajánlatpiszkozat megnyitása");
    expect(html).toContain("már létrejött");
    expect(html).not.toContain("Projekt létrehozása / kapcsolása");
    expect(html).not.toContain("Árajánlat-piszkozat létrehozása");
  });
  it("shows missing roof type as an actionable calculation gap without blocking the saved summary", () => {
    const section: SurveySection = { id: "123e4567-e89b-42d3-a456-426614174101", name: "DEMO tető", workType: "roof", notes: "", photoIds: [], measurements: [] };
    const html = renderToStaticMarkup(<WorkspaceSummary organizationId="organization-1" surveyId="survey-1" version={1} sections={[section]} calculations={[]} initialFollowups={[]} projects={[]} originalProjectId={null} readOnly />);
    expect(html).toContain("A felmérés menthető tetőforma nélkül.");
    expect(html).not.toContain("Épület hossza");
    expect(html).toContain("Felmérés összesítése · V1");
  });

  it("renders the historical quick single-slope revision from its own saved measurements (V1 ≠ V2)", () => {
    const section = (eave: number): SurveySection => ({ id: "123e4567-e89b-42d3-a456-426614174201", name: "DEMO félnyereg", workType: "roof", roofType: "shed", roofMeasurementMode: "quick", notes: "", photoIds: [], measurements: [
      { id: "123e4567-e89b-42d3-a456-426614174202", label: "Eresz", value: eave, unit: "m", semanticType: "roof_eave_run" },
      { id: "123e4567-e89b-42d3-a456-426614174203", label: "Lejtő", value: 4.2, unit: "m", semanticType: "roof_plane_slope_a" }] });
    const render = (sections: SurveySection[], version: number) => renderToStaticMarkup(<WorkspaceSummary organizationId="o" surveyId="s" version={version} sections={sections} calculations={[]} initialFollowups={[]} projects={[]} originalProjectId={null} readOnly />);
    expect(render([section(8.5)], 1)).toContain("35,70 m²");
    expect(render([section(8.5)], 1)).toContain("A félnyeregtető síkjának méretarányos");
    expect(render([section(9)], 2)).toContain("37,80 m²");
    expect(render([section(8.5)], 1)).not.toContain("nem számítható újra");
  });
});

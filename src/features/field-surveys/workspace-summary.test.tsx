import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SurveyCalculationLink, SurveySection } from "@/domain/field-surveys/workspace";

vi.mock("./workspace-actions", () => ({ createSurveyFollowups: vi.fn() }));

import { WorkspaceSummary } from "./workspace-summary";

describe("saved calculation in the survey summary", () => {
  it("reopens the saved calculation while keeping the exact source revision visible", () => {
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
    expect(html).toContain("Mentett számítás megnyitása");
    expect(html).toContain("Anyaglista készítése");
    expect(html).toContain("surveyVersion=2");
    expect(html).toContain("/kalkulatorok/ereszcsatorna?organization=organization-1&amp;calculation=calculation-1");
    expect(html).toContain("Forrásfelmérés: V1");
    expect(html).toContain("korábbi forrás");
    expect(html).toContain("A felmérésből hiányzik (a kalkulátorban pótolható)");
    expect(html).toContain("calculation-revision-1");
    expect(html).toContain("3 db");

    const projectHtml = renderToStaticMarkup(<WorkspaceSummary organizationId="organization-1" surveyId="survey-1" version={2} sections={[section]} calculations={[linked]} initialFollowups={[]} projects={[]} originalProjectId="project-1" readOnly />);
    expect(projectHtml).toContain("/projektek/project-1/ereszcsatorna?organization=organization-1&amp;calculation=calculation-1&amp;revision=calculation-revision-1");
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
});

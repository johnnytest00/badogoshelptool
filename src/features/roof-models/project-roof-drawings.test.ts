import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RoofModelRecord } from "./roof-model-data";
import { ProjectRoofDrawings, selectProjectRoofDrawings } from "./project-roof-drawings";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";

const output = calculateGableRoof({ inputMode: "height", buildingWidthMm: 8000, buildingLengthMm: 12000, roofRiseMm: 3000, eaveOverhangMm: 500, frontGableOverhangMm: 250, rearGableOverhangMm: 250 });
const model = (overrides: Partial<RoofModelRecord> = {}): RoofModelRecord => ({ id: "model-1", projectId: "project-1", name: "Főépület", roofType: "gable", currentRevisionId: "roof-rev-1", currentRevisionNumber: 3, currentInput: null, currentOutput: output, currentCalculationId: "calc-1", currentCalculationRevisionId: "calc-rev-1", revisions: [], ...overrides });

describe("project roof drawing overview", () => {
  it("keeps only saved gable drawings and retains model and revision identities", () => {
    const entries = selectProjectRoofDrawings([model(), model({ id: "model-2", name: "Melléképület", currentRevisionNumber: 2 }), model({ id: "model-3", currentRevisionId: null }), model({ id: "model-4", roofType: "hip" })]);
    expect(entries.map(({ id, name, revisionNumber }) => [id, name, revisionNumber])).toEqual([["model-1", "Főépület", 3], ["model-2", "Melléképület", 2]]);
  });

  it("stacks multiple model drawings with unique headings and detail links", () => {
    const html = renderToStaticMarkup(createElement(ProjectRoofDrawings, { models: [model(), model({ id: "model-2", name: "Melléképület", currentRevisionNumber: 2 })], projectId: "project-1", organizationId: "org-1" }));
    expect(html).toContain("Főépület · V3 rajzai");
    expect(html).toContain("Melléképület · V2 rajzai");
    expect(html).toContain("Részletes modell megnyitása");
    expect(html).toContain('aria-label="Rajznézet választása"');
    expect(html).toContain("organization=org-1");
    expect((html.match(/class="project-roof-drawing"/g) ?? []).length).toBe(2);
  });
});

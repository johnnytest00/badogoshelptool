import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RoofModelRecord } from "./roof-model-data";
import { ProjectRoofDrawings, resolveProjectRoofDrawing, selectProjectRoofDrawings } from "./project-roof-drawings";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";

const output = calculateGableRoof({ inputMode: "height", buildingWidthMm: 8000, buildingLengthMm: 12000, roofRiseMm: 3000, eaveOverhangMm: 500, frontGableOverhangMm: 250, rearGableOverhangMm: 250 });
const model = (overrides: Partial<RoofModelRecord> = {}): RoofModelRecord => ({ id: "model-1", projectId: "project-1", name: "Főépület", roofType: "gable", currentRevisionId: "roof-rev-1", currentRevisionNumber: 3, currentInput: null, currentOutput: output, currentCalculationId: "calc-1", currentCalculationRevisionId: "calc-rev-1", revisions: [], ...overrides });

describe("project roof drawing overview", () => {
  it("keeps only saved gable drawings and retains model and revision identities", () => {
    const entries = selectProjectRoofDrawings([model(), model({ id: "model-2", name: "Melléképület", currentRevisionId: "roof-rev-2", currentRevisionNumber: 2, currentCalculationId: "calc-2", currentCalculationRevisionId: "calc-rev-2" }), model({ id: "model-3", currentRevisionId: null }), model({ id: "model-4", roofType: "hip" })]);
    expect(entries.map(({ id, name, revisionId, revisionNumber, calculationId, calculationRevisionId }) => [id, name, revisionId, revisionNumber, calculationId, calculationRevisionId])).toEqual([
      ["model-1", "Főépület", "roof-rev-1", 3, "calc-1", "calc-rev-1"],
      ["model-2", "Melléképület", "roof-rev-2", 2, "calc-2", "calc-rev-2"],
    ]);
  });

  it("uses the compact model entries as drawing selectors and renders one saved drawing", () => {
    const html = renderToStaticMarkup(createElement(ProjectRoofDrawings, { models: [model(), model({ id: "model-2", name: "Melléképület", currentRevisionId: "roof-rev-2", currentRevisionNumber: 2, currentCalculationId: "calc-2", currentCalculationRevisionId: "calc-rev-2" })], projectId: "project-1", organizationId: "org-1" }));
    expect(html).toContain("Méretezett rajznézet");
    expect(html).toContain('<h2 id="project-roof-drawings-title">Tetőrajzok</h2>');
    expect(html).toContain('<h2 id="project-roof-models-title">Tetőmodellek</h2>');
    expect((html.match(/class="roof-list-heading"/g) ?? []).length).toBe(2);
    expect(html).toContain('aria-label="Rajz megtekintése: Főépület, V3"');
    expect(html).toContain('aria-label="Rajz megtekintése: Melléképület, V2"');
    expect(html).toContain("Teljes modell megnyitása");
    expect(html).toContain("organization=org-1");
    expect((html.match(/class="technical-drawing-svg"/g) ?? []).length).toBe(1);
    expect((html.match(/class="roof-model-select"/g) ?? []).length).toBe(2);
    expect(html).toContain('data-model-revision-id="roof-rev-1"');
    expect(html).toContain('data-calculation-revision-id="calc-rev-1"');
    expect(html).not.toContain('data-model-id="model-2"');
  });

  it("resolves only the selected saved revision and falls back if that model disappears", () => {
    const entries = selectProjectRoofDrawings([
      model(),
      model({ id: "model-2", name: "Melléképület", currentRevisionId: "roof-rev-2", currentRevisionNumber: 2, currentCalculationId: "calc-2", currentCalculationRevisionId: "calc-rev-2" }),
    ]);
    expect(resolveProjectRoofDrawing(entries, "model-2")).toMatchObject({ id: "model-2", revisionId: "roof-rev-2", calculationRevisionId: "calc-rev-2" });
    expect(resolveProjectRoofDrawing(entries, "removed-model")?.id).toBe("model-1");
    expect(resolveProjectRoofDrawing([], null)).toBeNull();
  });

  it("keeps models without saved geometry navigable without showing a false drawing", () => {
    const html = renderToStaticMarkup(createElement(ProjectRoofDrawings, { models: [model({ currentOutput: null, currentRevisionId: "roof-rev-1" })], projectId: "project-1", organizationId: "org-1" }));
    expect(html).toContain("nincs mentett rajz");
    expect(html).toContain("Teljes modell megnyitása");
    expect(html).not.toContain('class="technical-drawing-svg"');
  });
});

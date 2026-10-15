import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./roof-model-actions", () => ({ saveGableRoofAction: vi.fn() }));
vi.mock("./sheet-layout-actions", () => ({ createSheetLayoutTakeoffAction: vi.fn(), saveSheetLayoutAction: vi.fn() }));
vi.mock("./gable-trapezoidal-covering-panel", () => ({ GableTrapezoidalCoveringPanel: () => null }));
vi.mock("./gable-metal-tile-covering-preview", () => ({ GableMetalTileCoveringPreview: () => null }));
vi.mock("./metal-sheet-layout-panel", () => ({ MetalSheetLayoutPanel: () => null, initialMetalSheetLayoutValues: {} }));

import { GableRoofCalculatorForm } from "./gable-roof-form";

describe("continuous project gable workspace", () => {
  it("places validated inputs and the interactive drawing as direct workspace children", () => {
    const input = { inputMode: "height" as const, buildingLengthMm: 10000, buildingWidthMm: 6000, roofRiseMm: 3000, eaveOverhangMm: 300, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
    const output = calculateGableRoof(input);
    const html = renderToStaticMarkup(<GableRoofCalculatorForm organizationId="org" projectId="project" model={{
      id: "123e4567-e89b-42d3-a456-426614174010", projectId: "123e4567-e89b-42d3-a456-426614174011", name: "DEMO nyeregtető", roofType: "gable",
      currentRevisionId: "123e4567-e89b-42d3-a456-426614174012", currentRevisionNumber: 1, currentInput: input, currentOutput: output,
      currentCalculationId: null, currentCalculationRevisionId: null, revisions: [{ id: "123e4567-e89b-42d3-a456-426614174012", revisionNumber: 1, input, createdAt: "2026-10-15T00:00:00.000Z" }],
    }} />);
    const inputPosition = html.indexOf("roof-form-grid-compact");
    const drawingPosition = html.indexOf("technical-drawing is-compact");
    const resultsPosition = html.indexOf("roof-results");
    expect(inputPosition).toBeGreaterThanOrEqual(0);
    expect(inputPosition).toBeLessThan(drawingPosition);
    expect(drawingPosition).toBeLessThan(resultsPosition);
    expect(html).toContain('class="roof-workspace roof-workspace-surface roof-workspace-project"');
    expect(html).not.toContain('class="roof-workspace-surface"><div');
    expect(html).toContain('role="group" aria-label="Rajz vezérlők"');
    expect(html).toContain('<details class="drawing-advanced-controls">');
    expect(html).toContain('name="buildingLengthMm"');
  });
});

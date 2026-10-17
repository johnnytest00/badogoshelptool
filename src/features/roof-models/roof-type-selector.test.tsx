import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { createRoofDrawingModel } from "@/domain/drawings/roof-drawing";
import { RoofTypeSelector, roofTypeOptions } from "./roof-type-selector";
vi.mock("./gable-roof-form", () => ({ GableRoofCalculatorForm: () => createElement("form", null, "Tető külső hossza") }));
vi.mock("./standalone-gable-preview", () => ({ StandaloneGablePreview: () => createElement("form", null, "Tető külső hossza") }));
vi.mock("./multi-roof-form", () => ({ MultiRoofCalculatorForm: () => createElement("form", null, "Tető külső hossza") }));
import { RoofCreation } from "./roof-creation";

describe("shared roof type selector", () => {
  it("opens new roof creation on the seven-card stage without dimension inputs", () => {
    const html = renderToStaticMarkup(createElement(RoofCreation, { organizationId: "123e4567-e89b-42d3-a456-426614174000" }));
    expect(html.match(/class="roof-type-illustration"/g)).toHaveLength(7);
    expect(html).toContain("Válaszd ki a tető típusát");
    expect(html).toContain('href="/kalkulatorok?organization=123e4567-e89b-42d3-a456-426614174000"');
    expect(html).toContain("Vissza a kalkulátorokhoz");
    for (const option of roofTypeOptions) expect(html).toContain(option.name);
    expect(html).not.toContain("Tetőmodell neve");
    expect(html).not.toContain("Tető külső hossza");
  });
  it("shows seven distinct technical illustrations and an accessible selected state", () => {
    const html = renderToStaticMarkup(createElement(RoofTypeSelector, { selected: "hip", onSelect: () => undefined }));
    expect(roofTypeOptions).toHaveLength(7);
    for (const option of roofTypeOptions) expect(html).toContain(option.name);
    expect(html.match(/class="roof-type-illustration"/g)).toHaveLength(7);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(6);
    expect(html).toContain('class="roof-type-card is-selected"');
    expect(html).toContain("Kiválasztva");
    expect(html).toContain('class="glass-section-header roof-type-selector-heading"');
    expect(html).not.toContain("Új tető");
    for (const option of roofTypeOptions) expect(html).toContain(option.description);
  });

  it("draws exactly the calculated plane and edge identities", () => {
    const geometry = calculateRoofGeometry({ type: "tShape", lengthMm: 10000, widthMm: 6000, pitchDegrees: 45, wingWidthMm: 4000, wingProjectionMm: 5000 });
    const drawing = createRoofDrawingModel(geometry);
    expect(drawing.polygons.map((polygon) => polygon.id)).toEqual(geometry.planes.map((plane) => plane.id));
    expect(drawing.polygons.every((polygon) => polygon.outline === false)).toBe(true);
    expect(new Set(drawing.polygons.map((polygon) => polygon.label.replace(/ · geometriai részlet \d+$/, ""))).size).toBeLessThan(geometry.planes.length);
    expect(drawing.polygons.some((polygon) => polygon.label.includes("geometriai részlet"))).toBe(true);
    expect(drawing.segments.map((segment) => segment.id)).toEqual(geometry.edges.map((edge) => edge.id));
    expect(drawing.segments.filter((segment) => segment.label?.startsWith("Vápavonal"))).toHaveLength(2);
  });
});

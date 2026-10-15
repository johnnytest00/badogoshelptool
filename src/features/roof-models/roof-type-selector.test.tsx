import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { createRoofDrawingModel } from "@/domain/drawings/roof-drawing";
import { RoofTypeSelector, roofTypeOptions } from "./roof-type-selector";

describe("shared roof type selector", () => {
  it("shows seven distinct technical illustrations and an accessible selected state", () => {
    const html = renderToStaticMarkup(createElement(RoofTypeSelector, { selected: "hip", onSelect: () => undefined }));
    expect(roofTypeOptions).toHaveLength(7);
    for (const option of roofTypeOptions) expect(html).toContain(option.name);
    expect(html.match(/class="roof-type-illustration"/g)).toHaveLength(7);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(6);
  });

  it("draws exactly the calculated plane and edge identities", () => {
    const geometry = calculateRoofGeometry({ type: "tShape", lengthMm: 10000, widthMm: 6000, pitchDegrees: 45, wingWidthMm: 4000, wingProjectionMm: 5000 });
    const drawing = createRoofDrawingModel(geometry);
    expect(drawing.polygons.map((polygon) => polygon.id)).toEqual(geometry.planes.map((plane) => plane.id));
    expect(drawing.segments.map((segment) => segment.id)).toEqual(geometry.edges.map((edge) => edge.id));
    expect(drawing.segments.filter((segment) => segment.label?.startsWith("Vápavonal"))).toHaveLength(2);
  });
});

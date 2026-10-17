import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConstructionMaterialDrawing } from "@/features/calculators/construction-visuals";

const cases = [
  ["concrete.strip", { totalCenterlineLengthMm: "10000", widthMm: "400", depthMm: "800" }, ["totalCenterlineLengthMm", "widthMm"]],
  ["concrete.pile", { count: "4", diameterMm: "300", lengthMm: "5000" }, ["diameterMm"]],
  ["concrete.slab", { lengthMm: "10000", widthMm: "8000", thicknessMm: "200" }, ["lengthMm", "widthMm"]],
  ["concrete.ring", { outerDiameterMm: "1200", wallThicknessMm: "100", heightMm: "1000" }, ["outerDiameterMm", "wallThicknessMm"]],
  ["concrete.paving", { lengthMm: "10000", widthMm: "2000", tileLengthMm: "200", tileWidthMm: "100", baseLayerThicknessMm: "150" }, ["lengthMm", "widthMm"]],
  ["concrete.blind_area", { buildingLengthMm: "10000", buildingWidthMm: "8000", apronWidthMm: "1000", concreteThicknessMm: "100", gravelThicknessMm: "150" }, ["buildingLengthMm", "apronWidthMm"]],
  ["concrete.mix", { concreteVolumeM3: "4", cementKgPerM3: "300", cementRatio: "1", sandRatio: "2", aggregateRatio: "3" }, ["cementRatio", "sandRatio", "aggregateRatio"]],
  ["concrete.rebar", { barDiameterMm: "12", cutLengthMm: "6000", pieceCount: "10" }, ["cutLengthMm"]],
  ["concrete.mesh", { lengthMm: "5000", widthMm: "3000", coverMm: "50", spacingMm: "200", barDiameterMm: "10" }, ["lengthMm", "widthMm", "spacingMm", "coverMm"]],
  ["aux.diagonal", { lengthMm: "3000", widthMm: "4000" }, ["lengthMm", "widthMm"]],
] as const;

const alternateViews = [
  ["concrete.strip", "section", cases[0][1], ["widthMm", "depthMm"]],
  ["concrete.pile", "section", cases[1][1], ["diameterMm", "lengthMm"]],
  ["concrete.slab", "section", cases[2][1], ["lengthMm", "thicknessMm"]],
  ["concrete.ring", "section", cases[3][1], ["outerDiameterMm", "wallThicknessMm", "heightMm"]],
  ["concrete.paving", "tile", cases[4][1], ["tileLengthMm", "tileWidthMm"]],
  ["concrete.paving", "section", cases[4][1], ["lengthMm", "baseLayerThicknessMm"]],
  ["concrete.blind_area", "section", cases[5][1], ["concreteThicknessMm", "gravelThicknessMm"]],
  ["concrete.rebar", "section", cases[7][1], ["barDiameterMm"]],
] as const;

describe("concrete calculator technical drawings", () => {
  it.each(cases)("renders finite dimensions and interactive field links for %s", (referenceId, values, dimensionKeys) => {
    const html = renderToStaticMarkup(<ConstructionMaterialDrawing referenceId={referenceId} values={values} />);
    expect(html).toContain("Műszaki rajz");
    expect(html).toContain("construction-stair-svg");
    expect(html).toContain("Rajz nagyítása");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
    for (const key of dimensionKeys) expect(html).toContain(`data-dimension="${key}"`);
  });

  it.each(alternateViews)("renders the alternate %s %s view from its input geometry", (referenceId, initialView, values, dimensionKeys) => {
    const html = renderToStaticMarkup(<ConstructionMaterialDrawing referenceId={referenceId} initialView={initialView} values={values} />);
    for (const key of dimensionKeys) expect(html).toContain(`data-dimension="${key}"`);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
  });
});

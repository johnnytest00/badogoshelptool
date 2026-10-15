import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { createRoofDrawingModel } from "@/domain/drawings/roof-drawing";
import { MeasurementGuidance, measurementGuideFor, measurementGuideForSurvey } from "./measurement-guidance";

describe("professional measurement guidance", () => {
  it("keeps field meaning and units explicit for every roof input family", () => {
    for (const [type, keys] of Object.entries({
      shed: ["lengthMm", "widthMm", "pitchDegrees"], hip: ["lengthMm", "widthMm", "pitchDegrees"], pyramid: ["sideMm", "pitchDegrees"],
      halfHip: ["lengthMm", "widthMm", "pitchDegrees", "hipEaveHeightMm"], lShape: ["lengthMm", "widthMm", "pitchDegrees", "wingWidthMm", "wingProjectionMm"], tShape: ["lengthMm", "widthMm", "pitchDegrees", "wingWidthMm", "wingProjectionMm"], gable: ["buildingLengthMm", "buildingWidthMm", "roofRiseMm", "roofPitchDegrees", "eaveOverhangMm"],
    } satisfies Record<string, string[]>)) {
      for (const key of keys) {
        const result = measurementGuideFor(type as Parameters<typeof measurementGuideFor>[0], key);
        expect(result?.unit, `${type}.${key}`).toBeTruthy();
        expect(result?.meaning, `${type}.${key}`).toContain(".");
      }
    }
  });

  it("renders a focused guide without inventing an unsupported value", () => {
    const guide = measurementGuideFor("tShape", "wingProjectionMm");
    const html = renderToStaticMarkup(createElement(MeasurementGuidance, { guide }));
    expect(html).toContain("data-active-measurement=\"wingProjectionMm\"");
    expect(html).toContain("vízszintes távolság");
    expect(html).toContain("mm");
  });

  it("links survey semantics to the same guide keys and roof drawing dimensions", () => {
    expect(measurementGuideForSurvey("gable", "roof_building_width")?.key).toBe("buildingWidthMm");
    const geometry = calculateRoofGeometry({ type: "lShape", lengthMm: 10000, widthMm: 6000, pitchDegrees: 35, wingWidthMm: 4000, wingProjectionMm: 5000 });
    const drawing = createRoofDrawingModel(geometry);
    expect(drawing.dimensions.some((item) => item.sourceKey === "wingWidthMm")).toBe(true);
    expect(drawing.dimensions.some((item) => item.sourceKey === "wingProjectionMm")).toBe(true);
  });
});

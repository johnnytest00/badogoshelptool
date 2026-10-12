import { describe, expect, it } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateMetalSheetLayout } from "@/domain/calculations/metal-sheet-layout";
import { createGableDrawingModel, filterDrawingModel, formatDrawingMeasurement, type DrawingLayerId } from "./gable-drawing";

const output = calculateGableRoof({ inputMode: "height", buildingWidthMm: 8000, buildingLengthMm: 12000, roofRiseMm: 3000, eaveOverhangMm: 500, frontGableOverhangMm: 250, rearGableOverhangMm: 250 });

describe("gable drawing model", () => {
  it("projects the F5 reference geometry without changing engineering coordinates", () => {
    const top = createGableDrawingModel(output, "top");
    expect(top.bounds).toEqual({ minX: -250, maxX: 12250, minY: -4500, maxY: 4500 });
    expect(top.segments.some((item) => item.label === "Gerinc")).toBe(true);
    const section = createGableDrawingModel(output, "cross-section");
    expect(section.bounds.minX).toBe(-4500);
    expect(section.bounds.maxX).toBe(4500);
    expect(section.bounds.maxY).toBe(375);
    expect(section.bounds.minY).toBe(-3000);
  });

  it("creates all four views from the same output", () => {
    for (const view of ["top", "gable", "cross-section", "longitudinal"] as const) {
      const model = createGableDrawingModel(output, view);
      expect(model.segments.length).toBeGreaterThan(0);
      expect(model.bounds.maxX).toBeGreaterThan(model.bounds.minX);
      expect(model.bounds.maxY).toBeGreaterThan(model.bounds.minY);
    }
  });

  it("uses source dimensions and Hungarian formatting", () => {
    const section = createGableDrawingModel(output, "cross-section");
    expect(section.dimensions.map((item) => item.sourceMm)).toEqual([9000, 3000, 5625]);
    expect(formatDrawingMeasurement(12500)).toBe("12,50 m");
    expect(formatDrawingMeasurement(500)).toBe("500 mm");
  });

  it("filters only presentation layers", () => {
    const model = createGableDrawingModel(output, "top");
    const visible = Object.fromEntries((['planes', 'outlines', 'ridge-eaves', 'dimensions', 'angles', 'guides', 'sheet-layout'] as DrawingLayerId[]).map((id) => [id, id !== "dimensions"])) as Record<DrawingLayerId, boolean>;
    expect(filterDrawingModel(model, visible).dimensions).toHaveLength(0);
    expect(filterDrawingModel(model, visible).polygons).toHaveLength(2);
    expect(filterDrawingModel(model, { ...visible, outlines: false, "ridge-eaves": true }).segments.every((item) => item.label?.includes("Gerinc") || item.label?.includes("eresz"))).toBe(true);
  });

  it("maps calculated sheet coordinates to both top-view roof planes", () => {
    const layout = calculateMetalSheetLayout({ roof: { startXmm: -250, endXmm: 12250, slopeLengthMm: 5625 }, effectiveCoveringWidthMm: 1000, nominalSheetWidthMm: null, alignment: "left", minimumSheetLengthMm: null, maximumSheetLengthMm: null, endAllowanceMm: null });
    const model = createGableDrawingModel(output, "top", layout);
    expect(model.sheetStrips).toHaveLength(26);
    expect(model.sheetStrips.filter((strip) => strip.planeSide === "left")).toHaveLength(13);
    const partials = model.sheetStrips.filter((strip) => strip.isPartial);
    expect(partials).toHaveLength(2);
    expect(partials[0].points.map((point) => point.x)).toEqual([11750, 12250, 12250, 11750]);
    expect(createGableDrawingModel(output, "cross-section", layout).sheetStrips).toHaveLength(0);
  });

  it("rejects incomplete geometry instead of inventing drawing points", () => {
    expect(() => createGableDrawingModel({ ...output, planes: [output.planes[0]] }, "top")).toThrow("hiányos");
  });
});

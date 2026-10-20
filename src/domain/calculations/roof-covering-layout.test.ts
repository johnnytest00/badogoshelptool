import { describe, expect, it } from "vitest";
import { calculateRoofGeometry } from "./roof-geometry";
import { calculateRoofCoveringLayout } from "./roof-covering-layout";

const m = 1_000;
const product = {
  form: "sheet", nominalWidthMm: 1_100, effectiveCoveringWidthMm: 1_000,
  physicalLengthMm: 2_100, usableCoveringLengthMm: 2_000,
  manufacturerConstraintReference: "DEMO gyártói adatlap",
} as const;

const gable = calculateRoofGeometry({ type: "gable", geometry: { inputMode: "angle", buildingLengthMm: 10 * m, buildingWidthMm: 6 * m, roofPitchDegrees: 45, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } });
const hip = calculateRoofGeometry({ type: "hip", lengthMm: 10 * m, widthMm: 6 * m, pitchDegrees: 45 });

describe("roof covering layout", () => {
  it("fills a rectangular gable plane with full columns", () => {
    const result = calculateRoofCoveringLayout(gable, product);
    expect(result.status).toBe("VALID");
    // Each plane: 10 m eave / 1 m usable width = 10 columns; slope 3 m * sqrt2 = 4242.6 mm
    // over 2 m usable length = 3 sheets per column. Two planes.
    expect(result.columnCount).toBe(20);
    expect(result.totalSheetCount).toBe(60);
    expect(result.columns.every((column) => column.sheetCount === 3)).toBe(true);
    expect(result.columns.every((column) => Math.abs(column.requiredCoveringLengthMm - 3 * m * Math.SQRT2) < 1e-6)).toBe(true);
    expect(result.totalNominalSheetAreaMm2).toBe(60 * 1_100 * 2_100);
  });

  it("measures each column against the plane outline on a hip roof", () => {
    const result = calculateRoofCoveringLayout(hip, product);
    expect(result.status).toBe("VALID");
    expect(new Set(result.columns.map((column) => column.planeId)).size).toBe(4);

    // A hip end is a triangle, so its columns must get shorter towards the tip.
    const lengths = result.columns.map((column) => column.requiredCoveringLengthMm);
    expect(Math.min(...lengths)).toBeLessThan(Math.max(...lengths));
    expect(Math.max(...lengths)).toBeCloseTo(3 * m * Math.SQRT2, 6);

    // Hand-derived for 10x6 m at 45 degrees with 1 m usable width and 2 m usable length:
    // each main trapezoid needs 1+2+3+3+3+3+3+3+2+1 = 24 sheets over 10 columns,
    // each hip triangle 1+2+3+3+2+1 = 12 over 6 columns, so 2*24 + 2*12 = 72 in 32 columns.
    expect(result.columnCount).toBe(32);
    expect(result.totalSheetCount).toBe(72);

    // A pure area estimate would ignore the outline; the layout must need at least that many.
    const areaEstimate = Math.ceil(result.netRoofAreaMm2! / (1_000 * 2_000));
    expect(result.totalSheetCount!).toBeGreaterThanOrEqual(areaEstimate);
    expect(result.columns.every((column) => column.sheetCount === Math.ceil(column.requiredCoveringLengthMm / 2_000 - 1e-7))).toBe(true);
  });

  it("refuses to guess missing manufacturer data", () => {
    const withoutSource = calculateRoofCoveringLayout(gable, { ...product, manufacturerConstraintReference: undefined });
    expect(withoutSource.status).toBe("INCOMPLETE");
    expect(withoutSource.totalSheetCount).toBeNull();
    expect(withoutSource.netRoofAreaMm2).toBeCloseTo(gable.totalAreaMm2, 6);

    const withoutLength = calculateRoofCoveringLayout(gable, { ...product, usableCoveringLengthMm: undefined });
    expect(withoutLength.status).toBe("INCOMPLETE");

    const inconsistent = calculateRoofCoveringLayout(gable, { ...product, effectiveCoveringWidthMm: 1_200 });
    expect(inconsistent.status).toBe("INVALID");
  });
});

import { describe, expect, it } from "vitest";
import { calculateRoofGeometry } from "./roof-geometry";
import { summarizeRoofGeometry } from "./roof-geometry-results";
import { ROOF_ENGINEERING_REFERENCES } from "./engineering-reference-fixtures";
import { geometryFromSurveyMeasurements, surveyRoofFields } from "@/domain/field-surveys/roof-geometry";

const available = (summary: ReturnType<typeof summarizeRoofGeometry>, key: string) => {
  const result = [...summary.primary, ...summary.edges, ...summary.planes.flatMap((plane) => [plane.area, plane.projectedArea, plane.perimeter, plane.pitch, plane.slopeRun, plane.slopeLength])].find((item) => item.key === key);
  expect(result, `expected ${key} to be represented`).toBeDefined();
  expect(result?.status).toBe("available");
  if (result?.status !== "available") throw new Error(`${key} is unavailable`);
  return result;
};

describe("shared derived roof geometry results", () => {
  it.each(ROOF_ENGINEERING_REFERENCES)("reconciles primary results for $name", (reference) => {
    const geometry = calculateRoofGeometry(reference.input);
    const summary = summarizeRoofGeometry(geometry);
    expect(summary.primary.length).toBeGreaterThanOrEqual(4);
    expect(summary.primary.length).toBeLessThanOrEqual(6);
    expect(available(summary, "totalArea").value).toBeCloseTo(reference.expectedSurfaceAreaMm2 / 1_000_000, 9);
    expect(available(summary, "projectedArea").value).toBeCloseTo(reference.expectedProjectedAreaMm2 / 1_000_000, 9);
    expect(summary.planes.reduce((sum, plane) => sum + (plane.area.status === "available" ? plane.area.value : 0), 0)).toBeCloseTo(reference.expectedSurfaceAreaMm2 / 1_000_000, 9);
    expect(summary.planes.reduce((sum, plane) => sum + (plane.projectedArea.status === "available" ? plane.projectedArea.value : 0), 0)).toBeCloseTo(reference.expectedProjectedAreaMm2 / 1_000_000, 9);
    expect(available(summary, "pitchDegrees").value).toBeCloseTo(reference.expectedPitchDegrees, 9);
    expect(summary.edgeSegments.map((edge) => edge.id)).toEqual(geometry.edges.map((edge) => edge.id));
    const percent = summary.primary.find((result) => result.key === "pitchDegrees");
    expect(percent?.status === "available" ? percent.detail?.value : undefined).toBeCloseTo(Math.tan(reference.expectedPitchDegrees * Math.PI / 180) * 100, 8);
    for (const kind of ["eave", "upper", "ridge", "rake", "hip", "valley"] as const) {
      const expectedMm = reference.expectedEdgeLengthMm[kind];
      const result = [...summary.primary, ...summary.edges].find((item) => item.key === `${kind}Length`);
      if (expectedMm === 0) expect(result?.status).toBe("unavailable");
      else {
        expect(result?.status).toBe("available");
        if (result?.status === "available") expect(result.value).toBeCloseTo(expectedMm / 1_000, 8);
      }
      const segmentLengthM = summary.edgeSegments.filter((edge) => edge.kind === kind).reduce((sum, edge) => sum + edge.lengthM, 0);
      if (expectedMm === 0) expect(segmentLengthM).toBe(0);
      else expect(segmentLengthM).toBeCloseTo(expectedMm / 1_000, 8);
    }
  });

  it("derives the gable plane run and slope from vertex geometry, including overhang", () => {
    const geometry = calculateRoofGeometry({ type: "gable", geometry: {
      inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 3_000,
      eaveOverhangMm: 500, frontGableOverhangMm: 200, rearGableOverhangMm: 300,
    } });
    const summary = summarizeRoofGeometry(geometry);
    for (const plane of summary.planes) {
      expect(plane.slopeRun.status).toBe("available");
      expect(plane.slopeLength.status).toBe("available");
      if (plane.slopeRun.status === "available") expect(plane.slopeRun.value).toBeCloseTo(3.5, 9);
      if (plane.slopeLength.status === "available") expect(plane.slopeLength.value).toBeCloseTo(Math.hypot(3_500, 3_500) / 1_000, 9);
    }
    expect(available(summary, "eaveLength").value).toBeCloseTo(21, 9);
    expect(available(summary, "ridgeLength").value).toBeCloseTo(10.5, 9);
  });

  it("marks absent edge classes unavailable rather than displaying zero", () => {
    const pyramid = calculateRoofGeometry({ type: "pyramid", sideMm: 6_000, pitchDegrees: 45 });
    const summary = summarizeRoofGeometry(pyramid);
    expect(summary.edges.find((item) => item.key === "ridgeLength")).toMatchObject({
      status: "unavailable", reason: "Ehhez a tetőformához nem tartozik ilyen él.",
    });
    expect(summary.edgeSegments.every((edge) => edge.lengthM > 0)).toBe(true);
  });

  it.each(ROOF_ENGINEERING_REFERENCES.filter((reference) => reference.input.type !== "gable"))("produces the same result model for survey and standalone use: $name", (reference) => {
    if (reference.input.type === "gable") return;
    const values = reference.input as unknown as Record<string, number>;
    const measurements = surveyRoofFields(reference.input.type).map((field, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      label: field.label,
      semanticType: field.semanticType,
      unit: field.unit,
      value: values[field.key],
    }));
    const surveyInput = geometryFromSurveyMeasurements(reference.input.type, measurements);
    expect(surveyInput).not.toBeNull();
    const standalone = summarizeRoofGeometry(calculateRoofGeometry(reference.input));
    const survey = summarizeRoofGeometry(calculateRoofGeometry(surveyInput!));
    expect(survey).toEqual(standalone);
  });
});

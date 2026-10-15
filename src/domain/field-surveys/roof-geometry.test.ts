import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, type RoofGeometryType } from "@/domain/calculations/roof-geometry";
import { geometryFromSurveyMeasurements, surveyRoofFields } from "./roof-geometry";
import type { FieldSurveyMeasurement } from "./contracts";

const values: Record<string, number> = { lengthMm: 10000, widthMm: 6000, pitchDegrees: 35, sideMm: 6000,
  hipEaveHeightMm: 1000, wingWidthMm: 4000, wingProjectionMm: 5000 };

describe("survey roof geometry handoff", () => {
  it.each(["shed", "hip", "pyramid", "halfHip", "lShape", "tShape"] as const)("derives %s only from its measured fields", (type) => {
    const measurements: FieldSurveyMeasurement[] = surveyRoofFields(type).map((field, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, label: `DEMO ${field.label}`,
      value: values[field.key], unit: field.unit, semanticType: field.semanticType,
    }));
    const input = geometryFromSurveyMeasurements(type, measurements);
    expect(input?.type).toBe(type);
    expect(input && calculateRoofGeometry(input).totalAreaMm2).toBeGreaterThan(0);
    expect(geometryFromSurveyMeasurements(type, measurements.slice(1))).toBeNull();
    expect(geometryFromSurveyMeasurements(type, [...measurements, measurements[0]])).toBeNull();
  });
  it("has exactly one gable path and no type-specific fields for it", () => {
    expect(surveyRoofFields("gable" satisfies RoofGeometryType)).toEqual([]);
  });
});

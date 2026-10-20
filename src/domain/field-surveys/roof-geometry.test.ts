import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, type RoofGeometryType } from "@/domain/calculations/roof-geometry";
import { geometryFromSurveyMeasurements, surveyRoofFieldGroups, surveyRoofFieldMessages, surveyRoofFields } from "./roof-geometry";
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

  it.each(["hip", "pyramid", "halfHip", "lShape", "tShape"] as const)("groups %s fields without losing or adding any", (type) => {
    expect(surveyRoofFieldGroups(type).flatMap((group) => group.types).sort()).toEqual(surveyRoofFields(type).map((field) => field.semanticType).sort());
  });
  it("reports field-level problems only for entered values, then the engine's cross-field rule", () => {
    const draft = (field: ReturnType<typeof surveyRoofFields>[number], value: string, unit: "mm" | "m" | "degree" = field.unit) => ({ id: field.key, semanticType: field.semanticType, unit, value });
    const [length, width, pitch] = surveyRoofFields("hip");
    expect(surveyRoofFieldMessages("hip", [draft(length, ""), draft(width, "")])).toEqual({});
    expect(surveyRoofFieldMessages("hip", [draft(length, "10,5", "mm"), draft(pitch, "90")])).toMatchObject({ lengthMm: expect.stringContaining("egész"), pitchDegrees: expect.stringContaining("0 és 80") });
    expect(surveyRoofFieldMessages("hip", [draft(length, "6", "m"), draft(width, "8", "m"), draft(pitch, "30")])).toEqual({ lengthMm: "A kontyolt tető hossza legyen nagyobb a szélességénél." });
    expect(surveyRoofFieldMessages("hip", [draft(length, "10", "m"), draft(width, "6", "m"), draft(pitch, "30")])).toEqual({});
  });
});

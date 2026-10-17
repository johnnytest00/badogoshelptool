import { describe, expect, it } from "vitest";
import { buildGableSurveyPreview } from "./gable-survey-preview";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import type { SurveyMeasurementDraft } from "./survey-draft-recovery";

const measurement = (id: string, semanticType: SurveyMeasurementDraft["semanticType"], value: string, unit: SurveyMeasurementDraft["unit"], label: string = semanticType) => ({
  id: `123e4567-e89b-42d3-a456-${id.padStart(12, "0")}`,
  label,
  semanticType,
  value,
  unit,
});

const heightInputs = (): SurveyMeasurementDraft[] => [
  measurement("1", "roof_building_length", "100", "m", "Épület hossza"),
  measurement("2", "roof_building_width", "40", "m", "Épület szélessége"),
  measurement("3", "roof_rise", "10", "m", "Tetőemelkedés"),
  measurement("4", "roof_eave_overhang", "0", "mm", "Eresztúlnyúlás"),
  measurement("5", "roof_front_gable_overhang", "0", "mm", "Első oromtúlnyúlás"),
  measurement("6", "roof_rear_gable_overhang", "0", "mm", "Hátsó oromtúlnyúlás"),
] as SurveyMeasurementDraft[];

describe("gable survey preview", () => {
  it("renders valid rise input through the existing gable geometry engine", () => {
    const result = buildGableSurveyPreview(heightInputs());
    expect(result.issue).toBeNull();
    expect(result.output?.angles.pitchDegrees).toBeCloseTo(26.565051177, 8);
    expect(result.output?.areas.combinedRoofM2).toBeCloseTo(4472.135955, 5);
    expect(result.geometry?.totalAreaMm2).toBeCloseTo(result.output!.areas.combinedRoofMm2, 3);
    expect(result.geometry).toEqual(calculateRoofGeometry({ type: "gable", geometry: {
      inputMode: "height", buildingLengthMm: 100_000, buildingWidthMm: 40_000, roofRiseMm: 10_000,
      eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0,
    } }));
  });

  it("renders a valid pitch-only input using the same engine", () => {
    const inputs = heightInputs().filter((item) => item.semanticType !== "roof_rise");
    inputs.push(measurement("7", "roof_pitch", "26.565051177", "degree", "Tetőhajlásszög") as SurveyMeasurementDraft);
    const result = buildGableSurveyPreview(inputs);
    expect(result.issue).toBeNull();
    expect(result.output?.heights.roofRiseMm).toBeCloseTo(10000, 3);
  });

  it("explains and marks conflicting rise and pitch without generating geometry", () => {
    const inputs = heightInputs();
    inputs.push(measurement("7", "roof_pitch", "30", "degree", "Tetőhajlásszög") as SurveyMeasurementDraft);
    const result = buildGableSurveyPreview(inputs);
    expect(result.output).toBeNull();
    expect(result.issue?.message).toContain("egyszerre csak egyet fogad el");
    expect(Object.keys(result.issue?.fieldMessages ?? {})).toHaveLength(2);
  });

  it("identifies missing required measurements and marks the empty field", () => {
    const inputs = heightInputs().map((item) => item.semanticType === "roof_building_width" ? { ...item, value: "" } : item);
    const result = buildGableSurveyPreview(inputs);
    expect(result.output).toBeNull();
    expect(result.issue?.kind).toBe("incomplete");
    expect(result.issue?.message).toContain("Épület szélessége");
    expect(result.issue?.fieldMessages).toHaveProperty(inputs[1].id);
  });

  it("explains invalid values and preserves the original draft value", () => {
    const inputs = heightInputs().map((item) => item.semanticType === "roof_building_length" ? { ...item, value: "0" } : item);
    const result = buildGableSurveyPreview(inputs);
    expect(result.output).toBeNull();
    expect(result.issue?.message).toContain("pozitív, egész milliméterben");
    expect(inputs[0].value).toBe("0");
    expect(result.issue?.fieldMessages).toHaveProperty(inputs[0].id);
  });
});

import { describe, expect, it } from "vitest";
import { fieldSurveyInputSchema, fieldSurveyMeasurementSchema, fieldSurveyTemplates } from "./contracts";

const valid = {
  organizationId: "123e4567-e89b-42d3-a456-426614174000",
  projectId: null,
  workType: "gutter",
  measurements: [{ id: "123e4567-e89b-42d3-a456-426614174001", label: "Ereszszakasz hossza", value: 8.5, unit: "m" }],
  notes: null,
};

describe("field survey contracts", () => {
  it("accepts fast standalone and project-linked measurements with explicit units", () => {
    expect(fieldSurveyInputSchema.safeParse(valid).success).toBe(true);
    expect(fieldSurveyInputSchema.safeParse({ ...valid, projectId: "123e4567-e89b-42d3-a456-426614174002", notes: null }).success).toBe(true);
    expect(fieldSurveyInputSchema.safeParse({ ...valid, measurements: [...valid.measurements, { id: "123e4567-e89b-42d3-a456-426614174003", label: "Lefolyó", value: 2, unit: "count" }] }).success).toBe(true);
  });

  it("rejects missing/unknown units and non-integral counts", () => {
    expect(fieldSurveyInputSchema.safeParse({ ...valid, measurements: [{ ...valid.measurements[0], unit: "" }] }).success).toBe(false);
    expect(fieldSurveyInputSchema.safeParse({ ...valid, measurements: [{ ...valid.measurements[0], unit: "yard" }] }).success).toBe(false);
    expect(fieldSurveyInputSchema.safeParse({ ...valid, measurements: [{ ...valid.measurements[0], unit: "count", value: 1.5 }] }).success).toBe(false);
    expect(fieldSurveyMeasurementSchema.safeParse({ ...valid.measurements[0], semanticType: "gutter_run_length", unit: "degree" }).success).toBe(false);
    expect(fieldSurveyMeasurementSchema.safeParse({ ...valid.measurements[0], semanticType: "roof_pitch", unit: "mm" }).success).toBe(false);
  });

  it("shows a Hungarian message for an empty mobile numeric field", () => {
    const result = fieldSurveyInputSchema.safeParse({ ...valid, measurements: [{ ...valid.measurements[0], value: Number.NaN }] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("Adj meg érvényes számértéket.");
  });

  it("allows notes and project association to stay absent and exposes practical editable templates", () => {
    expect(fieldSurveyInputSchema.safeParse({ ...valid, projectId: null, notes: null }).success).toBe(true);
    expect(fieldSurveyTemplates.gutter.map(({ label }) => label)).toContain("Ereszszakasz hossza");
    expect(fieldSurveyTemplates.flashing.map(({ label }) => label)).toContain("Kiterített szélesség");
    expect(fieldSurveyTemplates.flashing[0].semanticType).toBe("flashing_run_length");
  });
});

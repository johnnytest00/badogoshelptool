import type { SurveyMeasurementDraft } from "./survey-draft-recovery";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SurveyMeasurementTemplate = Pick<SurveyMeasurementDraft, "label" | "unit" | "semanticType">;

export function appendSurveyMeasurement(
  measurements: readonly SurveyMeasurementDraft[],
  template: SurveyMeasurementTemplate,
  createId: () => string,
): SurveyMeasurementDraft[] {
  const id = createId();
  if (!uuidPattern.test(id) || measurements.some((measurement) => measurement.id === id)) {
    throw new Error("A new survey measurement requires a unique UUID.");
  }
  return [...measurements, { ...template, id, value: "" }];
}

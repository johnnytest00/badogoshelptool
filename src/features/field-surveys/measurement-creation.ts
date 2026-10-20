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
  // Explicit pick: roof templates (RoofField) carry UI-only metadata such as `key`, which the strict section schema rejects.
  return [...measurements, { id, label: template.label, unit: template.unit, semanticType: template.semanticType, value: "" }];
}

/** Adds one blank draft per template whose role is not yet present; every existing value is kept. */
export function addMissingMeasurements(
  measurements: readonly SurveyMeasurementDraft[],
  templates: readonly SurveyMeasurementTemplate[],
  createId: () => string,
): SurveyMeasurementDraft[] {
  return templates
    .filter((template) => !measurements.some((measurement) => measurement.semanticType === template.semanticType))
    .reduce((all, template) => appendSurveyMeasurement(all, template, createId), [...measurements]);
}

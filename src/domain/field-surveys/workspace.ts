import { z } from "zod";
import { fieldSurveyMeasurementSchema, fieldSurveyWorkTypeSchema, fieldSurveyWorkTypeLabels, fieldSurveySemanticTypeSchema, fieldSurveyUnitSchema, type FieldSurveyMeasurement, type FieldSurveyWorkType } from "./contracts";

export const surveySectionMeasurementSchema = z.object({
  id: z.string().uuid(), label: z.string().trim().min(1).max(120), value: z.number().finite().nullable(),
  unit: fieldSurveyUnitSchema, semanticType: fieldSurveySemanticTypeSchema,
}).strict().superRefine((measurement, context) => {
  const checked = fieldSurveyMeasurementSchema.safeParse({ ...measurement, value: measurement.value ?? 0 });
  if (!checked.success) for (const issue of checked.error.issues) context.addIssue({ code: "custom", path: issue.path, message: issue.message });
});
export function completeSectionMeasurements(section: SurveySection): FieldSurveyMeasurement[] {
  return section.measurements.filter((measurement) => measurement.value !== null) as FieldSurveyMeasurement[];
}

export const surveySectionSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1, "A munkaszakasz neve kötelező.").max(120),
  workType: fieldSurveyWorkTypeSchema, measurements: z.array(surveySectionMeasurementSchema).max(100),
  notes: z.string().max(2000), photoIds: z.array(z.string().uuid()).max(100),
}).strict();
export const surveySectionsSchema = z.array(surveySectionSchema).min(1).max(30).superRefine((sections, context) => {
  const sectionIds = sections.map((section) => section.id);
  const measurementIds = sections.flatMap((section) => section.measurements.map((measurement) => measurement.id));
  if (new Set(sectionIds).size !== sectionIds.length || new Set(measurementIds).size !== measurementIds.length || measurementIds.length > 100) {
    context.addIssue({ code: "custom", message: "Legfeljebb 100, egyedi azonosítójú mérés menthető; a munkaszakaszok azonosítója is legyen egyedi." });
  }
});
export type SurveySection = z.infer<typeof surveySectionSchema>;
export type SavedSurveyCalculation = { calculationId: string; revisionId: string; revisionNumber: number };
export type SurveyCalculationLink = SavedSurveyCalculation & {
  id: string; sectionId: string; surveyRevisionId: string; surveyVersion: number; calculatorType: string;
  name: string; output: unknown; warnings: unknown; provenance: unknown;
};
export type SurveyFollowup = { id: string; kind: "project" | "quotation"; projectId: string | null; quotationId: string | null; quotationRevisionId: string | null; surveyRevisionId: string };

// Stable compatibility section identity. No legacy record or revision is rewritten.
export function surveySections(record: { sections?: SurveySection[] | null; id?: string; surveyId?: string; workType: FieldSurveyWorkType; measurements: FieldSurveyMeasurement[]; notes: string | null }): SurveySection[] {
  return record.sections ?? [{ id: record.surveyId ?? record.id!, name: fieldSurveyWorkTypeLabels[record.workType], workType: record.workType, measurements: record.measurements, notes: record.notes ?? "", photoIds: [] }];
}

export function savedQuantitySummary(type: string, output: unknown): { label: string; value: number; unit: string }[] {
  if (!output || typeof output !== "object") return [];
  const value = output as Record<string, unknown>;
  const quantities: { label: string; value: unknown; unit: string }[] = [];
  if (type === "gutters.material-estimate") {
    const totals = value.totals as Record<string, unknown> | undefined;
    quantities.push({ label: "Ereszcsatornaszál", value: totals?.gutterStockSections, unit: "db" }, { label: "Lefolyószál", value: totals?.downpipeStockSections, unit: "db" });
  }
  if (type === "sheet_metal.flashings.material-estimate") {
    const totals = value.totals as Record<string, unknown> | undefined;
    quantities.push({ label: "Becsült szegélyszál", value: totals?.estimatedSectionCount, unit: "db" });
  }
  if (type === "roof.gable.trapezoidal-covering" || type === "roof.gable.metal-tile-covering") {
    const covering = value.covering as Record<string, unknown> | undefined;
    if (covering?.status === "VALID") quantities.push({ label: "Feltételes lemezmennyiség", value: covering.totalSheetCount, unit: "db" });
  }
  return quantities.filter((item): item is { label: string; value: number; unit: string } => typeof item.value === "number" && Number.isFinite(item.value));
}

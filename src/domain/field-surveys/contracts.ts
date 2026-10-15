import { z } from "zod";

export const fieldSurveyWorkTypeSchema = z.enum(["roof", "gutter", "flashing", "other"]);
export type FieldSurveyWorkType = z.infer<typeof fieldSurveyWorkTypeSchema>;

export const fieldSurveyUnitSchema = z.enum(["mm", "m", "m2", "degree", "count"]);
export type FieldSurveyUnit = z.infer<typeof fieldSurveyUnitSchema>;

export const fieldSurveySemanticTypeSchema = z.enum([
  "custom", "roof_building_length", "roof_building_width", "roof_rise", "roof_pitch",
  "roof_eave_overhang", "roof_front_gable_overhang", "roof_rear_gable_overhang",
  "gutter_run_length", "gutter_stock_length", "gutter_bracket_spacing",
  "flashing_run_length", "flashing_section_length", "flashing_overlap",
]);
export type FieldSurveySemanticType = z.infer<typeof fieldSurveySemanticTypeSchema>;

export const fieldSurveySemanticTypeLabels: Record<FieldSurveySemanticType, string> = {
  custom: "Egyéb, nincs kalkulátormegfeleltetés",
  roof_building_length: "Nyeregtető · épület hossza",
  roof_building_width: "Nyeregtető · épület szélessége",
  roof_rise: "Nyeregtető · emelkedés a fal felett",
  roof_pitch: "Nyeregtető · hajlásszög",
  roof_eave_overhang: "Nyeregtető · eresztúlnyúlás",
  roof_front_gable_overhang: "Nyeregtető · első oromtúlnyúlás",
  roof_rear_gable_overhang: "Nyeregtető · hátsó oromtúlnyúlás",
  gutter_run_length: "Ereszcsatorna · szakaszhossz",
  gutter_stock_length: "Ereszcsatorna · kiválasztott szálhossz",
  gutter_bracket_spacing: "Ereszcsatorna · konzoltávolság",
  flashing_run_length: "Szegély · szakaszhossz",
  flashing_section_length: "Szegély · kereskedelmi szálhossz",
  flashing_overlap: "Szegély · szálankénti átfedés",
};

type FieldSurveyTemplate = Readonly<{ label: string; unit: FieldSurveyUnit; semanticType: FieldSurveySemanticType }>;

export const fieldSurveyMeasurementSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1, "A mérés neve kötelező.").max(120, "A mérés neve legfeljebb 120 karakter lehet."),
  value: z.number({ error: "Adj meg érvényes számértéket." }).finite("Adj meg véges számértéket.").min(0, "A mérés nem lehet negatív.").max(1_000_000_000, "A mérés értéke túl nagy."),
  unit: fieldSurveyUnitSchema,
  semanticType: fieldSurveySemanticTypeSchema.optional().default("custom"),
}).strict().superRefine((measurement, context) => {
  if (measurement.unit === "count" && !Number.isInteger(measurement.value)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "A darabszám egész szám legyen." });
  }
  if (measurement.unit === "degree" && measurement.value > 360) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "A szög legfeljebb 360° lehet." });
  }
  const lengthTypes: FieldSurveySemanticType[] = ["roof_building_length", "roof_building_width", "roof_rise", "roof_eave_overhang", "roof_front_gable_overhang", "roof_rear_gable_overhang", "gutter_run_length", "gutter_stock_length", "gutter_bracket_spacing", "flashing_run_length", "flashing_section_length", "flashing_overlap"];
  if (lengthTypes.includes(measurement.semanticType) && !["mm", "m"].includes(measurement.unit)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["unit"], message: "Ehhez a mérési szerephez mm vagy m egység szükséges." });
  }
  if (measurement.semanticType === "roof_pitch" && measurement.unit !== "degree") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["unit"], message: "A tetőhajlásszög egysége fok legyen." });
  }
});
export type FieldSurveyMeasurement = z.infer<typeof fieldSurveyMeasurementSchema>;

export const fieldSurveyInputSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  workType: fieldSurveyWorkTypeSchema,
  measurements: z.array(fieldSurveyMeasurementSchema).min(1, "Adj meg legalább egy mérést.").max(100, "Legfeljebb 100 mérés menthető."),
  notes: z.string().trim().max(2000, "A megjegyzés legfeljebb 2000 karakter lehet.").nullable(),
}).strict();
export type FieldSurveyInput = z.infer<typeof fieldSurveyInputSchema>;

export const fieldSurveyTemplates: Record<FieldSurveyWorkType, readonly FieldSurveyTemplate[]> = {
  roof: [
    { label: "Épület hossza", unit: "m", semanticType: "roof_building_length" },
    { label: "Épület szélessége", unit: "m", semanticType: "roof_building_width" },
    { label: "Tetőemelkedés a fal felett", unit: "m", semanticType: "roof_rise" },
    { label: "Tetőhajlásszög", unit: "degree", semanticType: "roof_pitch" },
    { label: "Eresztúlnyúlás", unit: "mm", semanticType: "roof_eave_overhang" },
    { label: "Első oromtúlnyúlás", unit: "mm", semanticType: "roof_front_gable_overhang" },
    { label: "Hátsó oromtúlnyúlás", unit: "mm", semanticType: "roof_rear_gable_overhang" },
  ],
  gutter: [
    { label: "Ereszszakasz hossza", unit: "m", semanticType: "gutter_run_length" },
    { label: "Kiválasztott ereszcsatorna-szálhossz", unit: "mm", semanticType: "gutter_stock_length" },
    { label: "Konzolok távolsága", unit: "mm", semanticType: "gutter_bracket_spacing" },
  ],
  flashing: [
    { label: "Kiterített szélesség", unit: "mm", semanticType: "custom" },
    { label: "Szegélyszakasz hossza", unit: "m", semanticType: "flashing_run_length" },
    { label: "Kiválasztott szegélyszál hossza", unit: "mm", semanticType: "flashing_section_length" },
    { label: "Toldásonkénti átfedés", unit: "mm", semanticType: "flashing_overlap" },
  ],
  other: [{ label: "Egyedi mérés", unit: "mm", semanticType: "custom" }],
};

export const fieldSurveyWorkTypeLabels: Record<FieldSurveyWorkType, string> = {
  roof: "Tető",
  gutter: "Ereszcsatorna",
  flashing: "Bádogos szegély",
  other: "Egyéb",
};

export const fieldSurveyUnitLabels: Record<FieldSurveyUnit, string> = {
  mm: "mm",
  m: "m",
  m2: "m²",
  degree: "°",
  count: "db",
};

import { z } from "zod";

export const fieldSurveyWorkTypeSchema = z.enum(["roof", "gutter", "flashing", "other"]);
export type FieldSurveyWorkType = z.infer<typeof fieldSurveyWorkTypeSchema>;

export const fieldSurveyUnitSchema = z.enum(["mm", "m", "m2", "degree", "count"]);
export type FieldSurveyUnit = z.infer<typeof fieldSurveyUnitSchema>;

export const fieldSurveySemanticTypeSchema = z.enum([
  "custom", "roof_building_length", "roof_building_width", "roof_rise", "roof_pitch",
  "roof_eave_overhang", "roof_front_gable_overhang", "roof_rear_gable_overhang",
  "roof_outer_length", "roof_outer_width", "roof_outer_side", "roof_hip_eave_height", "roof_wing_width", "roof_wing_projection",
  "roof_eave_run", "roof_plane_slope_a", "roof_plane_slope_b",
  "roof_ridge_length", "roof_eave_a", "roof_eave_b", "roof_verge_a_left", "roof_verge_a_right", "roof_verge_b_left", "roof_verge_b_right",
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
  roof_outer_length: "Tető külső hossza", roof_outer_width: "Tető külső szélessége", roof_outer_side: "Sátortető külső oldalhossza",
  roof_hip_eave_height: "Félkonty alsó élének magassága", roof_wing_width: "Csatlakozó szárny szélessége", roof_wing_projection: "Szárny kinyúlása",
  roof_eave_run: "Nyeregtető · tetőhossz az eresz irányában", roof_plane_slope_a: "Nyeregtető · A sík lejtő menti hossza", roof_plane_slope_b: "Nyeregtető · B sík lejtő menti hossza",
  roof_ridge_length: "Nyeregtető · gerinc hossza", roof_eave_a: "Nyeregtető · A sík eresz hossza", roof_eave_b: "Nyeregtető · B sík eresz hossza",
  roof_verge_a_left: "Nyeregtető · A sík bal széle", roof_verge_a_right: "Nyeregtető · A sík jobb széle", roof_verge_b_left: "Nyeregtető · B sík bal széle", roof_verge_b_right: "Nyeregtető · B sík jobb széle",
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
  const lengthTypes: FieldSurveySemanticType[] = ["roof_building_length", "roof_building_width", "roof_rise", "roof_eave_overhang", "roof_front_gable_overhang", "roof_rear_gable_overhang", "roof_outer_length", "roof_outer_width", "roof_outer_side", "roof_hip_eave_height", "roof_wing_width", "roof_wing_projection", "roof_eave_run", "roof_plane_slope_a", "roof_plane_slope_b", "roof_ridge_length", "roof_eave_a", "roof_eave_b", "roof_verge_a_left", "roof_verge_a_right", "roof_verge_b_left", "roof_verge_b_right", "gutter_run_length", "gutter_stock_length", "gutter_bracket_spacing", "flashing_run_length", "flashing_section_length", "flashing_overlap"];
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
  // Régi ereszcsatorna/szegély szakaszok olvashatók maradnak, de új mérésük csak általános lehet.
  gutter: [{ label: "Egyedi mérés", unit: "mm", semanticType: "custom" }],
  flashing: [{ label: "Egyedi mérés", unit: "mm", semanticType: "custom" }],
  other: [{ label: "Egyedi mérés", unit: "mm", semanticType: "custom" }],
};

/** F9.44.1 gyors mérés: közvetlenül mért, eresz-irányú tetőhossz és síkonkénti lejtő menti hossz. */
export const quickGableTemplates: readonly FieldSurveyTemplate[] = [
  { label: "Tetőhossz az eresz irányában", unit: "m", semanticType: "roof_eave_run" },
  { label: "A sík lejtő menti hossza", unit: "m", semanticType: "roof_plane_slope_a" },
  { label: "B sík lejtő menti hossza", unit: "m", semanticType: "roof_plane_slope_b" },
];

/** F9.45.1 félnyeregtető gyors mérés: eresz menti hossz és a lejtő menti hossz (egyetlen sík). */
export const quickShedTemplates: readonly FieldSurveyTemplate[] = [
  { label: "Tetőhossz az eresz mentén", unit: "m", semanticType: "roof_eave_run" },
  { label: "Lejtő menti hossz", unit: "m", semanticType: "roof_plane_slope_a" },
];

/** F9.44.5 részletes mérés: gerinc, síkonkénti eresz és lejtő menti hossz; a hajlásszög csak rögzítésre kerül. */
export const detailedGableTemplates: readonly FieldSurveyTemplate[] = [
  { label: "Gerinc hossza", unit: "m", semanticType: "roof_ridge_length" },
  { label: "A sík eresz hossza", unit: "m", semanticType: "roof_eave_a" },
  { label: "A sík lejtő menti hossza", unit: "m", semanticType: "roof_plane_slope_a" },
  { label: "B sík eresz hossza", unit: "m", semanticType: "roof_eave_b" },
  { label: "B sík lejtő menti hossza", unit: "m", semanticType: "roof_plane_slope_b" },
  { label: "Hajlásszög", unit: "degree", semanticType: "roof_pitch" },
];
export const detailedVergeTemplates: Readonly<Record<"roof_verge_a_left" | "roof_verge_a_right" | "roof_verge_b_left" | "roof_verge_b_right", FieldSurveyTemplate>> = {
  roof_verge_a_left: { label: "A sík bal széle", unit: "m", semanticType: "roof_verge_a_left" },
  roof_verge_a_right: { label: "A sík jobb széle", unit: "m", semanticType: "roof_verge_a_right" },
  roof_verge_b_left: { label: "B sík bal széle", unit: "m", semanticType: "roof_verge_b_left" },
  roof_verge_b_right: { label: "B sík jobb széle", unit: "m", semanticType: "roof_verge_b_right" },
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

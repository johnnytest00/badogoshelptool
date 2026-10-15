import type { GutterMaterialInput } from "@/domain/calculations/gutter-material";
import type { FieldSurveyMeasurement, FieldSurveyWorkType } from "./contracts";

export type SurveyHandoffSource = Readonly<{ surveyId: string; revisionId: string; version: number }>;
export type RoofPrefill = Readonly<{
  inputMode: "height" | "angle"; buildingLengthMm: string; buildingWidthMm: string;
  roofRiseMm: string; roofPitchDegrees: string; eaveOverhangMm: string;
  frontGableOverhangMm: string; rearGableOverhangMm: string;
}>;
export type FlashingPrefill = Readonly<{ sectionLengthMm?: number; overlapMm?: number; runs: readonly Readonly<{ id: string; name: string; lengthMm: number }>[] }>;

export type SurveyCalculatorHandoff =
  | Readonly<{ ok: true; calculator: "gutter"; source: SurveyHandoffSource; input: GutterMaterialInput; missing: readonly string[] }>
  | Readonly<{ ok: true; calculator: "roof"; source: SurveyHandoffSource; input: RoofPrefill; missing: readonly string[] }>
  | Readonly<{ ok: true; calculator: "flashing"; source: SurveyHandoffSource; input: FlashingPrefill; missing: readonly string[] }>
  | Readonly<{ ok: false; error: string }>;

const lengthToMm = (measurement: FieldSurveyMeasurement): number | null => {
  if (measurement.unit === "mm") return measurement.value;
  if (measurement.unit === "m") return measurement.value * 1000;
  return null;
};

const textNumber = (value: number | null | undefined) => value == null ? "" : String(value);

function uniqueMeasurement(measurements: readonly FieldSurveyMeasurement[], semanticType: string): FieldSurveyMeasurement | undefined | null {
  const matching = measurements.filter((item) => item.semanticType === semanticType);
  return matching.length > 1 ? null : matching[0];
}

function readLength(measurements: readonly FieldSurveyMeasurement[], semanticType: string): number | undefined | null {
  const item = uniqueMeasurement(measurements, semanticType);
  if (item === null) return null;
  if (!item) return undefined;
  const mm = lengthToMm(item);
  return mm !== null && Number.isSafeInteger(mm) ? mm : null;
}

export function mapFieldSurveyToCalculator(input: Readonly<{
  surveyId: string; revisionId: string; version: number; workType: FieldSurveyWorkType; measurements: readonly FieldSurveyMeasurement[];
}>): SurveyCalculatorHandoff {
  const source = { surveyId: input.surveyId, revisionId: input.revisionId, version: input.version };
  if (input.workType === "other") return { ok: false, error: "Az Egyéb munkatípushoz nincs automatikus kalkulátormegfeleltetés." };

  if (input.workType === "roof") {
    const buildingLength = readLength(input.measurements, "roof_building_length");
    const buildingWidth = readLength(input.measurements, "roof_building_width");
    const rise = readLength(input.measurements, "roof_rise");
    const eave = readLength(input.measurements, "roof_eave_overhang");
    const front = readLength(input.measurements, "roof_front_gable_overhang");
    const rear = readLength(input.measurements, "roof_rear_gable_overhang");
    if ([buildingLength, buildingWidth, rise, eave, front, rear].some((value) => value === null)) return { ok: false, error: "Egy tetőmérési szerep többször szerepel, nem egyértelmű vagy nem alakítható egész mm-re." };
    const pitch = uniqueMeasurement(input.measurements, "roof_pitch");
    if (pitch === null) return { ok: false, error: "A tetőhajlásszög szerep többször szerepel." };
    if (pitch && pitch.unit !== "degree") return { ok: false, error: "A tetőhajlásszög egysége nem fok." };
    if (pitch && rise !== undefined) return { ok: false, error: "Tetőemelkedés és hajlásszög egyszerre szerepel; válassz egyetlen meghatározó adatot." };
    const values: RoofPrefill = {
      inputMode: pitch ? "angle" : "height",
      buildingLengthMm: textNumber(buildingLength), buildingWidthMm: textNumber(buildingWidth),
      roofRiseMm: textNumber(rise), roofPitchDegrees: pitch ? String(pitch.value) : "",
      eaveOverhangMm: textNumber(eave), frontGableOverhangMm: textNumber(front), rearGableOverhangMm: textNumber(rear),
    };
    const required = values.inputMode === "height"
      ? [["buildingLengthMm", "Épület hossza"], ["buildingWidthMm", "Épület szélessége"], ["roofRiseMm", "Tetőemelkedés"]]
      : [["buildingLengthMm", "Épület hossza"], ["buildingWidthMm", "Épület szélessége"], ["roofPitchDegrees", "Tetőhajlásszög"]];
    const missing = required.concat([["eaveOverhangMm", "Eresztúlnyúlás"], ["frontGableOverhangMm", "Első oromtúlnyúlás"], ["rearGableOverhangMm", "Hátsó oromtúlnyúlás"]]).filter(([key]) => !values[key as keyof RoofPrefill]).map(([, label]) => label);
    return { ok: true, calculator: "roof", source, input: values, missing };
  }

  if (input.workType === "flashing") {
    const runMeasurements = input.measurements.filter((item) => item.semanticType === "flashing_run_length");
    if (runMeasurements.some((item) => lengthToMm(item) === null)) return { ok: false, error: "A szegélyszakasz mérése csak mm vagy m egységben adható át." };
    const sectionLengthMm = readLength(input.measurements, "flashing_section_length");
    const overlapMm = readLength(input.measurements, "flashing_overlap");
    if (sectionLengthMm === null || overlapMm === null) return { ok: false, error: "A szegélyszálhossz vagy átfedés szerep többször szerepel, vagy mértékegysége nem megfelelő." };
    const runs = runMeasurements.map((item) => ({ id: item.id, name: item.label, lengthMm: lengthToMm(item)! }));
    if (!runs.length) runs.push({ id: "survey-flashing-missing", name: "Új szegélyszakasz", lengthMm: 0 });
    const missing = [sectionLengthMm === undefined || sectionLengthMm <= 0 ? "A kiválasztott kereskedelmi szálhossz" : null, ...(!runMeasurements.length || runMeasurements.some((item) => item.value <= 0) ? ["Pozitív szegélyszakasz-hossz"] : [])].filter((item): item is string => Boolean(item));
    return { ok: true, calculator: "flashing", source, input: { sectionLengthMm, overlapMm, runs }, missing };
  }

  const runMeasurements = input.measurements.filter((item) => item.semanticType === "gutter_run_length");
  const runs: GutterMaterialInput["runs"][number][] = runMeasurements.length ? runMeasurements.map((item, index) => {
    const length = lengthToMm(item);
    return { id: item.id, name: item.label || `Ereszszakasz ${index + 1}`, lengthMm: length ?? 0, description: "", measurementSource: "site_measurement" as const, roofEdge: null, bracketSpacingMm: null };
  }) : [{ id: "survey-run-missing", name: "Új ereszszakasz", lengthMm: 0, description: "", measurementSource: "site_measurement" as const, roofEdge: null, bracketSpacingMm: null }];
  if (runMeasurements.some((item) => lengthToMm(item) === null)) return { ok: false, error: "Az ereszszakasz mérése csak mm vagy m egységben adható át." };
  const stockLength = readLength(input.measurements, "gutter_stock_length");
  const bracketSpacing = readLength(input.measurements, "gutter_bracket_spacing");
  if (stockLength === null || bracketSpacing === null) return { ok: false, error: "A szálhossz vagy konzoltávolság szerep többször szerepel, vagy mértékegysége nem megfelelő." };
  if (bracketSpacing !== undefined) runs.forEach((run) => { run.bracketSpacingMm = bracketSpacing; });
  const missing = [stockLength === undefined || stockLength <= 0 ? "A kiválasztott ereszcsatorna-szál hossza" : null, ...(!runMeasurements.length || runMeasurements.some((item) => item.value <= 0) ? ["Pozitív ereszszakasz-hossz"] : [])].filter((item): item is string => Boolean(item));
  return { ok: true, calculator: "gutter", source, input: { gutterStockLengthMm: stockLength ?? 0, runs, downpipes: [], manualComponents: [] }, missing };
}

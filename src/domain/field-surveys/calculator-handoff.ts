import type { FieldSurveyMeasurement, FieldSurveyWorkType } from "./contracts";

export type SurveyHandoffSource = Readonly<{ surveyId: string; revisionId: string; version: number }>;
export type RoofPrefill = Readonly<{
  inputMode: "height" | "angle"; buildingLengthMm: string; buildingWidthMm: string;
  roofRiseMm: string; roofPitchDegrees: string; eaveOverhangMm: string;
  frontGableOverhangMm: string; rearGableOverhangMm: string;
}>;
export type FlashingPrefill = Readonly<{ sectionLengthMm?: number; overlapMm?: number; runs: readonly Readonly<{ id: string; name: string; lengthMm: number }>[] }>;

export type SurveyCalculatorHandoff =
  | Readonly<{ ok: true; calculator: "roof"; source: SurveyHandoffSource; input: RoofPrefill; missing: readonly string[] }>
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

  // Régi ereszcsatorna/szegély szakaszok olvashatók maradnak, de kalkulátorra nem adhatók át.
  return { ok: false, error: "Ehhez a munkatípushoz nincs önálló kalkulátor a felmérésből." };
}

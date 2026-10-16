import { calculateGableRoof, gableRoofInputSchema } from "@/domain/calculations/gable-roof";
import { mapFieldSurveyToCalculator } from "@/domain/field-surveys/calculator-handoff";
import { fieldSurveyMeasurementSchema, type FieldSurveyMeasurement, type FieldSurveySemanticType } from "@/domain/field-surveys/contracts";
import type { SurveyMeasurementDraft } from "./survey-draft-recovery";

export type GableSurveyPreviewIssue = Readonly<{
  kind: "incomplete" | "invalid";
  message: string;
  fieldMessages: Readonly<Record<string, string>>;
}>;

export type GableSurveyPreview = Readonly<{
  output: ReturnType<typeof calculateGableRoof> | null;
  issue: GableSurveyPreviewIssue | null;
}>;

const semanticByMissingLabel: Readonly<Record<string, FieldSurveySemanticType>> = {
  "Épület hossza": "roof_building_length",
  "Épület szélessége": "roof_building_width",
  "Tetőemelkedés": "roof_rise",
  "Tetőhajlásszög": "roof_pitch",
  "Eresztúlnyúlás": "roof_eave_overhang",
  "Első oromtúlnyúlás": "roof_front_gable_overhang",
  "Hátsó oromtúlnyúlás": "roof_rear_gable_overhang",
};

const inputFieldBySchemaKey: Readonly<Record<string, FieldSurveySemanticType>> = {
  buildingLengthMm: "roof_building_length",
  buildingWidthMm: "roof_building_width",
  roofRiseMm: "roof_rise",
  roofPitchDegrees: "roof_pitch",
  eaveOverhangMm: "roof_eave_overhang",
  frontGableOverhangMm: "roof_front_gable_overhang",
  rearGableOverhangMm: "roof_rear_gable_overhang",
};

const semanticLabels: Readonly<Partial<Record<FieldSurveySemanticType, string>>> = {
  roof_building_length: "Az épület hossza",
  roof_building_width: "Az épület szélessége",
  roof_rise: "A tetőemelkedés",
  roof_pitch: "A tetőhajlásszög",
  roof_eave_overhang: "Az eresztúlnyúlás",
  roof_front_gable_overhang: "Az első oromtúlnyúlás",
  roof_rear_gable_overhang: "A hátsó oromtúlnyúlás",
};

const geometrySemantics: readonly FieldSurveySemanticType[] = [
  "roof_building_length", "roof_building_width", "roof_rise", "roof_pitch",
  "roof_eave_overhang", "roof_front_gable_overhang", "roof_rear_gable_overhang",
];

function issue(kind: GableSurveyPreviewIssue["kind"], message: string, fields: readonly Readonly<{ id: string; message: string }>[]): GableSurveyPreview {
  return {
    output: null,
    issue: { kind, message, fieldMessages: Object.fromEntries(fields.map((field) => [field.id, field.message])) },
  };
}

/** Validates the survey's existing height-or-angle contract before drawing. */
export function buildGableSurveyPreview(drafts: readonly SurveyMeasurementDraft[]): GableSurveyPreview {
  const measurements: FieldSurveyMeasurement[] = [];
  for (const draft of drafts) {
    if (!draft.value.trim()) continue;
    const value = Number(draft.value.trim().replace(",", "."));
    const parsed = fieldSurveyMeasurementSchema.safeParse({ ...draft, value });
    if (!parsed.success) {
      const message = `${draft.label}: ${parsed.error.issues[0]?.message ?? "Adj meg érvényes mérési értéket."}`;
      const fields = [{ id: draft.id, message }];
      return issue("invalid", message, fields);
    }
    if (geometrySemantics.includes(parsed.data.semanticType)) {
      const lengthMeasurement = ["roof_building_length", "roof_building_width", "roof_rise", "roof_eave_overhang", "roof_front_gable_overhang", "roof_rear_gable_overhang"].includes(parsed.data.semanticType);
      const valueMm = parsed.data.unit === "m" ? parsed.data.value * 1000 : parsed.data.value;
      if (lengthMeasurement && !Number.isSafeInteger(valueMm)) {
        const message = `${draft.label}: a tetőgeometriához egész milliméterre átváltható érték szükséges.`;
        return issue("invalid", message, [{ id: draft.id, message }]);
      }
    }
    measurements.push(parsed.data);
  }

  const bySemantic = new Map<FieldSurveySemanticType, FieldSurveyMeasurement[]>();
  measurements.forEach((measurement) => {
    if (!geometrySemantics.includes(measurement.semanticType)) return;
    bySemantic.set(measurement.semanticType, [...(bySemantic.get(measurement.semanticType) ?? []), measurement]);
  });
  const duplicates = [...bySemantic.values()].filter((items) => items.length > 1).flat();
  if (duplicates.length) {
    const fields = duplicates.map((measurement) => ({ id: measurement.id, message: "Ugyanez a tetőméret többször szerepel; a rajzhoz tarts meg egy mezőt." }));
    return issue("invalid", "Azonos számítási szerep többször szerepel. Javítsd a kijelölt mezőket a rajzhoz.", fields);
  }

  const rise = bySemantic.get("roof_rise")?.[0];
  const pitch = bySemantic.get("roof_pitch")?.[0];
  if (rise && pitch) {
    const message = "A nyeregtető rajzához vagy tetőemelkedést, vagy hajlásszöget adj meg; a meglévő számítási mód egyszerre csak egyet fogad el.";
    return issue("invalid", message, [rise, pitch].map((measurement) => ({ id: measurement.id, message: "Válassz emelkedést vagy hajlásszöget; ne add meg egyszerre mindkettőt." })));
  }

  const mapped = mapFieldSurveyToCalculator({
    surveyId: "00000000-0000-4000-8000-000000000001",
    revisionId: "00000000-0000-4000-8000-000000000002",
    version: 1,
    workType: "roof",
    measurements,
  });
  if (!mapped.ok || mapped.calculator !== "roof") {
    const relevant = measurements.filter((measurement) => geometrySemantics.includes(measurement.semanticType));
    return issue("invalid", mapped.ok ? "A tetőelőnézet bemenete nem értelmezhető." : mapped.error, relevant.map((measurement) => ({ id: measurement.id, message: "Ellenőrizd ezt a tetőméretet." })));
  }
  if (mapped.missing.length) {
    const message = `A nyeregtető rajzához még szükséges: ${mapped.missing.join(", ")}.`;
    const missingSemantics = new Set(mapped.missing.map((label) => semanticByMissingLabel[label]).filter((value): value is FieldSurveySemanticType => Boolean(value)));
    const fields = drafts.filter((draft) => missingSemantics.has(draft.semanticType)).map((draft) => ({ id: draft.id, message: "A rajzhoz add meg ezt az értéket." }));
    return issue("incomplete", message, fields);
  }

  const value = (raw: string) => raw.trim() ? Number(raw) : undefined;
  const input = gableRoofInputSchema.safeParse({
    inputMode: mapped.input.inputMode,
    buildingLengthMm: value(mapped.input.buildingLengthMm),
    buildingWidthMm: value(mapped.input.buildingWidthMm),
    eaveOverhangMm: value(mapped.input.eaveOverhangMm),
    frontGableOverhangMm: value(mapped.input.frontGableOverhangMm),
    rearGableOverhangMm: value(mapped.input.rearGableOverhangMm),
    ...(mapped.input.inputMode === "height" ? { roofRiseMm: value(mapped.input.roofRiseMm) } : { roofPitchDegrees: value(mapped.input.roofPitchDegrees) }),
  });
  if (!input.success) {
    const schemaField = String(input.error.issues[0]?.path[0] ?? "");
    const semantic = inputFieldBySchemaKey[schemaField];
    const label = semanticLabels[semantic] ?? "A megadott tetőméret";
    const message = schemaField === "roofPitchDegrees"
      ? `${label} legyen 0° fölött és 90° alatt.`
      : `${label} legyen pozitív, egész milliméterben megadható méret.`;
    const fields = drafts.filter((draft) => draft.semanticType === semantic).map((draft) => ({ id: draft.id, message }));
    return issue("invalid", message, fields);
  }

  try {
    return { output: calculateGableRoof(input.data), issue: null };
  } catch {
    const fields = measurements.filter((measurement) => geometrySemantics.includes(measurement.semanticType)).map((measurement) => ({ id: measurement.id, message: "Ellenőrizd ezt a méretet; a számított eredmény nem ábrázolható biztonságosan." }));
    return issue("invalid", "A megadott tetőméretekből nem számítható biztonságos rajz. Ellenőrizd a méreteket.", fields);
  }
}

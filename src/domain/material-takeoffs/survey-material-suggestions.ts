import { gableRoofCalculator } from "@/domain/calculations/gable-roof";
import { surveySections, type SurveyCalculationLink, type SurveyRoofGeometrySource, type SurveySection } from "@/domain/field-surveys/workspace";
import type { FieldSurveyMeasurement, FieldSurveyWorkType } from "@/domain/field-surveys/contracts";

export type SurveyMaterialSourceRef = Readonly<
  | { type: "measurement"; sectionId: string; measurementId: string }
  | { type: "calculation"; sectionId: string; calculationId: string; calculationRevisionId: string }
  | { type: "surveyGeometry"; sectionId: string; geometrySourceId: string }
>;

export type SurveyMaterialSuggestion = Readonly<{
  key: string;
  sectionId: string;
  description: string;
  quantity: string;
  unit: "linear_meter" | "square_meter";
  materialCategory: "gutter" | "flashing" | "roof_covering";
  sourceLabel: string;
  quantityKind: "measured" | "calculated";
  sourceRef: SurveyMaterialSourceRef;
}>;

export type SurveyMaterialProvenanceItem = Readonly<{
  itemId: string;
  sectionId: string;
  sourceKind: "measurement" | "calculation" | "geometry";
  sourceRef: SurveyMaterialSourceRef;
  sourceLabel: string;
  sourceValue: string;
  sourceUnit: "m" | "m²";
  quantityKind: "measured" | "calculated";
  calculationRevisionNumber?: number;
}>;

export type SurveyMaterialSuggestionResult = Readonly<{
  suggestions: readonly SurveyMaterialSuggestion[];
  unavailable: readonly string[];
}>;

type SurveySource = Readonly<{
  surveyId: string;
  revisionId: string;
  version: number;
  workType: FieldSurveyWorkType;
  measurements: readonly FieldSurveyMeasurement[];
  sections?: readonly SurveySection[] | null;
}>;

function exactQuantity(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const sixDecimals = value.toFixed(6);
  if (Number(sixDecimals) !== value) return null;
  return sixDecimals.replace(/0+$/, "").replace(/\.$/, "");
}

function calculatedQuantity(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function isEmptyWarnings(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

export function deriveSurveyMaterialSuggestions(
  source: SurveySource,
  calculations: readonly SurveyCalculationLink[],
  geometrySources: readonly SurveyRoofGeometrySource[] = [],
): SurveyMaterialSuggestionResult {
  const sections = surveySections({
    ...source,
    id: source.surveyId,
    surveyId: source.surveyId,
    measurements: [...source.measurements],
    sections: source.sections ? [...source.sections] : null,
    notes: null,
  });
  const suggestions: SurveyMaterialSuggestion[] = [];
  const unavailable: string[] = [];

  for (const section of sections) {
    if (section.workType === "gutter" || section.workType === "flashing") {
      const semanticType = section.workType === "gutter" ? "gutter_run_length" : "flashing_run_length";
      const displayKind = section.workType === "gutter" ? "ereszcsatorna-szakasz" : "szegélyszakasz";
      const measurement = section.measurements.find((candidate) => candidate.semanticType === semanticType);
      const quantity = measurement?.unit === "m" && measurement.value !== null ? exactQuantity(measurement.value) : null;
      if (measurement && quantity) {
        suggestions.push({
          key: `${section.id}:${measurement.id}`,
          sectionId: section.id,
          description: `${section.name} · ${displayKind} mért hossza`,
          quantity,
          unit: "linear_meter",
          materialCategory: section.workType === "gutter" ? "gutter" : "flashing",
          sourceLabel: `${measurement.label} · V${source.version} · mért adat`,
          quantityKind: "measured",
          sourceRef: { type: "measurement", sectionId: section.id, measurementId: measurement.id },
        });
      } else {
        const reason = !measurement
          ? "hiányzik a kiválasztott szakaszhossz-mérés"
          : measurement.value === null || measurement.value <= 0
            ? "a szakaszhossz hiányos vagy nulla"
            : measurement.unit !== "m"
              ? "a mérés egysége nem méter; automatikus egységváltás nem történik"
              : "a mennyiség nem fér el veszteségmentesen a lista hat tizedesjegyű pontosságában";
        unavailable.push(`${section.name}: ${reason}. Beszerzési mennyiséget szálhossz, toldás és ráhagyás nélkül nem számolunk.`);
      }
    }

    if (section.workType === "roof") {
      const calculation = calculations.find((candidate) => candidate.sectionId === section.id
        && candidate.surveyRevisionId === source.revisionId
        && candidate.calculatorType === "roof.gable"
        && candidate.validationStatus === "verified"
        && isEmptyWarnings(candidate.warnings));
      const parsed = calculation ? gableRoofCalculator.outputSchema.safeParse(calculation.output) : null;
      const quantity = parsed?.success ? calculatedQuantity(parsed.data.areas.combinedRoofM2) : null;
      if (calculation && quantity) {
        suggestions.push({
          key: `${section.id}:${calculation.revisionId}`,
          sectionId: section.id,
          description: `${section.name} · ellenőrzött tetőfelület`,
          quantity,
          unit: "square_meter",
          materialCategory: "roof_covering",
          sourceLabel: `Tetőgeometria · számítás V${calculation.revisionNumber} · felmérés V${source.version}`,
          quantityKind: "calculated",
          sourceRef: { type: "calculation", sectionId: section.id, calculationId: calculation.calculationId, calculationRevisionId: calculation.revisionId },
        });
      } else {
        const geometry = geometrySources.find((candidate) => candidate.sectionId === section.id && candidate.surveyRevisionId === source.revisionId);
        const geometryQuantity = geometry ? calculatedQuantity(geometry.combinedRoofM2) : null;
        if (geometry && geometryQuantity) {
          suggestions.push({
            key: `${section.id}:geometry:${geometry.id}`,
            sectionId: section.id,
            description: `${section.name} · ellenőrzött tetőfelület`,
            quantity: geometryQuantity,
            unit: "square_meter",
            materialCategory: "roof_covering",
            sourceLabel: `Tetőgeometria · felmérés V${source.version}`,
            quantityKind: "calculated",
            sourceRef: { type: "surveyGeometry", sectionId: section.id, geometrySourceId: geometry.id },
          });
        } else {
          unavailable.push(`${section.name}: nincs ehhez a felmérésrevízióhoz rögzített, ellenőrzött tetőgeometria (a kiválasztott tetőforma teljes, érvényes méretei szükségesek). Fedési darabszámot vagy ráhagyást nem becslünk.`);
        }
      }
    }
  }

  if (!sections.some((section) => section.workType === "roof" || section.workType === "gutter" || section.workType === "flashing")) {
    unavailable.push("Ebből az egyéb munkaszakaszból nincs igazoltan átemelhető mennyiség; kézi tétellel folytathatod.");
  }
  return { suggestions, unavailable };
}

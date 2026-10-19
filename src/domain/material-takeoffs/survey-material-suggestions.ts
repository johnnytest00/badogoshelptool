import { gableRoofCalculator } from "@/domain/calculations/gable-roof";
import { surveySections, type SurveyCalculationLink, type SurveyRoofGeometrySource, type SurveySection } from "@/domain/field-surveys/workspace";
import { roofEdgeRoleLabels, type RoofEdgeRole } from "@/domain/field-surveys/work-elements";
import type { FieldSurveyMeasurement, FieldSurveyWorkType } from "@/domain/field-surveys/contracts";

/** measured = directly measured; calculated = verified roof geometry (still unchanged); overridden = taken from the roof geometry, then edited by hand. */
export type QuantityKind = "measured" | "calculated" | "overridden";
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
  quantityKind: QuantityKind;
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
  quantityKind: QuantityKind;
  origin?: Readonly<{ kind: "verifiedRoofEdge"; roofSectionId: string; role: RoofEdgeRole; geometrySourceId: string | null; calculatedValueMm: number | null }>;
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

/** Mirrors the database rule (save_workflow_material_list_from_survey_revision): "calculated" only while the value equals the recorded, verified roof edge. */
export function measurementOrigin(section: SurveySection, value: number | null, geometrySources: readonly SurveyRoofGeometrySource[], revisionId: string): { quantityKind: QuantityKind; originLabel: string } {
  const link = section.lengthSource;
  if (!link) return { quantityKind: "measured", originLabel: "mért adat" };
  const edge = geometrySources.find((item) => item.sectionId === link.roofSectionId && item.surveyRevisionId === revisionId)?.edges?.[link.role];
  if (edge !== undefined && value !== null && Math.abs(value * 1000 - edge) <= 0.5) return { quantityKind: "calculated", originLabel: `tetőgeometriából számított (${roofEdgeRoleLabels[link.role]})` };
  return { quantityKind: "overridden", originLabel: edge === undefined ? "kézi érték (a tetőforrás nem ellenőrizhető)" : "kézzel felülírva a tetőgeometriához képest" };
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
        const { quantityKind, originLabel } = measurementOrigin(section, measurement.value, geometrySources, source.revisionId);
        suggestions.push({
          key: `${section.id}:${measurement.id}`,
          sectionId: section.id,
          description: `${section.name} · ${displayKind} hossza`,
          quantity,
          unit: "linear_meter",
          materialCategory: section.workType === "gutter" ? "gutter" : "flashing",
          sourceLabel: `${measurement.label} · V${source.version} · ${originLabel}`,
          quantityKind,
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

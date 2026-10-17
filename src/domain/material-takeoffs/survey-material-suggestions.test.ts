import { describe, expect, it } from "vitest";
import { calculateGableRoof, gableRoofInputSchema } from "@/domain/calculations/gable-roof";
import type { SurveyCalculationLink, SurveySection } from "@/domain/field-surveys/workspace";
import { deriveSurveyMaterialSuggestions } from "./survey-material-suggestions";

const surveyId = "00000000-0000-4000-8000-000000000101";
const revisionId = "00000000-0000-4000-8000-000000000102";
const roofSectionId = "00000000-0000-4000-8000-000000000103";
const gutterSectionId = "00000000-0000-4000-8000-000000000104";
const flashingSectionId = "00000000-0000-4000-8000-000000000105";
const measurementId = "00000000-0000-4000-8000-000000000106";

const sections: SurveySection[] = [
  { id: roofSectionId, name: "DEMO tető", workType: "roof", notes: "", photoIds: [], measurements: [] },
  { id: gutterSectionId, name: "DEMO eresz", workType: "gutter", notes: "", photoIds: [], measurements: [
    { id: measurementId, label: "DEMO ereszszakasz", value: 8.25, unit: "m", semanticType: "gutter_run_length" },
  ] },
  { id: flashingSectionId, name: "DEMO szegély", workType: "flashing", notes: "", photoIds: [], measurements: [
    { id: "00000000-0000-4000-8000-000000000107", label: "DEMO szegélyszakasz", value: null, unit: "m", semanticType: "flashing_run_length" },
  ] },
];

function roofCalculation(overrides: Partial<SurveyCalculationLink> = {}): SurveyCalculationLink {
  const input = gableRoofInputSchema.parse({ inputMode: "height", buildingLengthMm: 10000, buildingWidthMm: 6000, roofRiseMm: 3000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 });
  return {
    id: "00000000-0000-4000-8000-000000000108", calculationId: "00000000-0000-4000-8000-000000000109",
    revisionId: "00000000-0000-4000-8000-000000000110", revisionNumber: 1, sectionId: roofSectionId,
    surveyRevisionId: revisionId, surveyVersion: 2, calculatorType: "roof.gable", name: "DEMO tetőgeometria",
    output: calculateGableRoof(input), warnings: [], provenance: "user_provided", validationStatus: "verified", ...overrides,
  };
}

function source(overrides: Partial<Parameters<typeof deriveSurveyMaterialSuggestions>[0]> = {}) {
  return { surveyId, revisionId, version: 2, workType: "roof" as const, measurements: [], sections, ...overrides };
}

describe("deriveSurveyMaterialSuggestions", () => {
  it("offers only an exact verified roof area and explicit meter measurements", () => {
    const result = deriveSurveyMaterialSuggestions(source(), [roofCalculation()]);
    expect(result.suggestions.map(({ description, quantity, unit, quantityKind }) => ({ description, quantity, unit, quantityKind }))).toEqual([
      { description: "DEMO tető · ellenőrzött tetőfelület", quantity: "84.852814", unit: "square_meter", quantityKind: "calculated" },
      { description: "DEMO eresz · ereszcsatorna-szakasz mért hossza", quantity: "8.25", unit: "linear_meter", quantityKind: "measured" },
    ]);
    expect(result.suggestions[0].sourceRef).toMatchObject({ type: "calculation", calculationRevisionId: roofCalculation().revisionId });
    expect(result.suggestions[1].sourceRef).toMatchObject({ type: "measurement", measurementId });
    expect(result.unavailable).toContain("DEMO szegély: a szakaszhossz hiányos vagy nulla. Beszerzési mennyiséget szálhossz, toldás és ráhagyás nélkül nem számolunk.");
  });

  it("does not use an unverified, stale-revision, warned, malformed, or unsupported product-count calculation", () => {
    const output = calculateGableRoof(gableRoofInputSchema.parse({ inputMode: "height", buildingLengthMm: 10000, buildingWidthMm: 6000, roofRiseMm: 3000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 }));
    for (const calculation of [
      roofCalculation({ validationStatus: "estimated" }),
      roofCalculation({ surveyRevisionId: "00000000-0000-4000-8000-000000000111" }),
      roofCalculation({ warnings: ["DEMO figyelmeztetés"] }),
      roofCalculation({ output: { areas: { combinedRoofM2: 100 } } }),
      roofCalculation({ calculatorType: "roof.gable.metal-tile-covering", output }),
    ]) {
      const result = deriveSurveyMaterialSuggestions(source(), [calculation]);
      expect(result.suggestions.some((item) => item.quantityKind === "calculated")).toBe(false);
    }
  });

  it("does not silently convert other units or round quantities beyond six decimals", () => {
    const gutterSection = sections[1];
    const result = deriveSurveyMaterialSuggestions(source({ sections: [
      sections[0],
      { ...gutterSection, measurements: [{ ...gutterSection.measurements[0], value: 1.2345678 }] },
      { ...sections[2], measurements: [{ ...sections[2].measurements[0], value: 12000, unit: "mm" }] },
    ] }), []);
    expect(result.suggestions).toEqual([]);
    expect(result.unavailable).toHaveLength(3);
    expect(result.unavailable.some((reason) => reason.includes("hat tizedesjegyű pontosság"))).toBe(true);
    expect(result.unavailable.some((reason) => reason.includes("automatikus egységváltás nem történik"))).toBe(true);
  });
});

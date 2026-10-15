import { describe, expect, it } from "vitest";
import { completeSectionMeasurements, savedQuantitySummary, surveySections, surveySectionsSchema } from "./workspace";
import { mapFieldSurveyToCalculator } from "./calculator-handoff";
const id = "00000000-0000-4000-8000-000000000001";
const measurement = { id, label: "DEMO eresz", value: 8.5, unit: "m" as const, semanticType: "gutter_run_length" as const };
const section = { id, name: "DEMO eresz", workType: "gutter" as const, notes: "", photoIds: [], measurements: [measurement] };
describe("unified survey contracts", () => {
  it("preserves incomplete values and excludes them from calculator prefill", () => {
    const parsed = surveySectionsSchema.parse([{ ...section, measurements: [{ ...measurement, value: null }] }]);
    expect(parsed[0].measurements[0].value).toBeNull();
    const handoff = mapFieldSurveyToCalculator({ surveyId: id, revisionId: id, version: 1, workType: "gutter", measurements: completeSectionMeasurements(parsed[0]) });
    expect(handoff.ok && handoff.missing).toContain("Pozitív ereszszakasz-hossz");
  });
  it("keeps independent sections, validates units, duplicates and total measurement bounds", () => {
    expect(surveySectionsSchema.safeParse([section, section]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...section, measurements: [{ ...measurement, unit: "m2" }] }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...section, measurements: [{ ...measurement, value: -1 }] }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...section, measurements: [{ ...measurement, value: NaN }] }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...section, measurements: [] }]).success).toBe(true);
  });
  it("maps legacy data without rewriting its identity, measurements or history", () => {
    const record = { id, workType: "gutter" as const, measurements: [measurement], notes: "DEMO" };
    expect(surveySections(record)[0]).toMatchObject({ id, measurements: [measurement], notes: "DEMO" });
    expect(record).not.toHaveProperty("sections");
  });
  it("reports known result units individually and never promotes nominal area to purchasing quantity", () => {
    expect(savedQuantitySummary("roof.gable.metal-tile-covering", { geometry: {}, covering: { status: "VALID", totalSheetCount: 20, totalNominalSheetAreaMm2: 120000000 } })).toEqual([{ label: "Feltételes lemezmennyiség", value: 20, unit: "db" }]);
    expect(savedQuantitySummary("gutters.material-estimate", { totals: { gutterStockSections: 3, downpipeStockSections: 2 } })).toHaveLength(2);
    expect(savedQuantitySummary("unknown", { quantity: 100 })).toEqual([]);
  });
});

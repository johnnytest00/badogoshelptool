import { describe, expect, it } from "vitest";
import { completeSectionMeasurements, savedQuantitySummary, surveySections, surveySectionsSchema } from "./workspace";
const id = "00000000-0000-4000-8000-000000000001";
const measurement = { id, label: "DEMO eresz", value: 8.5, unit: "m" as const, semanticType: "gutter_run_length" as const };
const section = { id, name: "DEMO eresz", workType: "gutter" as const, notes: "", photoIds: [], measurements: [measurement] };
describe("unified survey contracts", () => {
  it("preserves incomplete values and excludes them from calculator prefill", () => {
    const parsed = surveySectionsSchema.parse([{ ...section, measurements: [{ ...measurement, value: null }] }]);
    expect(parsed[0].measurements[0].value).toBeNull();
    expect(completeSectionMeasurements(parsed[0])).toEqual([]);
  });
  it("keeps independent sections, validates units, duplicates and total measurement bounds", () => {
    expect(surveySectionsSchema.safeParse([section, section]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...section, measurements: [{ ...measurement, unit: "m2" }] }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...section, measurements: [{ ...measurement, value: -1 }] }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...section, measurements: [{ ...measurement, value: NaN }] }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...section, measurements: [] }]).success).toBe(true);
  });
  it("allows a partial roof section to persist before roof type selection", () => {
    expect(surveySectionsSchema.safeParse([{ id, name: "DEMO tető", workType: "roof", notes: "", photoIds: [], measurements: [] }]).success).toBe(true);
  });
  it("preserves optional partial roof-timber parameters and validates their ranges", () => {
    const parameters = { rafterMaxSpacingMm: 600, rafterStartInsetMm: 0, battenSectionWidthMm: 30 };
    const saved = surveySectionsSchema.parse([{ id, name: "DEMO tető", workType: "roof", notes: "", photoIds: [], measurements: [], roofTimberParameters: parameters }]);
    expect(saved[0].roofTimberParameters).toEqual(parameters);
    expect(surveySectionsSchema.safeParse([{ ...saved[0], workType: "gutter" }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...saved[0], roofTimberParameters: { rafterMaxSpacingMm: 100001 } }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...saved[0], roofTimberParameters: { rafterMaxSpacingMm: 0 } }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...saved[0], roofTimberParameters: { unknown: 1 } }]).success).toBe(false);
  });
  it("retains optional underlay inputs in a roof section without requiring them for basic survey data", () => {
    const parameters = { rollWidthMm: 1500, rollLengthMm: 50000, sideOverlapMm: 150, endOverlapMm: 0, installationDirection: "eave-to-ridge" as const };
    const parsed = surveySectionsSchema.parse([{ id, name: "DEMO tető", workType: "roof", notes: "", photoIds: [], measurements: [], roofUnderlayParameters: parameters }]);
    expect(parsed[0].roofUnderlayParameters).toEqual(parameters);
    expect(surveySectionsSchema.parse([{ id, name: "DEMO tető", workType: "roof", notes: "", photoIds: [], measurements: [] }])[0]).not.toHaveProperty("roofUnderlayParameters");
    expect(surveySectionsSchema.safeParse([{ ...parsed[0], workType: "gutter" }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...parsed[0], roofUnderlayParameters: { ...parameters, sideOverlapMm: 1500 } }]).success).toBe(false);
    expect(surveySectionsSchema.safeParse([{ ...parsed[0], roofUnderlayParameters: { ...parameters, extra: true } }]).success).toBe(false);
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

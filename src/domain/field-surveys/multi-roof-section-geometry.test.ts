import { describe, expect, it } from "vitest";
import type { SurveySection } from "./workspace";
import { multiRoofGeometryFromSurveySection } from "./multi-roof-section-geometry";

const section = (overrides: Partial<SurveySection> = {}): SurveySection => ({
  id: "00000000-0000-4000-8000-000000000301", name: "DEMO kontytető", workType: "roof", notes: "", photoIds: [], measurements: [],
  ...overrides,
});

describe("multiRoofGeometryFromSurveySection", () => {
  it("maps a complete hip section to the general roof geometry input", () => {
    const input = multiRoofGeometryFromSurveySection(section({
      roofType: "hip",
      measurements: [
        { id: "m1", label: "hossz", value: 12000, unit: "mm", semanticType: "roof_outer_length" },
        { id: "m2", label: "szélesség", value: 8000, unit: "mm", semanticType: "roof_outer_width" },
        { id: "m3", label: "hajlás", value: 35, unit: "degree", semanticType: "roof_pitch" },
      ],
    }));
    expect(input).toEqual({ type: "hip", lengthMm: 12000, widthMm: 8000, pitchDegrees: 35 });
  });

  it("returns null for an unselected or gable roof type", () => {
    expect(multiRoofGeometryFromSurveySection(section())).toBeNull();
    expect(multiRoofGeometryFromSurveySection(section({ roofType: "gable" }))).toBeNull();
  });

  it("returns null for incomplete measurements", () => {
    expect(multiRoofGeometryFromSurveySection(section({
      roofType: "hip",
      measurements: [{ id: "m1", label: "hossz", value: 12000, unit: "mm", semanticType: "roof_outer_length" }],
    }))).toBeNull();
  });
});

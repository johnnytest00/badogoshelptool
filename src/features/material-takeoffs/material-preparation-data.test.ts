import { describe, expect, it } from "vitest";
import { surveyNameFromRevision } from "./material-preparation-data";

describe("survey source name mapping", () => {
  it("uses the exact immutable revision section names", () => {
    expect(surveyNameFromRevision("roof", [
      { id: "section-1", name: "DEMO tető", workType: "roof" },
      { id: "section-2", name: "Ereszcsatorna", workType: "gutter" },
    ])).toBe("DEMO tető · Ereszcsatorna");
  });

  it("falls back to the known work type without inventing a custom title", () => {
    expect(surveyNameFromRevision("gutter", null)).toBe("Ereszcsatorna");
    expect(surveyNameFromRevision("unknown", null)).toBe("Felmérés");
  });
});

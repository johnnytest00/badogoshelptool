import { describe, expect, it } from "vitest";
import { initializeCalculatorDraft, updateCalculatorDraft, replaceCalculatorDraft } from "./construction-drafts";

describe("calculator drafts", () => {
  it("keeps unfinished A, B and C inputs across switches and same-calculator selection", () => {
    let drafts = initializeCalculatorDraft({}, "roof.rafter-cut", { horizontalHalfSpanMm: "", riseMm: "" });
    drafts = updateCalculatorDraft(drafts, "roof.rafter-cut", "horizontalHalfSpanMm", "4000");
    drafts = updateCalculatorDraft(drafts, "roof.rafter-cut", "riseMm", "3000");
    drafts = initializeCalculatorDraft(drafts, "roof.truss", { spanMm: "" });
    drafts = updateCalculatorDraft(drafts, "roof.truss", "spanMm", "3200");
    drafts = initializeCalculatorDraft(drafts, "concrete.pile", { count: "" });
    drafts = updateCalculatorDraft(drafts, "concrete.pile", "count", "2.");

    expect(initializeCalculatorDraft(drafts, "roof.rafter-cut", { horizontalHalfSpanMm: "" })).toBe(drafts);
    expect(drafts["roof.rafter-cut"]).toEqual({ horizontalHalfSpanMm: "4000", riseMm: "3000" });
    expect(drafts["roof.truss"]?.spanMm).toBe("3200");
    expect(drafts["concrete.pile"]?.count).toBe("2.");
  });

  it("ignores late defaults, but explicitly loaded revisions replace only their calculator", () => {
    let drafts = updateCalculatorDraft({}, "roof.rafter-cut", "riseMm", "3.");
    drafts = initializeCalculatorDraft(drafts, "roof.rafter-cut", { riseMm: "3000" });
    expect(drafts["roof.rafter-cut"]?.riseMm).toBe("3.");
    drafts = updateCalculatorDraft(drafts, "roof.truss", "spanMm", "5000");
    drafts = replaceCalculatorDraft(drafts, "roof.rafter-cut", { riseMm: "2500" });
    expect(drafts["roof.rafter-cut"]?.riseMm).toBe("2500");
    expect(drafts["roof.truss"]?.spanMm).toBe("5000");
  });
});

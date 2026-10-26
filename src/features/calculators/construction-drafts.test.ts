import { describe, expect, it } from "vitest";
import { applyFieldChange, initializeCalculatorDraft, updateCalculatorDraft, replaceCalculatorDraft } from "./construction-drafts";

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

// M10.1.3 (docs/M10_PHASE1_FINAL_INDEPENDENT_QA.md §16.4): `applyFieldChange` is the exact function
// ConstructionCalculatorSuite's `updateValue` calls for every field change — these are the owner's real
// state-transition tests, not only the isolated `invalidateGableGeometryOnShapeChange` helper's unit tests.
describe("applyFieldChange — the owner's atomic roofShape transition", () => {
  const applied = { displayName: "DEMO szarufa", revisionNumber: 1, newFields: { widthMm: "8000", pitchDegrees: "34.01934998982646", seatCutHeightMm: "100" }, snapshot: { widthMm: "", pitchDegrees: "", seatCutHeightMm: "" } };
  const draftsWith = (fields: Record<string, string>) => ({ "roof.material-takeoff": { roofShape: "gable", ...fields } });

  it("gable→hip/shed, both fields untouched: resets both in the same update that changes the shape", () => {
    for (const nextShape of ["hip", "shed"]) {
      const drafts = draftsWith({ widthMm: "8000", pitchDegrees: "34.01934998982646", seatCutHeightMm: "100" });
      const result = applyFieldChange(drafts, "roof.material-takeoff", "roofShape", nextShape, applied);
      expect(result.drafts["roof.material-takeoff"]).toMatchObject({ roofShape: nextShape, widthMm: "", pitchDegrees: "", seatCutHeightMm: "100" });
      expect(result.nextApplied).toEqual({ displayName: "DEMO szarufa", revisionNumber: 1, newFields: { seatCutHeightMm: "100" }, snapshot: { seatCutHeightMm: "" } });
    }
  });

  it("gable→hip, only widthMm manually edited: resets only pitchDegrees and keeps the manual width (the proven P1)", () => {
    const drafts = draftsWith({ widthMm: "9500", pitchDegrees: "34.01934998982646", seatCutHeightMm: "100" });
    const result = applyFieldChange(drafts, "roof.material-takeoff", "roofShape", "hip", applied);
    expect(result.drafts["roof.material-takeoff"]).toMatchObject({ roofShape: "hip", widthMm: "9500", pitchDegrees: "", seatCutHeightMm: "100" });
    expect(result.nextApplied).toEqual({ displayName: "DEMO szarufa", revisionNumber: 1, newFields: { widthMm: "8000", seatCutHeightMm: "100" }, snapshot: { widthMm: "", seatCutHeightMm: "" } });
  });

  it("gable→hip, only pitchDegrees manually edited: resets only widthMm and keeps the manual pitch", () => {
    const drafts = draftsWith({ widthMm: "8000", pitchDegrees: "40", seatCutHeightMm: "100" });
    const result = applyFieldChange(drafts, "roof.material-takeoff", "roofShape", "hip", applied);
    expect(result.drafts["roof.material-takeoff"]).toMatchObject({ roofShape: "hip", widthMm: "", pitchDegrees: "40", seatCutHeightMm: "100" });
    expect(result.nextApplied).toEqual({ displayName: "DEMO szarufa", revisionNumber: 1, newFields: { pitchDegrees: "34.01934998982646", seatCutHeightMm: "100" }, snapshot: { pitchDegrees: "", seatCutHeightMm: "" } });
  });

  it("gable→hip, both fields manually edited: keeps both manual values and the Karmi tracking unchanged", () => {
    const drafts = draftsWith({ widthMm: "9500", pitchDegrees: "40", seatCutHeightMm: "100" });
    const result = applyFieldChange(drafts, "roof.material-takeoff", "roofShape", "hip", applied);
    expect(result.drafts["roof.material-takeoff"]).toMatchObject({ roofShape: "hip", widthMm: "9500", pitchDegrees: "40" });
    expect(result.nextApplied).toEqual(applied);
  });

  it("gable→hip→gable: invalidated geometry is not resurrected on switching back", () => {
    const drafts = draftsWith({ widthMm: "8000", pitchDegrees: "34.01934998982646", seatCutHeightMm: "100" });
    const afterHip = applyFieldChange(drafts, "roof.material-takeoff", "roofShape", "hip", applied);
    const backToGable = applyFieldChange(afterHip.drafts, "roof.material-takeoff", "roofShape", "gable", afterHip.nextApplied);
    expect(backToGable.drafts["roof.material-takeoff"]).toMatchObject({ roofShape: "gable", widthMm: "", pitchDegrees: "" });
    expect(backToGable.nextApplied).toEqual(afterHip.nextApplied);
  });

  it("fast repeated shape changes (hip→shed) after the gable exit do not re-trigger or lose tracking", () => {
    const drafts = draftsWith({ widthMm: "8000", pitchDegrees: "34.01934998982646", seatCutHeightMm: "100" });
    const step1 = applyFieldChange(drafts, "roof.material-takeoff", "roofShape", "hip", applied);
    const step2 = applyFieldChange(step1.drafts, "roof.material-takeoff", "roofShape", "shed", step1.nextApplied);
    expect(step2.drafts["roof.material-takeoff"]).toMatchObject({ roofShape: "shed", widthMm: "", pitchDegrees: "", seatCutHeightMm: "100" });
    expect(step2.nextApplied).toEqual(step1.nextApplied);
  });

  it("a non-roofShape field change never invokes the invalidation and leaves unrelated manual data alone", () => {
    const drafts = { "roof.material-takeoff": { roofShape: "gable", lengthMm: "12000" } };
    const result = applyFieldChange(drafts, "roof.material-takeoff", "lengthMm", "15000", null);
    expect(result.drafts["roof.material-takeoff"]).toEqual({ roofShape: "gable", lengthMm: "15000" });
    expect(result.nextApplied).toBeNull();
  });

  it("is a safe no-op pass-through when nothing was transferred yet", () => {
    const result = applyFieldChange(draftsWith({}), "roof.material-takeoff", "roofShape", "hip", null);
    expect(result.drafts["roof.material-takeoff"].roofShape).toBe("hip");
    expect(result.nextApplied).toBeNull();
  });
});

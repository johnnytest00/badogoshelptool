import { describe, expect, it } from "vitest";
import type { DrawingTextSource } from "@/infrastructure/drawings/drawing-text-source";
import { decideQuickTransfer, hasSplitPowerSuffix, numericSourcesAt, quickTransferFields, quickTransferUndoState } from "./drawing-quick-transfer";
import { definitions } from "./roof-calculator-definitions";

const label = (originalText: string, method: DrawingTextSource["method"] = "pdf-text", bounds = { x: .1, y: .1, width: .05, height: .02 }): DrawingTextSource => ({
  sourceDocumentId: "demo", pageNumber: 1, originalText, normalizedText: originalText, tokens: [], method, engine: method === "ocr" ? "tesseract.js@7.0.0" : "pdfjs-dist@6.4.299",
  confidence: null, uncertainty: "unknown", rotationDegrees: 0, position: { x: bounds.x, y: bounds.y }, bounds,
});
const takeoff = definitions["roof.material-takeoff"];
const rafter = definitions["roof.rafter-cut"];
const decide = (fieldKey: string, text: string, extra: Partial<Parameters<typeof decideQuickTransfer>[0]> = {}) =>
  decideQuickTransfer({ definition: takeoff, current: { roofShape: "gable" }, fieldKey, source: label(text), scopeIssue: "", ...extra });

describe("decideQuickTransfer", () => {
  it("converts printed and chosen units exactly; a printed unit wins over the label choice", () => {
    expect(decide("lengthMm", "8,20 m", { labelUnit: "mm" })).toEqual({ kind: "apply", value: "8200", sourceUnit: "m", unitOrigin: "pdf" });
    expect(decide("lengthMm", "17,00", { labelUnit: "m" })).toEqual({ kind: "apply", value: "17000", sourceUnit: "m", unitOrigin: "label" });
    expect(decide("lengthMm", "17,00", { labelUnit: "cm" })).toEqual({ kind: "apply", value: "170", sourceUnit: "cm", unitOrigin: "label" });
    expect(decide("pitchDegrees", "35°")).toMatchObject({ kind: "apply", value: "35" });
    expect(decideQuickTransfer({ definition: rafter, current: {}, fieldKey: "horizontalHalfSpanMm", source: label("4,50 m"), scopeIssue: "" })).toMatchObject({ kind: "apply", value: "4500" });
  });

  it("never guesses: unitless needs a unit, OCR goes to review, wrong dimensions and compound labels are rejected", () => {
    expect(decide("lengthMm", "17,00").kind).toBe("needs-unit");
    expect(decideQuickTransfer({ definition: takeoff, current: {}, fieldKey: "lengthMm", source: label("8,20 m", "ocr"), scopeIssue: "" }).kind).toBe("review");
    expect(decide("pitchDegrees", "4,0%")).toMatchObject({ kind: "reject", reason: expect.stringMatching(/százalékos/u) });
    expect(decide("pitchDegrees", "17,00", { labelUnit: "m" })).toMatchObject({ kind: "reject", reason: expect.stringMatching(/nem illik/u) });
    expect(decide("lengthMm", "35°")).toMatchObject({ kind: "reject", reason: expect.stringMatching(/nem illik/u) });
    for (const text of ["30x50", "12,5 m²", "-3,00", "2 db", "A-A metszet 1:100"]) expect(decide("lengthMm", text, { labelUnit: "m" }).kind).toBe("reject");
    expect(decide("roofShape", "8,20 m").kind).toBe("reject");
    expect(decide("pitchDegrees", "85°")).toMatchObject({ kind: "reject" });
  });

  it("never reuses a unit answer on another label, because whole numbers in cm and mm are written alike (P0-1)", () => {
    // E-01 pattern: dimension chains in m with two decimals, openings in cm and wall sizes in mm as whole numbers.
    // No written form tells cm from mm, and a 10x error here still looks like a plausible roof size, so every
    // unitless label asks for its own unit; a previous answer is never carried over.
    for (const text of ["17,00", "3,9", "90", "1250"]) {
      expect(decide("lengthMm", text)).toMatchObject({ kind: "needs-unit", reason: expect.stringMatching(/csak erre a feliratra/u) });
    }
    expect(decide("lengthMm", "1250", { labelUnit: "mm" })).toMatchObject({ kind: "apply", value: "1250", sourceUnit: "mm", unitOrigin: "label" });
    expect(decide("lengthMm", "1250", { labelUnit: "cm" })).toMatchObject({ kind: "apply", value: "12500", sourceUnit: "cm", unitOrigin: "label" });
    expect(decide("lengthMm", "90 cm", { labelUnit: "m" })).toMatchObject({ kind: "apply", value: "900", unitOrigin: "pdf" });
  });

  it("holds the transfer until the roof-section assignment is settled, after the label itself is checked", () => {
    expect(decide("lengthMm", "8,20 m", { scopeIssue: "Előbb igazold a fedettséget." })).toEqual({ kind: "needs-scope", reason: "Előbb igazold a fedettséget." });
    expect(decide("lengthMm", "4,0%", { scopeIssue: "Előbb igazold a fedettséget." }).kind).toBe("reject");
  });

  it("requires a separate confirmation when an explicit eave label targets roof width or an existing value", () => {
    expect(decide("lengthMm", "10,00 m - fal/tető hossza")).toMatchObject({
      kind: "confirm", value: "10000", semanticMismatch: true,
      reason: expect.stringMatching(/fal.*tetőméret/iu),
    });
    expect(decide("widthMm", "6,00 m - falvetületi szélesség")).toMatchObject({ kind: "confirm", semanticMismatch: true });
    expect(decide("widthMm", "0,50 m ereszkiülés")).toMatchObject({
      kind: "confirm", value: "500", sourceUnit: "m", semanticMismatch: true,
      reason: expect.stringMatching(/ereszkiülés.*Tető szélessége/iu),
    });
    expect(decide("lengthMm", "8,20 m", { current: { roofShape: "gable", lengthMm: "0" } })).toMatchObject({
      kind: "confirm", value: "8200", semanticMismatch: false,
      reason: expect.stringMatching(/meglévő érték/u),
    });
    expect(decide("lengthMm", "8,20 m", { current: { roofShape: "gable", lengthMm: "3000" } })).toMatchObject({
      kind: "confirm", value: "8200", semanticMismatch: false,
    });
  });

  it("offers only visible length and pitch fields of the current roof shape", () => {
    const keys = (shape: string) => quickTransferFields(takeoff, { roofShape: shape }).map(({ key }) => key);
    expect(keys("gable")).toEqual(expect.arrayContaining(["lengthMm", "widthMm", "pitchDegrees", "eaveOverhangMm"]));
    expect(keys("gable")).not.toContain("roofShape");
    expect(keys("pyramid")).toContain("sideMm");
    expect(keys("pyramid")).not.toContain("lengthMm");
  });
});

describe("numericSourcesAt", () => {
  it("returns every numeric label under the tap so overlaps are never resolved silently", () => {
    const sources = [label("17,00"), label("3,85", "pdf-text", { x: .12, y: .105, width: .05, height: .02 }), label("ALAPRAJZ", "pdf-text", { x: .1, y: .1, width: .1, height: .02 })];
    expect(numericSourcesAt(sources, { x: .13, y: .11 }).map(({ originalText }) => originalText)).toEqual(["17,00", "3,85"]);
    expect(numericSourcesAt(sources, { x: .105, y: .11 }).map(({ originalText }) => originalText)).toEqual(["17,00"]);
    expect(numericSourcesAt(sources, { x: .5, y: .5 })).toEqual([]);
  });
});

describe("quickTransferUndoState", () => {
  const record = { fieldKey: "lengthMm", previous: "", applied: "17000", sectionId: "a", documentSha256: "x", source: label("17,00"), unitOrigin: "label" as const, entry: null, previousEntry: null };
  it("only undoes into the same section and drawing while the field still holds the transferred value", () => {
    expect(quickTransferUndoState(record, { activeSectionId: "a", documentSha256: "x", current: { lengthMm: "17000" } })).toBe("undoable");
    expect(quickTransferUndoState(record, { activeSectionId: "b", documentSha256: "x", current: { lengthMm: "17000" } })).toBe("elsewhere");
    expect(quickTransferUndoState(record, { activeSectionId: "a", documentSha256: "y", current: { lengthMm: "17000" } })).toBe("elsewhere");
    expect(quickTransferUndoState(record, { activeSectionId: "a", documentSha256: "x", current: { lengthMm: "9000" } })).toBe("edited");
  });
});

describe("hasSplitPowerSuffix (E-01 browser QA)", () => {
  // Coordinates follow the E-01 room-area pattern: "12,84 m" with a smaller "2" span touching its end. Labels are synthetic.
  const area = label("12,84 m", "pdf-text", { x: .288, y: .4886, width: .0156, height: .0059 });
  const superscript = label("2", "pdf-text", { x: .3036, y: .4887, width: .0016, height: .004 });

  it("recognizes a separately extracted m² superscript and rejects the label as a length", () => {
    expect(hasSplitPowerSuffix(area, [area, superscript])).toBe(true);
    expect(decide("lengthMm", "12,84 m", { source: area, pageSources: [area, superscript] })).toMatchObject({ kind: "reject", reason: expect.stringMatching(/felső index/u) });
    expect(decide("lengthMm", "12,84 m", { source: area, pageSources: [area] })).toMatchObject({ kind: "apply", value: "12840" });
  });

  it("also works for vertical text and ignores normal-size or distant digits", () => {
    const vertical = label("4,50 m", "pdf-text", { x: .5, y: .5, width: .0059, height: .0156 });
    const verticalSuperscript = label("2", "pdf-text", { x: .5005, y: .4944, width: .004, height: .0016 });
    expect(hasSplitPowerSuffix(vertical, [vertical, verticalSuperscript])).toBe(true);
    expect(hasSplitPowerSuffix(area, [label("2", "pdf-text", { x: .3036, y: .4887, width: .004, height: .0059 })])).toBe(false);
    expect(hasSplitPowerSuffix(area, [label("2", "pdf-text", { x: .4, y: .4887, width: .0016, height: .004 })])).toBe(false);
    expect(hasSplitPowerSuffix(label("12,84", "pdf-text", { x: .288, y: .4886, width: .0156, height: .0059 }), [superscript])).toBe(false);
  });
});

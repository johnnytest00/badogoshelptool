import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { processPdfDocument } from "@/infrastructure/drawings/pdf-text-extractor";
import { activeMeasurementLink,
  CALIBRATION_MAX_DEVIATION, calibrationReducer, calibrationStep, canonicalPageSize, distanceInPoints, emptyCalibrationDraft,
  evaluateCalibration, lengthToMm, measureMm, measurementConflict, settledUnit, unitEvidence,
  type CalibrationDraft, type PageSizePoints,
} from "./drawing-calibration";

/**
 * `public/ocr/fixtures/synthetic-scale-drawing.pdf` — synthetic DEMO, A4 portrait 595x842 pt, four horizontal rules
 * of exact PDF-point length at exactly 50 mm of real length per point:
 *   A 100..300 pt @ y 700 = 10 000 mm   B 100..220 pt @ y 600 = 6 000 mm
 *   C 100..180 pt @ y 500 =  4 000 mm   D 100..125 pt @ y 400 = 1 250 mm
 * Marks are expressed the way the panel stores a tap: page-normalized, top-down, in the page's own frame.
 */
const size: PageSizePoints = { widthPoints: 595, heightPoints: 842 };
const mark = (xPoints: number, yPoints: number) => ({ x: xPoints / size.widthPoints, y: (size.heightPoints - yPoints) / size.heightPoints });
const ruleA = [mark(100, 700), mark(300, 700)] as const;
const ruleB = [mark(100, 600), mark(220, 600)] as const;
const ruleC = [mark(100, 500), mark(180, 500)] as const;
const ruleD = [mark(100, 400), mark(125, 400)] as const;
const TRUE_MM_PER_POINT = 50;

const draft = (over: Partial<CalibrationDraft> = {}): CalibrationDraft => ({ ...emptyCalibrationDraft, marking: true, ...over });
const complete = (points: readonly { x: number; y: number }[], primaryLengthMm: number, checkLengthMm: number) =>
  draft({ points, primaryLengthMm, checkLengthMm });

describe("calibration scale from two independent references", () => {
  it("agrees with the drawing's true scale within 1% and measures a third, unmarked rule", () => {
    const result = evaluateCalibration(complete([...ruleA, ...ruleB], 10_000, 6_000), size);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Math.abs(result.mmPerPoint - TRUE_MM_PER_POINT) / TRUE_MM_PER_POINT).toBeLessThan(0.01);
    expect(result.deviationRatio).toBeLessThan(0.001);

    const calibration = { documentSha256: "demo", pageNumber: 1, mmPerPoint: result.mmPerPoint, deviationRatio: result.deviationRatio, primary: { from: ruleA[0], to: ruleA[1], lengthMm: 10_000 }, check: { from: ruleB[0], to: ruleB[1], lengthMm: 6_000 } };
    const measured = measureMm(calibration, ruleC[0], ruleC[1], size);
    expect(Math.abs(measured - 4_000) / 4_000).toBeLessThan(0.01);
  });

  /** Marks pushed apart on one reference and pulled together on the other: the worst pairing for the check. */
  const slipped = (points: number) => {
    const d = points / size.widthPoints;
    return complete([
      { x: ruleA[0].x - d, y: ruleA[0].y }, { x: ruleA[1].x + d, y: ruleA[1].y },
      { x: ruleB[0].x + d, y: ruleB[0].y }, { x: ruleB[1].x - d, y: ruleB[1].y },
    ], 10_000, 6_000);
  };

  it("stays within 1% when every mark slips by a pixel at 400% zoom, where the 1% target applies", () => {
    // 1180 CSS px of rendered page width for a 595 pt page: one pixel is about half a PDF point.
    const result = evaluateCalibration(slipped(0.5), size);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Math.abs(result.mmPerPoint - TRUE_MM_PER_POINT) / TRUE_MM_PER_POINT).toBeLessThan(0.01);
  });

  it("refuses rather than reports false precision when the same slip happens at 100% on a phone", () => {
    // At 100% the page is ~295 px wide, so one pixel is ~2 pt: the two references then disagree by more than the
    // 2% gate, and the calibration is rejected instead of silently carrying a ~2% error into every measurement.
    expect(evaluateCalibration(slipped(2), size)).toEqual({ ok: false, issue: "scale-mismatch" });
  });

  it("refuses a scale the two references do not agree on, a too-short mark and a repeated reference", () => {
    // Second reference stated as 7 m although it measures 6 m: a second scale on the page, or a wrong number.
    expect(evaluateCalibration(complete([...ruleA, ...ruleB], 10_000, 7_000), size)).toEqual({ ok: false, issue: "scale-mismatch" });
    // Rule D is 25 pt: far under the 100 pt a hand-marked reference needs to carry the 1% target.
    expect(evaluateCalibration(complete([...ruleA, ...ruleD], 10_000, 1_250), size)).toEqual({ ok: false, issue: "too-short" });
    // The same rule marked twice proves nothing, in either direction.
    expect(evaluateCalibration(complete([...ruleA, ...ruleA], 10_000, 10_000), size)).toEqual({ ok: false, issue: "same-reference" });
    expect(evaluateCalibration(complete([...ruleA, ruleA[1], ruleA[0]], 10_000, 10_000), size)).toEqual({ ok: false, issue: "same-reference" });
    // A missing or non-positive length never yields a scale.
    expect(evaluateCalibration(complete([...ruleA, ...ruleB], 10_000, 0), size)).toEqual({ ok: false, issue: "invalid-length" });
    expect(evaluateCalibration(draft({ points: [...ruleA], primaryLengthMm: 10_000 }), size)).toEqual({ ok: false, issue: "invalid-length" });
  });

  it("is unaffected by zoom and by the rendered pixel size, because marks are page-normalized", () => {
    const a = evaluateCalibration(complete([...ruleA, ...ruleB], 10_000, 6_000), size);
    const b = evaluateCalibration(complete([...ruleA, ...ruleB], 10_000, 6_000), size);
    expect(a).toEqual(b);
    // Distances are in PDF points, so the same marks give the same length whatever the page is rendered at.
    expect(distanceInPoints(ruleA[0], ruleA[1], size)).toBeCloseTo(200, 6);
    expect(distanceInPoints(ruleC[0], ruleC[1], size)).toBeCloseTo(80, 6);
  });

  it("measures the same physical length after a quarter turn", () => {
    const result = evaluateCalibration(complete([...ruleA, ...ruleB], 10_000, 6_000), size);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const calibration = { documentSha256: "demo", pageNumber: 1, mmPerPoint: result.mmPerPoint, deviationRatio: result.deviationRatio, primary: { from: ruleA[0], to: ruleA[1], lengthMm: 10_000 }, check: { from: ruleB[0], to: ruleB[1], lengthMm: 6_000 } };
    // Marks are stored unrotated, so the rotated page only swaps the two sides of the page size.
    const rotated = canonicalPageSize({ widthPoints: size.heightPoints, heightPoints: size.widthPoints }, 90);
    expect(rotated).toEqual(size);
    expect(measureMm(calibration, ruleC[0], ruleC[1], rotated)).toBeCloseTo(measureMm(calibration, ruleC[0], ruleC[1], size), 9);
    expect(canonicalPageSize(size, 180)).toEqual(size);
  });

  it("keeps a diagonal honest by using the page aspect, not the normalized square", () => {
    // 300 pt across and 400 pt down is a 500 pt diagonal; treating normalized units as a square would not give that.
    expect(distanceInPoints(mark(100, 700), mark(400, 300), size)).toBeCloseTo(500, 6);
  });
});

describe("dual evidence against a label's value", () => {
  it("separates 1250 mm from 12 500 mm once an independent measurement exists", () => {
    const result = evaluateCalibration(complete([...ruleA, ...ruleB], 10_000, 6_000), size);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const calibration = { documentSha256: "demo", pageNumber: 1, mmPerPoint: result.mmPerPoint, deviationRatio: result.deviationRatio, primary: { from: ruleA[0], to: ruleA[1], lengthMm: 10_000 }, check: { from: ruleB[0], to: ruleB[1], lengthMm: 6_000 } };
    // Rule D is the dimension the label "1250" belongs to; the user makes that link, nothing infers it.
    const measured = measureMm(calibration, ruleD[0], ruleD[1], size);
    expect(measured).toBeCloseTo(1_250, 0);

    const evidence = unitEvidence(1250, measured);
    expect(evidence.filter((item) => item.consistent).map((item) => item.unit)).toEqual(["mm"]);
    expect(settledUnit(evidence)).toBe("mm");
    // The 10x reading is off by an order of magnitude, far outside any hand-marking slip.
    expect(evidence.find((item) => item.unit === "cm")!.deviationRatio).toBeGreaterThan(8);
  });

  it("leaves the value unchecked when the evidence settles nothing", () => {
    expect(settledUnit(unitEvidence(1250, 0))).toBeNull();
    expect(settledUnit(unitEvidence(0, 1250))).toBeNull();
    // A label that fits no unit is not evidence for any of them.
    expect(settledUnit(unitEvidence(1250, 7_000))).toBeNull();
    // 1 mm measured against the label "1": mm fits, and cm/m are far away, so this one does settle.
    expect(settledUnit(unitEvidence(1, 1))).toBe("mm");
  });

  it("converts typed lengths and rejects what is not a positive number", () => {
    expect(lengthToMm("4,55", "m")).toBe(4_550);
    expect(lengthToMm("120", "cm")).toBe(1_200);
    for (const value of ["", "0", "-3", "abc"]) expect(lengthToMm(value, "m"), value).toBeNull();
  });

  it("flags a chosen unit that the measurement itself contradicts, but only that unit", () => {
    // Label "1250" read as mm fits a 1250 mm measurement; reading it as cm (12 500 mm) is a 10x conflict.
    const evidence = unitEvidence(1250, 1_250);
    expect(measurementConflict(evidence, "mm")).toBe(false);
    expect(measurementConflict(evidence, "cm")).toBe(true);
    // No measurement means no evidence at all, so nothing can conflict yet.
    expect(measurementConflict([], "mm")).toBe(false);
    // A non-length unit (°, %, db) never appears in the evidence, so it can never conflict.
    expect(measurementConflict(evidence, "°")).toBe(false);
  });
});

describe("calibration lifecycle", () => {
  const sizeAction = { size, documentSha256: "demo", pageNumber: 1 } as const;

  it("walks the steps, accepts on an agreeing check and keeps nothing after a reset", () => {
    let state = calibrationReducer(emptyCalibrationDraft, { type: "start" });
    expect(calibrationStep(state)).toBe("primary-points");
    state = calibrationReducer(state, { type: "add-point", point: ruleA[0] });
    state = calibrationReducer(state, { type: "add-point", point: ruleA[1] });
    expect(calibrationStep(state)).toBe("primary-length");
    state = calibrationReducer(state, { type: "set-primary-length", lengthMm: 10_000 });
    expect(calibrationStep(state)).toBe("check-points");
    state = calibrationReducer(state, { type: "add-point", point: ruleB[0] });
    state = calibrationReducer(state, { type: "add-point", point: ruleB[1] });
    expect(calibrationStep(state)).toBe("check-length");
    // A fifth point is ignored rather than overwriting a reference.
    expect(calibrationReducer(state, { type: "add-point", point: ruleC[0] }).points).toHaveLength(4);

    state = calibrationReducer(state, { type: "set-check-length", lengthMm: 6_000, ...sizeAction });
    expect(calibrationStep(state)).toBe("accepted");
    expect(state.marking).toBe(false);
    expect(state.accepted?.deviationRatio).toBeLessThan(CALIBRATION_MAX_DEVIATION);
    expect(state.accepted?.pageNumber).toBe(1);

    expect(calibrationReducer(state, { type: "reset" })).toEqual(emptyCalibrationDraft);

    // Restoring a saved session re-arms the accepted scale directly, without replaying the marking steps.
    const restored = calibrationReducer(emptyCalibrationDraft, { type: "restore", accepted: state.accepted });
    expect(restored).toEqual({ ...emptyCalibrationDraft, accepted: state.accepted });
    expect(calibrationReducer(restored, { type: "restore", accepted: null })).toEqual(emptyCalibrationDraft);
  });

  it("reports a disagreeing check instead of accepting it, and lets the user step back", () => {
    let state = calibrationReducer(emptyCalibrationDraft, { type: "start" });
    for (const point of [...ruleA]) state = calibrationReducer(state, { type: "add-point", point });
    state = calibrationReducer(state, { type: "set-primary-length", lengthMm: 10_000 });
    for (const point of [...ruleB]) state = calibrationReducer(state, { type: "add-point", point });
    state = calibrationReducer(state, { type: "set-check-length", lengthMm: 7_000, ...sizeAction });
    expect(state.accepted).toBeNull();
    expect(state.issue).toBe("scale-mismatch");
    expect(calibrationStep(state)).toBe("check-length");

    // Stepping a point back clears the length that belonged to it, so a stale number cannot be reused.
    state = calibrationReducer(state, { type: "undo-point" });
    expect(state.points).toHaveLength(3);
    expect(state.checkLengthMm).toBeNull();
    expect(calibrationStep(state)).toBe("check-points");
  });

  it("takes no points while it is off or already accepted", () => {
    expect(calibrationReducer(emptyCalibrationDraft, { type: "add-point", point: ruleA[0] }).points).toHaveLength(0);
    const accepted = { ...emptyCalibrationDraft, marking: true, accepted: { documentSha256: "d", pageNumber: 1, mmPerPoint: 50, deviationRatio: 0, primary: { from: ruleA[0], to: ruleA[1], lengthMm: 10_000 }, check: { from: ruleB[0], to: ruleB[1], lengthMm: 6_000 } } };
    expect(calibrationReducer(accepted, { type: "add-point", point: ruleC[0] }).points).toHaveLength(0);
  });
});

describe("the fixture the measurements are taken from", () => {
  it("parses as one A4 page whose labels name the real lengths", async () => {
    const bytes = new Uint8Array(await readFile(resolve(process.cwd(), "public/ocr/fixtures/synthetic-scale-drawing.pdf")));
    const document = await processPdfDocument(bytes);
    expect(document.pageCount).toBe(1);
    const [page] = document.pages;
    expect([page!.widthPoints, page!.heightPoints]).toEqual([size.widthPoints, size.heightPoints]);
    const labels = page!.textSpans.map(({ originalText }) => originalText.trim());
    for (const label of ["10,00 m", "6,00 m", "4,00 m", "1250"]) expect(labels, label).toContain(label);
  });
});

describe("activeMeasurementLink (P1.4.1 pairing, extracted in T8)", () => {
  const label = { id: "a" };
  const other = { id: "b" };
  const measure = [{ x: .1, y: .1 }, { x: .2, y: .2 }];
  const link = { source: label, documentSha256: "sha-1", pageNumber: 2, measure, measuredMm: 4000 };
  const now = { source: label as typeof label | null, documentSha256: "sha-1", pageNumber: 2, measure };

  it("holds only while the label, document, page and the measurement's own points are all unchanged", () => {
    expect(activeMeasurementLink(link, now)).toBe(link);
    expect(activeMeasurementLink(link, { ...now, source: other })).toBeNull();
    expect(activeMeasurementLink(link, { ...now, documentSha256: "sha-2" })).toBeNull();
    expect(activeMeasurementLink(link, { ...now, pageNumber: 3 })).toBeNull();
  });

  it("drops the pairing when the measurement is re-tapped to the very same coordinates", () => {
    // A new array with equal values is a new measurement: the user measured again, so the pairing must be re-made.
    expect(activeMeasurementLink(link, { ...now, measure: [{ x: .1, y: .1 }, { x: .2, y: .2 }] })).toBeNull();
    expect(activeMeasurementLink(link, { ...now, measure: [] })).toBeNull();
  });

  it("claims nothing without a pairing or without a selected label", () => {
    expect(activeMeasurementLink(null, now)).toBeNull();
    expect(activeMeasurementLink(link, { ...now, source: null })).toBeNull();
  });
});

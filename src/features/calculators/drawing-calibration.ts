import type { LengthUnit } from "@/domain/measurements/length-input";
import type { PagePoint } from "./drawing-roof-section";

/**
 * P1.1 calibration (experimental): the user marks a known distance on one PDF page, then a second, independent known
 * distance; only when both yield the same scale does the page become measurable. Nothing here reads the drawing — it
 * only turns two human-made statements into a scale, and refuses when they disagree.
 *
 * Points are page-normalized in the page's own (unrotated) frame, the same convention as the roof-section overlay, so
 * zoom cannot change a result: zoom scales the rendered pixels, never the normalized coordinates. The page's size in
 * PDF points gives the aspect ratio, without which a diagonal in normalized units would be meaningless.
 */
export const lengthUnitToMm: Readonly<Record<LengthUnit, number>> = { mm: 1, cm: 10, m: 1000 };

/** The two references may disagree by this much and still count as one scale; beyond it the calibration is refused. */
export const CALIBRATION_MAX_DEVIATION = 0.02;
/**
 * A reference shorter than this cannot carry the 1% target: at 400% zoom one mis-tapped pixel is about half a PDF
 * point, and a slip at both ends of a 100 pt reference already costs 1%. Shorter marks are refused rather than
 * reported with false precision.
 */
export const CALIBRATION_MIN_SEGMENT_POINTS = 100;
/** Two references count as the same measurement when their endpoints sit this close, relative to the primary length. */
export const CALIBRATION_SAME_SEGMENT_RATIO = 0.1;
/** How far a measured distance may sit from a label's value and still count as consistent with it (hand-marked ends). */
export const CALIBRATION_VALUE_TOLERANCE = 0.05;

export type PageSizePoints = Readonly<{ widthPoints: number; heightPoints: number }>;

/**
 * The page's size in its own unrotated frame. `processPdfDocument` reports the rotated viewport, while marks are
 * stored unrotated (`pagePointFromViewport`), so a quarter turn swaps the two sides and nothing else: a calibration
 * taken before a rotation keeps measuring the same physical length after it.
 */
export function canonicalPageSize(page: PageSizePoints, rotation: 0 | 90 | 180 | 270): PageSizePoints {
  return rotation === 90 || rotation === 270 ? { widthPoints: page.heightPoints, heightPoints: page.widthPoints } : page;
}
export type CalibrationReference = Readonly<{ from: PagePoint; to: PagePoint; lengthMm: number }>;

export type AcceptedCalibration = Readonly<{
  /**
   * The drawing's SHA-256, not its parse id: rotating the preview re-parses the document and mints a new source id,
   * which would silently drop a calibration that is still perfectly valid for the same drawing.
   */
  documentSha256: string;
  pageNumber: number;
  /** Millimetres of real length per PDF point on this page. */
  mmPerPoint: number;
  /** How far the check reference's scale sat from the primary one's, as a ratio. */
  deviationRatio: number;
  primary: CalibrationReference;
  check: CalibrationReference;
}>;

export type CalibrationIssue =
  | "too-short"
  | "same-reference"
  | "invalid-length"
  | "scale-mismatch";

export const calibrationIssueMessages: Readonly<Record<CalibrationIssue, string>> = {
  "too-short": "A megjelölt szakasz túl rövid a pontos léptékhez. Nagyíts rá, és jelölj hosszabb ismert méretet.",
  "same-reference": "A két referencia ugyanazt a méretet jelöli. A második ellenőrzéshez egy másik, független méret kell.",
  "invalid-length": "Az ismert hossz csak 0-nál nagyobb szám lehet.",
  "scale-mismatch": "A két méret nem ugyanazt a léptéket adja. A lapon több lépték lehet, torzult lehet, vagy az egyik pont pontatlan — a kalibráció így nem használható.",
};

export type CalibrationDraft = Readonly<{
  /** Whether the user is currently marking; the accepted calibration survives leaving the mode. */
  marking: boolean;
  /** Primary from, primary to, check from, check to — in that order. */
  points: readonly PagePoint[];
  primaryLengthMm: number | null;
  checkLengthMm: number | null;
  accepted: AcceptedCalibration | null;
  issue: CalibrationIssue | null;
  /** Whether taps on the page currently place measurement points; off by default so the page stays tappable. */
  measuring: boolean;
  /** Two points of an ad-hoc measurement on an already calibrated page; this is what the calibration is for. */
  measure: readonly PagePoint[];
}>;

export const emptyCalibrationDraft: CalibrationDraft = { marking: false, points: [], primaryLengthMm: null, checkLengthMm: null, accepted: null, issue: null, measuring: false, measure: [] };

export type CalibrationStep = "off" | "primary-points" | "primary-length" | "check-points" | "check-length" | "accepted";

/** What the UI should ask for next; derived from the draft, so no step is stored twice. */
export function calibrationStep(draft: CalibrationDraft): CalibrationStep {
  if (draft.accepted) return "accepted";
  if (!draft.marking) return "off";
  if (draft.points.length < 2) return "primary-points";
  if (draft.primaryLengthMm === null) return "primary-length";
  if (draft.points.length < 4) return "check-points";
  return "check-length";
}

export const calibrationStepHints: Readonly<Record<CalibrationStep, string>> = {
  off: "",
  "primary-points": "Koppints egy ismert méret két végpontjára a rajzon.",
  "primary-length": "Mekkora ez a méret a valóságban?",
  "check-points": "Jelölj egy másik, független ismert méretet két ponttal.",
  "check-length": "Mekkora az ellenőrző méret a valóságban?",
  accepted: "",
};

/** Distance between two page-normalized points, in PDF points. Independent of zoom and of the rendered pixel size. */
export function distanceInPoints(from: PagePoint, to: PagePoint, size: PageSizePoints) {
  return Math.hypot((to.x - from.x) * size.widthPoints, (to.y - from.y) * size.heightPoints);
}

/** Millimetres from a length the user typed; `null` for anything that is not a usable positive number. */
export function lengthToMm(value: string, unit: LengthUnit): number | null {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed * lengthUnitToMm[unit] : null;
}

/**
 * Two references are the same measurement when each endpoint of one sits on an endpoint of the other (in either
 * direction), relative to the primary's own length. Re-marking the same dimension line proves nothing about the scale.
 */
function sameReference(primary: readonly PagePoint[], check: readonly PagePoint[], size: PageSizePoints) {
  const span = distanceInPoints(primary[0]!, primary[1]!, size);
  if (span <= 0) return true;
  const near = (a: PagePoint, b: PagePoint) => distanceInPoints(a, b, size) <= span * CALIBRATION_SAME_SEGMENT_RATIO;
  return (near(primary[0]!, check[0]!) && near(primary[1]!, check[1]!))
    || (near(primary[0]!, check[1]!) && near(primary[1]!, check[0]!));
}

export type CalibrationResult =
  | Readonly<{ ok: true; mmPerPoint: number; deviationRatio: number }>
  | Readonly<{ ok: false; issue: CalibrationIssue }>;

/** Turns a complete draft into a scale, or says why it cannot. Never guesses a scale from one reference alone. */
export function evaluateCalibration(draft: CalibrationDraft, size: PageSizePoints): CalibrationResult {
  const { points, primaryLengthMm, checkLengthMm } = draft;
  if (points.length < 4 || primaryLengthMm === null || checkLengthMm === null) return { ok: false, issue: "invalid-length" };
  if (!(primaryLengthMm > 0) || !(checkLengthMm > 0)) return { ok: false, issue: "invalid-length" };
  const primarySpan = distanceInPoints(points[0]!, points[1]!, size);
  const checkSpan = distanceInPoints(points[2]!, points[3]!, size);
  if (primarySpan < CALIBRATION_MIN_SEGMENT_POINTS || checkSpan < CALIBRATION_MIN_SEGMENT_POINTS) return { ok: false, issue: "too-short" };
  if (sameReference(points.slice(0, 2), points.slice(2, 4), size)) return { ok: false, issue: "same-reference" };

  const primaryScale = primaryLengthMm / primarySpan;
  const checkScale = checkLengthMm / checkSpan;
  const deviationRatio = Math.abs(checkScale - primaryScale) / primaryScale;
  if (!Number.isFinite(deviationRatio) || deviationRatio > CALIBRATION_MAX_DEVIATION) return { ok: false, issue: "scale-mismatch" };
  // The accepted scale is the mean of two independently stated references, not whichever was marked first.
  return { ok: true, mmPerPoint: (primaryScale + checkScale) / 2, deviationRatio };
}

/** Real length of a marked segment on a calibrated page, in millimetres. */
export function measureMm(calibration: AcceptedCalibration, from: PagePoint, to: PagePoint, size: PageSizePoints) {
  return distanceInPoints(from, to, size) * calibration.mmPerPoint;
}

export type UnitEvidence = Readonly<{
  unit: LengthUnit;
  /** What the label would mean in this unit, in mm. */
  valueMm: number;
  /** How far that sits from the measured length, as a ratio. */
  deviationRatio: number;
  consistent: boolean;
}>;

/**
 * Dual evidence: the number written on a label, read in each unit, against a distance the user measured on the
 * calibrated page for the same dimension. Only the user may say which label belongs to which measurement — nothing
 * here infers that from position. A single consistent unit is evidence; none or several leaves the value unchecked.
 */
export function unitEvidence(labelValue: number, measuredMm: number, units: readonly LengthUnit[] = ["mm", "cm", "m"]): readonly UnitEvidence[] {
  if (!(labelValue > 0) || !(measuredMm > 0)) return [];
  return units.map((unit) => {
    const valueMm = labelValue * lengthUnitToMm[unit];
    const deviationRatio = Math.abs(valueMm - measuredMm) / measuredMm;
    return { unit, valueMm, deviationRatio, consistent: deviationRatio <= CALIBRATION_VALUE_TOLERANCE };
  });
}

/** The single unit the measurement supports, or null when the evidence does not settle it. */
export function settledUnit(evidence: readonly UnitEvidence[]): LengthUnit | null {
  const consistent = evidence.filter((item) => item.consistent);
  return consistent.length === 1 ? consistent[0]!.unit : null;
}

/**
 * P1.4: whether a transfer's chosen unit is actively contradicted by the user's own measurement — not merely
 * unsettled (no measurement, or several units fit equally well), but the one unit about to be used is itself
 * outside tolerance. A non-length unit (°, %, db) is never in `evidence`, so it never conflicts here.
 */
export function measurementConflict(evidence: readonly UnitEvidence[], unit: string): boolean {
  return evidence.some((item) => item.unit === unit && !item.consistent);
}

export type CalibrationAction =
  | Readonly<{ type: "start" }>
  | Readonly<{ type: "cancel" }>
  | Readonly<{ type: "add-point"; point: PagePoint }>
  | Readonly<{ type: "undo-point" }>
  | Readonly<{ type: "set-primary-length"; lengthMm: number | null }>
  | Readonly<{ type: "set-check-length"; lengthMm: number | null; size: PageSizePoints; documentSha256: string; pageNumber: number }>
  | Readonly<{ type: "start-measure" }>
  | Readonly<{ type: "measure-point"; point: PagePoint }>
  | Readonly<{ type: "clear-measure" }>
  | Readonly<{ type: "reset" }>
  | Readonly<{ type: "restore"; accepted: AcceptedCalibration | null }>;

/**
 * One state slot for the whole calibration lifecycle, so the drawing panel does not grow another handful of
 * useStates. Every action that can invalidate the scale clears it; `reset` is what a new file, page or rotation uses.
 */
export function calibrationReducer(state: CalibrationDraft, action: CalibrationAction): CalibrationDraft {
  switch (action.type) {
    case "start":
      return { ...emptyCalibrationDraft, marking: true };
    case "cancel":
      return { ...state, marking: false, issue: null };
    case "add-point":
      return state.marking && state.points.length < 4 && !state.accepted
        ? { ...state, points: [...state.points, action.point], issue: null }
        : state;
    case "undo-point": {
      if (state.points.length === 0 || state.accepted) return state;
      const points = state.points.slice(0, -1);
      // A length belongs to the reference it was typed for; stepping a point back drops it so it cannot be reused.
      return { ...state, points, issue: null, checkLengthMm: points.length < 4 ? null : state.checkLengthMm, primaryLengthMm: points.length < 2 ? null : state.primaryLengthMm };
    }
    case "set-primary-length":
      return { ...state, primaryLengthMm: action.lengthMm, issue: action.lengthMm === null ? "invalid-length" : null };
    case "set-check-length": {
      if (action.lengthMm === null) return { ...state, checkLengthMm: null, issue: "invalid-length" };
      const next = { ...state, checkLengthMm: action.lengthMm };
      const result = evaluateCalibration(next, action.size);
      if (!result.ok) return { ...next, accepted: null, issue: result.issue };
      return {
        ...next,
        issue: null,
        marking: false,
        accepted: {
          documentSha256: action.documentSha256,
          pageNumber: action.pageNumber,
          mmPerPoint: result.mmPerPoint,
          deviationRatio: result.deviationRatio,
          primary: { from: next.points[0]!, to: next.points[1]!, lengthMm: next.primaryLengthMm! },
          check: { from: next.points[2]!, to: next.points[3]!, lengthMm: action.lengthMm },
        },
      };
    }
    case "start-measure":
      return state.accepted ? { ...state, measuring: true, measure: [] } : state;
    case "measure-point": {
      // Measuring needs a scale; the second point ends it, so the page goes back to normal tapping on its own.
      if (!state.accepted || !state.measuring) return state;
      const measure = [...state.measure, action.point];
      return { ...state, measure, measuring: measure.length < 2 };
    }
    case "clear-measure":
      return { ...state, measuring: false, measure: [] };
    case "reset":
      return emptyCalibrationDraft;
    // From a restored work session: trusted, already-validated evidence, not a fresh draft to re-mark.
    case "restore":
      return action.accepted ? { ...emptyCalibrationDraft, accepted: action.accepted } : emptyCalibrationDraft;
  }
}

/**
 * P1.4.1: a label is backed by a measurement only while the user's explicit pairing still holds. Being on the same
 * page at the same time is not evidence — so the pairing survives only if the label object, the document, the page
 * and the measurement's own two points are all still the ones it was made with. Re-selecting a label, re-measuring
 * (even an identical re-tap), changing page, document or section each breaks one of these and drops the pairing.
 *
 * Extracted from `PlanFieldTransfer` unchanged (T8), so the rule can be read and tested on its own.
 */
export type MeasurementLink<Source> = Readonly<{
  source: Source;
  documentSha256: string;
  pageNumber: number;
  measure: readonly PagePoint[];
  measuredMm: number;
}>;

export function activeMeasurementLink<Source>(
  link: MeasurementLink<Source> | null,
  now: Readonly<{ source: Source | null; documentSha256: string; pageNumber: number; measure: readonly PagePoint[] }>,
): MeasurementLink<Source> | null {
  return now.source !== null && link !== null && link.source === now.source
    && link.documentSha256 === now.documentSha256 && link.pageNumber === now.pageNumber && link.measure === now.measure
    ? link : null;
}

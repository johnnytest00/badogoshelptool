import type { LengthUnit } from "@/domain/measurements/length-input";
import type { DrawingTextSource } from "@/infrastructure/drawings/drawing-text-source";
import type { CalculatorDefinition } from "./construction-calculator-types";
import { isFieldVisible } from "./construction-computation";
import { approveDrawingFields, isPercentSlopeForPitch } from "./drawing-field-transfer";
import { isUnitlessDrawingMeasurement, suggestDrawingValue } from "./drawing-value-suggestion";

/**
 * P1.1 tap-to-fill: with a target field already chosen, one tap on a drawing label is the approval, but only
 * for an unambiguous PDF.js text label whose unit and dimension fit the field. Everything else is routed to
 * the detailed, separately approved transfer or rejected; nothing is inferred from the drawing's position or scale.
 */
export type QuickTransferDecision =
  | Readonly<{ kind: "apply"; value: string; sourceUnit: string; unitOrigin: "pdf" | "label" }>
  | Readonly<{ kind: "confirm"; value: string; sourceUnit: string; unitOrigin: "pdf" | "label"; reason: string; semanticMismatch: boolean }>
  | Readonly<{ kind: "review"; reason: string }>
  | Readonly<{ kind: "needs-unit"; reason: string }>
  | Readonly<{ kind: "needs-scope"; reason: string }>
  | Readonly<{ kind: "reject"; reason: string }>;

export type QuickTransferRequest = Readonly<{
  definition: CalculatorDefinition;
  current: Record<string, string>;
  fieldKey: string;
  source: DrawingTextSource;
  /**
   * The unit the user chose for THIS label. A unit choice never carries over to another label (P0-1): a plan may
   * give building dimensions in m ("17,00"), openings in cm ("90") and wall dimensions in mm ("1250"), and whole
   * numbers in cm and mm are written identically — so any reuse across labels risks a silent 10x error whose
   * result still looks like a plausible roof size. Never wins over a unit printed on the label.
   */
  labelUnit?: LengthUnit;
  /** Why the roof-section assignment is not settled yet ("" when it is). */
  scopeIssue: string;
  /** The other labels of the page, to see a superscript that PDF.js returns as a separate span. */
  pageSources?: readonly DrawingTextSource[];
}>;

/**
 * True when a label ending in a length unit has a separate, smaller "2"/"3" glyph touching its end: the PDF text
 * layer often splits "12,84 m²" into "12,84 m" + "2" (seen on E-01, all 14 room areas). Rotation-agnostic: the
 * superscript is smaller than the label's text thickness and touches its bounds.
 */
export function hasSplitPowerSuffix(source: DrawingTextSource, pageSources: readonly DrawingTextSource[]) {
  const box = source.bounds;
  if (!box || !/\d\s*(?:mm|cm|m)\s*$/u.test(source.originalText)) return false;
  const thickness = Math.min(box.width, box.height);
  return pageSources.some((other) => {
    const near = other.bounds;
    if (other === source || !near || other.pageNumber !== source.pageNumber || !/^\s*[23²³]\s*$/u.test(other.originalText)) return false;
    return Math.max(near.width, near.height) <= thickness * 0.85
      && near.x <= box.x + box.width + thickness && near.x + near.width >= box.x - thickness
      && near.y <= box.y + box.height + thickness && near.y + near.height >= box.y - thickness;
  });
}

/** Fields a drawing dimension may fill: plain lengths in mm and the pitch in degrees. */
export function quickTransferFields(definition: CalculatorDefinition, values: Record<string, string>) {
  return definition.fields.filter((field) => !field.kind && (field.unit === "mm" || field.unit === "°") && isFieldVisible(field, values));
}

function semanticTargetIssue(sourceText: string, fieldKey: string, fieldLabel: string) {
  const text = sourceText.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("hu");
  if (/\bfal(?:\b|vetulet|meret|kontur)/u.test(text)) {
    return "A falméret nem automatikusan tetőméret. Ellenőrizd, hogy a felirat a kijelölt, fedett tetőrész mérete is.";
  }
  if (/\bereszkiules\b/u.test(text) && !["eaveOverhangMm", "eaveProjectionMm"].includes(fieldKey)) {
    return `A felirat explicit „ereszkiülés” jelentése nem egyezik a(z) ${fieldLabel} célmezővel.`;
  }
  if (/\bhomlokzati\s+kiules\b/u.test(text) && !["frontGableOverhangMm", "rearGableOverhangMm"].includes(fieldKey)) {
    return `A felirat explicit „homlokzati kiülés” jelentése nem egyezik a(z) ${fieldLabel} célmezővel.`;
  }
  return "";
}

export function decideQuickTransfer({ definition, current, fieldKey, source, labelUnit, scopeIssue, pageSources = [] }: QuickTransferRequest): QuickTransferDecision {
  const field = quickTransferFields(definition, current).find((item) => item.key === fieldKey);
  if (!field) return { kind: "reject", reason: "Ez a mező nem tölthető ki rajzi méretből." };
  if (source.method !== "pdf-text") return { kind: "review", reason: "OCR-felirat: a számot a részletes átvitelben ellenőrizd és hagyd jóvá." };
  if (isPercentSlopeForPitch(source, fieldKey)) return { kind: "reject", reason: "A százalékos lejtés nem fokérték, ezért nem lehet tetőhajlás." };
  if (hasSplitPowerSuffix(source, pageSources)) return { kind: "reject", reason: `A „${source.originalText}” felirat mögött felső index (²/³) áll: ez terület vagy térfogat, nem hosszméret.` };

  const printed = suggestDrawingValue(source.originalText, source.method, field.unit);
  const unitless = !printed && isUnitlessDrawingMeasurement(source.originalText, source.method);
  if (!printed && !unitless) {
    const otherDimension = ["mm", "°", "db"].some((unit) => suggestDrawingValue(source.originalText, source.method, unit));
    return { kind: "reject", reason: otherDimension
      ? `A „${source.originalText}” felirat mértékegysége nem illik a(z) ${field.label} (${field.unit}) mezőhöz.`
      : `A „${source.originalText}” felirat nem egyetlen, egyértelmű méret (például összetett, területi vagy százalékos felirat).` };
  }
  // Only lengths have a unit to ask for; a unitless number is never taken as degrees.
  if (unitless && field.unit !== "mm") return { kind: "reject", reason: `A „${source.originalText}” felirat egység nélküli, ezért nem illik a(z) ${field.label} (${field.unit}) mezőhöz: oda csak ${field.unit}-kal jelölt érték vihető át.` };
  if (unitless && !labelUnit) {
    return { kind: "needs-unit", reason: `„${source.originalText}”: a rajzon nincs egység. Mi az egysége? A válasz csak erre a feliratra érvényes.` };
  }
  const suggestion = printed ?? suggestDrawingValue(source.originalText, source.method, field.unit, labelUnit);
  if (!suggestion) return { kind: "reject", reason: `A „${source.originalText}” felirat mértékegysége nem illik a(z) ${field.label} (${field.unit}) mezőhöz.` };
  if (scopeIssue) return { kind: "needs-scope", reason: scopeIssue };

  const existingValue = current[fieldKey]?.trim() ?? "";
  const approval = approveDrawingFields(definition, current, [{ fieldKey, value: suggestion.value }], new Set(existingValue ? [fieldKey] : []));
  if (!approval.ok) return { kind: "reject", reason: approval.issues.join(" ") };
  const semanticIssue = semanticTargetIssue(source.originalText, fieldKey, field.label);
  const result = { value: approval.fields[fieldKey]!, sourceUnit: suggestion.sourceUnit, unitOrigin: printed ? "pdf" as const : "label" as const };
  if (semanticIssue || existingValue) return {
    kind: "confirm", ...result, semanticMismatch: Boolean(semanticIssue),
    reason: semanticIssue || `${field.label}: a meglévő érték felülírása külön jóváhagyást igényel.`,
  };
  return { kind: "apply", ...result };
}

/**
 * Numeric labels whose sense zone contains the tap point (page-normalized), so overlapping dimension labels are
 * never picked silently. The zone is centred on the label and is the larger of the label itself and `reach` per
 * axis, mirroring the `max(100%, 2.75rem)` hit area in CSS; `reach` is per axis because the caller converts those
 * 44 CSS px into page units at the current render size and zoom. Measuring from the label's centre — rather than
 * padding its bounds — keeps the candidate set the same size as the zone: a plan whose dimension rows sit 25 px
 * apart would otherwise make every single tap ambiguous.
 */
export function numericSourcesAt(sources: readonly DrawingTextSource[], point: Readonly<{ x: number; y: number }>, reach: Readonly<{ x: number; y: number }> = { x: 0.01, y: 0.01 }) {
  return sources.filter(({ bounds, originalText }) => bounds && /\d/u.test(originalText)
    && Math.abs(point.x - (bounds.x + bounds.width / 2)) <= Math.max(bounds.width / 2, reach.x)
    && Math.abs(point.y - (bounds.y + bounds.height / 2)) <= Math.max(bounds.height / 2, reach.y));
}

export type QuickTransferRecord<TEntry> = Readonly<{
  fieldKey: string;
  /** Field value before the transfer ("" = empty). */
  previous: string;
  applied: string;
  sectionId: string;
  /** SHA-256 of the drawing the value came from. */
  documentSha256: string;
  source: DrawingTextSource;
  unitOrigin: "pdf" | "label";
  entry: TEntry;
  /** Provenance entry the transfer replaced, restored by the undo. */
  previousEntry: TEntry | null;
}>;

/** An undo only writes back into the same section and drawing, and only while the field still holds the transferred value. */
export function quickTransferUndoState<TEntry>(record: QuickTransferRecord<TEntry>, context: Readonly<{ activeSectionId: string; documentSha256: string; current: Record<string, string> }>) {
  if (record.sectionId !== context.activeSectionId || record.documentSha256 !== context.documentSha256) return "elsewhere" as const;
  if ((context.current[record.fieldKey] ?? "") !== record.applied) return "edited" as const;
  return "undoable" as const;
}

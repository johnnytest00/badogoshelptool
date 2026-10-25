import type { ResultLine } from "@/features/calculators/construction-calculator-types";

/** Decision 12/8: layout quantities and cut-list rows may become quotation quantities; everything else is informational. */
export type CalculationQuoteCandidate = Readonly<{ sourceKey: string; label: string; quantity: number; unit: string; meaning: "LAYOUT" | "CUT_LIST" }>;

export type QuotationCalculationSource = Readonly<{
  calculationId: string;
  calculationRevisionId: string;
  calculationName: string;
  calculatorId: string;
  revisionNumber: number;
  candidates: readonly CalculationQuoteCandidate[];
  informational: readonly ResultLine[];
  /** Saved line ↔ source pairs of the opened quotation revision; empty for a new draft. */
  sourceLineMap: ReadonlyArray<{ sourceKey: string; quotationLineIndex: number }>;
}>;

const record = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Mirrors the source keys the database resolves in save_standalone_quotation_from_calculation. */
export function calculationQuoteCandidates(output: unknown): { candidates: CalculationQuoteCandidate[]; informational: ResultLine[] } {
  const snapshot = record(output);
  const candidates: CalculationQuoteCandidate[] = [];
  const informational: ResultLine[] = [];
  for (const line of list(snapshot?.lines)) {
    const value = record(line);
    if (value && typeof value.label === "string" && (finite(value.value) || typeof value.value === "string") && typeof value.unit === "string") informational.push({ label: value.label, value: value.value, unit: value.unit });
  }
  list(record(snapshot?.takeoff)?.parts).forEach((rawPart, partIndex) => {
    const part = record(rawPart);
    list(part?.quantities).forEach((rawQuantity, quantityIndex) => {
      const quantity = record(rawQuantity);
      if (!part || !quantity || typeof quantity.label !== "string" || typeof quantity.unit !== "string" || !finite(quantity.value)) return;
      const label = `${String(part.label)} · ${quantity.label}`;
      if (quantity.meaning === "LAYOUT" && quantity.value > 0) candidates.push({ sourceKey: `takeoff/${partIndex}/${quantityIndex}`, label, quantity: quantity.value, unit: quantity.unit, meaning: "LAYOUT" });
      else informational.push({ label, value: quantity.value, unit: quantity.unit });
    });
  });
  const cutList = record(snapshot?.cutList);
  for (const [kind, name] of [["rafters", "Szarufa"], ["battens", "Léc"]] as const) {
    list(cutList?.[kind]).forEach((rawRow, index) => {
      const row = record(rawRow);
      if (row && finite(row.lengthMm) && finite(row.count) && row.count > 0) candidates.push({ sourceKey: `cut/${kind}/${index}`, label: `${name} · ${row.lengthMm} mm`, quantity: row.count, unit: "db", meaning: "CUT_LIST" });
    });
  }
  return { candidates, informational };
}

/** Quotation quantities allow six decimals; the exact source value stays in the immutable source record. */
export function quotationQuantity(value: number): string {
  return String(Math.round(value * 1_000_000) / 1_000_000);
}

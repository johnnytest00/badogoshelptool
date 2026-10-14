import { lineTotal, scaledToDecimal, sumMoney } from "./money";

export const QUOTATION_FINANCIAL_SOURCE_VERSION = "F9.7.6.6.3.2b" as const;

export type QuotationPriceBasis = "net" | "gross";
export type TaxTreatmentState =
  | { status: "unresolved"; treatmentId: null; parameters: null }
  | { status: "unsupported"; treatmentId: string; parameters: null };

export type QuotationFinancialContract = {
  schemaVersion: 1;
  sourceVersion: typeof QUOTATION_FINANCIAL_SOURCE_VERSION;
  currency: "HUF";
  priceBasis: QuotationPriceBasis | null;
  netAmount: string | null;
  taxTreatment: TaxTreatmentState;
  taxAmount: null;
  grossAmount: string | null;
  totalPayable: null;
  rounding: { quantityScale: 6; moneyScale: 2; mode: "half_up"; scope: "line" };
};

export type FinancialLine = { quantity: string; unitPrice: string; priceClass: QuotationPriceBasis };

/** No tax treatment has an approved calculation rule in this milestone. */
export function resolveTaxTreatment(treatmentId: string | null | undefined): TaxTreatmentState {
  if (!treatmentId) return { status: "unresolved", treatmentId: null, parameters: null };
  return { status: "unsupported", treatmentId, parameters: null };
}

export function calculateQuotationFinancialContract(
  lines: readonly FinancialLine[],
): QuotationFinancialContract {
  const priceBasis = lines[0]?.priceClass ?? null;
  if (lines.some((line) => line.priceClass !== priceBasis)) {
    throw new Error("A nettó és bruttó árbesorolás nem keverhető.");
  }
  const amounts = lines.map((line) => lineTotal(line.quantity, line.unitPrice));
  const amount = scaledToDecimal(sumMoney(amounts).minor, 2);
  return {
    schemaVersion: 1,
    sourceVersion: QUOTATION_FINANCIAL_SOURCE_VERSION,
    currency: "HUF",
    priceBasis,
    netAmount: priceBasis === "net" && lines.length > 0 ? amount : null,
    taxTreatment: { status: "unresolved", treatmentId: null, parameters: null },
    taxAmount: null,
    grossAmount: priceBasis === "gross" && lines.length > 0 ? amount : null,
    totalPayable: null,
    rounding: { quantityScale: 6, moneyScale: 2, mode: "half_up", scope: "line" },
  };
}


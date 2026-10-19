import { materialPriceKindLabels, materialPurchasingUnitLabels, type MaterialPriceKind, type MaterialProvenance, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { lineTotal, scaledToDecimal } from "@/domain/quotations/money";

/** Shared pricing operations: catalog price options (supplier lines) and priced-line totals. UI and actions import only from here. */
export const BASE_PRICE_LABEL = "Alap ár";

export type PriceLine = Readonly<{
  id: string; optionId: string | null; amount: number; currency: string; purchasingUnit: MaterialPurchasingUnit; priceKind: MaterialPriceKind;
  effectiveDate: string; recordedAt: string; provenance: MaterialProvenance; sourceName: string | null;
}>;
export type PriceOptionRow = Readonly<{ id: string; label: string; status: "active" | "archived" }>;
/** One supplier line: `prices` is its immutable history, newest first; `current` is the newest one. optionId null = unnamed legacy line. */
export type PriceOption = Readonly<{ id: string | null; label: string; status: "active" | "archived"; prices: readonly PriceLine[]; current: PriceLine | null }>;

const newestFirst = (a: PriceLine, b: PriceLine) => b.effectiveDate.localeCompare(a.effectiveDate) || b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id);

export function buildPriceOptions(prices: readonly PriceLine[], options: readonly PriceOptionRow[]): PriceOption[] {
  const sorted = [...prices].sort(newestFirst);
  const lineOf = (optionId: string | null) => sorted.filter((price) => price.optionId === optionId);
  const legacy = lineOf(null);
  const named = [...options].sort((a, b) => a.label.localeCompare(b.label, "hu")).map((option): PriceOption => {
    const history = lineOf(option.id);
    return { id: option.id, label: option.label, status: option.status, prices: history, current: history[0] ?? null };
  });
  return [...(legacy.length ? [{ id: null, label: BASE_PRICE_LABEL, status: "active" as const, prices: legacy, current: legacy[0] ?? null }] : []), ...named];
}

/** Prices a user may newly pick: the current price of each active option, in the variant's unit and HUF. */
export function selectablePrices(options: readonly PriceOption[], variantUnit: MaterialPurchasingUnit): PriceLine[] {
  return options.flatMap((option) => option.status === "active" && option.current && option.current.currency === "HUF" && option.current.purchasingUnit === variantUnit ? [option.current] : []);
}

/** A price is pre-selected only when there is exactly one choice. Several suppliers are never ranked: the user picks (never the cheapest). */
export function defaultPrice(options: readonly PriceOption[], variantUnit: MaterialPurchasingUnit): PriceLine | null {
  const choices = selectablePrices(options, variantUnit);
  return choices.length === 1 ? choices[0]! : null;
}

/** Selector content: the current price of each active supplier line, plus an already chosen older/archived price so a saved selection stays visible. */
export function priceChoices(options: readonly PriceOption[], variantUnit: MaterialPurchasingUnit, selectedPriceId: string | null | undefined): PriceLine[] {
  const choices = selectablePrices(options, variantUnit);
  const chosen = selectedPriceId ? options.flatMap((option) => option.prices).find((price) => price.id === selectedPriceId) : undefined;
  return chosen && !choices.some((price) => price.id === chosen.id) ? [chosen, ...choices] : choices;
}

export function validatePriceUnit(priceUnit: MaterialPurchasingUnit, variantUnit: MaterialPurchasingUnit): string | null {
  return priceUnit === variantUnit ? null : `Az ár egysége (${materialPurchasingUnitLabels[priceUnit]}) nem egyezik a termék egységével (${materialPurchasingUnitLabels[variantUnit]}).`;
}

export const supplierLabel = (price: Pick<PriceLine, "optionId" | "sourceName">): string | null => price.optionId ? price.sourceName : null;

export function formatPriceAmount(price: Pick<PriceLine, "amount" | "purchasingUnit" | "priceKind">): string {
  const text = price.amount.toLocaleString("hu-HU", { minimumFractionDigits: price.amount % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return `${text} Ft/${materialPurchasingUnitLabels[price.purchasingUnit]} · ${materialPriceKindLabels[price.priceKind].toLowerCase()}`;
}

/** Compact selector text: "Lindab — 3 200 Ft/m² · nettó". */
export const priceChoiceLabel = (price: PriceLine) => `${supplierLabel(price) ?? BASE_PRICE_LABEL} — ${formatPriceAmount(price)}`;

/** Informational difference to the selected price (same unit and basis only); it never selects anything. */
export function priceDifference(price: PriceLine, selected: PriceLine | null): number | null {
  if (!selected || selected.id === price.id || selected.priceKind !== price.priceKind || selected.purchasingUnit !== price.purchasingUnit) return null;
  return Math.round((price.amount - selected.amount) * 100) / 100;
}

/** Labor and material line amount with the quotation's exact decimal arithmetic (HUF, 2 decimals). Null when an input is not a valid decimal. */
export function pricedLineAmount(quantity: string, unitPrice: string): string | null {
  try { return scaledToDecimal(lineTotal(quantity, unitPrice).minor, 2); } catch { return null; }
}

import type { QuotationLine } from "@/domain/quotations/contracts";
import { materialPurchasingUnitLabels, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { decimalToScaled } from "@/domain/quotations/money";

export type QuotationMaterialLinkState = "catalog_linked" | "manual" | "source_unmapped";

export function quotationPurchasingUnitLabel(unit: string): string {
  return materialPurchasingUnitLabels[unit as MaterialPurchasingUnit] ?? unit;
}

export function quotationPurchasingUnitIdentity(unit: string): string {
  const normalized = unit.trim().toLocaleLowerCase("hu-HU");
  const known = Object.entries(materialPurchasingUnitLabels).find(([code, label]) =>
    code.toLocaleLowerCase("hu-HU") === normalized || label.toLocaleLowerCase("hu-HU") === normalized,
  );
  return known?.[0] ?? normalized;
}

export function quotationPurchasingUnitsMatch(current: string, next: string): boolean {
  return quotationPurchasingUnitIdentity(current) === quotationPurchasingUnitIdentity(next);
}

export function quotationPricesEqual(current: string, next: string): boolean {
  try { return decimalToScaled(current, 2) === decimalToScaled(next, 2); } catch { return false; }
}

export function quotationMaterialLinkState(line: { variantId?: string | null; sourceMaterialItemId?: string | null }): QuotationMaterialLinkState {
  if (line.variantId) return "catalog_linked";
  return line.sourceMaterialItemId ? "source_unmapped" : "manual";
}

/** Category changes detach an incompatible catalog association without editing the quote values. */
export function changeQuotationMaterialCategory<T extends {
  variantId?: string;
  categoryId?: string;
  priceId?: string;
  priceProvenance?: QuotationLine["priceProvenance"];
}>(
  line: T,
  nextCategoryId: string,
  selectedVariantCategoryId: string | null,
): T {
  if (!line.variantId || (selectedVariantCategoryId ?? line.categoryId ?? "") === nextCategoryId) {
    return { ...line, categoryId: nextCategoryId } as T;
  }
  return {
    ...line,
    categoryId: nextCategoryId,
    variantId: "",
    priceId: "",
    priceProvenance: line.priceId ? "catalog_snapshot" : line.priceProvenance,
  } as T;
}

export function catalogReplacementNeedsConfirmation(
  line: Pick<QuotationLine, "unit" | "unitPrice">,
  nextUnit: string,
  nextCatalogPrice?: string,
): boolean {
  const unitWouldChange = Boolean(line.unit.trim()) && !quotationPurchasingUnitsMatch(line.unit, nextUnit);
  const priceWouldChange = nextCatalogPrice !== undefined
    && Boolean(line.unitPrice.trim())
    && !quotationPricesEqual(line.unitPrice, nextCatalogPrice);
  return unitWouldChange || priceWouldChange;
}

import type { MaterialPreparationItem } from "@/domain/material-preparations/contracts";
import type { MaterialPreparationRevision } from "@/features/material-takeoffs/material-preparation-data";
import type { MaterialProductRecord } from "@/features/materials/material-data";
import type { QuotationDraftValues } from "./quotation-draft-recovery";

type ImportedLine = QuotationDraftValues["lines"][number];

function cents(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const match = String(value).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return `${match[1].replace(/^0+(?=\d)/, "")}.${(match[2] ?? "").padEnd(2, "0")}`;
}

export function quotationLinesFromMaterialList(revision: MaterialPreparationRevision, products: readonly MaterialProductRecord[]): ImportedLine[] {
  return revision.items.map((item) => {
    const raw = item as MaterialPreparationItem & Record<string, unknown>;
    const price = raw.priceSnapshot && typeof raw.priceSnapshot === "object" ? raw.priceSnapshot as Record<string, unknown> : {};
    const product = products.find((candidate) => candidate.id === item.productId && candidate.status === "active");
    const variant = product?.variants.find((candidate) => candidate.id === item.variantId && candidate.purchasingUnit === item.unit);
    const priceKind = price.priceKind === "net" ? "net" : null;
    const priceAmount = typeof price.amount === "string" || typeof price.amount === "number" ? String(price.amount) : "";
    const priceUnitMatches = price.purchasingUnit === item.unit;
    const knownNetPrice = priceKind === "net" && price.currency === "HUF" && priceUnitMatches && /^\d+(?:\.\d{1,2})?$/.test(priceAmount);
    const priceId = typeof price.priceId === "string" ? price.priceId : typeof raw.priceId === "string" ? raw.priceId : "";
    const importedCents = cents(priceAmount);
    const priceIsCurrent = knownNetPrice && Boolean(variant?.prices.some((candidate) => candidate.id === priceId
      && candidate.currency === "HUF" && candidate.priceKind === "net" && candidate.purchasingUnit === item.unit
      && cents(candidate.amount) === importedCents));
    const sourceStillSelectable = Boolean(variant);
    const sourceDescription = item.description;
    const noteParts = [item.notes, !sourceStillSelectable && item.variantId ? "A katalógusforrás jelenleg nem választható; kézi ellenőrzést igényel." : "",
      knownNetPrice && !priceIsCurrent ? "A mentett forrásár nem ellenőrizhető aktív katalógusárként; ellenőrizd mentés előtt." : ""]
      .filter((value): value is string => Boolean(value));
    return {
      type: sourceStillSelectable ? "MATERIAL" : "OTHER",
      description: sourceDescription,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: knownNetPrice ? priceAmount : "",
      priceClass: "net",
      variantId: sourceStillSelectable ? variant!.id : "",
      priceId: priceIsCurrent ? priceId : "",
      takeoffItemId: "",
      sourceMaterialItemId: item.id,
      takeoffSourceItemIds: [],
      priceProvenance: knownNetPrice ? "catalog_snapshot" : "missing",
      notes: noteParts.join(" · "),
    };
  });
}

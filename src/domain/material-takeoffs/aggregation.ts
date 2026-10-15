import { scaledToDecimal } from "@/domain/quotations/money";

export type MaterialPriceSnapshot = Readonly<{
  id?: string;
  amount?: string | number;
  currency?: string;
  purchasingUnit?: string;
  priceKind?: "net" | "gross" | string;
  effectiveDate?: string;
  sourceName?: string | null;
  provenance?: string;
}>;

export type MaterialSourceItem = Readonly<{
  id: string;
  variantId: string;
  quantity: string | number;
  unit: string;
  productName?: string | null;
  productCategory?: string | null;
  variantName?: string | null;
  materialSnapshot: unknown;
  priceSnapshot: MaterialPriceSnapshot | null;
}>;

export type MaterialSourceTakeoff = Readonly<{
  id: string;
  name: string;
  status: "draft" | "approved";
  version: number;
  sourceCalculationId: string;
  sourceRevisionId: string;
  sourceCurrentRevisionId: string | null;
  items: readonly MaterialSourceItem[];
}>;

export type AggregatedMaterialRequirement = Readonly<{
  key: string;
  productId: string;
  variantId: string;
  productName: string;
  productCategory: string | null;
  variantName: string;
  sku: string | null;
  unit: string;
  quantity: string;
  dimensions: Readonly<Record<string, unknown>>;
  materialSnapshot: Readonly<Record<string, unknown>>;
  sources: readonly Readonly<{
    itemId: string;
    takeoffId: string;
    takeoffName: string;
    takeoffVersion: number;
    calculationId: string;
    calculationRevisionId: string;
    stale: boolean;
    quantity: string;
    unit: string;
    priceSnapshot: MaterialPriceSnapshot | null;
  }>[];
  priceState: "consistent" | "missing" | "mixed";
  unitPrice: string | null;
  priceKind: "net" | "gross" | null;
  priceId: string | null;
}>;

export type PreparedQuotationMaterialLine = Readonly<{
  type: "MATERIAL";
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  priceClass: "net" | "gross";
  variantId: string;
  priceId: string;
  takeoffItemId: string;
  takeoffSourceItemIds: string[];
  priceProvenance: "takeoff_snapshot" | "missing";
  notes: string;
}>;

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
};

function quantityToMicros(value: string | number): bigint {
  const text = String(value).trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw new Error("A forrásmennyiség nem érvényes, legfeljebb 6 tizedesjegyű szám.");
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * BigInt(1_000_000) + BigInt((fraction + "000000").slice(0, 6));
}

function validPrice(price: MaterialPriceSnapshot | null): price is MaterialPriceSnapshot & { amount: string | number; currency: string; purchasingUnit: string; priceKind: string } {
  return Boolean(price && price.amount !== undefined && price.currency && price.purchasingUnit && price.priceKind);
}

export function aggregateMaterialRequirements(takeoffs: readonly MaterialSourceTakeoff[], selectedTakeoffIds: readonly string[]): AggregatedMaterialRequirement[] {
  const selected = new Set(selectedTakeoffIds);
  const groups = new Map<string, { snapshot: Record<string, unknown>; variantId: string; unit: string; productName: string; productCategory: string | null; variantName: string; amount: bigint; sources: AggregatedMaterialRequirement["sources"][number][] }>();
  const seenItems = new Set<string>();

  for (const takeoff of takeoffs) {
    if (takeoff.status !== "approved" || !selected.has(takeoff.id)) continue;
    for (const item of takeoff.items) {
      if (seenItems.has(item.id)) continue;
      seenItems.add(item.id);
      const snapshot = record(item.materialSnapshot);
      const technicalSpecs = record(snapshot.technicalSpecs);
      const dimensions = {
        lengthMm: snapshot.lengthMm ?? null,
        nominalWidthMm: snapshot.nominalWidthMm ?? null,
        effectiveWidthMm: snapshot.effectiveWidthMm ?? null,
        thicknessMm: snapshot.thicknessMm ?? null,
        packagingQuantity: snapshot.packagingQuantity ?? null,
        technicalSpecs,
      };
      const key = canonical({
        productId: snapshot.productId ?? null,
        productName: item.productName ?? snapshot.productName ?? "A terméknév nincs a forráspillanatképben",
        productCategory: item.productCategory ?? snapshot.productCategory ?? null,
        variantId: item.variantId,
        variantName: snapshot.variantName ?? snapshot.name ?? item.variantName ?? "Ismeretlen változat",
        sku: snapshot.sku ?? null,
        unit: item.unit,
        provenance: snapshot.provenance ?? null,
        productProvenance: snapshot.productProvenance ?? null,
        variantProvenance: snapshot.variantProvenance ?? null,
        ...dimensions,
      });
      const group = groups.get(key) ?? {
        snapshot, variantId: item.variantId, unit: item.unit,
        productName: item.productName ?? String(snapshot.productName ?? "A terméknév nincs a forráspillanatképben"),
        productCategory: item.productCategory ?? (typeof snapshot.productCategory === "string" ? snapshot.productCategory : null),
        variantName: String(snapshot.variantName ?? snapshot.name ?? item.variantName ?? "Ismeretlen változat"),
        amount: BigInt(0), sources: [],
      };
      group.amount += quantityToMicros(item.quantity);
      group.sources.push({
        itemId: item.id, takeoffId: takeoff.id, takeoffName: takeoff.name, takeoffVersion: takeoff.version,
        calculationId: takeoff.sourceCalculationId, calculationRevisionId: takeoff.sourceRevisionId,
        stale: takeoff.sourceRevisionId !== takeoff.sourceCurrentRevisionId,
        quantity: String(item.quantity), unit: item.unit, priceSnapshot: item.priceSnapshot,
      });
      groups.set(key, group);
    }
  }

  return [...groups.entries()].map(([key, group]) => {
    const prices = group.sources.map((source) => source.priceSnapshot);
    const allPriced = prices.every(validPrice);
    const priceValues = allPriced ? prices.map((price) => canonical({ amount: String(price.amount), currency: price.currency, purchasingUnit: price.purchasingUnit, priceKind: price.priceKind })) : [];
    const priceState: AggregatedMaterialRequirement["priceState"] = !allPriced ? "missing" : new Set(priceValues).size === 1 ? "consistent" : "mixed";
    const firstPrice = priceState === "consistent" ? prices[0] : null;
    const priceKind: "net" | "gross" | null = firstPrice?.priceKind === "net" || firstPrice?.priceKind === "gross" ? firstPrice.priceKind : null;
    const ids = priceState === "consistent" ? new Set(prices.map((price) => price?.id ?? null)) : new Set<string | null>();
    const snapshot = group.snapshot;
    return {
      key,
      productId: String(snapshot.productId ?? ""),
      variantId: String(snapshot.variantId ?? group.variantId),
      productName: group.productName,
      productCategory: group.productCategory,
      variantName: group.variantName,
      sku: typeof snapshot.sku === "string" ? snapshot.sku : null,
      unit: group.unit,
      quantity: scaledToDecimal(group.amount, 6).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1"),
      dimensions: {
        lengthMm: snapshot.lengthMm ?? null, nominalWidthMm: snapshot.nominalWidthMm ?? null,
        effectiveWidthMm: snapshot.effectiveWidthMm ?? null, thicknessMm: snapshot.thicknessMm ?? null,
        packagingQuantity: snapshot.packagingQuantity ?? null, technicalSpecs: record(snapshot.technicalSpecs),
      },
      materialSnapshot: snapshot,
      sources: group.sources,
      priceState,
      unitPrice: firstPrice && firstPrice.amount != null ? String(firstPrice.amount) : null,
      priceKind,
      priceId: ids.size === 1 ? [...ids][0] : null,
    };
  }).sort((a, b) => a.productName.localeCompare(b.productName, "hu-HU") || a.variantName.localeCompare(b.variantName, "hu-HU") || a.key.localeCompare(b.key));
}

export function prepareQuotationMaterialLines(requirements: readonly AggregatedMaterialRequirement[]): PreparedQuotationMaterialLine[] {
  return requirements.map((row) => ({
    type: "MATERIAL",
    description: `${row.productName} · ${row.variantName}`.slice(0, 240),
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.priceState === "consistent" ? row.unitPrice ?? "" : "",
    priceClass: row.priceState === "consistent" ? row.priceKind ?? "net" : "net",
    variantId: row.variantId,
    priceId: row.priceId ?? "",
    takeoffItemId: "",
    takeoffSourceItemIds: row.sources.map((source) => source.itemId),
    priceProvenance: row.priceState === "consistent" ? "takeoff_snapshot" : "missing",
    notes: row.priceState === "consistent" ? "Jóváhagyott anyagkimutatások árpillanatképei alapján." : "Hiányzó vagy eltérő árforrás; explicit egységár szükséges.",
  }));
}

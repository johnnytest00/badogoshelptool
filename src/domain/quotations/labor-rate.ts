export type LaborBasis = "roof_area_m2" | "run_length_m";
export type LaborRate = Readonly<{ id: string; name: string; basis: LaborBasis; rateAmount: string; priceClass: "net" | "gross" }>;
/** A verified, survey-derived quantity of a material list item; only these may drive an area/length based labor line. */
export type LaborBase = Readonly<{ itemId: string; label: string; quantity: string; unit: "m" | "m²" }>;

export const laborBasisLabels: Readonly<Record<LaborBasis, string>> = { roof_area_m2: "Tetőfelület (Ft/m²)", run_length_m: "Mért hossz (Ft/m)" };
export const laborBasisUnit: Readonly<Record<LaborBasis, "m" | "m²">> = { roof_area_m2: "m²", run_length_m: "m" };

/** Structured provenance of a labor line. Only the four ids are sent to the server; the rest is the stored, server-built immutable snapshot. */
export type LaborSourceRef = Readonly<{
  rateId: string; materialListId: string; materialRevisionId: string; materialItemId: string;
  rateSnapshot?: Readonly<{ name: string; basis: LaborBasis; rateAmount: string; priceClass: "net" | "gross"; currency: string }>;
  surveyId?: string; surveyRevisionId?: string; surveyVersion?: number; sourceLabel?: string; sourceQuantity?: string; sourceUnit?: "m" | "m²";
}>;

/** A billing quantity must be a positive decimal with at most six places; it is never derived from the source implicitly. */
export const isBillingQuantity = (value: string) => /^\d+(?:\.\d{1,6})?$/.test(value) && Number(value) > 0;
/** Quotation quantity precision (six decimals, trailing zeros removed); the exact source value stays in the labor provenance. */
export const quantityAtSix = (value: string) => Number(value).toFixed(6).replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
export const sameQuantity = (a: string, b: string) => Number(a) === Number(b);

export const laborMarker = (rateId: string, itemId: string) => `[munkadij:${rateId}:${itemId}]`;
/** Keys of rate/source pairs already applied, from structured provenance and from legacy note markers (F9.42.1 rows). */
export function appliedLaborKeys(lines: ReadonlyArray<{ notes?: string | null; laborSource?: { rateId: string; materialItemId: string } | null }>): string[] {
  return lines.flatMap((line) => [
    ...(line.laborSource ? [`${line.laborSource.rateId}:${line.laborSource.materialItemId}`] : []),
    ...[...(line.notes ?? "").matchAll(/\[munkadij:([^:\]]+):([^\]]+)\]/g)].map((match) => `${match[1]}:${match[2]}`),
  ]);
}

export type LaborRateOffer =
  | { status: "available"; rate: LaborRate; base: LaborBase }
  | { status: "unavailable"; rate: LaborRate; base: LaborBase; reason: string };

/** Matches rates to bases by identical unit only (no unit conversion) and by the quotation's existing price class (net and gross never mix). */
export function offerLaborRates(rates: readonly LaborRate[], bases: readonly LaborBase[], quotationClass: "net" | "gross" | null, appliedKeys: readonly string[]): LaborRateOffer[] {
  return bases.flatMap((base) => rates.filter((rate) => laborBasisUnit[rate.basis] === base.unit).map((rate): LaborRateOffer => {
    if (appliedKeys.includes(`${rate.id}:${base.itemId}`)) return { status: "unavailable", rate, base, reason: "Már alkalmazva ebben az ajánlatban." };
    if (quotationClass && quotationClass !== rate.priceClass) return { status: "unavailable", rate, base, reason: `Az ajánlat ${quotationClass === "net" ? "nettó" : "bruttó"} alapú; a szabály ${rate.priceClass === "net" ? "nettó" : "bruttó"}. Nem keverhető.` };
    return { status: "available", rate, base };
  }));
}

/** Explicit, traceable labor line: quantity is the verified source quantity, price is the stored rate; nothing is estimated. */
export const isUnitPrice = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value);

/** `unitPrice` is an explicit quotation-level override of the stored rate; the rate itself (and its snapshot) stays unchanged. */
export function buildLaborLine(rate: LaborRate, base: LaborBase, source: Readonly<{ materialListId: string; materialRevisionId: string }>, billingQuantity?: string, unitPrice?: string) {
  const quantity = billingQuantity === undefined ? base.quantity : billingQuantity;
  const deviates = !sameQuantity(quantity, base.quantity);
  const price = unitPrice === undefined ? rate.rateAmount : unitPrice;
  const priceOverridden = Number(price) !== Number(rate.rateAmount);
  const note = `Munkadíj-szabály: ${rate.name} · ${rate.rateAmount} Ft/${base.unit} · forrás: ${base.label}, ${base.quantity} ${base.unit}${deviates ? ` · elszámolt mennyiség kézzel módosítva: ${quantity} ${base.unit}` : ""}${priceOverridden ? ` · ajánlati egységár kézzel felülírva: ${price} Ft/${base.unit}` : ""}`;
  return {
    type: "LABOR" as const, description: `Munkadíj · ${rate.name} · ${base.label}`.slice(0, 240), quantity, unit: base.unit,
    unitPrice: price, priceClass: rate.priceClass, variantId: "", categoryId: "", priceId: "", takeoffItemId: "", sourceMaterialItemId: "", takeoffSourceItemIds: [] as string[],
    laborSource: { rateId: rate.id, materialListId: source.materialListId, materialRevisionId: source.materialRevisionId, materialItemId: base.itemId } as LaborSourceRef, priceProvenance: "user_entered" as const, notes: note.slice(0, 500),
  };
}

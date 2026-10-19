"use client";

import { useState } from "react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { LaborRateEditor } from "./labor-rate-editor";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { pricedLineAmount } from "@/domain/pricing";
import { buildLaborLine, isBillingQuantity, isUnitPrice, laborBasisLabels, offerLaborRates, sameQuantity, type LaborBase, type LaborRate, type LaborRateOffer } from "@/domain/quotations/labor-rate";

type LaborLine = ReturnType<typeof buildLaborLine>;

/** Optional: adds an explicit labor line from a stored rate and a verified survey quantity. Nothing is applied automatically. */
export function LaborRatePanel({ organizationId, rates, bases, quotationClass, appliedKeys, source, onApply, canEditRates = false }: Readonly<{
  organizationId: string; canEditRates?: boolean; rates: readonly LaborRate[]; bases: readonly LaborBase[]; quotationClass: "net" | "gross" | null;
  appliedKeys: readonly string[]; source: Readonly<{ materialListId: string; materialRevisionId: string }>; onApply: (line: LaborLine) => void;
}>) {
  if (bases.length === 0) return <GlassDisclosure className="labor-rate-panel" summary={<>Munkadíj a felmérés alapján<span className="survey-optional-badge">Opcionális</span></>}>
    <p className="plan-link-empty">Ehhez az anyaglistához nincs ellenőrzött felmérési mennyiség (tetőfelülethez ellenőrzött, figyelmeztetés nélküli nyeregtető-számítás, ereszhez mért hossz kell), ezért automatikus munkadíj nem ajánlható. Kézi munkadíjsort bármikor felvehetsz.</p>
  </GlassDisclosure>;
  const offers = offerLaborRates(rates, bases, quotationClass, appliedKeys);
  return <GlassDisclosure className="labor-rate-panel" summary={<>Munkadíj a felmérés alapján<span className="survey-optional-badge">Opcionális</span></>}>
    <p className="plan-link-note">Csak az anyaglista ellenőrzött felmérési mennyiségére, azonos mértékegységű szabállyal. A geometriai forrásmennyiség, az anyagbeszerzési mennyiség és a munkadíj elszámolási mennyisége nem azonos: az elszámolt mennyiség alapértelmezetten a forrásérték, de itt vagy a sorban kifejezetten módosítható; az eltérés jelölve marad. Becslés, ÁFA és kedvezmény nincs.</p>
    {rates.length === 0 ? <p className="plan-link-empty">Még nincs munkadíj-szabály. <Link href={`/beallitasok/munkadij?organization=${organizationId}`}>Szabály felvétele</Link></p>
      : offers.length === 0 ? <p className="plan-link-empty">Nincs a forrás mértékegységéhez illő szabály. <Link href={`/beallitasok/munkadij?organization=${organizationId}`}>Szabályok kezelése</Link></p>
      : <ul className="plan-link-list">{offers.map((offer) => <LaborOfferRow key={`${offer.rate.id}:${offer.base.itemId}`} offer={offer} source={source} onApply={onApply} organizationId={organizationId} canEditRate={canEditRates && !appliedKeys.some((key) => key.startsWith(`${offer.rate.id}:`))} />)}</ul>}
  </GlassDisclosure>;
}

function LaborOfferRow({ offer, source, onApply, organizationId, canEditRate }: Readonly<{ organizationId: string; canEditRate: boolean; offer: LaborRateOffer; source: Readonly<{ materialListId: string; materialRevisionId: string }>; onApply: (line: LaborLine) => void }>) {
  const [billing, setBilling] = useState(offer.base.quantity);
  const valid = isBillingQuantity(billing);
  const [price, setPrice] = useState(offer.rate.rateAmount);
  const priceValid = isUnitPrice(price);
  const deviates = valid && !sameQuantity(billing, offer.base.quantity);
  const total = valid && priceValid ? pricedLineAmount(billing, price) : null;
  const priceId = `labor-price-${offer.rate.id}-${offer.base.itemId}`;
  const inputId = `labor-qty-${offer.rate.id}-${offer.base.itemId}`;
  return <li>
    <span><strong>{offer.rate.name}</strong><br /><small>{laborBasisLabels[offer.rate.basis]} · {offer.rate.rateAmount} Ft · mért forrásmennyiség: {offer.base.quantity} {offer.base.unit} ({offer.base.label})</small>
      {offer.status === "unavailable" ? <><br /><small>{offer.reason}</small></> : <>
        <br /><label htmlFor={inputId}><small>Elszámolt mennyiség ({offer.base.unit})</small></label>{" "}
        <input id={inputId} inputMode="decimal" value={billing} onChange={(event) => setBilling(event.target.value.replace(",", "."))} aria-invalid={!valid} />
        <br /><label htmlFor={priceId}><small>Egységár (Ft/{offer.base.unit})</small></label>{" "}
        <input id={priceId} inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value.replace(",", "."))} aria-invalid={!priceValid} />
        {Number(price) !== Number(offer.rate.rateAmount) && priceValid && <><br /><small>Csak ennek az ajánlatnak az egységára; a szervezeti díj nem változik.</small></>}
        <br /><small>{valid && priceValid ? `${total} Ft${offer.rate.priceClass === "net" ? " nettó" : " bruttó"}` : !valid ? "Pozitív szám, legfeljebb 6 tizedessel." : "Az egységár legfeljebb két tizedesjegyű, nem negatív szám."}{deviates ? " · eltér a mért forrásmennyiségtől" : ""}</small></>}</span>
    <button type="button" className="secondary-button" disabled={offer.status === "unavailable" || !valid || !priceValid} onClick={() => onApply(buildLaborLine(offer.rate, offer.base, source, billing, price))}>Munkadíjsor hozzáadása</button>
    {canEditRate && <details><summary>Szervezeti díj szerkesztése</summary><LaborRateEditor organizationId={organizationId} rate={offer.rate} /></details>}
  </li>;
}

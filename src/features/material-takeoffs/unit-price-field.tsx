"use client";

import { materialPriceKindLabels, materialPurchasingUnitLabels, type MaterialPriceKind, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { BASE_PRICE_LABEL, priceChoiceLabel, supplierLabel, type PriceLine } from "@/domain/pricing";

export type UnitPriceOrigin = "catalog" | "override" | "manual" | "snapshot" | "missing";
const MANUAL = "__manual";
const valid = (value: string) => value === "" || /^\d{1,12}(?:[.,]\d{1,2})?$/.test(value);

/** One price control for every material line: editable amount + saved supplier prices + explicit manual state. Pure view; the editor owns the data. */
export function UnitPriceField({ label, unit, amount, kind, origin, priceId, choices, selected, hasCatalog, onSelect, onManual }: Readonly<{
  label: string; unit: MaterialPurchasingUnit; amount: string; kind: MaterialPriceKind | null; origin: UnitPriceOrigin; priceId: string | null;
  choices: readonly PriceLine[]; selected: PriceLine | null; hasCatalog: boolean; onSelect: (priceId: string | null) => void; onManual: (amount: string, kind: MaterialPriceKind) => void;
}>) {
  const ok = valid(amount);
  const fallbackKind: MaterialPriceKind = kind ?? selected?.priceKind ?? "net";
  const status = origin === "catalog" ? `Katalógus · ${selected ? supplierLabel(selected) ?? BASE_PRICE_LABEL : "mentett ár"}`
    : origin === "override" ? "Kézi felülírás" : origin === "manual" ? "Kézi ár" : origin === "snapshot" ? "Mentett ár (pillanatkép)" : "Ár hiányzik";
  const selectValue = origin === "override" ? MANUAL : priceId ?? "";
  return <div className={`unit-price-field is-${origin}`}>
    <span className="unit-price-label">Egységár</span>
    <div className="glass-field-group unit-price-control">
      <input aria-label={`${label} egységára`} inputMode="decimal" value={amount} placeholder="Nincs megadva" aria-invalid={!ok}
        onChange={(event) => onManual(event.target.value, fallbackKind)} />
      <span className="unit-price-unit">Ft/{materialPurchasingUnitLabels[unit]}</span>
      {hasCatalog && <select aria-label={`${label} mentett beszállítói árai`} value={selectValue}
        onChange={(event) => event.target.value === MANUAL ? onManual(amount, fallbackKind) : onSelect(event.target.value || null)}>
        <option value="">{choices.length ? "Mentett ár…" : "Nincs mentett ár"}</option>
        {choices.map((price) => <option key={price.id} value={price.id}>{priceChoiceLabel(price)}</option>)}
        <option value={MANUAL}>Kézi ár</option>
      </select>}
    </div>
    <div className="unit-price-meta">
      <span className="unit-price-origin">{status}</span>
      {(origin === "manual" || origin === "override") && <select aria-label={`${label} árának alapja`} value={kind ?? ""} onChange={(event) => onManual(amount, event.target.value === "gross" ? "gross" : "net")}>
        <option value="" disabled>Alap…</option><option value="net">{materialPriceKindLabels.net}</option><option value="gross">{materialPriceKindLabels.gross}</option>
      </select>}
      {origin !== "manual" && origin !== "override" && kind && <span className="unit-price-basis">{materialPriceKindLabels[kind]}</span>}
    </div>
    {!ok && <small className="unit-price-error" role="alert">Legfeljebb két tizedesjegyű HUF ár.</small>}
  </div>;
}

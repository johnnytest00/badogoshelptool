"use client";

import { materialPriceKindLabels, materialPriceKinds, materialPurchasingUnitLabels } from "@/domain/materials/contracts";
import { formatPriceAmount, priceDifference, type PriceOption } from "@/domain/pricing";
import { createMaterialPriceAction, createMaterialPriceOptionAction, updateMaterialPriceOptionAction } from "./material-actions";
import type { MaterialVariantRecord } from "./material-data";
import { ActionForm, currentHungarianDate } from "./material-forms";

const money = (value: number) => `${value > 0 ? "+" : ""}${value.toLocaleString("hu-HU")} Ft`;

function OptionRow({ organizationId, variant, option, reference }: Readonly<{ organizationId: string; variant: MaterialVariantRecord; option: PriceOption; reference: PriceOption["current"] }>) {
  const archived = option.status === "archived";
  const diff = option.current && !archived ? priceDifference(option.current, reference) : null;
  return <li className={`price-option${archived ? " is-archived" : ""}`}>
    <div className="price-option-head">
      <strong className="price-option-name">{option.label}</strong>
      {archived && <span className="provenance-badge">Archivált</span>}
      {diff !== null && diff !== 0 && <small className="price-option-diff" title="Különbség a legalacsonyabb mentett árhoz képest; tájékoztató, nem választás.">{money(diff)}</small>}
      {option.current && <small className="price-option-date">{option.current.effectiveDate}</small>}
    </div>
    {!archived && <ActionForm action={createMaterialPriceAction} className="price-option-edit" submitClassName="secondary-button" submitLabel="Ár mentése" pendingLabel="Mentés…">
      <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="variantId" value={variant.id} />
      {option.id && <input type="hidden" name="optionId" value={option.id} />}<input type="hidden" name="purchasingUnit" value={variant.purchasingUnit} /><input type="hidden" name="effectiveDate" value={currentHungarianDate()} />
      <label className="glass-field-group price-option-amount"><span className="sr-only">{option.label} egységára</span>
        <input name="amount" inputMode="decimal" defaultValue={option.current ? String(option.current.amount) : ""} placeholder="Nincs megadva" required /><em>Ft/{materialPurchasingUnitLabels[variant.purchasingUnit]}</em></label>
      <select name="priceKind" aria-label={`${option.label} ár alapja`} defaultValue={option.current?.priceKind ?? "net"}>{materialPriceKinds.map((kind) => <option key={kind} value={kind}>{materialPriceKindLabels[kind]}</option>)}</select>
    </ActionForm>}
    {archived && <p className="price-option-archived">{option.current ? formatPriceAmount(option.current) : "Ár nincs megadva"}</p>}
    <details className="price-option-more"><summary>Átnevezés, archiválás, előzmények</summary><div className="price-option-more-body">
        {option.id && !archived && <ActionForm action={updateMaterialPriceOptionAction} className="price-option-rename" submitClassName="secondary-button" submitLabel="Átnevezés">
          <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="optionId" value={option.id} />
          <label className="material-field"><span>Név</span><input name="label" defaultValue={option.label} maxLength={60} required /></label>
        </ActionForm>}
        {option.id && <ActionForm action={updateMaterialPriceOptionAction} className="inline-status-form" submitClassName="secondary-button" submitLabel={archived ? "Visszaállítás" : "Archiválás"}>
          <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="optionId" value={option.id} /><input type="hidden" name="status" value={archived ? "active" : "archived"} />
        </ActionForm>}
        <ul className="price-option-history" aria-label="Árelőzmények">{option.prices.map((price) => <li key={price.id}>{formatPriceAmount(price)} · {price.effectiveDate}</li>)}</ul>
    </div></details>
  </li>;
}

/** Named supplier price lines of one variant: edit in place (a new immutable price is stored), rename, archive. Nothing here picks a price for a document. */
export function PriceOptionsPanel({ organizationId, variant }: Readonly<{ organizationId: string; variant: MaterialVariantRecord }>) {
  const options = variant.priceOptions;
  const active = options.filter((option) => option.status === "active");
  const reference = active.flatMap((option) => option.current ? [option.current] : []).reduce<PriceOption["current"]>((low, price) => !low || price.amount < low.amount ? price : low, null);
  return <div className="price-options">
    <div className="material-section-title"><h3>Beszállítói árak</h3><span>{active.length} aktív</span></div>
    {options.length ? <ul className="price-option-list">{options.map((option) => <OptionRow key={option.id ?? "base"} organizationId={organizationId} variant={variant} option={option} reference={reference} />)}</ul>
      : <p className="missing-data">Még nincs ár. Ez nem nulla ár.</p>}
    <ActionForm action={createMaterialPriceOptionAction} className="price-option-new" submitLabel="Hozzáadás" pendingLabel="Mentés…">
      <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="variantId" value={variant.id} /><input type="hidden" name="effectiveDate" value={currentHungarianDate()} />
      <label className="material-field"><span>Új beszállító / forrás</span><input name="label" maxLength={60} required placeholder="Például: Lindab" /></label>
      <label className="material-field"><span>Egységár <small>Ft/{materialPurchasingUnitLabels[variant.purchasingUnit]}</small></span><input name="amount" inputMode="decimal" placeholder="3200" required /></label>
      <label className="material-field"><span>Alap</span><select name="priceKind" defaultValue="net">{materialPriceKinds.map((kind) => <option key={kind} value={kind}>{materialPriceKindLabels[kind]}</option>)}</select></label>
    </ActionForm>
  </div>;
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { materialProvenanceLabels, materialPriceKindLabels, materialPriceKinds, materialPurchasingUnitLabels, materialPurchasingUnits, materialProvenances, type MaterialProvenance, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import type { MaterialActionResult } from "./material-actions";
import type { MaterialCategoryRecord, MaterialManufacturerRecord, MaterialProductRecord, MaterialVariantRecord } from "./material-data";
import { createMaterialManagerProductAction, createMaterialVariantAction, createManufacturerAction, updateMaterialProductAction, updateMaterialVariantAction, updateManufacturerAction, changeMaterialProductStatusAction } from "./material-actions";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { generateSecureUuid } from "@/lib/secure-uuid";

export function ActionForm({ action, children, className, submitLabel, pendingLabel, submitClassName = "primary-button" }: Readonly<{ action: (formData: FormData) => Promise<MaterialActionResult>; children: React.ReactNode; className?: string; submitLabel?: string; pendingLabel?: string; submitClassName?: string }>) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [message, setMessage] = useState(""); const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  return <form className={className} action={(formData) => startTransition(async () => { const result = await action(formData); setMessage(result.ok ? "Mentve." : result.error ?? "A mentés nem sikerült."); setFieldErrors(result.fieldErrors ?? {}); if (result.ok) router.refresh(); })}>{children}{message && <p className={`form-message ${message === "Mentve." ? "is-success" : "is-error"}`} role={message === "Mentve." ? "status" : "alert"}>{message}</p>}{Object.keys(fieldErrors).length > 0 && <ul className="material-field-errors" role="alert">{Object.entries(fieldErrors).map(([field, error]) => <li key={field}>{error}</li>)}</ul>}<button className={submitClassName} type="submit" disabled={pending}>{pending ? pendingLabel ?? "Mentés…" : submitLabel ?? "Mentés"}</button></form>;
}

function ProvenanceSelect({ value = "user_provided" }: Readonly<{ value?: MaterialProvenance }>) { return <label className="material-field"><span>Adat eredete</span><select name="dataProvenance" defaultValue={value}>{materialProvenances.map((item) => <option key={item} value={item}>{materialProvenanceLabels[item]}</option>)}</select></label>; }
function UnitSelect({ value = "piece", disabled = false }: Readonly<{ value?: MaterialPurchasingUnit; disabled?: boolean }>) { return <label className="material-field"><span>Egység</span><select name="purchasingUnit" defaultValue={value} disabled={disabled}>{materialPurchasingUnits.map((item) => <option key={item} value={item}>{materialPurchasingUnitLabels[item]}</option>)}</select>{disabled && <><input type="hidden" name="purchasingUnit" value={value} /><small>Az árhoz rögzített egység nem módosítható.</small></>}</label>; }
function ErrorMessage() { return null; }

export function ManufacturerForm({ organizationId, manufacturer }: Readonly<{ organizationId: string; manufacturer?: MaterialManufacturerRecord }>) {
  return <ActionForm action={manufacturer ? updateManufacturerAction : createManufacturerAction} className="material-inline-form"><input type="hidden" name="organizationId" value={organizationId} />{manufacturer && <input type="hidden" name="manufacturerId" value={manufacturer.id} />}<label className="material-field"><span>Gyártó neve</span><input name="name" defaultValue={manufacturer?.name ?? ""} required maxLength={200} /></label><label className="material-field"><span>Weboldal <small>opcionális</small></span><input name="website" type="url" defaultValue={manufacturer?.website ?? ""} placeholder="https://…" /></label><label className="material-field"><span>Megjegyzés <small>opcionális</small></span><textarea name="notes" defaultValue={manufacturer?.notes ?? ""} rows={2} /></label><span className="sr-only"><ErrorMessage /></span></ActionForm>;
}

export function currentHungarianDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date());
}

export function MaterialManagerProductForm({ organizationId, categories, onCreated }: Readonly<{ organizationId: string; categories: readonly MaterialCategoryRecord[]; onCreated?: (productId: string) => void }>) {
  const router = useRouter();
  const [requestId, setRequestId] = useState(() => generateSecureUuid());
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [priceAmount, setPriceAmount] = useState("");
  const activeCategories = useMemo(() => categories.filter((item) => item.isActive), [categories]);
  const renewRequest = () => { setRequestId(generateSecureUuid()); setFeedback(""); setFieldErrors({}); };

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createMaterialManagerProductAction(formData);
      if (!result.ok || !result.productId) {
        setFeedback(result.error ?? "A termék mentése nem sikerült.");
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setFeedback(result.reused ? "A korábbi mentés visszaigazolva." : "Termék mentve.");
      if (onCreated) onCreated(result.productId);
      else {
        router.push(`/anyagok/${result.productId}?organization=${organizationId}`);
        router.refresh();
      }
    });
  }

  return <form className="material-manager-product-form" onSubmit={submit} onChange={renewRequest}>
    <input type="hidden" name="organizationId" value={organizationId} />
    <input type="hidden" name="requestId" value={requestId} />
    <label className="material-field"><span>Termék neve <strong>Kötelező</strong></span><input name="name" autoFocus required maxLength={200} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "manager-product-name-error" : "manager-product-name-help"} /><small id="manager-product-name-help">A méretet írd a névbe, például: Csatorna 333 mm antracit.</small>{fieldErrors.name && <small id="manager-product-name-error" className="field-error">{fieldErrors.name}</small>}</label>
    <label className="material-field"><span>Kategória <strong>Kötelező</strong></span><select name="categoryId" defaultValue={activeCategories[0]?.id ?? ""} required aria-invalid={Boolean(fieldErrors.categoryId)}>{activeCategories.length === 0 && <option value="">Előbb hozz létre kategóriát</option>}{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{fieldErrors.categoryId && <small className="field-error">{fieldErrors.categoryId}</small>}</label>
    <UnitSelect />
    <p className="material-manager-unit-help">Az egység határozza meg az árazást és az anyaglista mennyiségét. Átváltás nem történik.</p>
    <details className="material-manager-price-disclosure">
      <summary>Egységár megadása <span>opcionális</span></summary>
      <div className="material-manager-price-fields">
        <label className="material-field"><span>Egységár <small>HUF / kiválasztott egység</small></span><input name="priceAmount" inputMode="decimal" value={priceAmount} onChange={(event) => setPriceAmount(event.target.value)} placeholder="Nincs megadva" aria-invalid={Boolean(fieldErrors.priceAmount)} />{fieldErrors.priceAmount && <small className="field-error">{fieldErrors.priceAmount}</small>}</label>
        <label className="material-field"><span>Ártípus</span><select name="priceKind" defaultValue=""><option value="">Válassz, ha árat adsz meg</option>{materialPriceKinds.map((kind) => <option key={kind} value={kind}>{materialPriceKindLabels[kind]}</option>)}</select>{fieldErrors.priceKind && <small className="field-error">{fieldErrors.priceKind}</small>}</label>
        <label className="material-field"><span>Érvényes dátum</span><input name="priceEffectiveDate" type="date" defaultValue={currentHungarianDate()} />{fieldErrors.priceEffectiveDate && <small className="field-error">{fieldErrors.priceEffectiveDate}</small>}</label>
        <p className="missing-data">Az ár HUF-ban, a kiválasztott egységre mentődik. A 0 Ft megadott ár, az üres mező pedig hiányzó ár.</p>
      </div>
    </details>
    {feedback && <p className={`form-message ${fieldErrors && Object.keys(fieldErrors).length === 0 && feedback.includes("mentve") ? "is-success" : "is-error"}`} role={fieldErrors && Object.keys(fieldErrors).length === 0 && feedback.includes("mentve") ? "status" : "alert"}>{feedback}</p>}
    <button className="primary-button" type="submit" disabled={pending || activeCategories.length === 0}>{pending ? "Mentés…" : "Termék mentése"}</button>
  </form>;
}

export function MaterialProductForm({ organizationId, manufacturers, categories, product }: Readonly<{ organizationId: string; manufacturers: readonly MaterialManufacturerRecord[]; categories: readonly MaterialCategoryRecord[]; product: MaterialProductRecord }>) {
  return <ActionForm action={updateMaterialProductAction} className="material-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="productId" value={product.id} /><div className="material-form-grid"><label className="material-field"><span>Termék neve</span><input name="name" defaultValue={product.name} required maxLength={200} /><small>A méretet is a névbe írd, például: Csatorna 333 mm antracit.</small></label><label className="material-field"><span>Kategória</span><select name="categoryId" defaultValue={product.categoryId}>{categories.filter((item) => item.isActive || item.id === product.categoryId).map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " · inaktív"}</option>)}</select></label></div><GlassDisclosure className="material-advanced-fields" summary={<>További termékadatok</>}><div className="material-subgrid"><label className="material-field"><span>Gyártó <small>opcionális</small></span><select name="manufacturerId" defaultValue={product.manufacturerId ?? ""}><option value="">Nincs megadva</option>{manufacturers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="material-field"><span>Termékkód <small>opcionális</small></span><input name="productCode" defaultValue={product.productCode ?? ""} maxLength={120} /></label><label className="material-field material-field-wide"><span>Leírás <small>opcionális</small></span><textarea name="description" defaultValue={product.description ?? ""} rows={3} /></label><ProvenanceSelect value={product.provenance} /><label className="material-field"><span>Forrás neve</span><input name="sourceName" defaultValue={product.sourceName ?? ""} /></label><label className="material-field"><span>Forrás URL</span><input name="sourceUrl" type="url" defaultValue={product.sourceUrl ?? ""} placeholder="https://…" /></label><label className="material-field"><span>Forrás dátuma</span><input name="sourceDate" type="date" defaultValue={product.sourceDate ?? ""} /></label><label className="material-field material-field-wide"><span>Forrásmegjegyzés</span><textarea name="sourceNotes" defaultValue={product.sourceNotes ?? ""} rows={2} /></label></div></GlassDisclosure></ActionForm>;
}

export function VariantForm({ organizationId, productId, variant }: Readonly<{ organizationId: string; productId: string; variant?: MaterialVariantRecord }>) {
  return <ActionForm action={variant ? updateMaterialVariantAction : createMaterialVariantAction} className="material-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="productId" value={productId} />{variant && <input type="hidden" name="variantId" value={variant.id} />}<div className="material-form-grid"><label className="material-field"><span>Variáns neve</span><input name="name" defaultValue={variant?.name ?? ""} required maxLength={200} placeholder="Opcionális megkülönböztető név" /></label><label className="material-field"><span>SKU <small>opcionális</small></span><input name="sku" defaultValue={variant?.sku ?? ""} maxLength={120} /></label><UnitSelect value={variant?.purchasingUnit} disabled={Boolean(variant?.prices.length)} /></div><GlassDisclosure className="material-advanced-fields" summary={<>Műszaki adatok <span>opcionális, haladó</span></>}><div className="material-form-grid"><label className="material-field"><span>Névleges szélesség <small>mm</small></span><input name="nominalWidthMm" inputMode="decimal" defaultValue={variant?.nominalWidthMm ?? ""} /></label><label className="material-field"><span>Hasznos szélesség <small>mm</small></span><input name="effectiveWidthMm" inputMode="decimal" defaultValue={variant?.effectiveWidthMm ?? ""} /></label><label className="material-field"><span>Vastagság <small>mm</small></span><input name="thicknessMm" inputMode="decimal" defaultValue={variant?.thicknessMm ?? ""} /></label><label className="material-field"><span>Profilanyag-azonosító <small>pontos anyagjelölés, opcionális</small></span><input name="profileMaterialSpec" defaultValue={variant?.technicalSpecs.profileMaterialSpec ?? ""} maxLength={200} /></label><label className="material-field"><span>Hossz <small>mm</small></span><input name="lengthMm" inputMode="decimal" defaultValue={variant?.lengthMm ?? ""} /></label><label className="material-field"><span>Csomag mennyisége</span><input name="packagingQuantity" inputMode="decimal" defaultValue={variant?.packagingQuantity ?? ""} /></label><label className="material-field material-field-wide"><span>További műszaki adatok <small>JSON</small></span><textarea name="technicalSpecs" defaultValue={JSON.stringify(variant?.technicalSpecs ?? {}, null, 2)} rows={4} /></label></div><div className="material-subgrid"><ProvenanceSelect value={variant?.provenance} /><label className="material-field"><span>Forrás neve</span><input name="sourceName" defaultValue={variant?.sourceName ?? ""} /></label><label className="material-field"><span>Forrás URL</span><input name="sourceUrl" type="url" defaultValue={variant?.sourceUrl ?? ""} placeholder="https://…" /></label><label className="material-field"><span>Forrás dátuma</span><input name="sourceDate" type="date" defaultValue={variant?.sourceDate ?? ""} /></label><label className="material-field material-field-wide"><span>Forrásmegjegyzés</span><textarea name="sourceNotes" defaultValue={variant?.sourceNotes ?? ""} rows={2} /></label></div></GlassDisclosure></ActionForm>;
}

export function ProductStatusForm({ organizationId, product }: Readonly<{ organizationId: string; product: MaterialProductRecord }>) { const label = product.status === "active" ? "Archiválás" : "Visszaállítás"; return <ActionForm action={changeMaterialProductStatusAction} className="inline-status-form" submitClassName="secondary-button" submitLabel={label} pendingLabel={`${label}…`}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="status" value={product.status === "active" ? "archived" : "active"} /></ActionForm>; }

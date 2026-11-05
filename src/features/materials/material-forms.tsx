"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { materialPriceKindLabels, materialPriceKinds, materialPurchasingUnitLabels, materialPurchasingUnits, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import type { MaterialActionResult } from "./material-actions";
import type { MaterialCategoryRecord, MaterialManufacturerRecord, MaterialProductRecord, MaterialVariantRecord } from "./material-data";
import { createMaterialManagerProductAction, createMaterialVariantAction, createManufacturerAction, updateMaterialProductAction, updateMaterialVariantAction, updateManufacturerAction, changeMaterialProductStatusAction } from "./material-actions";
import { generateSecureUuid } from "@/lib/secure-uuid";

export function ActionForm({ action, children, className, submitLabel, pendingLabel, submitClassName = "primary-button" }: Readonly<{ action: (formData: FormData) => Promise<MaterialActionResult>; children: React.ReactNode; className?: string; submitLabel?: string; pendingLabel?: string; submitClassName?: string }>) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [message, setMessage] = useState(""); const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  return <form className={className} action={(formData) => startTransition(async () => { const result = await action(formData); setMessage(result.ok ? "Mentve." : result.error ?? "A mentés nem sikerült."); setFieldErrors(result.fieldErrors ?? {}); if (result.ok) router.refresh(); })}>{children}{message && <p className={`form-message ${message === "Mentve." ? "is-success" : "is-error"}`} role={message === "Mentve." ? "status" : "alert"}>{message}</p>}{Object.keys(fieldErrors).length > 0 && <ul className="material-field-errors" role="alert">{Object.entries(fieldErrors).map(([field, error]) => <li key={field}>{error}</li>)}</ul>}<button className={submitClassName} type="submit" disabled={pending}>{pending ? pendingLabel ?? "Mentés…" : submitLabel ?? "Mentés"}</button></form>;
}

function UnitSelect({ value = "piece", disabled = false, onChange, label = "Egység" }: Readonly<{ value?: MaterialPurchasingUnit; disabled?: boolean; onChange?: (unit: MaterialPurchasingUnit) => void; label?: string }>) { return <label className="material-field"><span>{label}</span><select name="purchasingUnit" defaultValue={value} disabled={disabled} onChange={(event) => onChange?.(event.target.value as MaterialPurchasingUnit)}>{materialPurchasingUnits.map((item) => <option key={item} value={item}>{materialPurchasingUnitLabels[item]}</option>)}</select>{disabled && <><input type="hidden" name="purchasingUnit" value={value} /><small>Az árhoz rögzített egység nem módosítható.</small></>}</label>; }
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
  const [purchasingUnit, setPurchasingUnit] = useState<MaterialPurchasingUnit>("piece");
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
    <label className="material-field"><span>Termék neve <strong>Kötelező</strong></span><input name="name" autoFocus required maxLength={200} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "manager-product-name-error" : undefined} />{fieldErrors.name && <small id="manager-product-name-error" className="field-error">{fieldErrors.name}</small>}</label>
    <label className="material-field"><span>Kategória <strong>Kötelező</strong></span><select name="categoryId" defaultValue={activeCategories[0]?.id ?? ""} required aria-invalid={Boolean(fieldErrors.categoryId)}>{activeCategories.length === 0 && <option value="">Előbb hozz létre kategóriát</option>}{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{fieldErrors.categoryId && <small className="field-error">{fieldErrors.categoryId}</small>}</label>
    <UnitSelect onChange={setPurchasingUnit} />
    <section className="material-manager-price-disclosure" aria-label="Egységár megadása, opcionális">
      <div className="material-manager-price-heading"><strong>Egységár</strong><span>opcionális</span></div>
      <div className="material-manager-price-fields">
        <label className="material-field"><span>Egységár (Ft/{materialPurchasingUnitLabels[purchasingUnit]})</span><input name="priceAmount" inputMode="decimal" value={priceAmount} onChange={(event) => setPriceAmount(event.target.value)} placeholder="Nincs megadva" aria-invalid={Boolean(fieldErrors.priceAmount)} />{fieldErrors.priceAmount && <small className="field-error">{fieldErrors.priceAmount}</small>}</label>
        <label className="material-field"><span>Beszerzési hely</span><input name="priceSupplier" maxLength={60} placeholder="Például: Lindab" aria-invalid={Boolean(fieldErrors.priceSupplier)} />{fieldErrors.priceSupplier && <small className="field-error">{fieldErrors.priceSupplier}</small>}</label>
        <label className="material-field"><span>Ártípus</span><select name="priceKind" defaultValue=""><option value="">Válassz, ha árat adsz meg</option>{materialPriceKinds.map((kind) => <option key={kind} value={kind}>{materialPriceKindLabels[kind]}</option>)}</select>{fieldErrors.priceKind && <small className="field-error">{fieldErrors.priceKind}</small>}</label>
      </div>
    </section>
    {feedback && <p className={`form-message ${fieldErrors && Object.keys(fieldErrors).length === 0 && feedback.includes("mentve") ? "is-success" : "is-error"}`} role={fieldErrors && Object.keys(fieldErrors).length === 0 && feedback.includes("mentve") ? "status" : "alert"}>{feedback}</p>}
    <button className="primary-button" type="submit" disabled={pending || activeCategories.length === 0}>{pending ? "Mentés…" : "Termék mentése"}</button>
  </form>;
}

export function MaterialProductForm({ organizationId, manufacturers, categories, product }: Readonly<{ organizationId: string; manufacturers: readonly MaterialManufacturerRecord[]; categories: readonly MaterialCategoryRecord[]; product: MaterialProductRecord }>) {
  return <ActionForm action={updateMaterialProductAction} className="material-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="productId" value={product.id} /><div className="material-form-grid"><label className="material-field"><span>Termék neve</span><input name="name" defaultValue={product.name} required maxLength={200} /><small>Ajánlott a termék jellemző paramétereit is feltüntetni a nevében.</small></label><label className="material-field"><span>Kategória</span><select name="categoryId" defaultValue={product.categoryId}>{categories.filter((item) => item.isActive || item.id === product.categoryId).map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " · inaktív"}</option>)}</select></label><label className="material-field"><span>Gyártó <small>opcionális</small></span><select name="manufacturerId" defaultValue={product.manufacturerId ?? ""}><option value="">Nincs megadva</option>{manufacturers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="material-field"><span>Termékkód <small>opcionális</small></span><input name="productCode" defaultValue={product.productCode ?? ""} maxLength={120} /></label><label className="material-field material-field-wide"><span>Leírás <small>opcionális</small></span><textarea name="description" defaultValue={product.description ?? ""} rows={3} /></label></div></ActionForm>;
}

export function VariantUnitForm({ organizationId, productId, variant, label = "Egység" }: Readonly<{ organizationId: string; productId: string; variant: MaterialVariantRecord; label?: string }>) {
  return <ActionForm action={updateMaterialVariantAction} className="material-unit-form" submitClassName="secondary-button"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="productId" value={productId} /><input type="hidden" name="variantId" value={variant.id} /><input type="hidden" name="name" value={variant.name} /><input type="hidden" name="sku" value={variant.sku ?? ""} /><UnitSelect value={variant.purchasingUnit} disabled={Boolean(variant.prices.length)} label={label} /></ActionForm>;
}

export function VariantForm({ organizationId, productId, variant, showUnit = true }: Readonly<{ organizationId: string; productId: string; variant?: MaterialVariantRecord; showUnit?: boolean }>) {
  return <ActionForm action={variant ? updateMaterialVariantAction : createMaterialVariantAction} className="material-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="productId" value={productId} />{variant && <input type="hidden" name="variantId" value={variant.id} />}<div className="material-form-grid"><label className="material-field"><span>Variáns neve</span><input name="name" defaultValue={variant?.name ?? ""} required maxLength={200} placeholder="Opcionális megkülönböztető név" /></label><label className="material-field"><span>SKU <small>opcionális</small></span><input name="sku" defaultValue={variant?.sku ?? ""} maxLength={120} /></label>{showUnit && <UnitSelect value={variant?.purchasingUnit} disabled={Boolean(variant?.prices.length)} />}</div></ActionForm>;
}

export function ProductStatusForm({ organizationId, product }: Readonly<{ organizationId: string; product: MaterialProductRecord }>) { const label = product.status === "active" ? "Archiválás" : "Visszaállítás"; return <ActionForm action={changeMaterialProductStatusAction} className="inline-status-form" submitClassName="secondary-button" submitLabel={label} pendingLabel={`${label}…`}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="status" value={product.status === "active" ? "archived" : "active"} /></ActionForm>; }

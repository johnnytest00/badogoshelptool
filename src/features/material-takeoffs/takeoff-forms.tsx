"use client";

import { useActionState, useState } from "react";
import { addMaterialTakeoffStateAction, approveMaterialTakeoffStateAction, type Result } from "./takeoff-actions";
import type { MaterialVariantRecord } from "@/features/materials/material-data";
import { materialPurchasingUnitLabels } from "@/domain/materials/contracts";
import type { TakeoffMethod } from "@/domain/material-takeoffs/contracts";
import { areaSources, linearSources, methodForUnit, methodOptionsForUnit } from "./takeoff-form-options";

const initial: Result = { ok: false };

export function TakeoffItemForm({ organizationId, projectId, takeoffId, variants }: Readonly<{ organizationId: string; projectId: string; takeoffId: string; variants: MaterialVariantRecord[] }>) {
  const [state, action] = useActionState(addMaterialTakeoffStateAction, initial);
  const [variantId, setVariantId] = useState("");
  const [method, setMethod] = useState<TakeoffMethod>("manual");
  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const selectVariant = (id: string) => {
    setVariantId(id);
    const unit = variants.find((variant) => variant.id === id)?.purchasingUnit;
    setMethod(methodForUnit(unit));
  };

  return <form action={action} className="stack-form">
    <input type="hidden" name="organizationId" value={organizationId} />
    <input type="hidden" name="projectId" value={projectId} />
    <input type="hidden" name="takeoffId" value={takeoffId} />
    <label>Anyagváltozat<select name="variantId" value={variantId} onChange={(event) => selectVariant(event.target.value)} required><option value="">Válassz…</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}{variant.sku ? ` · ${variant.sku}` : ""} ({materialPurchasingUnitLabels[variant.purchasingUnit]})</option>)}</select></label>
    <label>Mennyiség meghatározása<select name="method" value={method} onChange={(event) => setMethod(event.target.value as TakeoffMethod)}>
      {methodOptionsForUnit(selectedVariant?.purchasingUnit).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>
    {method !== "manual" && <label>Mérési alap<select name="measurementKey" required defaultValue="" key={method}><option value="">Válassz geometriai értéket…</option>{(method === "area" ? areaSources : linearSources).map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label>}
    {method === "area" && <label>Ráhagyás (%)<input name="allowancePercent" type="number" min="0" max="1000" step="0.01" required placeholder="Add meg kifejezetten; 0 is választható" /></label>}
    {method === "manual" && <label>Kézi mennyiség ({selectedVariant ? materialPurchasingUnitLabels[selectedVariant.purchasingUnit] : "választott egység"})<input name="manualQuantity" type="number" min="0" step="0.0001" required /></label>}
    <label>Végső mennyiség, ha módosítod<input name="finalQuantity" type="number" min="0" step="0.0001" /></label>
    <label>Korrekció indoka, ha módosítod a mennyiséget<input name="adjustmentReason" /></label>
    <label>Felhasznált árverzió<select name="priceId" disabled={!selectedVariant}><option value="">Nincs kiválasztott ár</option>{selectedVariant?.prices.map((price) => <option key={price.id} value={price.id}>{price.amount.toLocaleString("hu-HU")} {price.currency} · {price.effectiveDate}</option>)}</select></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className="primary-button" type="submit">Tétel hozzáadása</button>
  </form>;
}

export function ApproveTakeoffForm({ organizationId, projectId, takeoffId }: Readonly<{ organizationId: string; projectId: string; takeoffId: string }>) {
  const [state, action] = useActionState(approveMaterialTakeoffStateAction, initial);
  return <form action={action} className="takeoff-approval-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="takeoffId" value={takeoffId} />{state.error && <p className="form-error" role="alert">{state.error}</p>}<button className="primary-button" type="submit">Kimutatás jóváhagyása</button></form>;
}

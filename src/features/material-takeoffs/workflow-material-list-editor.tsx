"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, Settings2 } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { materialCategories, materialCategoryLabels, materialPurchasingUnitLabels, materialPurchasingUnits, type MaterialCategory, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { generateSecureUuid } from "@/lib/secure-uuid";
import type { ExecutionPlanOption } from "@/features/execution/execution-data";
import type { MaterialProductRecord } from "@/features/materials/material-data";
import type { MaterialPreparationList } from "./material-preparation-data";
import { saveWorkflowMaterialListAction, type WorkflowMaterialListActionState } from "./workflow-material-list-actions";

type WorkflowLine = { id: string; kind: "manual" | "catalog"; description: string; materialCategory: MaterialCategory; quantity: string; unit: MaterialPurchasingUnit; variantId: string | null; priceId: string | null };
const initialState: WorkflowMaterialListActionState = { ok: false };
const blankLine = (): WorkflowLine => ({ id: generateSecureUuid(), kind: "manual", description: "", materialCategory: "other", quantity: "1", unit: "piece", variantId: null, priceId: null });
const quantityPattern = /^\d{1,12}(?:[.,]\d{1,6})?$/;

function listLines(list: MaterialPreparationList | null): WorkflowLine[] {
  const raw = list?.currentRevision?.items as unknown as Array<Record<string, unknown>> | undefined;
  return raw?.map((item) => ({
    id: typeof item.id === "string" ? item.id : generateSecureUuid(),
    kind: item.kind === "catalog" ? "catalog" : "manual",
    description: typeof item.description === "string" ? item.description : "",
    materialCategory: materialCategories.includes(item.materialCategory as MaterialCategory) ? item.materialCategory as MaterialCategory : "other",
    quantity: typeof item.quantity === "string" ? item.quantity : "1",
    unit: materialPurchasingUnits.includes(item.unit as MaterialPurchasingUnit) ? item.unit as MaterialPurchasingUnit : "piece",
    variantId: typeof item.variantId === "string" ? item.variantId : null,
    priceId: typeof item.priceId === "string" ? item.priceId : null,
  })) ?? [];
}

export function WorkflowMaterialListEditor({ organizationId, products, plans, list, requestedPlanId = "" }: Readonly<{
  organizationId: string; products: readonly MaterialProductRecord[]; plans: readonly ExecutionPlanOption[];
  list: MaterialPreparationList | null; requestedPlanId?: string;
}>) {
  const router = useRouter();
  const { notify } = useAppInteraction();
  const [state, action, pending] = useActionState(saveWorkflowMaterialListAction, initialState);
  const [name, setName] = useState(list?.name ?? "");
  const [planId, setPlanId] = useState(list?.executionPlanId ?? requestedPlanId);
  const [lines, setLines] = useState<WorkflowLine[]>(() => listLines(list));
  const [newItem, setNewItem] = useState<WorkflowLine>(() => blankLine());
  const requestKey = useMemo(() => generateSecureUuid(), [list?.id, list?.currentRevisionId]);
  const baseline = useRef(JSON.stringify({ name, planId, lines }));
  const dirty = JSON.stringify({ name, planId, lines }) !== baseline.current;
  const handledSave = useRef<string | null>(null);
  useUnsavedChangeGuard({ dirty, pending });

  useEffect(() => {
    if (!state.ok || !state.listId || state.version === undefined) return;
    const operation = `${state.listId}:${state.version}`;
    if (handledSave.current === operation) return;
    handledSave.current = operation;
    baseline.current = JSON.stringify({ name, planId, lines });
    notify({ kind: "success", message: "Anyaglista mentve" });
    router.replace(`/anyaglistak/${state.listId}?organization=${organizationId}`, { scroll: false });
    router.refresh();
  }, [state, name, planId, lines, notify, organizationId, router]);

  const updateLine = (id: string, patch: Partial<WorkflowLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  const addLine = () => {
    const description = newItem.description.trim();
    if (!description || !quantityPattern.test(newItem.quantity) || Number(newItem.quantity.replace(",", ".")) <= 0) return;
    setLines((current) => [...current, { ...newItem, description, id: generateSecureUuid() }]);
    setNewItem(blankLine());
  };
  const selectCatalogVariant = (rawId: string) => {
    if (!rawId) { setNewItem((current) => ({ ...current, kind: "manual", variantId: null, priceId: null })); return; }
    const variant = products.flatMap((product) => product.variants).find((item) => item.id === rawId);
    const product = products.find((item) => item.variants.some((variantItem) => variantItem.id === rawId));
    if (!variant || !product) return;
    setNewItem((current) => ({ ...current, kind: "catalog", materialCategory: product.category, description: `${product.name} · ${variant.name}`, unit: variant.purchasingUnit, variantId: variant.id, priceId: variant.latestPrice?.id ?? null }));
  };
  const allVariants = products.flatMap((product) => product.variants.filter(() => product.status === "active" && product.category === newItem.materialCategory).map((variant) => ({ product, variant })));

  return <div className="dashboard-shell"><div className="dashboard-container workflow-material-lists">
    <Link className="back-link" href={`/anyaglistak?organization=${organizationId}`}>← Anyaglisták</Link>
    <header className="workflow-list-header"><div><p className="section-eyebrow">Anyagkimutatás</p><h1>{list?.name ?? "Új anyaglista"}</h1><p>{list ? `V${list.version} · önálló lista vagy kivitelezési tervhez kapcsolva` : "Önállóan is menthető; tervhez kapcsolás opcionális."}</p></div><details className="workflow-material-settings"><summary aria-label="Anyagkatalógus beállításai" title="Katalógus"><Settings2 aria-hidden="true" /></summary><div className="workflow-material-settings-panel"><strong>Anyagkatalógus</strong><p>A lista tételeihez a szervezet aktív termékei és ismert árverziói használhatók.</p><Link className="secondary-button" href={`/anyagok?organization=${organizationId}`}>Termékek és árak kezelése</Link><Link className="text-action" href={`/anyagok/uj?organization=${organizationId}`}>+ Új termék</Link></div></details></header>
    <form action={action} className="workflow-material-editor">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="listId" value={list?.id ?? ""} />
      <input type="hidden" name="expectedVersion" value={list?.version ?? 0} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <section className="glass-bubble workflow-material-meta">
        <label>Lista neve<input name="name" maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Például: DEMO tetőfelújítás anyagai" /></label>
        <label>Kivitelezési terv <span>opcionális</span><select name="executionPlanId" value={planId} disabled={Boolean(list)} onChange={(event) => setPlanId(event.target.value)}><option value="">Önálló anyaglista</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label>
        {list && <input type="hidden" name="executionPlanId" value={planId} />}
      </section>
      <section className="glass-bubble workflow-material-lines" aria-labelledby="workflow-material-lines-title">
        <div className="workflow-list-section-heading"><div><p className="section-eyebrow">Tételek</p><h2 id="workflow-material-lines-title">Anyagok</h2></div><span>{lines.length} tétel</span></div>
        {lines.length ? <div className="workflow-material-row-list">{lines.map((line) => {
          const variant = line.variantId ? allVariants.find((entry) => entry.variant.id === line.variantId)?.variant : null;
          const price = line.priceId ? variant?.prices.find((entry) => entry.id === line.priceId) : null;
          return <div className="workflow-material-row" key={line.id}>
            <Pencil aria-hidden="true" className="workflow-material-edit-icon" />
            {line.kind === "catalog" ? <span className="workflow-material-category">{materialCategoryLabels[line.materialCategory]}</span> : <label className="sr-only" htmlFor={`material-category-${line.id}`}>Anyag kategóriája</label>}
            {line.kind === "manual" && <select id={`material-category-${line.id}`} className="workflow-material-category-select" value={line.materialCategory} onChange={(event) => updateLine(line.id, { materialCategory: event.target.value as MaterialCategory })}>{materialCategories.map((category) => <option key={category} value={category}>{materialCategoryLabels[category]}</option>)}</select>}
            <label className="sr-only" htmlFor={`material-description-${line.id}`}>Tétel neve</label><input id={`material-description-${line.id}`} value={line.description} maxLength={240} onChange={(event) => updateLine(line.id, { description: event.target.value })} />
            <label className="sr-only" htmlFor={`material-quantity-${line.id}`}>Mennyiség</label><input id={`material-quantity-${line.id}`} className="workflow-material-quantity" inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} aria-describedby={`material-unit-${line.id}`} />
            {line.kind === "manual" ? <label className="sr-only" htmlFor={`material-unit-${line.id}`}>Egység</label> : null}
            {line.kind === "manual"
              ? <select id={`material-unit-${line.id}`} className="workflow-material-unit-select" value={line.unit} onChange={(event) => updateLine(line.id, { unit: event.target.value as MaterialPurchasingUnit })} aria-label={`${line.description || "Kézi tétel"} egysége`}>
                  {materialPurchasingUnits.map((unit) => <option key={unit} value={unit}>{materialPurchasingUnitLabels[unit]}</option>)}
                </select>
              : <span id={`material-unit-${line.id}`} className="workflow-material-unit">{materialPurchasingUnitLabels[line.unit]}</span>}
            <span className="workflow-material-price">{price ? `${price.amount.toLocaleString("hu-HU")} Ft/${materialPurchasingUnitLabels[price.purchasingUnit]}` : "Ár nincs megadva"}</span>
            {line.kind === "catalog" && variant && <select className="workflow-material-price-select" aria-label={`${line.description} árverzió, opcionális`} value={line.priceId ?? ""} onChange={(event) => updateLine(line.id, { priceId: event.target.value || null })}><option value="">Ár nélkül</option>{variant.prices.filter((item) => item.purchasingUnit === line.unit).map((item) => <option key={item.id} value={item.id}>{item.amount.toLocaleString("hu-HU")} Ft · {item.priceKind === "net" ? "nettó" : "bruttó"} · {item.effectiveDate}</option>)}</select>}
            <button className="icon-button" type="button" aria-label={`${line.description || "Tétel"} törlése`} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}><Minus aria-hidden="true" /></button>
          </div>;
        })}</div> : <p className="missing-data">Adj hozzá kézi vagy katalógusból választott anyagot.</p>}
        <div className="workflow-material-add-row">
          <label><span>Kategória</span><select value={newItem.materialCategory} onChange={(event) => setNewItem((current) => ({ ...current, materialCategory: event.target.value as MaterialCategory, kind: "manual", variantId: null, priceId: null }))}>{materialCategories.map((category) => <option key={category} value={category}>{materialCategoryLabels[category]}</option>)}</select></label>
          <label className="workflow-material-catalog-choice"><span>Katalógustermék <small>opcionális</small></span><select value={newItem.variantId ?? ""} onChange={(event) => selectCatalogVariant(event.target.value)}><option value="">Kézi tétel</option>{allVariants.map(({ product, variant }) => <option key={variant.id} value={variant.id}>{product.name} · {variant.name} ({materialPurchasingUnitLabels[variant.purchasingUnit]})</option>)}</select></label>
          <label><span>Megnevezés</span><input value={newItem.description} maxLength={240} onChange={(event) => setNewItem((current) => ({ ...current, description: event.target.value }))} /></label>
          <label><span>Mennyiség</span><input inputMode="decimal" value={newItem.quantity} onChange={(event) => setNewItem((current) => ({ ...current, quantity: event.target.value }))} /></label>
          <label><span>Egység</span><select value={newItem.unit} disabled={newItem.kind === "catalog"} onChange={(event) => setNewItem((current) => ({ ...current, unit: event.target.value as MaterialPurchasingUnit }))}>{materialPurchasingUnits.map((unit) => <option key={unit} value={unit}>{materialPurchasingUnitLabels[unit]}</option>)}</select></label>
          {newItem.priceId && <span className="workflow-material-price">Katalógusárat rögzít: {allVariants.find((entry) => entry.variant.id === newItem.variantId)?.variant.latestPrice?.amount.toLocaleString("hu-HU")} Ft</span>}
          <button className="secondary-button" type="button" onClick={addLine}><Plus aria-hidden="true" /> Anyag hozzáadása</button>
        </div>
      </section>
      <footer className="workflow-material-save"><p role="status" aria-live="polite">{state.error ?? (pending ? "Mentés folyamatban…" : state.ok ? `Mentve · V${state.version}` : dirty ? "Nem mentett módosítások" : list ? `Mentve · V${list.version}` : "A mennyiség és egység mentéskor ellenőrződik." )}</p><button className="primary-button" type="submit" disabled={pending || lines.length === 0}>{pending ? "Mentés…" : list ? "Változat mentése" : "Anyaglista mentése"}</button></footer>
    </form>
    {list?.currentRevisionId && <Link className="secondary-button workflow-list-quote-link" href={`/ajanlatok/uj?organization=${organizationId}&${planId ? `plan=${planId}&` : ""}materialList=${list.id}&materialRevision=${list.currentRevisionId}`}>Árajánlat készítése ebből a mentett verzióból</Link>}
    {state.error && <p className="form-message is-error" role="alert">{state.error}</p>}
  </div></div>;
}


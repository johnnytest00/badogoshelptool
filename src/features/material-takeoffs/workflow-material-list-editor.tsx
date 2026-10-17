"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { materialCategories, materialCategoryLabels, materialPriceKindLabels, materialPurchasingUnitLabels, materialPurchasingUnits, type MaterialCategory, type MaterialPriceKind, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { generateSecureUuid } from "@/lib/secure-uuid";
import type { ExecutionPlanOption } from "@/features/execution/execution-data";
import type { MaterialCategoryRecord, MaterialProductRecord } from "@/features/materials/material-data";
import type { MaterialPreparationList } from "./material-preparation-data";
import { saveWorkflowMaterialListAction, type WorkflowMaterialListActionState } from "./workflow-material-list-actions";
import { WorkflowMaterialProductPicker, type WorkflowMaterialProductOption } from "./workflow-material-product-picker";

type WorkflowLine = {
  id: string;
  kind: "manual" | "catalog";
  description: string;
  materialCategory: MaterialCategory;
  categoryId: string | null;
  categoryName: string | null;
  quantity: string;
  unit: MaterialPurchasingUnit;
  variantId: string | null;
  priceId: string | null;
  manualPriceAmount: string;
  manualPriceKind: MaterialPriceKind | null;
  priceSnapshot: Record<string, unknown> | null;
};

type NewLine = Omit<WorkflowLine, "id" | "priceSnapshot">;
const initialState: WorkflowMaterialListActionState = { ok: false };
const blankLine = (categoryId: string | null = null): NewLine => ({
  kind: "catalog", description: "", materialCategory: "other", categoryId, categoryName: null,
  quantity: "1", unit: "piece", variantId: null, priceId: null, manualPriceAmount: "", manualPriceKind: null,
});
const quantityPattern = /^\d{1,12}(?:[.,]\d{1,6})?$/;
const pricePattern = /^\d{1,12}(?:[.,]\d{1,2})?$/;

function listLines(list: MaterialPreparationList | null, products: readonly MaterialProductRecord[]): WorkflowLine[] {
  const raw = list?.currentRevision?.items as unknown as Array<Record<string, unknown>> | undefined;
  return raw?.map((item) => {
    const kind = item.kind === "catalog" ? "catalog" : "manual";
    const materialSnapshot = item.materialSnapshot && typeof item.materialSnapshot === "object" ? item.materialSnapshot as Record<string, unknown> : {};
    const priceSnapshot = item.priceSnapshot && typeof item.priceSnapshot === "object" ? item.priceSnapshot as Record<string, unknown> : null;
    const product = products.find((candidate) => candidate.id === item.productId);
    const rawPrice = item.manualPriceAmount ?? (priceSnapshot?.manual === true ? priceSnapshot.amount : "");
    const priceKind = item.manualPriceKind ?? (priceSnapshot?.manual === true ? priceSnapshot.priceKind : null);
    const categoryId = typeof item.categoryId === "string" ? item.categoryId
      : typeof materialSnapshot.categoryId === "string" ? materialSnapshot.categoryId : product?.categoryId ?? null;
    return {
      id: typeof item.id === "string" ? item.id : generateSecureUuid(),
      kind,
      description: typeof item.description === "string" ? item.description : "",
      materialCategory: materialCategories.includes(item.materialCategory as MaterialCategory) ? item.materialCategory as MaterialCategory : "other",
      categoryId,
      categoryName: typeof item.categoryName === "string" ? item.categoryName
        : typeof materialSnapshot.categoryName === "string" ? materialSnapshot.categoryName : product?.categoryName ?? null,
      quantity: typeof item.quantity === "string" ? item.quantity : "1",
      unit: materialPurchasingUnits.includes(item.unit as MaterialPurchasingUnit) ? item.unit as MaterialPurchasingUnit : "piece",
      variantId: typeof item.variantId === "string" ? item.variantId : null,
      priceId: typeof item.priceId === "string" ? item.priceId : typeof priceSnapshot?.priceId === "string" ? priceSnapshot.priceId : null,
      manualPriceAmount: typeof rawPrice === "string" || typeof rawPrice === "number" ? String(rawPrice) : "",
      manualPriceKind: priceKind === "net" || priceKind === "gross" ? priceKind : null,
      priceSnapshot,
    };
  }) ?? [];
}

function priceLabel(amount: string | number, unit: MaterialPurchasingUnit, kind: unknown) {
  const numericAmount = Number(String(amount).replace(",", "."));
  if (!Number.isFinite(numericAmount)) return `${String(amount)} Ft/${materialPurchasingUnitLabels[unit]}`;
  const basis = kind === "net" || kind === "gross" ? ` · ${materialPriceKindLabels[kind].toLowerCase()}` : "";
  const formatted = numericAmount.toLocaleString("hu-HU", { minimumFractionDigits: numericAmount % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return `${formatted} Ft/${materialPurchasingUnitLabels[unit]}${basis}`;
}

export function WorkflowMaterialListEditor({ organizationId, products, plans, categories, list, requestedPlanId = "" }: Readonly<{
  organizationId: string;
  products: readonly MaterialProductRecord[];
  plans: readonly ExecutionPlanOption[];
  categories: readonly MaterialCategoryRecord[];
  list: MaterialPreparationList | null;
  requestedPlanId?: string;
}>) {
  const router = useRouter();
  const { notify, requestConfirmation } = useAppInteraction();
  const [state, action, pending] = useActionState(saveWorkflowMaterialListAction, initialState);
  const [name, setName] = useState(list?.name ?? "");
  const [planId, setPlanId] = useState(list?.executionPlanId ?? requestedPlanId);
  const [lines, setLines] = useState<WorkflowLine[]>(() => listLines(list, products));
  const [entryMode, setEntryMode] = useState<"catalog" | "manual">("catalog");
  const [newItem, setNewItem] = useState<NewLine>(() => blankLine());
  const [addError, setAddError] = useState("");
  const requestKey = useMemo(() => generateSecureUuid(), [list?.id, list?.currentRevisionId]);
  const baseline = useRef(JSON.stringify({ name, planId, lines }));
  const dirty = JSON.stringify({ name, planId, lines }) !== baseline.current;
  const handledSave = useRef<string | null>(null);
  const activeCategories = categories.filter((category) => category.isActive);
  const categoryVariants = useMemo(() => products
    .filter((product) => product.status === "active" && product.categoryId === newItem.categoryId && product.categoryActive)
    .flatMap((product) => product.variants.map((variant) => ({ product, variant }))),
  [products, newItem.categoryId]);
  const productPickerOptions = useMemo<WorkflowMaterialProductOption[]>(() => categoryVariants.map(({ product, variant }) => ({
    id: variant.id,
    name: variant.name === "Alap egység" ? product.name : `${product.name} · ${variant.name}`,
    detail: `${materialPurchasingUnitLabels[variant.purchasingUnit]}${variant.latestPrice ? ` · ${priceLabel(variant.latestPrice.amount, variant.latestPrice.purchasingUnit, variant.latestPrice.priceKind)}` : " · Ár nincs megadva"}`,
    searchText: `${variant.name} ${variant.sku ?? ""}`,
  })), [categoryVariants]);
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
  const selectCatalogVariant = (rawId: string) => {
    const entry = categoryVariants.find(({ variant }) => variant.id === rawId);
    if (!entry) {
      setNewItem((current) => ({ ...current, description: "", materialCategory: "other", categoryName: null, variantId: null, priceId: null, unit: "piece" }));
      return;
    }
    const { product, variant } = entry;
    setNewItem((current) => ({
      ...current, kind: "catalog", materialCategory: product.category, categoryId: product.categoryId,
      categoryName: product.categoryName,
      description: variant.name === "Alap egység" ? product.name : `${product.name} · ${variant.name}`,
      unit: variant.purchasingUnit, variantId: variant.id, priceId: variant.latestPrice?.id ?? null,
      manualPriceAmount: "", manualPriceKind: null,
    }));
  };

  const addLine = () => {
    const description = newItem.description.trim();
    if (!description) { setAddError("Írd be a tétel nevét."); return; }
    if (!quantityPattern.test(newItem.quantity) || Number(newItem.quantity.replace(",", ".")) <= 0) { setAddError("Adj meg nullánál nagyobb mennyiséget, legfeljebb 6 tizedesjeggyel."); return; }
    if (entryMode === "catalog" && (!newItem.categoryId || !newItem.variantId)) { setAddError("Válassz kategóriát és katalógusterméket."); return; }
    if (entryMode === "manual" && newItem.manualPriceAmount && !pricePattern.test(newItem.manualPriceAmount.replace(",", "."))) { setAddError("Az ár HUF-ban, legfeljebb két tizedesjeggyel adható meg."); return; }
    if (entryMode === "manual" && newItem.manualPriceAmount && !newItem.manualPriceKind) { setAddError("Ár megadásakor válaszd ki, hogy nettó vagy bruttó."); return; }
    setLines((current) => [...current, { ...newItem, kind: entryMode, description, id: generateSecureUuid(), priceSnapshot: null }]);
    setNewItem(blankLine());
    setAddError("");
  };

  const removeLine = async (line: WorkflowLine) => {
    const accepted = await requestConfirmation({
      title: "Tétel eltávolítása",
      message: `A „${line.description || "névtelen tétel"}” kikerül ebből a mentendő anyaglistából. A korábbi, mentett lista-revíziók változatlanok maradnak.`,
      cancelLabel: "Mégse",
      actions: [{ label: "Tétel eltávolítása", tone: "danger", run: () => undefined }],
    });
    if (accepted) setLines((current) => current.filter((item) => item.id !== line.id));
  };

  return <div className="dashboard-shell"><div className="dashboard-container workflow-material-lists">
    <Link className="back-link" href={`/anyaglistak?organization=${organizationId}`}>← Anyaglisták</Link>
    <header className="workflow-list-header"><div><p className="section-eyebrow">Anyagkimutatás</p><h1>{list?.name ?? "Új anyaglista"}</h1><p>{list ? `V${list.version} · önálló lista vagy munkanaplóhoz kapcsolva` : "Önállóan is menthető; a munkanaplóhoz kapcsolás opcionális."}</p></div><Link className="workflow-material-manager-link" href={`/anyagkezelo?organization=${organizationId}`}>Anyagkezelő megnyitása</Link></header>
    <form action={action} className="workflow-material-editor">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="listId" value={list?.id ?? ""} />
      <input type="hidden" name="expectedVersion" value={list?.version ?? 0} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <section className="glass-bubble workflow-material-meta">
        <label>Lista neve<input name="name" maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Például: DEMO tetőfelújítás anyagai" /></label>
        <label>Munkanapló <span>opcionális</span><select name="executionPlanId" value={planId} disabled={Boolean(list)} onChange={(event) => setPlanId(event.target.value)}><option value="">Önálló anyaglista</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label>
        {list && <input type="hidden" name="executionPlanId" value={planId} />}
      </section>
      <section className="glass-bubble workflow-material-lines" aria-labelledby="workflow-material-lines-title">
        <div className="workflow-list-section-heading"><div><p className="section-eyebrow">Tételek</p><h2 id="workflow-material-lines-title">Anyagok</h2></div><span>{lines.length} tétel</span></div>
        {lines.length ? <div className="workflow-material-row-list">{lines.map((line) => {
          const product = products.find((entry) => entry.variants.some((variant) => variant.id === line.variantId));
          const variant = product?.variants.find((entry) => entry.id === line.variantId) ?? null;
          const price = line.priceId ? variant?.prices.find((entry) => entry.id === line.priceId) : null;
          const savedPrice = line.kind === "manual" && line.manualPriceAmount
            ? priceLabel(line.manualPriceAmount, line.unit, line.manualPriceKind)
            : price ? priceLabel(price.amount, price.purchasingUnit, price.priceKind)
              : line.priceSnapshot && typeof line.priceSnapshot.amount === "string" && line.priceSnapshot.currency === "HUF"
                ? priceLabel(line.priceSnapshot.amount, line.unit, line.priceSnapshot.priceKind)
                : "Ár nincs megadva";
          const selectableCategory = categories.find((category) => category.id === line.categoryId);
          return <article className="workflow-material-row" key={line.id}>
            <Pencil aria-hidden="true" className="workflow-material-edit-icon" />
            <div className="workflow-material-row-title"><span className="workflow-material-category">{selectableCategory?.name ?? line.categoryName ?? materialCategoryLabels[line.materialCategory]}</span>{line.kind === "catalog" && <small>Katalógustermék</small>}{line.kind === "manual" && <small>Kézi tétel</small>}</div>
            <label className="sr-only" htmlFor={`material-description-${line.id}`}>Tétel neve</label><input id={`material-description-${line.id}`} value={line.description} maxLength={240} onChange={(event) => updateLine(line.id, { description: event.target.value })} />
            <label className="workflow-material-field workflow-material-quantity-field"><span>Mennyiség</span><input aria-label={`${line.description || "Tétel"} mennyisége`} inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} /></label>
            {line.kind === "manual"
              ? <label className="workflow-material-field workflow-material-unit-field"><span>Egység</span><select aria-label={`${line.description || "Kézi tétel"} egysége`} value={line.unit} onChange={(event) => updateLine(line.id, { unit: event.target.value as MaterialPurchasingUnit })}>{materialPurchasingUnits.map((unit) => <option key={unit} value={unit}>{materialPurchasingUnitLabels[unit]}</option>)}</select></label>
              : <span className="workflow-material-unit">{materialPurchasingUnitLabels[line.unit]}</span>}
            {line.kind === "manual" ? <div className="workflow-material-manual-price"><label className="workflow-material-field"><span>Egységár (HUF) <small>opcionális</small></span><input aria-label={`${line.description || "Kézi tétel"} egységára HUF-ban`} inputMode="decimal" value={line.manualPriceAmount} onChange={(event) => updateLine(line.id, { manualPriceAmount: event.target.value, priceSnapshot: null })} /></label>{line.manualPriceAmount && <label className="workflow-material-field"><span>Ár típusa</span><select aria-label="Az ár nettó vagy bruttó" value={line.manualPriceKind ?? ""} onChange={(event) => updateLine(line.id, { manualPriceKind: event.target.value === "net" || event.target.value === "gross" ? event.target.value : null })}><option value="">Válassz…</option><option value="net">Nettó</option><option value="gross">Bruttó</option></select></label>}</div>
              : <div className="workflow-material-catalog-price"><span className="workflow-material-price">{savedPrice}</span>{variant && <label className="workflow-material-field"><span>Rögzített ár</span><select aria-label={`${line.description} rögzített ára`} value={line.priceId ?? ""} onChange={(event) => updateLine(line.id, { priceId: event.target.value || null, priceSnapshot: null })}><option value="">Ár nélkül</option>{variant.prices.filter((item) => item.purchasingUnit === line.unit).map((item) => <option key={item.id} value={item.id}>{priceLabel(item.amount, item.purchasingUnit, item.priceKind)} · {item.effectiveDate}</option>)}</select></label>}</div>}
            <button className="icon-button" type="button" aria-label={`${line.description || "Tétel"} eltávolítása`} onClick={() => void removeLine(line)}><Minus aria-hidden="true" /></button>
          </article>;
        })}</div> : <p className="missing-data">Válassz katalógusterméket, vagy adj hozzá gyors kézi tételt.</p>}

        <div className="workflow-material-entry-mode" role="group" aria-label="Tételfelvétel módja">
          <button className={entryMode === "catalog" ? "is-selected" : ""} type="button" aria-pressed={entryMode === "catalog"} onClick={() => { setEntryMode("catalog"); setAddError(""); }}>Katalógusból</button>
          <button className={entryMode === "manual" ? "is-selected" : ""} type="button" aria-pressed={entryMode === "manual"} onClick={() => { setEntryMode("manual"); setAddError(""); setNewItem((current) => ({ ...current, kind: "manual", categoryId: null, categoryName: null, materialCategory: "other", variantId: null, priceId: null })); }}>Gyors kézi tétel</button>
        </div>
        {entryMode === "catalog" ? <div className="workflow-material-add-row workflow-material-catalog-entry">
          <label><span>1. Kategória <strong>Kötelező</strong></span><select value={newItem.categoryId ?? ""} onChange={(event) => { setNewItem((current) => ({ ...current, categoryId: event.target.value || null, categoryName: null, variantId: null, priceId: null, description: "", unit: "piece" })); }}><option value="">Válassz kategóriát…</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="workflow-material-product-field"><span>2. Termék</span><WorkflowMaterialProductPicker options={productPickerOptions} value={newItem.variantId ?? ""} disabled={!newItem.categoryId} onSelect={selectCatalogVariant} /></label>
          <label><span>3. Mennyiség</span><input inputMode="decimal" value={newItem.quantity} onChange={(event) => setNewItem((current) => ({ ...current, quantity: event.target.value }))} /></label>
          <span className="workflow-material-unit workflow-material-entry-unit">{newItem.variantId ? `Egység: ${materialPurchasingUnitLabels[newItem.unit]}` : "Az egység a termékből töltődik be."}</span>
          <span className="workflow-material-price workflow-material-entry-price">{newItem.priceId ? `Ár: ${priceLabel(categoryVariants.find(({ variant }) => variant.id === newItem.variantId)?.variant.latestPrice?.amount ?? "", newItem.unit, categoryVariants.find(({ variant }) => variant.id === newItem.variantId)?.variant.latestPrice?.priceKind)}` : "Ár nincs megadva"}</span>
          <button className="secondary-button" type="button" onClick={addLine} disabled={!newItem.variantId}><Plus aria-hidden="true" /> Anyag hozzáadása</button>
          {!activeCategories.length && <p className="workflow-material-hint">Még nincs aktív kategória. <Link href={`/anyagkezelo?organization=${organizationId}`}>Hozz létre egyet az Anyagkezelőben</Link>, vagy válts gyors kézi tételre.</p>}
        </div> : <div className="workflow-material-add-row workflow-material-manual-entry">
          <label><span>Megnevezés <strong>Kötelező</strong></span><input value={newItem.description} maxLength={240} onChange={(event) => setNewItem((current) => ({ ...current, description: event.target.value }))} placeholder="Például: egyedi szegélylemez" /></label>
          <label><span>Mennyiség <strong>Kötelező</strong></span><input inputMode="decimal" value={newItem.quantity} onChange={(event) => setNewItem((current) => ({ ...current, quantity: event.target.value }))} /></label>
          <label><span>Egység <strong>Kötelező</strong></span><select value={newItem.unit} onChange={(event) => setNewItem((current) => ({ ...current, unit: event.target.value as MaterialPurchasingUnit }))}>{materialPurchasingUnits.map((unit) => <option key={unit} value={unit}>{materialPurchasingUnitLabels[unit]}</option>)}</select></label>
          <label><span>Egységár (HUF) <small>opcionális</small></span><input inputMode="decimal" value={newItem.manualPriceAmount} onChange={(event) => setNewItem((current) => ({ ...current, manualPriceAmount: event.target.value }))} placeholder="Ár nélkül is hozzáadható" /></label>
          {newItem.manualPriceAmount && <label><span>Ár típusa <strong>Kötelező</strong></span><select value={newItem.manualPriceKind ?? ""} onChange={(event) => setNewItem((current) => ({ ...current, manualPriceKind: event.target.value === "net" || event.target.value === "gross" ? event.target.value : null }))}><option value="">Válassz…</option><option value="net">Nettó</option><option value="gross">Bruttó</option></select></label>}
          <button className="secondary-button" type="button" onClick={addLine}><Plus aria-hidden="true" /> Anyag hozzáadása</button>
        </div>}
        {addError && <p className="form-message is-error workflow-material-add-error" role="alert">{addError}</p>}
      </section>
      <footer className="workflow-material-save"><p role="status" aria-live="polite">{pending ? "Mentés folyamatban…" : state.ok ? `Mentve · V${state.version}` : dirty ? "Nem mentett módosítások" : list ? `Mentve · V${list.version}` : "A mennyiség és az ár mentéskor újra ellenőrződik."}</p><button className="primary-button" type="submit" disabled={pending || lines.length === 0}>{pending ? "Mentés…" : list ? "Változat mentése" : "Anyaglista mentése"}</button></footer>
    </form>
    {state.error && <p className="form-message is-error" role="alert">{state.error}</p>}
    {list?.currentRevisionId && <Link className="secondary-button workflow-list-quote-link" href={`/ajanlatok/uj?organization=${organizationId}&${planId ? `plan=${planId}&` : ""}materialList=${list.id}&materialRevision=${list.currentRevisionId}`}>Árajánlat készítése ebből a mentett verzióból</Link>}
  </div></div>;
}

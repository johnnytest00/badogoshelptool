"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, PackageOpen, Plus, Trash2 } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { materialCategories, materialCategoryLabels, materialPriceKindLabels, materialPurchasingUnitLabels, materialPurchasingUnits, type MaterialCategory, type MaterialPriceKind, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import type { SurveyMaterialProvenanceItem, SurveyMaterialSourceRef, SurveyMaterialSuggestion } from "@/domain/material-takeoffs/survey-material-suggestions";
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
  sourceRef?: SurveyMaterialSourceRef;
  sourceLabel?: string;
  sourceUnit?: MaterialPurchasingUnit;
  sourceValue?: string;
  quantityKind?: "measured" | "calculated";
  quantityManuallyEdited?: boolean;
};

export type WorkflowMaterialListSurveyContext = Readonly<{
  surveyId: string;
  surveyRevisionId: string;
  surveyName: string;
  surveyVersion: number;
  currentSurveyVersion: number;
  stale: boolean;
  suggestions: readonly SurveyMaterialSuggestion[];
  unavailable: readonly string[];
}>;

type NewLine = Omit<WorkflowLine, "id" | "priceSnapshot">;
const initialState: WorkflowMaterialListActionState = { ok: false };
const blankLine = (categoryId: string | null = null): NewLine => ({
  kind: "catalog", description: "", materialCategory: "other", categoryId, categoryName: null,
  quantity: "1", unit: "piece", variantId: null, priceId: null, manualPriceAmount: "", manualPriceKind: null,
});
const quantityPattern = /^\d{1,12}(?:[.,]\d{1,6})?$/;
const pricePattern = /^\d{1,12}(?:[.,]\d{1,2})?$/;

function verifiedPrice(variant: MaterialProductRecord["variants"][number]) {
  return variant.prices.find((price) => price.provenance === "verified" && price.currency === "HUF" && price.purchasingUnit === variant.purchasingUnit) ?? null;
}

function provenanceLabel(source: SurveyMaterialProvenanceItem, version: number) {
  const quality = source.quantityKind === "measured" ? "mért adat" : "ellenőrzött számítás";
  const calculationVersion = source.sourceKind === "calculation" && typeof source.calculationRevisionNumber === "number"
    ? ` · számítás V${source.calculationRevisionNumber}` : "";
  const sourceValue = Number(source.sourceValue);
  const formattedValue = Number.isFinite(sourceValue)
    ? sourceValue.toLocaleString("hu-HU", { maximumFractionDigits: 6 }) : source.sourceValue;
  return `${source.sourceLabel} · forrás ${formattedValue} ${source.sourceUnit} · ${quality} · felmérés V${version}${calculationVersion}`;
}

function suggestionLines(suggestions: readonly SurveyMaterialSuggestion[]): WorkflowLine[] {
  return suggestions.map((suggestion) => ({
    id: generateSecureUuid(), kind: "manual", description: suggestion.description,
    materialCategory: suggestion.materialCategory, categoryId: null, categoryName: null,
    quantity: suggestion.quantity, unit: suggestion.unit, variantId: null, priceId: null,
    manualPriceAmount: "", manualPriceKind: null, priceSnapshot: null,
    sourceRef: suggestion.sourceRef, sourceLabel: suggestion.sourceLabel,
    sourceUnit: suggestion.unit, sourceValue: suggestion.quantity, quantityKind: suggestion.quantityKind,
  }));
}

function editableQuantity(value: unknown) {
  if (typeof value !== "string" || !/^\d{1,12}(?:\.\d{1,6})?$/.test(value)) return typeof value === "string" ? value : "1";
  return value.replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, "$1");
}

function listLines(list: MaterialPreparationList | null, products: readonly MaterialProductRecord[]): WorkflowLine[] {
  const raw = list?.currentRevision?.items as unknown as Array<Record<string, unknown>> | undefined;
  const surveySource = list?.currentRevision?.surveySource;
  const provenanceByItemId = new Map((surveySource?.items ?? []).map((source) => [source.itemId, source]));
  return raw?.map((item) => {
    const kind = item.kind === "catalog" ? "catalog" : "manual";
    const materialSnapshot = item.materialSnapshot && typeof item.materialSnapshot === "object" ? item.materialSnapshot as Record<string, unknown> : {};
    const priceSnapshot = item.priceSnapshot && typeof item.priceSnapshot === "object" ? item.priceSnapshot as Record<string, unknown> : null;
    const product = products.find((candidate) => candidate.id === item.productId);
    const rawPrice = item.manualPriceAmount ?? (priceSnapshot?.manual === true ? priceSnapshot.amount : "");
    const priceKind = item.manualPriceKind ?? (priceSnapshot?.manual === true ? priceSnapshot.priceKind : null);
    const categoryId = typeof item.categoryId === "string" ? item.categoryId
      : typeof materialSnapshot.categoryId === "string" ? materialSnapshot.categoryId : product?.categoryId ?? null;
    const source = typeof item.id === "string" ? provenanceByItemId.get(item.id) : undefined;
    return {
      id: typeof item.id === "string" ? item.id : generateSecureUuid(),
      kind,
      description: typeof item.description === "string" ? item.description : "",
      materialCategory: materialCategories.includes(item.materialCategory as MaterialCategory) ? item.materialCategory as MaterialCategory : "other",
      categoryId,
      categoryName: typeof item.categoryName === "string" ? item.categoryName
        : typeof materialSnapshot.categoryName === "string" ? materialSnapshot.categoryName : product?.categoryName ?? null,
      quantity: editableQuantity(item.quantity),
      unit: materialPurchasingUnits.includes(item.unit as MaterialPurchasingUnit) ? item.unit as MaterialPurchasingUnit : "piece",
      variantId: typeof item.variantId === "string" ? item.variantId : null,
      priceId: typeof item.priceId === "string" ? item.priceId : typeof priceSnapshot?.priceId === "string" ? priceSnapshot.priceId : null,
      manualPriceAmount: typeof rawPrice === "string" || typeof rawPrice === "number" ? String(rawPrice) : "",
      manualPriceKind: priceKind === "net" || priceKind === "gross" ? priceKind : null,
      priceSnapshot,
      ...(source ? {
        sourceRef: source.sourceRef,
        sourceLabel: provenanceLabel(source, surveySource!.surveyVersion),
        sourceUnit: source.sourceUnit === "m²" ? "square_meter" as const : "linear_meter" as const,
        sourceValue: source.sourceValue,
        quantityKind: source.quantityKind,
        quantityManuallyEdited: Number(item.quantity) !== Number(source.sourceValue),
      } : {}),
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

type DisplayUnitPrice = Readonly<{ amount: number; kind: MaterialPriceKind | null }>;

function lineUnitPrice(line: WorkflowLine, products: readonly MaterialProductRecord[], surveyMode: boolean): DisplayUnitPrice | null {
  if (line.kind === "manual" && line.manualPriceAmount && line.manualPriceKind) {
    const amount = Number(line.manualPriceAmount.replace(",", "."));
    return Number.isFinite(amount) && amount >= 0 ? { amount, kind: line.manualPriceKind } : null;
  }
  const variant = products.flatMap((product) => product.variants).find((item) => item.id === line.variantId);
  const selectedPrice = line.priceId ? variant?.prices.find((item) => item.id === line.priceId) : null;
  if (selectedPrice && selectedPrice.currency === "HUF" && selectedPrice.purchasingUnit === line.unit
    && (!surveyMode || selectedPrice.provenance === "verified")) {
    return { amount: selectedPrice.amount, kind: selectedPrice.priceKind };
  }
  const snapshot = line.priceSnapshot;
  const snapshotAmount = snapshot?.amount;
  const snapshotIsUsable = snapshot !== null
    && (typeof snapshotAmount === "string" || typeof snapshotAmount === "number")
    && snapshot.currency === "HUF" && (!surveyMode || (snapshot.provenance === "verified" && snapshot.manual !== true));
  if (snapshotIsUsable) {
    const amount = Number(snapshotAmount);
    const kind = snapshot.priceKind === "net" || snapshot.priceKind === "gross" ? snapshot.priceKind : null;
    if (Number.isFinite(amount) && amount >= 0) return { amount, kind };
  }
  return null;
}

export function calculateMaterialLineTotal(quantity: string, unitPrice: number): number | null {
  const normalizedQuantity = quantity.trim().replace(",", ".");
  if (!quantityPattern.test(normalizedQuantity)) return null;
  const amount = Number(normalizedQuantity);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return null;
  const total = amount * unitPrice;
  if (!Number.isFinite(total)) return null;
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

function formatHuf(amount: number) {
  return `${amount.toLocaleString("hu-HU", { maximumFractionDigits: 2 })} Ft`;
}

export function WorkflowMaterialListEditor({ organizationId, products, plans, categories, list, requestedPlanId = "", surveySource = null, defaultName = "" }: Readonly<{
  organizationId: string;
  products: readonly MaterialProductRecord[];
  plans: readonly ExecutionPlanOption[];
  categories: readonly MaterialCategoryRecord[];
  list: MaterialPreparationList | null;
  requestedPlanId?: string;
  surveySource?: WorkflowMaterialListSurveyContext | null;
  defaultName?: string;
}>) {
  const router = useRouter();
  const { notify, requestConfirmation } = useAppInteraction();
  const [state, action, pending] = useActionState(saveWorkflowMaterialListAction, initialState);
  const [name, setName] = useState(list?.name ?? defaultName);
  const [planId, setPlanId] = useState(list?.executionPlanId ?? requestedPlanId);
  const [lines, setLines] = useState<WorkflowLine[]>(() => list ? listLines(list, products) : suggestionLines(surveySource?.suggestions ?? []));
  const [allowStaleSource, setAllowStaleSource] = useState(false);
  const [entryMode, setEntryMode] = useState<"catalog" | "manual">("catalog");
  const [newItem, setNewItem] = useState<NewLine>(() => blankLine());
  const [addError, setAddError] = useState("");
  const manualNameInputRef = useRef<HTMLInputElement>(null);
  const catalogPickerFieldRef = useRef<HTMLLabelElement>(null);
  const requestKey = useMemo(() => generateSecureUuid(), [list?.id, list?.currentRevisionId]);
  const baseline = useRef(JSON.stringify({ name, planId, lines }));
  const dirty = JSON.stringify({ name, planId, lines }) !== baseline.current;
  const handledSave = useRef<string | null>(null);
  const activeCategories = categories.filter((category) => category.isActive);
  const savedSurveySource = list?.currentRevision?.surveySource ?? null;
  const activeSurveySource = surveySource ?? savedSurveySource;
  const surveyMode = Boolean(activeSurveySource);
  const creatingFromSurvey = Boolean(surveySource && !list);
  const priceSummary = useMemo(() => lines.reduce((summary, line) => {
    const price = lineUnitPrice(line, products, surveyMode);
    if (!price) return { ...summary, missing: summary.missing + 1 };
    const total = calculateMaterialLineTotal(line.quantity, price.amount);
    if (total === null) return { ...summary, invalid: summary.invalid + 1 };
    if (price?.kind === "net") return { ...summary, net: summary.net + total, netCount: summary.netCount + 1 };
    if (price?.kind === "gross") return { ...summary, gross: summary.gross + total, grossCount: summary.grossCount + 1 };
    return { ...summary, unclassified: summary.unclassified + 1 };
  }, { net: 0, gross: 0, missing: 0, invalid: 0, netCount: 0, grossCount: 0, unclassified: 0 }), [lines, products, surveyMode]);
  const categoryVariants = useMemo(() => products
    .filter((product) => product.status === "active" && product.categoryId === newItem.categoryId && product.categoryActive)
    .flatMap((product) => product.variants.map((variant) => ({ product, variant }))),
  [products, newItem.categoryId]);
  const productPickerOptions = useMemo<WorkflowMaterialProductOption[]>(() => categoryVariants.map(({ product, variant }) => ({
    id: variant.id,
    name: variant.name === "Alap egység" ? product.name : `${product.name} · ${variant.name}`,
    detail: `${product.categoryName} · ${materialPurchasingUnitLabels[variant.purchasingUnit]}${(surveyMode ? verifiedPrice(variant) : variant.latestPrice) ? ` · ${priceLabel((surveyMode ? verifiedPrice(variant) : variant.latestPrice)!.amount, variant.purchasingUnit, (surveyMode ? verifiedPrice(variant) : variant.latestPrice)!.priceKind)}` : " · Ár nincs megadva"}`,
    searchText: `${product.name} ${variant.name} ${variant.sku ?? ""}`,
  })), [categoryVariants, surveyMode]);
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
    const selectedPrice = surveyMode ? verifiedPrice(variant) : variant.latestPrice;
    setNewItem((current) => ({
      ...current, kind: "catalog", materialCategory: product.category, categoryId: product.categoryId,
      categoryName: product.categoryName,
      description: variant.name === "Alap egység" ? product.name : `${product.name} · ${variant.name}`,
      unit: variant.purchasingUnit, variantId: variant.id, priceId: selectedPrice?.id ?? null,
      manualPriceAmount: "", manualPriceKind: null,
    }));
  };

  const selectSurveyLineVariant = (line: WorkflowLine, rawId: string) => {
    if (!rawId) {
      updateLine(line.id, { kind: "manual", categoryId: null, categoryName: null, variantId: null, priceId: null, priceSnapshot: null, manualPriceAmount: "", manualPriceKind: null });
      return;
    }
    const entry = products.flatMap((product) => product.variants.map((variant) => ({ product, variant })))
      .find(({ variant, product }) => product.status === "active" && product.categoryActive
        && variant.id === rawId && variant.purchasingUnit === line.unit && variant.purchasingUnit === line.sourceUnit);
    if (!entry) return;
    const { product, variant } = entry;
    const price = verifiedPrice(variant);
    updateLine(line.id, {
      kind: "catalog", description: variant.name === "Alap egység" ? product.name : `${product.name} · ${variant.name}`,
      materialCategory: product.category, categoryId: product.categoryId, categoryName: product.categoryName,
      variantId: variant.id, priceId: price?.id ?? null, priceSnapshot: null,
      manualPriceAmount: "", manualPriceKind: null,
    });
  };

  const addLine = () => {
    const description = newItem.description.trim();
    if (!description) { setAddError("Írd be a tétel nevét."); return; }
    if (!quantityPattern.test(newItem.quantity) || Number(newItem.quantity.replace(",", ".")) <= 0) { setAddError("Adj meg nullánál nagyobb mennyiséget, legfeljebb 6 tizedesjeggyel."); return; }
    if (entryMode === "catalog" && (!newItem.categoryId || !newItem.variantId)) { setAddError("Válassz kategóriát és katalógusterméket."); return; }
    if (entryMode === "manual" && newItem.manualPriceAmount && !pricePattern.test(newItem.manualPriceAmount.replace(",", "."))) { setAddError("Az ár HUF-ban, legfeljebb két tizedesjeggyel adható meg."); return; }
    if (entryMode === "manual" && newItem.manualPriceAmount && !newItem.manualPriceKind) { setAddError("Ár megadásakor válaszd ki, hogy nettó vagy bruttó."); return; }
    setLines((current) => [...current, { ...newItem, kind: entryMode, description, id: generateSecureUuid(), priceSnapshot: null }]);
    setNewItem(entryMode === "catalog"
      ? { ...blankLine(newItem.categoryId), categoryName: newItem.categoryName }
      : { ...blankLine(), kind: "manual", materialCategory: "other", unit: newItem.unit });
    setAddError("");
    window.requestAnimationFrame(() => {
      if (entryMode === "manual") manualNameInputRef.current?.focus({ preventScroll: true });
      else catalogPickerFieldRef.current?.querySelector<HTMLButtonElement>(".workflow-material-product-trigger")?.focus({ preventScroll: true });
    });
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

  const headerContext = list
    ? `Mentett verzió V${list.version} · ${lines.length} tétel`
    : creatingFromSurvey ? `Felmérés V${surveySource!.surveyVersion} · önálló anyaglista` : "Önálló anyaglista · a munkanapló opcionális";
  return <div className="dashboard-shell"><div className="dashboard-container workflow-material-lists">
    <Link className="back-link" href={`/anyaglistak?organization=${organizationId}`}>← Anyaglisták</Link>
    <GlassPageHeader title={list?.name ?? (defaultName || "Új anyaglista")} context={headerContext} className="workflow-material-page-header" actions={<>
      {list?.currentRevisionId && <Link className="secondary-button" href={`/ajanlatok/uj?organization=${organizationId}&${planId ? `plan=${planId}&` : ""}materialList=${list.id}&materialRevision=${list.currentRevisionId}`}>Ajánlat ebből <ArrowUpRight aria-hidden="true" size={16} /></Link>}
      <Link className="secondary-button workflow-material-manager-link" href={`/anyagkezelo?organization=${organizationId}`}>Anyagkezelő</Link>
    </>} />
    <form action={action} className="workflow-material-editor">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="listId" value={list?.id ?? ""} />
      <input type="hidden" name="expectedVersion" value={list?.version ?? 0} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      {creatingFromSurvey && <>
        <input type="hidden" name="sourceSurveyId" value={surveySource!.surveyId} />
        <input type="hidden" name="sourceSurveyRevisionId" value={surveySource!.surveyRevisionId} />
        <input type="hidden" name="sourceSurveyVersion" value={surveySource!.surveyVersion} />
        <input type="hidden" name="allowStaleSource" value={allowStaleSource ? "true" : "false"} />
      </>}
      {creatingFromSurvey && <section className={`glass-bubble survey-material-source-card${surveySource!.stale ? " is-stale" : ""}`} aria-label="Felmérés forrása">
        <div className="workflow-source-heading"><span className="workflow-source-mark" aria-hidden="true"><PackageOpen size={17} /></span><div><strong>{surveySource!.surveyName} · V{surveySource!.surveyVersion}</strong><p>{surveySource!.stale ? `Elavult forrás · jelenlegi verzió V${surveySource!.currentSurveyVersion}` : "Felmérésből összeállított lista"}</p></div></div>
        {surveySource!.stale && <label className="survey-material-stale-confirm"><input type="checkbox" checked={allowStaleSource} onChange={(event) => setAllowStaleSource(event.target.checked)} />A korábbi V{surveySource!.surveyVersion} felmérésből kérem a listát.</label>}
        {surveySource!.suggestions.length === 0 && <p className="workflow-source-warning" role="status">Nincs biztonságosan átvehető mennyiség. Adj hozzá anyagot kézzel vagy katalógusból.</p>}
        {surveySource!.unavailable.length > 0 && <details className="workflow-source-unavailable"><summary>Nem átvehető mérések ({surveySource!.unavailable.length})</summary><ul>{surveySource!.unavailable.map((reason) => <li key={reason}>{reason}</li>)}</ul></details>}
      </section>}
      {savedSurveySource && <aside className={`glass-bubble survey-material-source-card${savedSurveySource.stale ? " is-stale" : ""}`} aria-label="Kapcsolt forrásfelmérés">
        <div className="workflow-source-heading"><span className="workflow-source-mark" aria-hidden="true"><PackageOpen size={17} /></span><div><strong>{savedSurveySource.surveyName} · V{savedSurveySource.surveyVersion}</strong><p>{savedSurveySource.stale ? `Korábbi forrásrevízió · jelenlegi felmérés V${savedSurveySource.currentSurveyVersion}` : "Pontos, változtathatatlan felmérésrevízió"}</p></div></div>
        <details className="workflow-source-disclosure"><summary>Forrásazonosítók</summary><p>Felmérés: {savedSurveySource.surveyId}</p><p>Revízió: {savedSurveySource.surveyRevisionId}</p></details>
      </aside>}
      <section className="glass-bubble workflow-material-meta" aria-label="Lista beállításai">
        <label className="workflow-material-meta-name"><span>Anyaglista neve</span><input name="name" maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Például: Tetőfelújítás anyagai" /></label>
        {creatingFromSurvey ? <><input type="hidden" name="executionPlanId" value="" /><p className="workflow-material-hint">Önálló lista · munkanapló és ügyfél nem szükséges</p></>
          : <label className="workflow-material-meta-association"><span>Munkanapló <small>opcionális kapcsolat</small></span><select name="executionPlanId" value={planId} disabled={Boolean(list)} onChange={(event) => setPlanId(event.target.value)}><option value="">Önálló anyaglista</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label>}
        {list && <input type="hidden" name="executionPlanId" value={planId} />}
      </section>
      <section className="glass-bubble workflow-material-lines" aria-labelledby="workflow-material-lines-title">
        <div className="workflow-list-section-heading"><div><p className="section-eyebrow">Anyagkimutatás</p><h2 id="workflow-material-lines-title">Tételek</h2></div><span className="workflow-material-item-count">{lines.length} tétel</span></div>
        {lines.length ? <div className="workflow-material-row-list">{lines.map((line) => {
          const product = products.find((entry) => entry.variants.some((variant) => variant.id === line.variantId));
          const variant = product?.variants.find((entry) => entry.id === line.variantId) ?? null;
          const linePrice = lineUnitPrice(line, products, surveyMode);
          const lineTotal = linePrice ? calculateMaterialLineTotal(line.quantity, linePrice.amount) : null;
          const selectableCategory = categories.find((category) => category.id === line.categoryId);
          const sourceProductOptions: WorkflowMaterialProductOption[] = line.sourceRef ? products
            .filter((entry) => entry.status === "active" && entry.categoryActive)
            .flatMap((entry) => entry.variants.filter((candidate) => candidate.purchasingUnit === line.sourceUnit).map((candidate) => ({
              id: candidate.id,
              name: candidate.name === "Alap egység" ? entry.name : `${entry.name} · ${candidate.name}`,
              detail: `${entry.categoryName} · ${materialPurchasingUnitLabels[candidate.purchasingUnit]}${verifiedPrice(candidate) ? ` · ${priceLabel(verifiedPrice(candidate)!.amount, candidate.purchasingUnit, verifiedPrice(candidate)!.priceKind)}` : " · Ár nincs megadva"}`,
              searchText: `${entry.name} ${candidate.name} ${candidate.sku ?? ""} ${entry.manufacturerName ?? ""}`,
            }))) : [];
          return <article className="workflow-material-row" key={line.id}>
            <div className="workflow-material-row-heading">
              <div className="workflow-material-row-tags"><span className="workflow-material-category">{selectableCategory?.name ?? line.categoryName ?? materialCategoryLabels[line.materialCategory]}</span><span className={`workflow-material-origin${line.sourceRef ? " is-survey" : ""}`}>{line.sourceRef ? "Felmérésből" : line.kind === "catalog" ? "Katalógus" : "Kézi tétel"}</span></div>
              <button className="workflow-material-remove" type="button" aria-label={`${line.description || "Tétel"} eltávolítása`} onClick={() => void removeLine(line)}><Trash2 aria-hidden="true" size={17} /><span>Eltávolítás</span></button>
            </div>
            {line.sourceLabel && <p className="workflow-material-source-label"><strong>Forrás:</strong> {line.sourceLabel}{line.quantityManuallyEdited && <span className="workflow-material-edited-note"> · A mennyiség módosult</span>}</p>}
            {surveyMode && !line.sourceRef && <p className="workflow-material-source-label">Ehhez a tételhez nincs rögzített felmérési forrás.</p>}
            <div className="workflow-material-row-fields">
              <label className="workflow-material-field workflow-material-description"><span>Anyag megnevezése</span><input aria-label={`${line.description || "Tétel"} megnevezése`} value={line.description} maxLength={240} onChange={(event) => updateLine(line.id, { description: event.target.value })} /></label>
              <label className="workflow-material-field workflow-material-quantity-field"><span>Mennyiség</span><input aria-label={`${line.description || "Tétel"} mennyisége`} inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} /></label>
              {line.kind === "manual" && !line.sourceRef
                ? <label className="workflow-material-field workflow-material-unit-field"><span>Egység</span><select aria-label={`${line.description || "Kézi tétel"} egysége`} value={line.unit} onChange={(event) => updateLine(line.id, { unit: event.target.value as MaterialPurchasingUnit })}>{materialPurchasingUnits.map((unit) => <option key={unit} value={unit}>{materialPurchasingUnitLabels[unit]}</option>)}</select></label>
                : <div className="workflow-material-value-field"><span>Egység</span><strong>{materialPurchasingUnitLabels[line.unit]}</strong></div>}
              {line.kind === "manual"
                ? <div className="workflow-material-price-editor"><label className="workflow-material-field"><span>Egységár <small>HUF · opcionális</small></span><input aria-label={`${line.description || "Tétel"} egységára HUF-ban`} inputMode="decimal" value={line.manualPriceAmount} onChange={(event) => updateLine(line.id, { manualPriceAmount: event.target.value, priceSnapshot: null })} placeholder="Nincs megadva" /></label>{line.manualPriceAmount && <label className="workflow-material-field"><span>Ár típusa</span><select aria-label={`${line.description || "Tétel"} árának típusa`} value={line.manualPriceKind ?? ""} onChange={(event) => updateLine(line.id, { manualPriceKind: event.target.value === "net" || event.target.value === "gross" ? event.target.value : null })}><option value="">Válassz…</option><option value="net">Nettó</option><option value="gross">Bruttó</option></select></label>}</div>
                : <div className="workflow-material-price-editor workflow-material-catalog-price"><div className="workflow-material-value-field"><span>Egységár</span><strong>{linePrice ? priceLabel(linePrice.amount, line.unit, linePrice.kind) : "Ár nincs megadva"}</strong></div>{variant && <label className="workflow-material-field"><span>Árrevízió</span><select aria-label={`${line.description} rögzített ára`} value={line.priceId ?? ""} onChange={(event) => updateLine(line.id, { priceId: event.target.value || null, priceSnapshot: null })}><option value="">Ár nélkül</option>{variant.prices.filter((item) => item.purchasingUnit === line.unit && (!surveyMode || (item.provenance === "verified" && item.currency === "HUF"))).map((item) => <option key={item.id} value={item.id}>{priceLabel(item.amount, item.purchasingUnit, item.priceKind)} · {item.effectiveDate}</option>)}</select></label>}</div>}
              <div className="workflow-material-line-total"><span>Részösszeg</span><strong>{lineTotal === null ? (linePrice ? "Mennyiség ellenőrzendő" : "Ár nincs megadva") : formatHuf(lineTotal)}</strong>{lineTotal !== null && linePrice?.kind && <small>{materialPriceKindLabels[linePrice.kind].toLowerCase()}</small>}</div>
            </div>
            {line.sourceRef && <div className="workflow-material-row-source-product"><label><span>Katalógustermék · az egység nem változik</span><WorkflowMaterialProductPicker options={sourceProductOptions} value={line.variantId ?? ""} disabled={!sourceProductOptions.length} idPrefix={`survey-material-${line.id}`} onSelect={(id) => selectSurveyLineVariant(line, id)} /></label>{line.variantId && <button type="button" className="text-action" onClick={() => selectSurveyLineVariant(line, "")}>Katalóguskapcsolat törlése</button>}{!sourceProductOptions.length && <small>Nincs ilyen egységű katalógustermék. A mért mennyiséget nem alakítjuk át darabra.</small>}</div>}
          </article>;
        })}</div> : <div className="workflow-material-empty"><PackageOpen aria-hidden="true" size={22} /><div><strong>Még nincs anyag a listában</strong><p>Válassz katalógusterméket, vagy adj hozzá kézi tételt.</p></div></div>}

        <section className="workflow-material-add-panel" aria-labelledby="workflow-material-add-title">
          <div className="workflow-material-add-heading"><div><p className="section-eyebrow">Új tétel</p><h3 id="workflow-material-add-title">Anyag hozzáadása</h3></div><div className="workflow-material-entry-mode" role="group" aria-label="Anyag hozzáadása módja">
            <button className={entryMode === "catalog" ? "is-selected" : ""} type="button" aria-pressed={entryMode === "catalog"} onClick={() => { setEntryMode("catalog"); setAddError(""); }}>Katalógusból</button>
            <button className={entryMode === "manual" ? "is-selected" : ""} type="button" aria-pressed={entryMode === "manual"} onClick={() => { setEntryMode("manual"); setAddError(""); setNewItem((current) => ({ ...current, kind: "manual", categoryId: null, categoryName: null, materialCategory: "other", variantId: null, priceId: null })); }}>Kézi tétel</button>
          </div></div>
          {entryMode === "catalog" ? <div className="workflow-material-add-fields workflow-material-catalog-entry" onKeyDown={(event) => { if (event.key === "Enter" && !event.defaultPrevented) { event.preventDefault(); addLine(); } }}>
            <label className="workflow-material-field"><span>Kategória</span><select aria-label="Anyag kategóriája" value={newItem.categoryId ?? ""} onChange={(event) => { setNewItem((current) => ({ ...current, categoryId: event.target.value || null, categoryName: null, variantId: null, priceId: null, description: "", unit: "piece" })); }}><option value="">Válassz kategóriát…</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="workflow-material-field workflow-material-product-field" ref={catalogPickerFieldRef}><span>Termék keresése</span><WorkflowMaterialProductPicker options={productPickerOptions} value={newItem.variantId ?? ""} disabled={!newItem.categoryId} onSelect={selectCatalogVariant} /></label>
            <label className="workflow-material-field"><span>Mennyiség</span><input aria-label="Új tétel mennyisége" inputMode="decimal" value={newItem.quantity} onChange={(event) => setNewItem((current) => ({ ...current, quantity: event.target.value }))} /></label>
            <div className="workflow-material-entry-facts"><span>{newItem.variantId ? `Egység · ${materialPurchasingUnitLabels[newItem.unit]}` : "Az egység a termékből töltődik be"}</span><span>{newItem.priceId ? (() => { const variant = categoryVariants.find(({ variant: item }) => item.id === newItem.variantId)?.variant; const price = variant ? (surveyMode ? verifiedPrice(variant) : variant.latestPrice) : null; return price ? `Ár · ${priceLabel(price.amount, newItem.unit, price.priceKind)}` : "Ár nincs megadva"; })() : "Ár nincs megadva"}</span></div>
            <button className="primary-button workflow-material-add-button" type="button" onClick={addLine} disabled={!newItem.variantId}><Plus aria-hidden="true" size={18} /> Hozzáadás</button>
            {!activeCategories.length && <p className="workflow-material-hint">Még nincs aktív kategória. <Link href={`/anyagkezelo?organization=${organizationId}`}>Kezeld az Anyagkezelőben</Link>, vagy válts kézi tételre.</p>}
          </div> : <div className="workflow-material-add-fields workflow-material-manual-entry" onKeyDown={(event) => { if (event.key === "Enter" && !event.defaultPrevented) { event.preventDefault(); addLine(); } }}>
            <label className="workflow-material-field workflow-material-manual-name"><span>Megnevezés</span><input ref={manualNameInputRef} aria-label="Új kézi anyag megnevezése" value={newItem.description} maxLength={240} onChange={(event) => setNewItem((current) => ({ ...current, description: event.target.value }))} placeholder="Például: egyedi szegélylemez" /></label>
            <label className="workflow-material-field"><span>Mennyiség</span><input aria-label="Új kézi tétel mennyisége" inputMode="decimal" value={newItem.quantity} onChange={(event) => setNewItem((current) => ({ ...current, quantity: event.target.value }))} /></label>
            <label className="workflow-material-field"><span>Egység</span><select aria-label="Új kézi tétel egysége" value={newItem.unit} onChange={(event) => setNewItem((current) => ({ ...current, unit: event.target.value as MaterialPurchasingUnit }))}>{materialPurchasingUnits.map((unit) => <option key={unit} value={unit}>{materialPurchasingUnitLabels[unit]}</option>)}</select></label>
            <label className="workflow-material-field"><span>Egységár <small>HUF · opcionális</small></span><input aria-label="Új kézi tétel egységára HUF-ban" inputMode="decimal" value={newItem.manualPriceAmount} onChange={(event) => setNewItem((current) => ({ ...current, manualPriceAmount: event.target.value }))} placeholder="Nincs megadva" /></label>
            {newItem.manualPriceAmount && <label className="workflow-material-field"><span>Ár típusa</span><select aria-label="Új kézi tétel árának típusa" value={newItem.manualPriceKind ?? ""} onChange={(event) => setNewItem((current) => ({ ...current, manualPriceKind: event.target.value === "net" || event.target.value === "gross" ? event.target.value : null }))}><option value="">Válassz…</option><option value="net">Nettó</option><option value="gross">Bruttó</option></select></label>}
            <button className="primary-button workflow-material-add-button" type="button" onClick={addLine}><Plus aria-hidden="true" size={18} /> Hozzáadás</button>
          </div>}
          {addError && <p className="form-message is-error workflow-material-add-error" role="alert">{addError}</p>}
        </section>
        <div className="workflow-material-summary" aria-label="Anyaglista árösszesítés">
          <span><strong>{lines.length}</strong> tétel</span>
          {lines.length === 0 ? <span>Az árösszesítés az első tétel után jelenik meg.</span> : <span className={priceSummary.missing ? "is-missing" : ""}>{priceSummary.missing ? `Ár nélkül: ${priceSummary.missing}` : "Minden tételhez tartozik ár"}</span>}
          {priceSummary.invalid > 0 && <span className="is-missing">Ellenőrzendő mennyiség: {priceSummary.invalid}</span>}
          {priceSummary.netCount > 0 && <span>Nettó részösszeg <strong>{formatHuf(priceSummary.net)}</strong></span>}
          {priceSummary.grossCount > 0 && <span>Bruttó részösszeg <strong>{formatHuf(priceSummary.gross)}</strong></span>}
          {priceSummary.unclassified > 0 && <span>Ártípus nélkül <strong>{priceSummary.unclassified} tétel</strong></span>}
        </div>
      </section>
      {state.error && <p className="form-message is-error" role="alert">{state.error}</p>}
      <footer className="workflow-material-save"><p role="status" aria-live="polite">{pending ? "Mentés folyamatban…" : state.ok ? `Mentve · V${state.version}` : dirty ? "Nem mentett módosítások" : list ? `Mentve · V${list.version}` : "Az anyaglista mentésre kész."}</p><button className="primary-button" type="submit" disabled={pending || Boolean(creatingFromSurvey && lines.length === 0) || Boolean(creatingFromSurvey && surveySource!.stale && !allowStaleSource)}>{pending ? "Mentés…" : list ? `Változat mentése · V${list.version + 1}` : creatingFromSurvey ? "Mennyiségek megerősítése és mentése" : "Anyaglista mentése"}</button></footer>
    </form>
  </div></div>;
}

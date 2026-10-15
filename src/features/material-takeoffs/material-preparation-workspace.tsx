"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { aggregateMaterialRequirements, type MaterialSourceTakeoff } from "@/domain/material-takeoffs/aggregation";
import { materialPurchasingUnitLabels, materialProvenanceLabels, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { preparationStatusLabel, purchasingStatuses, workshopStatuses, type MaterialPreparationItem, type PreparationCategory } from "@/domain/material-preparations/contracts";
import { saveMaterialPreparationAction, type MaterialPreparationActionState } from "./material-preparation-actions";
import type { MaterialPreparationList } from "./material-preparation-data";

type Props = Readonly<{
  organizationId: string;
  projectId: string;
  projectName: string;
  takeoffs: readonly MaterialSourceTakeoff[];
  lists: readonly MaterialPreparationList[];
  selectedListId: string | null;
  draftQuotations?: readonly Readonly<{ id: string; name: string; version: number }>[];
}>;

const initialActionState: MaterialPreparationActionState = { ok: false };
const unitEntries = Object.entries(materialPurchasingUnitLabels) as [MaterialPurchasingUnit, string][];
const dimensionLabels: Record<string, string> = {
  lengthMm: "hossz", widthMm: "szélesség", nominalWidthMm: "névleges szélesség",
  effectiveWidthMm: "hasznos szélesség", thicknessMm: "vastagság", packagingQuantity: "kiszerelés",
  profileDescription: "profil leírása", materialSpec: "anyag/minőség", technicalSpecs: "műszaki adatok",
};

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function workshopMissingData(item: MaterialPreparationItem): string[] {
  if (item.category !== "workshop") return [];
  const dimensions = item.dimensions;
  const missing = [
    !hasContent(dimensions.lengthMm) ? "hossz" : null,
    !hasContent(dimensions.widthMm) && !hasContent(dimensions.nominalWidthMm) && !hasContent(dimensions.effectiveWidthMm) ? "szélesség" : null,
    !hasContent(dimensions.thicknessMm) ? "vastagság" : null,
    !hasContent(dimensions.profileDescription) ? "profil leírása" : null,
    !hasContent(dimensions.materialSpec) && !hasContent(dimensions.technicalSpecs) ? "anyag/műszaki adat" : null,
  ].filter((value): value is string => value !== null);
  return missing;
}

function sourceIdsFrom(list: MaterialPreparationList | null): string[] {
  return list?.currentRevision?.sourceTakeoffs.map((source) => source.takeoffId) ?? [];
}

function editableItems(items: readonly MaterialPreparationItem[]) {
  return items.map(({ id, sourceItemIds, category, status, description, quantity, unit, dimensions, supplier, notes, provenance }) => ({
    id, sourceItemIds: [...sourceItemIds], category, status, description,
    quantity, unit, manualTechnicalData: provenance === "manual" ? dimensions : undefined,
    supplier: supplier ?? "", notes: notes ?? "",
  }));
}

function defaultStatus(category: PreparationCategory) {
  return category === "purchasing" ? "required" : "prepare";
}

export function MaterialPreparationWorkspace(props: Props) {
  const router = useRouter();
  const selectedList = props.lists.find((list) => list.id === props.selectedListId) ?? null;
  const savedItems = selectedList?.currentRevision?.items ?? [];
  const [actionState, action, pending] = useActionState(saveMaterialPreparationAction, initialActionState);
  const [name, setName] = useState(selectedList?.name ?? `${props.projectName} · beszerzés és műhely`);
  const [sourceIds, setSourceIds] = useState<string[]>(() => sourceIdsFrom(selectedList));
  const [items, setItems] = useState<MaterialPreparationItem[]>(() => [...savedItems]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | PreparationCategory>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [manualDraft, setManualDraft] = useState({ description: "", quantity: "1", unit: "piece" as MaterialPurchasingUnit, profileDescription: "", lengthMm: "", widthMm: "", thicknessMm: "", materialSpec: "", technicalNotes: "" });
  const handledSave = useRef<string | null>(null);
  const requestKey = useMemo(() => crypto.randomUUID(), [selectedList?.id, selectedList?.currentRevisionId]);
  const fingerprint = JSON.stringify({ name, sourceIds, items });
  const initialFingerprint = useRef(fingerprint);
  const dirty = fingerprint !== initialFingerprint.current;

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const confirmInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      if (!window.confirm("A nem mentett módosítások elvesznek. Folytatod?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    window.addEventListener("click", confirmInternalNavigation, true);
    return () => { window.removeEventListener("beforeunload", warnBeforeLeave); window.removeEventListener("click", confirmInternalNavigation, true); };
  }, [dirty]);

  useEffect(() => {
    if (!actionState.ok || !actionState.listId || actionState.version === undefined) return;
    const operation = `${actionState.listId}:${actionState.version}`;
    if (handledSave.current === operation) return;
    handledSave.current = operation;
    const url = `/projektek/${props.projectId}/beszerzes?organization=${props.organizationId}&lista=${actionState.listId}`;
    router.replace(url, { scroll: false });
    router.refresh();
  }, [actionState, props.organizationId, props.projectId, router]);

  const approved = props.takeoffs.filter((takeoff) => takeoff.status === "approved");
  const preliminary = props.takeoffs.filter((takeoff) => takeoff.status === "draft");
  const isPreliminary = sourceIds.some((id) => preliminary.some((takeoff) => takeoff.id === id)) || selectedList?.currentRevision?.state === "preliminary";
  const filteredItems = items.filter((item) => {
    const term = search.trim().toLocaleLowerCase("hu-HU");
    const matchesSearch = !term || [item.description, item.productName, item.variantName, item.supplier, item.notes, item.quantity].some((value) => value?.toLocaleLowerCase("hu-HU").includes(term));
    return matchesSearch && (categoryFilter === "all" || item.category === categoryFilter);
  });
  const sameCategorySelected = selectedItems.length > 0 && new Set(items.filter((item) => selectedItems.includes(item.id)).map((item) => item.category)).size === 1
    ? items.find((item) => selectedItems.includes(item.id))?.category ?? null : null;

  function rebuildSourceLines(nextIds: string[]) {
    const currentSourceItems = items.filter((item) => item.kind === "source");
    const manualItems = items.filter((item) => item.kind === "manual");
    const requirements = aggregateMaterialRequirements(props.takeoffs, nextIds);
    const sourceItems = requirements.map((requirement): MaterialPreparationItem => {
      const prior = currentSourceItems.find((item) => item.sourceItemIds.some((id) => requirement.sources.some((source) => source.itemId === id)));
      const category = prior?.category ?? "purchasing";
      const sourceSnapshot = requirement.materialSnapshot;
      const dimensions = Object.fromEntries(Object.entries(requirement.dimensions).filter(([, value]) => value !== null && value !== undefined));
      return {
        id: prior?.id ?? crypto.randomUUID(), kind: "source", category,
        status: prior && (category === "purchasing" ? purchasingStatuses : workshopStatuses).includes(prior.status as never) ? prior.status : defaultStatus(category),
        description: `${requirement.productName} · ${requirement.variantName}`,
        productId: requirement.productId, variantId: requirement.variantId, productName: requirement.productName,
        variantName: requirement.variantName, sku: requirement.sku, quantity: requirement.quantity, unit: requirement.unit,
        dimensions: { ...dimensions, ...((sourceSnapshot.technicalSpecs && typeof sourceSnapshot.technicalSpecs === "object") ? { technicalSpecs: sourceSnapshot.technicalSpecs } : {}) },
        materialSnapshot: sourceSnapshot, sourceItemIds: requirement.sources.map((source) => source.itemId),
        sourceSnapshots: requirement.sources.map((source) => ({ ...source, materialSnapshot: sourceSnapshot })),
        supplier: prior?.supplier ?? null, notes: prior?.notes ?? null,
        provenance: String(sourceSnapshot.provenance ?? sourceSnapshot.variantProvenance ?? "missing"),
      };
    });
    setItems([...sourceItems, ...manualItems]);
    setSelectedItems([]);
  }

  function toggleSource(takeoffId: string) {
    const nextIds = sourceIds.includes(takeoffId) ? sourceIds.filter((id) => id !== takeoffId) : [...sourceIds, takeoffId];
    setSourceIds(nextIds);
    rebuildSourceLines(nextIds);
  }

  function updateItem(id: string, update: Partial<MaterialPreparationItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  }

  function changeCategory(item: MaterialPreparationItem, category: PreparationCategory) {
    updateItem(item.id, { category, status: defaultStatus(category) });
  }

  function addManualItem() {
    const description = manualDraft.description.trim();
    if (!description || !/^\d{1,12}(?:\.\d{1,6})?$/.test(manualDraft.quantity) || Number(manualDraft.quantity) <= 0) return;
    const manualTechnicalData = {
      profileDescription: manualDraft.profileDescription.trim(), lengthMm: manualDraft.lengthMm.trim(),
      widthMm: manualDraft.widthMm.trim(), thicknessMm: manualDraft.thicknessMm.trim(),
      materialSpec: manualDraft.materialSpec.trim(), technicalNotes: manualDraft.technicalNotes.trim(),
    };
    setItems((current) => [...current, {
      id: crypto.randomUUID(), kind: "manual", category: "workshop", status: "prepare", description,
      quantity: manualDraft.quantity, unit: manualDraft.unit,
      dimensions: manualTechnicalData, sourceItemIds: [], sourceSnapshots: [], supplier: null, notes: null, provenance: "manual",
    }]);
    setManualDraft({ description: "", quantity: "1", unit: "piece", profileDescription: "", lengthMm: "", widthMm: "", thicknessMm: "", materialSpec: "", technicalNotes: "" });
  }

  const currentRevision = selectedList?.currentRevision;
  const exportUrl = selectedList ? `/api/projektek/${props.projectId}/beszerzes/${selectedList.id}/csv?organization=${props.organizationId}` : null;
  const print = () => window.print();

  return <div className="material-preparation-workspace">
    <section className="detail-surface preparation-overview">
      <div className="roof-list-heading"><div><p className="section-eyebrow">Beszerzés és gyártás</p><h2>{props.projectName}</h2></div>{selectedList && <div className="preparation-export-actions no-print"><button className="secondary-button" type="button" onClick={print}>Nyomtatás</button>{exportUrl && <a className="secondary-button" href={exportUrl}>CSV letöltése</a>}</div>}</div>
      <p className="detail-description">Jóváhagyott anyagkimutatásból indul. A mentés megőrzi a kiválasztott forrásokat és a lista korábbi változatait.</p>
      {props.lists.length > 0 && <div className="preparation-saved-lists no-print"><p className="section-eyebrow">Mentett listák</p><div className="preparation-list-links">{props.lists.map((list) => <Link key={list.id} className={selectedList?.id === list.id ? "preparation-list-link active" : "preparation-list-link"} href={`/projektek/${props.projectId}/beszerzes?organization=${props.organizationId}&lista=${list.id}`}><strong>{list.name}</strong><small>{list.version}. revízió · {list.currentRevision?.items.length ?? 0} tétel{list.currentRevision?.state === "preliminary" ? " · ELŐZETES" : ""}</small></Link>)}</div></div>}
      {selectedList && <p className="preparation-current-list-label">Megnyitott lista: <strong>{selectedList.name}</strong> · V{selectedList.version}</p>}
      {!selectedList && <p className="preparation-current-list-label">Új lista készül. A projekthez több külön lista is menthető.</p>}
      {props.draftQuotations?.length ? <div className="preparation-related-quotes no-print"><p className="section-eyebrow">Kapcsolódó ajánlatpiszkozatok</p>{props.draftQuotations.map((quote) => <Link key={quote.id} href={`/projektek/${props.projectId}/ajanlatok?organization=${props.organizationId}&edit=${quote.id}`}>{quote.name} · V{quote.version}</Link>)}</div> : null}
    </section>

    <form action={action} className="preparation-editor-form">
      <input type="hidden" name="organizationId" value={props.organizationId} />
      <input type="hidden" name="projectId" value={props.projectId} />
      <input type="hidden" name="preparationId" value={selectedList?.id ?? ""} />
      <input type="hidden" name="expectedVersion" value={selectedList?.version ?? 0} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="sourceTakeoffIds" value={JSON.stringify(sourceIds)} />
      <input type="hidden" name="items" value={JSON.stringify(editableItems(items))} />

      <section className="detail-surface preparation-source-panel no-print">
        <div className="roof-list-heading"><div><p className="section-eyebrow">1. Források</p><h2>Anyagkimutatások</h2></div><span className="preparation-count">{sourceIds.length} kiválasztva</span></div>
        <p className="detail-description">A forráscsoport módosítása csak a lista mentésekor lép életbe. Minden kiválasztott kimutatás minden tétele bekerül.</p>
        <label className="preparation-name-field">Lista megnevezése<input name="name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required /></label>
        {approved.length ? <div className="preparation-source-list">{approved.map((takeoff) => <TakeoffChoice key={takeoff.id} takeoff={takeoff} selected={sourceIds.includes(takeoff.id)} onToggle={() => toggleSource(takeoff.id)} />)}</div> : <p className="preparation-empty">Ehhez a projekthez nincs jóváhagyott anyagkimutatás.</p>}
        {preliminary.length > 0 && <details className="preparation-preliminary-picker"><summary>Előzetes, nem jóváhagyott tervezetek ({preliminary.length})</summary><p>Csak előzetes listába kerülnek; a beszerzésre kész állapotot a rendszer nem adja meg automatikusan.</p><div className="preparation-source-list">{preliminary.map((takeoff) => <TakeoffChoice key={takeoff.id} takeoff={takeoff} selected={sourceIds.includes(takeoff.id)} onToggle={() => toggleSource(takeoff.id)} preliminary />)}</div></details>}
        {selectedList?.currentRevision?.staleTakeoffIds.length ? <p className="preparation-stale-banner">Forrás elavult: a kalkuláció azóta újabb revíziót kapott. A korábbi mennyiség nem változott. Jelöld ki az új, jóváhagyott anyagkimutatást, majd mentsd a lista új változatát a frissítéshez.</p> : null}
      </section>

      <section className="detail-surface preparation-items-panel">
        <div className="roof-list-heading"><div><p className="section-eyebrow">2. Előkészítés</p><h2>Anyagok és műhelytételek</h2></div><span className={isPreliminary ? "preparation-state preliminary" : "preparation-state ready"}>{isPreliminary ? "ELŐZETES" : "JÓVÁHAGYOTT FORRÁS"}</span></div>
        {isPreliminary && <p className="preparation-stale-banner">Ez a lista előzetes, mert nem jóváhagyott kimutatást tartalmaz. Megrendeléshez használj jóváhagyott forrást.</p>}
        {currentRevision?.staleTakeoffIds.length ? <p className="preparation-stale-banner">A mentett forrás változatlanul megmarad. A mennyiségeket csak kifejezett forrásfrissítés után cseréljük.</p> : null}
        <div className="preparation-filters no-print"><label>Keresés<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Anyag, méret, beszállító…" /></label><label>Kategória<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | PreparationCategory)}><option value="all">Mindkettő</option><option value="purchasing">Beszerzés</option><option value="workshop">Műhelyben elkészítendő</option></select></label></div>
        {sameCategorySelected && <div className="preparation-bulk-actions no-print"><span>{selectedItems.length} tétel kijelölve</span><select aria-label="Kijelölt tételek új állapota" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}><option value="">Állapot kiválasztása</option>{(sameCategorySelected === "purchasing" ? purchasingStatuses : workshopStatuses).map((status) => <option key={status} value={status}>{preparationStatusLabel(sameCategorySelected, status)}</option>)}</select><button type="button" className="secondary-button" disabled={!bulkStatus} onClick={() => { setItems((current) => current.map((item) => selectedItems.includes(item.id) ? { ...item, status: bulkStatus } : item)); setBulkStatus(""); }}>Alkalmazás</button></div>}
        {filteredItems.length ? <div className="preparation-item-list">{filteredItems.map((item) => <PreparationItemCard key={item.id} item={item} selected={selectedItems.includes(item.id)} onSelect={() => setSelectedItems((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} onChange={(update) => updateItem(item.id, update)} onCategoryChange={(category) => changeCategory(item, category)} onRemove={() => { setItems((current) => current.filter((line) => line.id !== item.id)); setSelectedItems((current) => current.filter((id) => id !== item.id)); }} />)}</div> : <p className="preparation-empty">{items.length ? "A keresésnek nincs találata." : "Válassz egy vagy több anyagkimutatást, vagy adj hozzá kézi műhelytételt."}</p>}
        <ManualItemForm draft={manualDraft} onChange={(update) => setManualDraft((current) => ({ ...current, ...update }))} onAdd={addManualItem} />
      </section>

      {selectedList?.history && selectedList.history.length > 1 && <section className="detail-surface preparation-history"><details><summary>Korábbi változatok ({selectedList.history.length - 1})</summary><div className="preparation-history-list">{selectedList.history.filter((revision) => revision.id !== selectedList.currentRevisionId).map((revision) => <article key={revision.id}><strong>V{revision.revisionNumber} · {revision.state === "preliminary" ? "Előzetes" : "Jóváhagyott forrás"}</strong><small>{new Date(revision.createdAt).toLocaleString("hu-HU")} · {revision.items.length} tétel · forrás: {revision.sourceTakeoffs.map((source) => source.name).join(", ") || "kézi műhelytételek"}</small><ul>{revision.items.map((item) => <li key={item.id}>{item.description} · {item.quantity} {materialPurchasingUnitLabels[item.unit as MaterialPurchasingUnit] ?? item.unit} · {preparationStatusLabel(item.category, item.status)}</li>)}</ul></article>)}</div></details></section>}

      <div className="preparation-save-bar no-print"><p aria-live="polite">{actionState.error ?? (pending ? "Mentés folyamatban…" : actionState.ok ? `Mentve · V${actionState.version}` : dirty ? "Nem mentett módosítások." : selectedList ? `Mentve · V${selectedList.version}` : "Válassz forrást vagy adj meg kézi műhelytételt.")}</p><button className="primary-button" type="submit" disabled={pending || items.length === 0}>{pending ? "Mentés…" : selectedList ? "Változat mentése" : "Előkészítési lista mentése"}</button></div>
    </form>
    <div className="preparation-print-heading"><h1>{name || selectedList?.name || props.projectName}</h1><p>{props.projectName} · {new Date().toLocaleDateString("hu-HU")}{currentRevision ? ` · V${currentRevision.revisionNumber}` : ""}{isPreliminary ? " · ELŐZETES" : " · jóváhagyott forrás"}</p></div>
  </div>;
}

function TakeoffChoice({ takeoff, selected, onToggle, preliminary = false }: Readonly<{ takeoff: MaterialSourceTakeoff; selected: boolean; onToggle: () => void; preliminary?: boolean }>) {
  const stale = takeoff.sourceRevisionId !== takeoff.sourceCurrentRevisionId;
  return <label className={selected ? "preparation-source-choice selected" : "preparation-source-choice"}>
    <input type="checkbox" checked={selected} onChange={onToggle} />
    <span><strong>{takeoff.name}</strong><small>{takeoff.items.length} tétel · V{takeoff.version} · forrásszámítás {takeoff.sourceRevisionId.slice(0, 8)}</small></span>
    {preliminary && <span className="preparation-state preliminary">ELŐZETES</span>}
    {stale && <span className="preparation-stale-label">Elavult forrás</span>}
  </label>;
}

function PreparationItemCard({ item, selected, onSelect, onChange, onCategoryChange, onRemove }: Readonly<{
  item: MaterialPreparationItem;
  selected: boolean;
  onSelect: () => void;
  onChange: (update: Partial<MaterialPreparationItem>) => void;
  onCategoryChange: (category: PreparationCategory) => void;
  onRemove: () => void;
}>) {
  const missing = workshopMissingData(item);
  return <article className="preparation-item-card">
    <div className="preparation-item-main">
      <input className="preparation-item-select no-print" type="checkbox" aria-label={`Kijelölés: ${item.description}`} checked={selected} onChange={onSelect} />
      <div className="preparation-item-summary"><span className={item.category === "purchasing" ? "preparation-category purchasing" : "preparation-category workshop"}>{item.category === "purchasing" ? "Beszerzés" : "Műhelyben elkészítendő"}</span><strong>{item.description}</strong><small>{item.kind === "manual" ? "Kézi tétel" : `${item.productName ?? "Anyag"}${item.variantName ? ` · ${item.variantName}` : ""}${item.sku ? ` · ${item.sku}` : ""}`}</small></div>
      <strong className="preparation-quantity">{Number(item.quantity).toLocaleString("hu-HU", { maximumFractionDigits: 6 })} {materialPurchasingUnitLabels[item.unit as MaterialPurchasingUnit] ?? item.unit}</strong>
      <label className="preparation-row-status">Állapot<select value={item.status} onChange={(event) => onChange({ status: event.target.value })}>{(item.category === "purchasing" ? purchasingStatuses : workshopStatuses).map((status) => <option value={status} key={status}>{preparationStatusLabel(item.category, status)}</option>)}</select></label>
      <label className="preparation-row-category no-print">Lista<select value={item.category} onChange={(event) => onCategoryChange(event.target.value as PreparationCategory)}><option value="purchasing">Beszerzés</option><option value="workshop">Műhely</option></select></label>
    </div>
    {item.category === "workshop" && missing.length > 0 && <p className="preparation-missing">A forráspillanatképban nincs megadva: {missing.join(", ")}. Ez nem gyártási rajz vagy CNC utasítás.</p>}
    {item.supplier && <p className="preparation-item-note">Beszállító: {item.supplier}</p>}
    {item.notes && <p className="preparation-item-note">Megjegyzés: {item.notes}</p>}
    <details className="preparation-technical-details"><summary>Műszaki adatok és források</summary><div className="preparation-dimension-list">{Object.entries(item.dimensions).filter(([, value]) => hasContent(value)).map(([key, value]) => <span key={key}><small>{dimensionLabels[key] ?? key}</small><strong>{typeof value === "object" ? JSON.stringify(value) : `${String(value)}${key.endsWith("Mm") ? " mm" : ""}`}</strong></span>)}</div><p>Eredet: {item.kind === "manual" ? "Kézi tétel" : materialProvenanceLabels[item.provenance as keyof typeof materialProvenanceLabels] ?? item.provenance}</p>{item.sourceSnapshots.length > 0 && <ul>{item.sourceSnapshots.map((source) => <li key={String(source.itemId)}>{String(source.takeoffName)} V{String(source.takeoffVersion)} · kalkulációs revízió {String(source.calculationRevisionId)}</li>)}</ul>}</details>
    <details className="preparation-row-options no-print"><summary>Megjegyzés és beszállító</summary><div className="preparation-row-options-grid"><label>Beszállító (csak ha ismert)<input maxLength={200} value={item.supplier ?? ""} onChange={(event) => onChange({ supplier: event.target.value || null })} /></label><label>Megjegyzés<textarea maxLength={1000} rows={2} value={item.notes ?? ""} onChange={(event) => onChange({ notes: event.target.value || null })} /></label></div></details>
    {item.kind === "manual" && <button className="preparation-remove-button no-print" type="button" onClick={onRemove}>Tétel eltávolítása</button>}
  </article>;
}

type ManualDraft = { description: string; quantity: string; unit: MaterialPurchasingUnit; profileDescription: string; lengthMm: string; widthMm: string; thicknessMm: string; materialSpec: string; technicalNotes: string };

function ManualItemForm({ draft, onChange, onAdd }: Readonly<{ draft: ManualDraft; onChange: (update: Partial<ManualDraft>) => void; onAdd: () => void }>) {
  return <details className="preparation-manual-form no-print"><summary>+ Kézi műhelytétel hozzáadása</summary><p>A kézi tétel nem kap anyagkimutatás- vagy gyártói eredetet; csak a megadott adatokat mentjük.</p><div className="preparation-manual-fields">
    <label>Megnevezés<input maxLength={240} value={draft.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Például: DEMO egyedi szegély" /></label>
    <label>Mennyiség<input inputMode="decimal" pattern="[0-9]+([.][0-9]{1,6})?" value={draft.quantity} onChange={(event) => onChange({ quantity: event.target.value.replace(",", ".") })} /></label>
    <label>Egység<select value={draft.unit} onChange={(event) => onChange({ unit: event.target.value as MaterialPurchasingUnit })}>{unitEntries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Profil leírása<input maxLength={240} value={draft.profileDescription} onChange={(event) => onChange({ profileDescription: event.target.value })} /></label>
    <label>Hossz (mm)<input inputMode="decimal" value={draft.lengthMm} onChange={(event) => onChange({ lengthMm: event.target.value.replace(",", ".") })} /></label>
    <label>Szélesség (mm)<input inputMode="decimal" value={draft.widthMm} onChange={(event) => onChange({ widthMm: event.target.value.replace(",", ".") })} /></label>
    <label>Vastagság (mm)<input inputMode="decimal" value={draft.thicknessMm} onChange={(event) => onChange({ thicknessMm: event.target.value.replace(",", ".") })} /></label>
    <label>Anyag / minőség<input maxLength={240} value={draft.materialSpec} onChange={(event) => onChange({ materialSpec: event.target.value })} /></label>
    <label className="preparation-manual-wide">Műszaki megjegyzés<textarea maxLength={1000} rows={2} value={draft.technicalNotes} onChange={(event) => onChange({ technicalNotes: event.target.value })} /></label>
  </div><button type="button" className="secondary-button" onClick={onAdd} disabled={!draft.description.trim() || !/^\d{1,12}(?:\.\d{1,6})?$/.test(draft.quantity) || Number(draft.quantity) <= 0}>Kézi tétel hozzáadása</button></details>;
}

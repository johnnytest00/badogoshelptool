"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lineTotal, scaledToDecimal } from "@/domain/quotations/money";
import { guardUnsavedNavigation, warnBeforeUnloadIfDirty } from "@/lib/unsaved-changes";
import { saveQuotationDraftAction, type QuotationActionResult } from "./quotation-actions";
import type { QuotationRecord } from "./quotation-data";
import type { QuotationVariant } from "./quotation-data";
import { clearOtherQuotationRecoveryOwners, isQuotationRecoveryCurrent, quotationRecoveryKey, readQuotationRecovery, writeQuotationRecovery, type QuotationRecovery } from "./quotation-draft-recovery";
import type { PreparedQuotationMaterialLine } from "@/domain/material-takeoffs/aggregation";
import { materialPurchasingUnitLabels, type MaterialPurchasingUnit } from "@/domain/materials/contracts";

type Line = { type: "MATERIAL" | "LABOR" | "OTHER"; description: string; quantity: string; unit: string; unitPrice: string; priceClass: "net" | "gross"; variantId: string; priceId: string; takeoffItemId: string; takeoffSourceItemIds: string[]; priceProvenance: "catalog_snapshot" | "takeoff_snapshot" | "user_entered" | "missing"; notes: string };
const empty = (type: Line["type"] = "LABOR"): Line => ({ type, description: "", quantity: "1", unit: type === "LABOR" ? "óra" : "db", unitPrice: "", priceClass: "net", variantId: "", priceId: "", takeoffItemId: "", takeoffSourceItemIds: [], priceProvenance: "missing", notes: "" });

function quoteLine(line: Record<string, unknown>): Line {
  const priceId = String(line.priceId ?? "");
  const sourceIds = Array.isArray(line.takeoffSourceItemIds) ? line.takeoffSourceItemIds.filter((id): id is string => typeof id === "string") : [];
  const priceProvenance = line.priceProvenance === "catalog_snapshot" || line.priceProvenance === "takeoff_snapshot" || line.priceProvenance === "user_entered" || line.priceProvenance === "missing"
    ? line.priceProvenance : priceId ? "catalog_snapshot" : String(line.unitPrice ?? "") ? "user_entered" : "missing";
  return { type: String(line.type) as Line["type"], description: String(line.description ?? ""), quantity: String(line.quantity ?? ""), unit: String(line.unit ?? ""), unitPrice: String(line.unitPrice ?? ""), priceClass: String(line.priceClass ?? "net") as Line["priceClass"], variantId: String(line.variantId ?? ""), priceId, takeoffItemId: String(line.takeoffItemId ?? ""), takeoffSourceItemIds: sourceIds, priceProvenance, notes: String(line.notes ?? "") };
}

export function QuotationEditor({ userId, organizationId, projectId, clients, variants, takeoffItems, quote, preparedLines = [], transferError = "", operationId = "", alreadyIncludedCount = 0 }: Readonly<{ userId: string; organizationId: string; projectId: string; clients: Array<{ id: string; name: string }>; variants: QuotationVariant[]; takeoffItems: Array<{ id: string; quantity: string; unit: string; materialSnapshot: unknown }>; quote?: QuotationRecord; preparedLines?: readonly PreparedQuotationMaterialLine[]; transferError?: string; operationId?: string; alreadyIncludedCount?: number }>) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [result, setResult] = useState<QuotationActionResult>({ ok: false }); const [dirty, setDirty] = useState(false); const dirtyRef = useRef(false);
  const updateDirty = (value: boolean) => { dirtyRef.current = value; setDirty(value); };
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => warnBeforeUnloadIfDirty(dirtyRef.current, event); window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, []);
  const [name, setName] = useState(quote?.name ?? "Belső ajánlati piszkozat"); const [clientId, setClientId] = useState(quote?.clientId ?? "");
  const [lines, setLines] = useState<Line[]>(() => [...(quote?.lines.map(quoteLine) ?? []), ...preparedLines.map((line) => ({ ...line }))]);
  const baseline = useRef(JSON.stringify({ name, clientId, lines }));
  const recoveryKey = quotationRecoveryKey(userId, organizationId, projectId, quote?.id ?? null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recovery, setRecovery] = useState<{ value: QuotationRecovery; current: boolean } | null>(null);
  const saveLock = useRef(false);
  useEffect(() => {
    try {
      clearOtherQuotationRecoveryOwners(window.sessionStorage, userId);
      const saved = readQuotationRecovery(window.sessionStorage, recoveryKey);
      if (saved) setRecovery({ value: saved, current: isQuotationRecoveryCurrent(saved, quote?.version ?? 0, quote?.currentRevisionId ?? null) });
    } catch { /* A letiltott munkamenet-tár nem akadályozhatja az ajánlatszerkesztést. */ }
    setRecoveryReady(true);
  }, [recoveryKey, userId, quote?.currentRevisionId, quote?.version]);
  useEffect(() => {
    if (!recoveryReady) return;
    if (!dirty && recovery) return;
    try {
      if (dirty) writeQuotationRecovery(window.sessionStorage, recoveryKey, { sourceVersion: quote?.version ?? 0, sourceRevisionId: quote?.currentRevisionId ?? null, values: { name, clientId, lines } });
      else window.sessionStorage.removeItem(recoveryKey);
    } catch { /* Storage quota/privacy settings must not break editing. */ }
  }, [clientId, dirty, lines, name, quote?.currentRevisionId, quote?.version, recovery, recoveryKey, recoveryReady]);
  const discardRecovery = () => { try { window.sessionStorage.removeItem(recoveryKey); } catch { /* Best effort. */ } setRecovery(null); };
  const restoreRecovery = () => {
    if (!recovery?.current) return;
    const values = recovery.value.values;
    setName(values.name); setClientId(values.clientId); setLines(values.lines.map((line) => quoteLine(line as unknown as Record<string, unknown>))); updateDirty(JSON.stringify(values) !== baseline.current); setRecovery(null);
  };
  const syncDirty = (nextName = name, nextClientId = clientId, nextLines = lines) => updateDirty(JSON.stringify({ name: nextName, clientId: nextClientId, lines: nextLines }) !== baseline.current);
  const update = (index: number, change: Partial<Line>) => { const next = lines.map((line, itemIndex) => itemIndex === index ? { ...line, ...change } : line); setLines(next); syncDirty(name, clientId, next); };
  const allPricesEntered = lines.every((line) => line.unitPrice.trim() !== "");
  const totals = lines.reduce((sum, line) => { if (!line.unitPrice.trim()) return sum; try { return sum + lineTotal(line.quantity || "0", line.unitPrice).minor; } catch { return sum; } }, BigInt(0));
  const importedCount = preparedLines.reduce((count, line) => count + line.takeoffSourceItemIds.length, 0);
  const save = () => {
    if (saveLock.current || pending || transferError) return;
    saveLock.current = true;
    const data = new FormData(); data.set("organizationId", organizationId); data.set("projectId", projectId); if (quote) { data.set("quotationId", quote.id); data.set("version", String(quote.version)); } if (operationId) data.set("operationId", operationId); data.set("name", name); data.set("clientId", clientId); data.set("lines", JSON.stringify(lines)); setResult({ ok: false });
    startTransition(async () => { try { const next = await saveQuotationDraftAction(data); setResult(next); if (next.ok) { try { window.sessionStorage.removeItem(recoveryKey); } catch { /* Best effort. */ } setRecovery(null); baseline.current = JSON.stringify({ name, clientId, lines }); updateDirty(false); router.push(`/projektek/${projectId}/ajanlatok?organization=${organizationId}`); } } finally { saveLock.current = false; } });
  };
  return <section className="quotation-editor detail-surface">
    <div className="section-heading"><div><p className="section-eyebrow">Belső ajánlati piszkozat</p><h2>{quote ? `Ajánlat szerkesztése · v${quote.version}` : "Új ajánlati piszkozat"}</h2></div><span className="status-pill">HUF</span></div>
    <Link className="back-link" href={`/projektek/${projectId}?organization=${organizationId}`} onNavigate={(event) => guardUnsavedNavigation(event, { dirty, pending, confirmDiscard: () => window.confirm("A nem mentett ajánlati módosítások elvesznek. Elveted őket és visszatérsz a projekthez?"), onDiscard: () => { updateDirty(false); discardRecovery(); } })}>← Vissza a projekthez</Link>
    {transferError && <p className="form-message is-error" role="alert">{transferError}</p>}
    {(importedCount > 0 || alreadyIncludedCount > 0) && <p className="form-message" role="status">{importedCount > 0 ? `${importedCount} kimutatási anyagtétel összevonva.` : "Minden kiválasztott tétel már szerepel az ajánlatban."} {alreadyIncludedCount > 0 ? `${alreadyIncludedCount} már átvett forrás kimaradt a duplikáció elkerülésére. ` : ""}{importedCount > 0 ? "Ellenőrizd az árat, majd egészítsd ki a munkadíjjal és az egyéb tételekkel." : ""}</p>}
    {recovery && <section className="form-message" role="status"><p>{recovery.current ? "Korábban nem mentett ajánlati változat található ebben a munkamenetben." : "A helyi változat alapjául szolgáló ajánlati revízió azóta megváltozott. A mentett szerveradatokat nem írjuk felül."}</p>{recovery.current && <button className="secondary-button" type="button" onClick={restoreRecovery}>Változat visszaállítása</button>}<button className="text-button" type="button" onClick={discardRecovery}>Helyi változat elvetése</button></section>}
    <fieldset className="quotation-editor-fields" disabled={pending || !recoveryReady} aria-busy={pending || !recoveryReady}><div className="quotation-meta"><label>Ajánlat neve<input value={name} onChange={(event) => { setName(event.target.value); syncDirty(event.target.value); }} /></label><label>Ügyfél<select value={clientId} onChange={(event) => { setClientId(event.target.value); syncDirty(name, event.target.value); }}><option value="">Ügyfél nélkül</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label></div>
    <div className="quotation-lines"><div className="section-heading"><h3>Tételek</h3><div className="quotation-add-actions"><button className="secondary-button" type="button" onClick={() => { const next = [...lines, empty("MATERIAL")]; setLines(next); syncDirty(name, clientId, next); }}>+ Anyag</button><button className="secondary-button" type="button" onClick={() => { const next = [...lines, empty("LABOR")]; setLines(next); syncDirty(name, clientId, next); }}>+ Munkadíj</button><button className="secondary-button" type="button" onClick={() => { const next = [...lines, empty("OTHER")]; setLines(next); syncDirty(name, clientId, next); }}>+ Egyéb</button></div></div>
    {lines.map((line, index) => <div className="quotation-line" key={`${index}-${line.description}`}><div className="quotation-line-grid">
      <label>Típus<select value={line.type} onChange={(event) => update(index, { type: event.target.value as Line["type"] })}><option value="MATERIAL">Anyag</option><option value="LABOR">Munkadíj</option><option value="OTHER">Egyéb</option></select></label>
      <label>Megnevezés<input value={line.description} onChange={(event) => update(index, { description: event.target.value })} /></label>
      <label>Mennyiség<input inputMode="decimal" value={line.quantity} onChange={(event) => update(index, { quantity: event.target.value })} /></label>
      <label>Egység<input value={line.takeoffSourceItemIds.length ? materialPurchasingUnitLabels[line.unit as MaterialPurchasingUnit] ?? line.unit : line.unit} readOnly={line.takeoffSourceItemIds.length > 0} onChange={(event) => update(index, { unit: event.target.value })} /></label>
      <label>Egységár (HUF)<input inputMode="decimal" value={line.unitPrice} onChange={(event) => update(index, { unitPrice: event.target.value, priceId: "", priceProvenance: event.target.value.trim() ? "user_entered" : "missing" })} /></label>
      <label>Nettó/bruttó<select value={line.priceClass} onChange={(event) => update(index, { priceClass: event.target.value as Line["priceClass"] })}><option value="net">Nettó</option><option value="gross">Bruttó</option></select></label>
      {line.type === "MATERIAL" && <label>Katalógusváltozat<select value={line.variantId} onChange={(event) => { const variant = variants.find((item) => item.id === event.target.value); update(index, { variantId: event.target.value, unit: variant?.purchasingUnit ?? line.unit, priceId: "", priceProvenance: line.unitPrice.trim() ? "user_entered" : "missing" }); }}><option value="">Válassz…</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}{variant.sku ? ` · ${variant.sku}` : ""}</option>)}</select></label>}
      {line.variantId && <label>Rögzített ár<select value={line.priceId} onChange={(event) => { const price = variants.find((variant) => variant.id === line.variantId)?.prices.find((item) => item.id === event.target.value); update(index, { priceId: event.target.value, unitPrice: price ? String(price.amount) : line.unitPrice, priceClass: price?.priceKind ?? line.priceClass, priceProvenance: price ? "catalog_snapshot" : line.unitPrice.trim() ? "user_entered" : "missing" }); }}><option value="">Kézi ár</option>{variants.find((variant) => variant.id === line.variantId)?.prices.map((price) => <option key={price.id} value={price.id}>{price.amount.toLocaleString("hu-HU")} HUF · {price.effectiveDate}</option>)}</select></label>}
      {line.type === "MATERIAL" && takeoffItems.length > 0 && <label>Jóváhagyott kimutatási forrás<select value={line.takeoffItemId} onChange={(event) => { const item = takeoffItems.find((candidate) => candidate.id === event.target.value); update(index, { takeoffItemId: event.target.value, takeoffSourceItemIds: [], quantity: item?.quantity ?? line.quantity, unit: item?.unit ?? line.unit }); }}><option value="">Nincs import</option>{takeoffItems.map((item) => <option key={item.id} value={item.id}>{item.quantity} {item.unit}</option>)}</select></label>}
      <output className="quotation-line-total">{line.unitPrice.trim() ? (() => { try { return `${scaledToDecimal(lineTotal(line.quantity || "0", line.unitPrice).minor, 2)} HUF`; } catch { return "—"; } })() : "Hiányzó egységár"}</output>
      <button className="text-button" type="button" onClick={() => { const next = lines.filter((_, itemIndex) => itemIndex !== index); setLines(next); syncDirty(name, clientId, next); }}>Törlés</button></div>
      {line.takeoffSourceItemIds.length > 0 && <details><summary>Forráskimutatások ({line.takeoffSourceItemIds.length} tétel)</summary><p>A sor jóváhagyott, változatlan kimutatási tételekből készült. Az egységár csak egyező rögzített ár esetén jelenik meg.</p></details>}</div>)}</div>
    <div className="quotation-summary"><div><span>Összesítés</span><strong>{!lines.length ? "Nincs összesítés · még nincsenek tételek" : allPricesEntered ? `${scaledToDecimal(totals, 2)} HUF` : `Hiányzó ár · még ${lines.filter((line) => !line.unitPrice.trim()).length} tételhez`}</strong></div><small>Az összegek forintban szerepelnek; a rendszer nem számít ÁFÁ-t és nem vált pénznemet.</small></div></fieldset>
    {dirty && <p className="form-message" role="status">Mentetlen módosításaid vannak.</p>}{result.error && <p className="form-message is-error" role="alert">{result.error}</p>}{result.ok && <p className="form-message is-success" role="status">Az ajánlati revízió mentve.</p>}
    <button className="primary-button" type="button" disabled={pending || !recoveryReady || Boolean(transferError)} onClick={save}>{pending ? "Mentés…" : "Piszkozat mentése"}</button></section>;
}

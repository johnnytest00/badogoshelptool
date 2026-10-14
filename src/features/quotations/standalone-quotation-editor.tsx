"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lineTotal, scaledToDecimal } from "@/domain/quotations/money";
import { guardUnsavedNavigation, warnBeforeUnloadIfDirty } from "@/lib/unsaved-changes";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { getStandaloneSaveOperation, isHistoricalStandaloneRevision, standaloneNetLabels, type StandaloneSaveOperation } from "./standalone-quotation-ui-state";
import { quotationRecoveryKey, readQuotationRecovery, writeQuotationRecovery, isQuotationRecoveryCurrent, clearOtherQuotationRecoveryOwners, type QuotationRecovery, type QuotationDraftValues } from "./quotation-draft-recovery";
import { resolveStandaloneQuotationCatalogItemAction, saveStandaloneQuotationDraftAction, type StandaloneQuotationResult } from "./standalone-quotation-actions";
import type { MaterialProductRecord } from "@/features/materials/material-data";

type Line = QuotationDraftValues["lines"][number];
type EditorLine = Line & { localId: string };
type Revision = { id: string; revisionNumber: number; createdAt: string; subtotal: string | null };
type CurrentRevision = { id: string; revision_number: number; line_items_snapshot: unknown; subtotal: string | number | null };
const empty = (type: Line["type"]): Line => ({ type, description: "", quantity: "", unit: "", unitPrice: "", priceClass: "net", variantId: "", priceId: "", takeoffItemId: "", notes: "" });
const toPersistedLine = (line: EditorLine): Line => {
  const { localId, ...persisted } = line;
  void localId;
  return persisted;
};
const money = (value: string | number | null) => value === null ? "—" : `${Number(value).toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ft`;

export function StandaloneQuotationEditor({ userId, organizationId, quotationId, name: initialName, version, currentRevisionId, currentRevision, revisions, selectedRevisionId, products }: Readonly<{
  userId: string; organizationId: string; quotationId: string | null; name?: string; version: number; currentRevisionId: string | null;
  currentRevision?: CurrentRevision; revisions: Revision[]; selectedRevisionId?: string; products: MaterialProductRecord[];
}>) {
  const router = useRouter();
  const lineKeyCounter = useRef(0);
  const makeLocalId = () => { lineKeyCounter.current += 1; return `line-${lineKeyCounter.current}`; };
  const historical = isHistoricalStandaloneRevision(currentRevisionId, selectedRevisionId);
  const activeRevision = historical ? revisions.find((revision) => revision.id === selectedRevisionId) : undefined;
  const seed = historical ? currentRevision : currentRevision;
  const [name, setName] = useState(initialName ?? "");
  const [lines, setLines] = useState<EditorLine[]>(() => {
    const raw = seed?.line_items_snapshot;
    if (!Array.isArray(raw)) return [];
    return raw.map((entry) => {
      const value = entry as Partial<Line>;
      return { ...empty(value.type === "MATERIAL" || value.type === "LABOR" || value.type === "OTHER" ? value.type : "OTHER"), ...value, priceClass: "net", localId: makeLocalId() } as EditorLine;
    });
  });
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StandaloneQuotationResult<{ quotation_id: string; revision_id: string; revision_number: number; revision_created: boolean; totals_snapshot: Record<string, unknown> }>>({ ok: false, code: "INTERNAL", error: "" });
  const [catalogMessage, setCatalogMessage] = useState("");
  const baseline = useRef(JSON.stringify({ name: initialName ?? "", lines }));
  const recoveryKey = quotationRecoveryKey(userId, organizationId, "standalone", quotationId);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recovery, setRecovery] = useState<{ value: QuotationRecovery; current: boolean } | null>(null);
  const operation = useRef<StandaloneSaveOperation | null>(null);
  const savedSubtotal = currentRevision?.subtotal ?? null;
  const latestUrl = `/ajanlatok/${quotationId}?organization=${organizationId}`;

  const setDirtyState = (value: boolean) => { dirtyRef.current = value; setDirty(value); };
  const syncDirty = (nextName = name, nextLines = lines) => setDirtyState(JSON.stringify({ name: nextName, lines: nextLines }) !== baseline.current);
  const update = (index: number, patch: Partial<Line>) => {
    const next = lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line);
    setLines(next); syncDirty(name, next); setResult({ ok: false, code: "INTERNAL", error: "" });
  };
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => warnBeforeUnloadIfDirty(dirtyRef.current, event);
    window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler);
  }, []);
  useEffect(() => {
    try {
      clearOtherQuotationRecoveryOwners(window.sessionStorage, userId);
      const stored = readQuotationRecovery(window.sessionStorage, recoveryKey);
      if (stored) setRecovery({ value: stored, current: isQuotationRecoveryCurrent(stored, version, currentRevisionId) });
    } catch { /* A tiltott sessionStorage nem akadályozhatja a szerkesztést. */ }
    setRecoveryReady(true);
  }, [currentRevisionId, recoveryKey, userId, version]);
  useEffect(() => {
    if (!recoveryReady || historical) return;
    try {
      if (dirty) writeQuotationRecovery(window.sessionStorage, recoveryKey, { sourceVersion: version, sourceRevisionId: currentRevisionId, values: { name, clientId: "", lines: lines.map(toPersistedLine) } });
      else if (!recovery) window.sessionStorage.removeItem(recoveryKey);
    } catch { /* A privát mód vagy kvóta nem blokkolja a használatot. */ }
  }, [currentRevisionId, dirty, historical, lines, name, recovery, recoveryKey, recoveryReady, version]);

  const localEstimate = useMemo(() => lines.reduce((sum, line) => {
    try { return sum + lineTotal(line.quantity || "0", line.unitPrice || "0").minor; } catch { return sum; }
  }, BigInt(0)), [lines]);

  const addLine = (type: Line["type"]) => { const next = [...lines, { ...empty(type), localId: makeLocalId() }]; setLines(next); syncDirty(name, next); };
  const moveLine = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines]; [next[index], next[target]] = [next[target], next[index]];
    setLines(next); syncDirty(name, next);
  };
  const discardRecovery = () => { try { window.sessionStorage.removeItem(recoveryKey); } catch { /* Best effort. */ } setRecovery(null); };
  const restoreRecovery = () => {
    if (!recovery?.current || historical) return;
    const recovered = recovery.value.values.lines.map((line) => ({ ...line, localId: makeLocalId() }));
    const values = { name: recovery.value.values.name, lines: recovered };
    setName(values.name); setLines(values.lines); setDirtyState(JSON.stringify(values) !== baseline.current); setRecovery(null);
  };
  const catalogVariant = (variantId: string) => products.flatMap((product) => product.variants.map((variant) => ({ product, variant }))).find((entry) => entry.variant.id === variantId);
  const resolvePrice = async (lineIndex: number, variantId: string, priceId: string) => {
    const selected = catalogVariant(variantId);
    if (!selected) { setCatalogMessage("A katalógustermék nem található a betöltött listában."); return; }
    let response: Awaited<ReturnType<typeof resolveStandaloneQuotationCatalogItemAction>>;
    try { response = await resolveStandaloneQuotationCatalogItemAction(organizationId, variantId, priceId || undefined); }
    catch { setCatalogMessage("A katalógus most nem érhető el. Ellenőrizd a kapcsolatot, majd válaszd ki újra a tételt."); return; }
    if (!response.ok) { setCatalogMessage(response.error); return; }
    const price = response.data.price as { amount: string; provenance: string | null; effectiveDate: string; priceKind: "net" | "gross" } | null;
    if (price && price.priceKind !== "net") { setCatalogMessage("Ez az ár bruttó besorolású. A standalone szerkesztő jelenleg nettó HUF árakat fogad el; válassz másik árat vagy kézi nettó árat."); return; }
    const previous = lines[lineIndex];
    update(lineIndex, { variantId, priceId, description: `${selected.product.name} · ${selected.variant.name}`, unit: selected.variant.purchasingUnit, unitPrice: price?.amount ?? (previous?.variantId === variantId ? previous.unitPrice : ""), priceClass: "net" });
    setCatalogMessage(price ? `Katalógusár ellenőrizve · ${String(price.provenance ?? "forrás megadva")} · ${price.effectiveDate}` : "Katalógustermék kiválasztva; kézi nettó árat adj meg.");
  };
  const save = () => {
    if (historical || pending) return;
    const savedLines = lines.map((line) => ({ ...toPersistedLine(line), priceClass: "net" as const }));
    const payload = JSON.stringify({ quotationId, version, name: name.trim(), lines: savedLines });
    try {
      operation.current = getStandaloneSaveOperation(operation.current, payload, generateSecureUuid);
    } catch { setResult({ ok: false, code: "INTERNAL", error: "A biztonságos mentési azonosító nem hozható létre ezen a böngészőn." }); return; }
    const form = new FormData();
    form.set("organizationId", organizationId); form.set("operationId", operation.current.id); form.set("version", String(version));
    if (quotationId) form.set("quotationId", quotationId);
    form.set("name", name.trim() || "Belső ajánlati piszkozat"); form.set("clientId", "");
    form.set("lines", JSON.stringify(savedLines));
    setResult({ ok: false, code: "INTERNAL", error: "" });
    startTransition(async () => {
      let saved: Awaited<ReturnType<typeof saveStandaloneQuotationDraftAction>>;
      try { saved = await saveStandaloneQuotationDraftAction(form); }
      catch { setResult({ ok: false, code: "INTERNAL", error: "A hálózati mentés eredménye nem érkezett meg. Ugyanennek a módosításnak az újrapróbálásakor azonos műveletazonosítót használunk." }); return; }
      setResult(saved);
      if (saved.ok) {
        try { window.sessionStorage.removeItem(recoveryKey); } catch { /* Best effort. */ }
        setRecovery(null); setDirtyState(false); operation.current = null;
        baseline.current = JSON.stringify({ name, lines });
        router.push(`/ajanlatok/${saved.data.quotation_id}?organization=${organizationId}`);
      }
    });
  };

  return <section className="quotation-editor detail-surface standalone-quotation-editor">
    <Link className="back-link" href={`/ajanlatok?organization=${organizationId}`} onNavigate={(event) => guardUnsavedNavigation(event, { dirty: dirty && !historical, pending, confirmDiscard: () => window.confirm("A mentetlen ajánlati módosítások elvesznek. Elveted őket és visszatérsz az ajánlatokhoz?"), onDiscard: () => { setDirtyState(false); discardRecovery(); } })}>← Vissza az ajánlatokhoz</Link>
    <div className="section-heading"><div><p className="section-eyebrow">Önálló · csak piszkozat</p><h2>{quotationId ? `${initialName || "Ajánlat"} · v${activeRevision?.revisionNumber ?? version}` : "Új árajánlat"}</h2></div><span className="status-pill status-draft">Piszkozat</span></div>
    <p className="missing-data">Projekt és ügyfél nélkül is használható. Nettó HUF összegeket kezel; véglegesítés, ÁFA és hivatalos PDF még nem támogatott.</p>
    <div className="standalone-revision-bar" aria-label="Ajánlati revíziók">
      {revisions.map((revision) => <Link key={revision.id} className={`secondary-button ${revision.id === (selectedRevisionId ?? currentRevisionId) ? "is-current" : ""}`} href={`/ajanlatok/${quotationId}?organization=${organizationId}&revision=${revision.id}`} aria-current={revision.id === (selectedRevisionId ?? currentRevisionId) ? "page" : undefined} onNavigate={(event) => guardUnsavedNavigation(event, { dirty: dirty && !historical, pending, confirmDiscard: () => window.confirm("A mentetlen módosítások elvesznek. Elveted őket és megnyitod a kiválasztott immutable revíziót?"), onDiscard: () => { setDirtyState(false); discardRecovery(); } })}>v{revision.revisionNumber} · {money(revision.subtotal)}</Link>)}
      {historical && <Link className="primary-button" href={latestUrl}>Legfrissebb revízió megnyitása (v{version})</Link>}
      {historical && <span className="form-message" role="status">Történeti, változtathatatlan revízió megtekintése.</span>}
    </div>
    {recovery && !historical && <section className="form-message" role="status"><p>{recovery.current ? "Korábban nem mentett módosítás található ebben a munkamenetben." : "A helyi változat régebbi szerverrevízióból készült, ezért nem állítható vissza automatikusan."}</p>{recovery.current && <button className="secondary-button" type="button" onClick={restoreRecovery}>Változat visszaállítása</button>}<button className="text-button" type="button" onClick={discardRecovery}>Helyi változat elvetése</button></section>}
    <fieldset className="quotation-editor-fields" disabled={historical || pending || !recoveryReady} aria-busy={pending || !recoveryReady}>
      <div className="quotation-meta"><label htmlFor="standalone-name">Ajánlat neve<input id="standalone-name" value={name} onChange={(event) => { setName(event.target.value); syncDirty(event.target.value); setResult({ ok: false, code: "INTERNAL", error: "" }); }} aria-describedby="standalone-name-hint" /></label><small id="standalone-name-hint">Ha üresen hagyod, mentéskor „Belső ajánlati piszkozat” néven mentjük.</small></div>
      <div className="quotation-lines"><div className="section-heading"><div><p className="section-eyebrow">Tételek</p><h3>Ártételek</h3></div><div className="quotation-add-actions"><button className="secondary-button" type="button" onClick={() => addLine("MATERIAL")}>+ Kézi anyag</button><button className="secondary-button" type="button" onClick={() => addLine("LABOR")}>+ Munkadíj</button><button className="secondary-button" type="button" onClick={() => addLine("OTHER")}>+ Egyéb</button></div></div>
        {lines.length === 0 && <p className="empty-state">Még nincs tétel. Üres piszkozatot is elmenthetsz.</p>}
        {lines.map((line, index) => <article className="quotation-line" key={line.localId}><div className="quotation-line-grid">
          <label htmlFor={`line-${index}-type`}>Típus<select id={`line-${index}-type`} value={line.type} onChange={(event) => { const type = event.target.value as Line["type"]; update(index, type === "MATERIAL" ? { type } : { type, variantId: "", priceId: "" }); }}><option value="MATERIAL">Anyag</option><option value="LABOR">Munkadíj</option><option value="OTHER">Egyéb</option></select></label>
          {line.type === "MATERIAL" && <label htmlFor={`line-${index}-catalog`}>Katalógustermék<select id={`line-${index}-catalog`} value={line.variantId} onChange={(event) => { void resolvePrice(index, event.target.value, ""); }}><option value="">Kézi anyag / válassz katalógust</option>{products.flatMap((product) => product.variants.map((variant) => <option key={variant.id} value={variant.id}>{product.name} · {variant.name}{variant.sku ? ` · ${variant.sku}` : ""}</option>))}</select></label>}
          <label htmlFor={`line-${index}-description`}>Megnevezés<input id={`line-${index}-description`} value={line.description} onChange={(event) => update(index, { description: event.target.value })} /></label>
          <label htmlFor={`line-${index}-quantity`}>Mennyiség<input id={`line-${index}-quantity`} inputMode="decimal" value={line.quantity} onChange={(event) => update(index, { quantity: event.target.value })} aria-describedby={`line-${index}-error`} /></label>
          <label htmlFor={`line-${index}-unit`}>Egység<input id={`line-${index}-unit`} value={line.unit} onChange={(event) => update(index, { unit: event.target.value, priceId: "" })} /></label>
          <label htmlFor={`line-${index}-price`}>{standaloneNetLabels.unitPrice}<input id={`line-${index}-price`} inputMode="decimal" value={line.unitPrice} onChange={(event) => update(index, { unitPrice: event.target.value, priceId: "" })} /></label>
          {line.variantId && <label htmlFor={`line-${index}-price-source`}>Katalógusárforrás<select id={`line-${index}-price-source`} value={line.priceId} onChange={(event) => { void resolvePrice(index, line.variantId, event.target.value); }}><option value="">Kézi nettó ár</option>{catalogVariant(line.variantId)?.variant.prices.filter((price) => price.currency === "HUF" && price.priceKind === "net" && price.purchasingUnit === catalogVariant(line.variantId)?.variant.purchasingUnit).map((price) => <option key={price.id} value={price.id}>{price.amount.toLocaleString("hu-HU")} Ft · {price.effectiveDate}</option>)}</select><small>{line.priceId ? "Mentéskor a szerver ismét ellenőrzi a katalógusárat." : "Kézi árként kerül rögzítésre."}</small></label>}
          <output className="quotation-line-total">{standaloneNetLabels.lineTotal}: {(() => { try { return scaledToDecimal(lineTotal(line.quantity || "0", line.unitPrice || "0").minor, 2); } catch { return "—"; } })()} <small>nem mentett becslés</small></output>
          <div className="standalone-line-actions"><button className="text-button" type="button" disabled={index === 0} aria-label={`Tétel ${index + 1} mozgatása fel`} onClick={() => moveLine(index, -1)}>↑ Fel</button><button className="text-button" type="button" disabled={index === lines.length - 1} aria-label={`Tétel ${index + 1} mozgatása le`} onClick={() => moveLine(index, 1)}>↓ Le</button><button className="text-button" type="button" aria-label={`Tétel ${index + 1} törlése`} onClick={() => { const next = lines.filter((_, itemIndex) => itemIndex !== index); setLines(next); syncDirty(name, next); }}>Tétel törlése</button></div>
        </div><p id={`line-${index}-error`} className="missing-data">Leírás, pozitív mennyiség, egység és nemnegatív nettó egységár szükséges a kitöltött sor mentéséhez.</p></article>)}
      </div>
      {catalogMessage && <p className="form-message" role="status">{catalogMessage}</p>}
      <div className="quotation-summary"><div><span>{historical ? "Revízió nettó összege (Ft)" : standaloneNetLabels.subtotal}</span><strong>{historical ? money(activeRevision?.subtotal ?? null) : money(scaledToDecimal(localEstimate, 2))}</strong><small>{historical ? "A változtathatatlan szerver-pillanatkép összege." : "Nem mentett becslés; a szerver számítja és adja vissza az irányadó összeget."}</small></div>{!historical && <div><span>Legutóbbi mentett nettó összeg</span><strong>{money(savedSubtotal === null ? null : String(savedSubtotal))}</strong></div>}</div>
    </fieldset>
    {!historical && dirty && <p className="form-message" role="status">Mentetlen módosításaid vannak.</p>}
    {!historical && !result.ok && result.error && <div className="form-message is-error" role="alert">{result.error}{result.code === "CONFLICT" && quotationId && <button type="button" className="secondary-button" onClick={() => { if (window.confirm("A legfrissebb revízió betöltése elveti ezt a helyi módosításcsomagot. Megnyitod a szerver legfrissebb változatát?")) { discardRecovery(); window.location.assign(latestUrl); } }}>Legfrissebb revízió megnyitása</button>}</div>}
    {!historical && result.ok && <p className="form-message is-success" role="status">A piszkozat v{result.data.revision_number} revíziója mentve.</p>}
    {!historical && <button className="primary-button standalone-save" type="button" disabled={pending || !recoveryReady} onClick={save}>{pending ? "Mentés folyamatban…" : "Piszkozat mentése"}</button>}
  </section>;
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decimalToScaled, lineTotal, scaledToDecimal } from "@/domain/quotations/money";
import { validateStandaloneLines } from "@/domain/quotations/standalone";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { getStandaloneSaveOperation, isHistoricalStandaloneRevision, standaloneNetLabels, type StandaloneSaveOperation } from "./standalone-quotation-ui-state";
import { quotationRecoveryKey, readQuotationRecovery, writeQuotationRecovery, isQuotationRecoveryCurrent, clearOtherQuotationRecoveryOwners, type QuotationRecovery, type QuotationDraftValues } from "./quotation-draft-recovery";
import { resolveStandaloneQuotationCatalogItemAction, saveStandaloneQuotationDraftAction, updateStandaloneIssuerProfileAction, validateStandaloneQuotationDocumentAction, type StandaloneDocumentSources, type StandaloneQuotationResult } from "./standalone-quotation-actions";
import type { MaterialProductRecord } from "@/features/materials/material-data";
import { emptyQuotationDocumentDraft, validateQuotationDocumentReadiness, type DocumentReadiness, type IssuerDocumentProfile, type QuotationDocumentDraft } from "@/domain/quotations/document-readiness";

type Line = QuotationDraftValues["lines"][number];
type EditorLine = Line & { localId: string };
type Revision = { id: string; revisionNumber: number; createdAt: string; subtotal: string | null };
type CurrentRevision = { id: string; revision_number: number; input_snapshot: unknown; line_items_snapshot: unknown; subtotal: string | number | null; currency: string; price_class: "net" | "gross" | null };
const empty = (type: Line["type"]): Line => ({ type, description: "", quantity: "", unit: "", unitPrice: "", priceClass: "net", variantId: "", priceId: "", takeoffItemId: "", sourceMaterialItemId: "", notes: "" });
const toPersistedLine = (line: EditorLine): Line => {
  const { localId, ...persisted } = line;
  void localId;
  return persisted;
};
const money = (value: string | number | null) => value === null ? "—" : `${Number(value).toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ft`;
const objectValue = (value: unknown): Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
const textValue = (value: unknown) => typeof value === "string" ? value : "";

function revisionDocument(revision?: CurrentRevision): { draft: QuotationDocumentDraft; issuer?: Record<string, unknown>; recipient?: Record<string, unknown> } {
  const document = objectValue(objectValue(revision?.input_snapshot).document);
  const recipient = objectValue(document.recipient);
  const draft = {
    ...emptyQuotationDocumentDraft(),
    recipientSource: recipient.source === "linked_client" ? "client" as const : "manual" as const,
    recipientClientId: textValue(recipient.clientId), recipientName: textValue(recipient.name), recipientAddress: textValue(recipient.address),
    recipientEmail: textValue(recipient.email), recipientPhone: textValue(recipient.phone), recipientTaxIdentifier: textValue(recipient.taxIdentifier),
    reference: textValue(document.reference), validUntil: textValue(document.validUntil), notes: textValue(document.notes), terms: textValue(document.terms),
  };
  return { draft, issuer: objectValue(document.issuer), recipient };
}

export type QuotationMaterialSource = Readonly<{ materialListId: string; materialRevisionId: string; listName: string; revisionNumber: number; currentRevisionId: string | null; currentVersion: number; executionPlanId: string | null; sourceLineMap: ReadonlyArray<{ materialItemId: string; quotationLineIndex: number }> }>;

export function StandaloneQuotationEditor({ userId, organizationId, quotationId, name: initialName, version, currentRevisionId, currentRevision, revisions, selectedRevisionId, products, documentSources, materialSource = null, initialLines = [] }: Readonly<{
  userId: string; organizationId: string; quotationId: string | null; name?: string; version: number; currentRevisionId: string | null;
  currentRevision?: CurrentRevision; revisions: Revision[]; selectedRevisionId?: string; products: MaterialProductRecord[]; documentSources: StandaloneDocumentSources;
  materialSource?: QuotationMaterialSource | null; initialLines?: Line[];
}>) {
  const router = useRouter();
  const { requestConfirmation } = useAppInteraction();
  const lineKeyCounter = useRef(0);
  const makeLocalId = () => { lineKeyCounter.current += 1; return `line-${lineKeyCounter.current}`; };
  const historical = isHistoricalStandaloneRevision(currentRevisionId, selectedRevisionId);
  const activeRevision = historical ? revisions.find((revision) => revision.id === selectedRevisionId) : undefined;
  const seed = historical ? currentRevision : currentRevision;
  const [name, setName] = useState(initialName ?? "");
  const savedDocument = revisionDocument(currentRevision);
  const [document, setDocument] = useState<QuotationDocumentDraft>(savedDocument.draft);
  const [issuerProfile, setIssuerProfile] = useState<IssuerDocumentProfile>(() => historical && savedDocument.issuer ? {
    businessName: textValue(savedDocument.issuer.businessName) || null, businessAddress: textValue(savedDocument.issuer.businessAddress) || null,
    contactEmail: textValue(savedDocument.issuer.contactEmail) || null, contactPhone: textValue(savedDocument.issuer.contactPhone) || null,
    taxIdentifier: textValue(savedDocument.issuer.taxIdentifier) || null,
  } : { businessName: documentSources.issuer.businessName, businessAddress: documentSources.issuer.businessAddress, contactEmail: documentSources.issuer.contactEmail, contactPhone: documentSources.issuer.contactPhone, taxIdentifier: documentSources.issuer.taxIdentifier });
  const [issuerMessage, setIssuerMessage] = useState("");
  const [serverReadiness, setServerReadiness] = useState<DocumentReadiness | null>(null);
  const [issuerDirty, setIssuerDirty] = useState(false);
  const issuerDirtyRef = useRef(false);
  const [lines, setLines] = useState<EditorLine[]>(() => {
    const raw = seed?.line_items_snapshot;
    if (!Array.isArray(raw)) return initialLines.map((value) => ({ ...value, localId: makeLocalId() }));
    const linkedSourceIndexes = new Map((materialSource?.sourceLineMap ?? []).map((source) => [source.quotationLineIndex, source.materialItemId]));
    return raw.map((entry, index) => {
      const value = entry as Partial<Line>;
      return { ...empty(value.type === "MATERIAL" || value.type === "LABOR" || value.type === "OTHER" ? value.type : "OTHER"), ...value, sourceMaterialItemId: linkedSourceIndexes.get(index) ?? value.sourceMaterialItemId ?? "", priceClass: "net", localId: makeLocalId() } as EditorLine;
    });
  });
  const [dirty, setDirty] = useState(false);
  const [pdfPromptOpen, setPdfPromptOpen] = useState(false);
  const dirtyRef = useRef(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StandaloneQuotationResult<{ quotation_id: string; revision_id: string; revision_number: number; revision_created: boolean; totals_snapshot: Record<string, unknown> }>>({ ok: false, code: "INTERNAL", error: "" });
  const [catalogMessage, setCatalogMessage] = useState("");
  const baseline = useRef(JSON.stringify({ name: initialName ?? "", lines, document: savedDocument.draft }));
  const recoveryKey = quotationRecoveryKey(userId, organizationId, "standalone", quotationId);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recovery, setRecovery] = useState<{ value: QuotationRecovery; current: boolean } | null>(null);
  const operation = useRef<StandaloneSaveOperation | null>(null);
  const savedSubtotal = currentRevision?.subtotal ?? null;
  const savedAmountLabel = currentRevision?.price_class === "gross" ? "Bruttó árbesorolás összege" : currentRevision?.price_class === "net" ? "Nettó árbesorolás összege" : "Árbesorolás nélküli összeg";
  const latestUrl = `/ajanlatok/${quotationId}?organization=${organizationId}`;
  const pdfRevisionId = selectedRevisionId ?? currentRevisionId;
  const pdfUrl = quotationId && pdfRevisionId ? `/api/ajanlatok/${quotationId}/pdf?revision=${encodeURIComponent(pdfRevisionId)}` : null;

  const setDirtyState = (value: boolean) => { dirtyRef.current = value; setDirty(value); };
  const syncDirty = (nextName = name, nextLines = lines, nextDocument = document) => setDirtyState(JSON.stringify({ name: nextName, lines: nextLines, document: nextDocument }) !== baseline.current);
  const setDocumentField = <K extends keyof QuotationDocumentDraft>(key: K, value: QuotationDocumentDraft[K]) => {
    const next = { ...document, [key]: value };
    setDocument(next); setServerReadiness(null); syncDirty(name, lines, next); setResult({ ok: false, code: "INTERNAL", error: "" });
  };
  const changeIssuerProfile = <K extends keyof IssuerDocumentProfile>(key: K, value: IssuerDocumentProfile[K]) => {
    setIssuerProfile((current) => ({ ...current, [key]: value })); issuerDirtyRef.current = true; setIssuerDirty(true); setIssuerMessage("");
  };
  const update = (index: number, patch: Partial<Line>) => {
    const next = lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line);
    setLines(next); syncDirty(name, next); setResult({ ok: false, code: "INTERNAL", error: "" });
  };
  const discardRecovery = () => { try { window.sessionStorage.removeItem(recoveryKey); } catch { /* Best effort. */ } setRecovery(null); };
  useUnsavedChangeGuard({ dirty: (dirty || issuerDirty) && !historical, pending, discard: () => { setDirtyState(false); issuerDirtyRef.current = false; setIssuerDirty(false); discardRecovery(); } });
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
      if (dirty) writeQuotationRecovery(window.sessionStorage, recoveryKey, { sourceVersion: version, sourceRevisionId: currentRevisionId, values: { name, clientId: document.recipientSource === "client" ? document.recipientClientId : "", document, lines: lines.map(toPersistedLine) } });
      else if (!recovery) window.sessionStorage.removeItem(recoveryKey);
    } catch { /* A privát mód vagy kvóta nem blokkolja a használatot. */ }
  }, [currentRevisionId, dirty, document, historical, lines, name, recovery, recoveryKey, recoveryReady, version]);

  const localEstimate = useMemo(() => lines.reduce((sum, line) => {
    try { return sum + lineTotal(line.quantity || "0", line.unitPrice || "0").minor; } catch { return sum; }
  }, BigInt(0)), [lines]);
  const selectedClient = documentSources.clients.find((client) => client.id === document.recipientClientId);
  const readinessDocument = !historical && document.recipientSource === "client" && selectedClient ? {
    ...document, recipientName: selectedClient.name, recipientAddress: selectedClient.address ?? "", recipientEmail: selectedClient.email ?? "", recipientPhone: selectedClient.phone ?? "",
  } : document;
  const savedIssuerForReadiness: IssuerDocumentProfile | null = savedDocument.issuer ? {
    businessName: textValue(savedDocument.issuer.businessName) || null,
    businessAddress: textValue(savedDocument.issuer.businessAddress) || null,
    contactEmail: textValue(savedDocument.issuer.contactEmail) || null,
    contactPhone: textValue(savedDocument.issuer.contactPhone) || null,
    taxIdentifier: textValue(savedDocument.issuer.taxIdentifier) || null,
  } : null;
  const issuerForReadiness: IssuerDocumentProfile = currentRevision && savedIssuerForReadiness ? savedIssuerForReadiness : documentSources.issuer;
  const savedLines = Array.isArray(currentRevision?.line_items_snapshot) ? currentRevision.line_items_snapshot : [];
  const savedLineValidation = validateStandaloneLines(savedLines);
  let savedTotalsConsistent = false;
  if (savedLineValidation.ok && currentRevision?.subtotal !== null && currentRevision?.subtotal !== undefined) {
    try { savedTotalsConsistent = decimalToScaled(String(currentRevision.subtotal), 2) === decimalToScaled(savedLineValidation.totals.subtotal, 2) && savedLineValidation.totals.priceClass === currentRevision.price_class; } catch { savedTotalsConsistent = false; }
  }
  const readiness = validateQuotationDocumentReadiness(issuerForReadiness, readinessDocument, undefined, {
    hasCurrentRevision: Boolean(currentRevisionId && currentRevision?.id === currentRevisionId),
    hasCompleteLines: savedLineValidation.ok && savedLines.length > 0 && currentRevision?.price_class !== null,
    monetaryValuesConsistent: savedTotalsConsistent,
    currency: currentRevision?.currency ?? null,
    priceBasis: currentRevision?.price_class ?? null,
    taxTreatment: "unresolved",
  });
  const displayedReadiness = serverReadiness ?? readiness;

  const addLine = (type: Line["type"]) => { const next = [...lines, { ...empty(type), localId: makeLocalId() }]; setLines(next); syncDirty(name, next); };
  const moveLine = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines]; [next[index], next[target]] = [next[target], next[index]];
    setLines(next); syncDirty(name, next);
  };
  const restoreRecovery = () => {
    if (!recovery?.current || historical) return;
    const recovered = recovery.value.values.lines.map((line) => ({ ...line, localId: makeLocalId() }));
    const nextDocument = recovery.value.values.document ?? document;
    const values = { name: recovery.value.values.name, lines: recovered, document: nextDocument };
    setName(values.name); setLines(values.lines); setDocument(nextDocument); setDirtyState(JSON.stringify(values) !== baseline.current); setRecovery(null);
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
  const save = (saveIssuerProfileFirst = false) => {
    if (historical || pending) return;
    if (!name.trim()) { setResult({ ok: false, code: "VALIDATION", error: "Add meg az ajánlat nevét a mentéshez." }); return; }
    if (issuerDirty && !saveIssuerProfileFirst) { setResult({ ok: false, code: "VALIDATION", error: "Előbb mentsd a kibocsátói profilt, hogy az ajánlati revízió a friss adatokat rögzítse." }); return; }
    const savedLines = lines.map((line) => ({ ...toPersistedLine(line), priceClass: "net" as const }));
    const payload = JSON.stringify({ quotationId, version, name: name.trim(), lines: savedLines, document, materialListId: materialSource?.materialListId ?? null, materialRevisionId: materialSource?.materialRevisionId ?? null });
    try {
      operation.current = getStandaloneSaveOperation(operation.current, payload, generateSecureUuid);
    } catch { setResult({ ok: false, code: "INTERNAL", error: "A biztonságos mentési azonosító nem hozható létre ezen a böngészőn." }); return; }
    const form = new FormData();
    form.set("organizationId", organizationId); form.set("operationId", operation.current.id); form.set("version", String(version));
    if (quotationId) form.set("quotationId", quotationId);
    form.set("name", name.trim()); form.set("clientId", document.recipientSource === "client" ? document.recipientClientId : "");
    form.set("lines", JSON.stringify(savedLines));
    if (materialSource && lines.some((line) => line.sourceMaterialItemId)) {
      form.set("materialListId", materialSource.materialListId);
      form.set("materialRevisionId", materialSource.materialRevisionId);
    }
    form.set("document", JSON.stringify(document));
    setResult({ ok: false, code: "INTERNAL", error: "" });
    startTransition(async () => {
      if (issuerDirty && saveIssuerProfileFirst) {
        let profile: Awaited<ReturnType<typeof updateStandaloneIssuerProfileAction>>;
        try {
          profile = await updateStandaloneIssuerProfileAction(organizationId, {
            businessName: issuerProfile.businessName ?? "", businessAddress: issuerProfile.businessAddress ?? "",
            contactEmail: issuerProfile.contactEmail ?? "", contactPhone: issuerProfile.contactPhone ?? "", taxIdentifier: issuerProfile.taxIdentifier ?? "",
          });
        } catch { setIssuerMessage("A kibocsátói profil hálózati mentése nem sikerült; az ajánlati revízió nem készült el."); return; }
        if (!profile.ok) { setIssuerMessage(profile.error); setResult({ ok: false, code: "INTERNAL", error: "A kibocsátói profil mentése nem sikerült; az ajánlati revízió nem készült el." }); return; }
        setIssuerProfile(profile.data); issuerDirtyRef.current = false; setIssuerDirty(false); setIssuerMessage("A kibocsátói profil mentve; az ajánlati revízió mentése folyamatban.");
      }
      let saved: Awaited<ReturnType<typeof saveStandaloneQuotationDraftAction>>;
      try { saved = await saveStandaloneQuotationDraftAction(form); }
      catch { setResult({ ok: false, code: "INTERNAL", error: "A hálózati mentés eredménye nem érkezett meg. Ugyanennek a módosításnak az újrapróbálásakor azonos műveletazonosítót használunk." }); return; }
      setResult(saved);
      if (saved.ok) {
        try { window.sessionStorage.removeItem(recoveryKey); } catch { /* Best effort. */ }
        setRecovery(null); setDirtyState(false); operation.current = null;
        baseline.current = JSON.stringify({ name, lines, document });
        router.push(`/ajanlatok/${saved.data.quotation_id}?organization=${organizationId}`);
      }
    });
  };
  const saveIssuerProfile = () => {
    if (!documentSources.canEditIssuer || pending) return;
    startTransition(async () => {
      const saved = await updateStandaloneIssuerProfileAction(organizationId, {
        businessName: issuerProfile.businessName ?? "", businessAddress: issuerProfile.businessAddress ?? "",
        contactEmail: issuerProfile.contactEmail ?? "", contactPhone: issuerProfile.contactPhone ?? "", taxIdentifier: issuerProfile.taxIdentifier ?? "",
      });
      if (!saved.ok) { setIssuerMessage(saved.error); return; }
      setIssuerProfile(saved.data); issuerDirtyRef.current = false; setIssuerDirty(false); setIssuerMessage("A kibocsátói adatok mentve."); setServerReadiness(null); router.refresh();
    });
  };
  const checkReadiness = () => {
    startTransition(async () => {
      const checked = await validateStandaloneQuotationDocumentAction(organizationId, document, quotationId);
      if (!checked.ok) { setResult(checked); return; }
      setServerReadiness(checked.data);
    });
  };

  return <section className="quotation-editor detail-surface standalone-quotation-editor">
    <Link className="back-link" href={`/ajanlatok?organization=${organizationId}`}>← Vissza az ajánlatokhoz</Link>
    <div className="section-heading"><div><p className="section-eyebrow">Önálló · csak piszkozat</p><h2>{quotationId ? `${initialName || "Ajánlat"} · v${activeRevision?.revisionNumber ?? version}` : "Új árajánlat"}</h2></div><span className="status-pill status-draft">Piszkozat</span></div>
    <p className="missing-data">Projekt és ügyfél nélkül is használható. Nettó HUF összegeket kezel; véglegesítés, ÁFA és hivatalos PDF még nem támogatott.</p>
    {materialSource && <section className="glass-bubble quotation-material-source" aria-label="Anyaglista forrás"><strong>Anyaglista-forrás · {materialSource.listName}</strong><span>V{materialSource.revisionNumber} revízió · {materialSource.sourceLineMap.length} forrástétel</span>{materialSource.currentRevisionId && materialSource.currentRevisionId !== materialSource.materialRevisionId && <p role="status">A lista azóta V{materialSource.currentVersion} verzióra változott. Az ajánlat a kiválasztott, változtathatatlan V{materialSource.revisionNumber} forrásból indul.</p>}</section>}
    <div className="standalone-revision-bar" aria-label="Ajánlati revíziók">
      {revisions.map((revision) => <Link key={revision.id} className={`secondary-button ${revision.id === (selectedRevisionId ?? currentRevisionId) ? "is-current" : ""}`} href={`/ajanlatok/${quotationId}?organization=${organizationId}&revision=${revision.id}`} aria-current={revision.id === (selectedRevisionId ?? currentRevisionId) ? "page" : undefined}>v{revision.revisionNumber} · {money(revision.subtotal)}</Link>)}
      {historical && <Link className="primary-button" href={latestUrl}>Legfrissebb revízió megnyitása (v{version})</Link>}
      {historical && <span className="form-message" role="status">Történeti, változtathatatlan revízió megtekintése.</span>}
    </div>
    {pdfUrl && <div className="standalone-pdf-actions">
      {dirty || issuerDirty ? <button className="secondary-button" type="button" disabled={pending} onClick={() => setPdfPromptOpen(true)}>PDF-előnézet</button>
        : <a className="secondary-button" href={pdfUrl} target="_blank" rel="noreferrer">PDF-előnézet</a>}
      {pdfPromptOpen && <section className="form-message" aria-labelledby="standalone-pdf-unsaved-title">
        <strong id="standalone-pdf-unsaved-title">Mentetlen módosítások</strong>
        <p>Az előnézet a mentett v{revisions.find((revision) => revision.id === pdfRevisionId)?.revisionNumber ?? currentRevision?.revision_number ?? version} revízióból készül. A helyi módosításokat nem tartalmazza.</p>
        {issuerDirty && <p>Módosult a kibocsátói profil is; azt külön mentsd, majd mentsd új ajánlati revízióként, ha az adatoknak szerepelniük kell az előnézetben.</p>}
        <div className="quotation-add-actions">
          <button className="secondary-button" type="button" disabled={pending} onClick={() => { setPdfPromptOpen(false); save(true); }}>Mentés előbb</button>
          <a className="primary-button" href={pdfUrl} target="_blank" rel="noreferrer" onClick={() => setPdfPromptOpen(false)}>Utolsó mentett előnézet megnyitása</a>
          <button className="text-button" type="button" onClick={() => setPdfPromptOpen(false)}>Mégse</button>
        </div>
      </section>}
    </div>}
    {recovery && !historical && <section className="form-message" role="status"><p>{recovery.current ? "Korábban nem mentett módosítás található ebben a munkamenetben." : "A helyi változat régebbi szerverrevízióból készült, ezért nem állítható vissza automatikusan."}</p>{recovery.current && <button className="secondary-button" type="button" onClick={restoreRecovery}>Változat visszaállítása</button>}<button className="text-button" type="button" onClick={discardRecovery}>Helyi változat elvetése</button></section>}
    <fieldset className="quotation-editor-fields" disabled={historical || pending || !recoveryReady} aria-busy={pending || !recoveryReady}>
      <div className="quotation-meta"><label htmlFor="standalone-name">Ajánlat neve<input id="standalone-name" required maxLength={200} value={name} onChange={(event) => { setName(event.target.value); syncDirty(event.target.value); setResult({ ok: false, code: "INTERNAL", error: "" }); }} aria-describedby="standalone-name-hint" placeholder="Például: Tóth utca tetőfelújítás" /></label><small id="standalone-name-hint">Ez az egyetlen kötelező alapadat; a címzett és dokumentummezők opcionálisak.</small></div>
      <details className="standalone-document-details quotation-document-disclosure" aria-labelledby="standalone-document-heading">
        <summary id="standalone-document-heading" className="quotation-document-summary"><span><small>Opcionális</small><strong>Címzett és dokumentumadatok</strong></span><span className="status-pill status-draft">{displayedReadiness.status === "valid_draft" ? "Adatok rendben" : displayedReadiness.status === "invalid_document_data" ? "Hibás adat" : "Hiányos kiállítási adatok"}</span></summary>
        <div className="quotation-document-disclosure-body">
        <p className="missing-data">Ez a piszkozat menthető. Az adókezelés és a véglegesítés még nincs támogatva; ez az összegzés nem jelent kiállíthatóságot.</p>
        <div className="quotation-line-grid">
          <label htmlFor="document-recipient-source">Címzett adatforrása<select id="document-recipient-source" value={document.recipientSource} onChange={(event) => {
            const source = event.target.value as QuotationDocumentDraft["recipientSource"];
            const next = source === "client" ? { ...document, recipientSource: source, recipientClientId: "" } : { ...document, recipientSource: source, recipientClientId: "" };
            setDocument(next); setServerReadiness(null); syncDirty(name, lines, next);
          }}><option value="manual">Kézi címzett</option><option value="client">Műhely ügyfele</option></select></label>
          {document.recipientSource === "client" && <label htmlFor="document-recipient-client">Ügyfél<select id="document-recipient-client" value={document.recipientClientId} onChange={(event) => {
            const next = { ...document, recipientClientId: event.target.value };
            setDocument(next); setServerReadiness(null); syncDirty(name, lines, next);
          }}><option value="">Válassz ügyfelet</option>{documentSources.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><small>Mentéskor a szerver az ügyfél engedélyezett adataiból immutable címzett-pillanatképet készít.</small></label>}
          {document.recipientSource === "manual" && <>
            <label htmlFor="document-recipient-name">Címzett neve<input id="document-recipient-name" value={document.recipientName} onChange={(event) => setDocumentField("recipientName", event.target.value)} /></label>
            <label htmlFor="document-recipient-address">Címzett címe<input id="document-recipient-address" value={document.recipientAddress} onChange={(event) => setDocumentField("recipientAddress", event.target.value)} /></label>
            <label htmlFor="document-recipient-email">Címzett e-mail-címe<input id="document-recipient-email" type="email" value={document.recipientEmail} onChange={(event) => setDocumentField("recipientEmail", event.target.value)} /></label>
            <label htmlFor="document-recipient-phone">Címzett telefonszáma<input id="document-recipient-phone" value={document.recipientPhone} onChange={(event) => setDocumentField("recipientPhone", event.target.value)} /></label>
            <label htmlFor="document-recipient-tax">Címzett adóazonosító adata<input id="document-recipient-tax" value={document.recipientTaxIdentifier} onChange={(event) => setDocumentField("recipientTaxIdentifier", event.target.value)} /></label>
          </>}
          {document.recipientSource === "client" && <div className="missing-data"><strong>Mentéskor rögzítendő címzett-pillanatkép</strong><br />{readinessDocument.recipientName || "Név nincs megadva"} · {readinessDocument.recipientAddress || "cím nincs megadva"}{readinessDocument.recipientEmail ? ` · ${readinessDocument.recipientEmail}` : ""}</div>}
          <label htmlFor="document-reference">Belső hivatkozás<input id="document-reference" value={document.reference} onChange={(event) => setDocumentField("reference", event.target.value)} /></label>
          <label htmlFor="document-valid-until">Érvényesség dátuma<input id="document-valid-until" type="date" value={document.validUntil} onChange={(event) => setDocumentField("validUntil", event.target.value)} /></label>
          <label htmlFor="document-notes">Ajánlati megjegyzés<textarea id="document-notes" rows={3} value={document.notes} onChange={(event) => setDocumentField("notes", event.target.value)} /></label>
          <label htmlFor="document-terms">Feltételek<textarea id="document-terms" rows={4} value={document.terms} onChange={(event) => setDocumentField("terms", event.target.value)} /></label>
        </div>
        <div className="issuer-profile"><div><p className="section-eyebrow">Kibocsátó</p><strong>{historical ? textValue(savedDocument.issuer?.organizationName) || documentSources.issuer.organizationName : documentSources.issuer.organizationName}</strong></div>
          <div className="quotation-line-grid">
            <label htmlFor="issuer-business-name">Vállalkozás neve<input id="issuer-business-name" value={issuerProfile.businessName ?? ""} disabled={!documentSources.canEditIssuer || pending} onChange={(event) => changeIssuerProfile("businessName", event.target.value || null)} /></label>
            <label htmlFor="issuer-business-address">Vállalkozás címe<input id="issuer-business-address" value={issuerProfile.businessAddress ?? ""} disabled={!documentSources.canEditIssuer || pending} onChange={(event) => changeIssuerProfile("businessAddress", event.target.value || null)} /></label>
            <label htmlFor="issuer-contact-email">Kapcsolati e-mail<input id="issuer-contact-email" type="email" value={issuerProfile.contactEmail ?? ""} disabled={!documentSources.canEditIssuer || pending} onChange={(event) => changeIssuerProfile("contactEmail", event.target.value || null)} /></label>
            <label htmlFor="issuer-contact-phone">Kapcsolati telefon<input id="issuer-contact-phone" value={issuerProfile.contactPhone ?? ""} disabled={!documentSources.canEditIssuer || pending} onChange={(event) => changeIssuerProfile("contactPhone", event.target.value || null)} /></label>
            <label htmlFor="issuer-tax-id">Adóazonosító adat<input id="issuer-tax-id" value={issuerProfile.taxIdentifier ?? ""} disabled={!documentSources.canEditIssuer || pending} onChange={(event) => changeIssuerProfile("taxIdentifier", event.target.value || null)} /><small>Tájékoztató profiladat; nem adószámítási beállítás.</small></label>
          </div>
          {documentSources.canEditIssuer && !historical && <button className="secondary-button" type="button" disabled={pending} onClick={saveIssuerProfile}>Kibocsátói profil mentése</button>}
          {issuerDirty && <small role="status">Mentetlen kibocsátói profil módosítás.</small>}
          {!documentSources.canEditIssuer && <small>A kibocsátói adatokat csak műhelytulajdonos vagy admin módosíthatja.</small>}
          {issuerMessage && <p className="form-message" role="status">{issuerMessage}</p>}
        </div>
        <ul className="document-readiness" aria-label="Kiállítási hiányosságok">{displayedReadiness.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}</ul>
        {!historical && <button className="secondary-button" type="button" disabled={pending} onClick={checkReadiness}>{pending ? "Ellenőrzés folyamatban…" : "Dokumentumadatok szerveroldali ellenőrzése"}</button>}
        {serverReadiness && <small role="status">Az ellenőrzés hitelesített szerveroldali adatokkal lefutott.</small>}
        </div>
      </details>
      <div className="quotation-lines"><div className="section-heading"><div><p className="section-eyebrow">Tételek</p><h3>Ártételek</h3></div><div className="quotation-add-actions"><button className="secondary-button" type="button" onClick={() => addLine("OTHER")}>+ Kézi sor</button><button className="secondary-button" type="button" onClick={() => addLine("LABOR")}>+ Munkadíj</button><button className="secondary-button" type="button" onClick={() => addLine("OTHER")}>+ Egyéb</button></div></div>
        {lines.length === 0 && <p className="empty-state">Még nincs tétel. Üres piszkozatot is elmenthetsz.</p>}
        {lines.map((line, index) => <article className="quotation-line" key={line.localId}><div className="quotation-line-grid">
          {line.sourceMaterialItemId && <small className="quotation-source-line">Anyaglista-forrás tétel · {line.sourceMaterialItemId.slice(0, 8)}</small>}
          <label htmlFor={`line-${index}-type`}>Típus<select id={`line-${index}-type`} value={line.type} onChange={(event) => { const type = event.target.value as Line["type"]; update(index, type === "MATERIAL" ? { type } : { type, variantId: "", priceId: "" }); }}><option value="MATERIAL">Anyag</option><option value="LABOR">Munkadíj</option><option value="OTHER">Egyéb</option></select></label>
          {line.type === "MATERIAL" && <label htmlFor={`line-${index}-catalog`}>Katalógustermék<select id={`line-${index}-catalog`} value={line.variantId} onChange={(event) => { void resolvePrice(index, event.target.value, ""); }}><option value="">Kézi anyag / válassz katalógust</option>{products.flatMap((product) => product.variants.map((variant) => <option key={variant.id} value={variant.id}>{product.name} · {variant.name}{variant.sku ? ` · ${variant.sku}` : ""}</option>))}</select></label>}
          <label htmlFor={`line-${index}-description`}>Megnevezés<input id={`line-${index}-description`} value={line.description} onChange={(event) => update(index, { description: event.target.value })} /></label>
          <label htmlFor={`line-${index}-quantity`}>Mennyiség<input id={`line-${index}-quantity`} inputMode="decimal" value={line.quantity} onChange={(event) => update(index, { quantity: event.target.value })} aria-describedby={`line-${index}-error`} /></label>
          <label htmlFor={`line-${index}-unit`}>Egység<input id={`line-${index}-unit`} value={line.unit} onChange={(event) => update(index, { unit: event.target.value, priceId: "" })} /></label>
          <label htmlFor={`line-${index}-price`}>{standaloneNetLabels.unitPrice}<input id={`line-${index}-price`} inputMode="decimal" value={line.unitPrice} onChange={(event) => update(index, { unitPrice: event.target.value, priceId: "" })} /></label>
          {line.sourceMaterialItemId && !line.unitPrice && <p className="quotation-source-price-note">Ehhez a forrástételhez nincs átvehető nettó ár. Adj meg egy ellenőrzött egységárat mentés előtt.</p>}
          {line.variantId && <label htmlFor={`line-${index}-price-source`}>Katalógusárforrás<select id={`line-${index}-price-source`} value={line.priceId} onChange={(event) => { void resolvePrice(index, line.variantId, event.target.value); }}><option value="">Kézi nettó ár</option>{catalogVariant(line.variantId)?.variant.prices.filter((price) => price.currency === "HUF" && price.priceKind === "net" && price.purchasingUnit === catalogVariant(line.variantId)?.variant.purchasingUnit).map((price) => <option key={price.id} value={price.id}>{price.amount.toLocaleString("hu-HU")} Ft · {price.effectiveDate}</option>)}</select><small>{line.priceId ? "Mentéskor a szerver ismét ellenőrzi a katalógusárat." : "Kézi árként kerül rögzítésre."}</small></label>}
          <output className="quotation-line-total">{standaloneNetLabels.lineTotal}: {(() => { try { return scaledToDecimal(lineTotal(line.quantity || "0", line.unitPrice || "0").minor, 2); } catch { return "—"; } })()} <small>nem mentett becslés</small></output>
          <div className="standalone-line-actions"><button className="text-button" type="button" disabled={index === 0} aria-label={`Tétel ${index + 1} mozgatása fel`} onClick={() => moveLine(index, -1)}>↑ Fel</button><button className="text-button" type="button" disabled={index === lines.length - 1} aria-label={`Tétel ${index + 1} mozgatása le`} onClick={() => moveLine(index, 1)}>↓ Le</button><button className="text-button" type="button" aria-label={`Tétel ${index + 1} törlése`} onClick={() => { const next = lines.filter((_, itemIndex) => itemIndex !== index); setLines(next); syncDirty(name, next); }}>Tétel törlése</button></div>
        </div><p id={`line-${index}-error`} className="missing-data">Leírás, pozitív mennyiség, egység és nemnegatív nettó egységár szükséges a kitöltött sor mentéséhez.</p></article>)}
      </div>
      {catalogMessage && <p className="form-message" role="status">{catalogMessage}</p>}
      <div className="quotation-summary"><div><span>{historical ? `${savedAmountLabel} (Ft)` : standaloneNetLabels.subtotal}</span><strong>{historical ? money(activeRevision?.subtotal ?? null) : money(scaledToDecimal(localEstimate, 2))}</strong><small>{historical ? "A változtathatatlan szerver-pillanatkép összege." : "Nem mentett becslés; a szerver számítja és adja vissza az irányadó összeget."}</small></div>{!historical && <div><span>Legutóbbi mentett árbesorolási összeg</span><strong>{money(savedSubtotal === null ? null : String(savedSubtotal))}</strong></div>}</div>
    </fieldset>
    {!historical && dirty && <p className="form-message" role="status">Mentetlen módosításaid vannak.</p>}
    {!historical && !result.ok && result.error && <div className="form-message is-error" role="alert">{result.error}{result.code === "CONFLICT" && quotationId && <button type="button" className="secondary-button" onClick={async () => { const accepted = await requestConfirmation({ title: "Helyi változat elvetése", message: "A legfrissebb revízió megnyitása elveti ezt a helyi módosításcsomagot.", cancelLabel: "Maradok", actions: [{ label: "Legfrissebb revízió megnyitása", tone: "danger", run: () => undefined }] }); if (accepted) { discardRecovery(); router.replace(latestUrl); } }}>Legfrissebb revízió megnyitása</button>}</div>}
    {!historical && result.ok && <p className="form-message is-success" role="status">A piszkozat v{result.data.revision_number} revíziója mentve.</p>}
    {!historical && <button className="primary-button standalone-save" type="button" disabled={pending || !recoveryReady} onClick={() => save()}>{pending ? "Mentés folyamatban…" : "Piszkozat mentése"}</button>}
  </section>;
}

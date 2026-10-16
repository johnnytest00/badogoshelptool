"use client";

import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateFinalizedQuotationAction, finalizeQuotationAction, transitionQuotationStatusAction, type QuotationFinalizeResult, type QuotationStatusActionResult } from "./quotation-actions";
import { QuotationDocumentActions } from "./quotation-document-actions";
import type { QuotationRecord, QuotationStatus } from "./quotation-data";
import { GlassToolbar } from "@/components/ui/glass-toolbar";

const money = (value: string | null) => value == null ? "Nincs összesítés" : Number(value).toLocaleString("hu-HU", { minimumFractionDigits: 2 }) + " HUF";
const statusLabel: Record<QuotationStatus, string> = { draft: "Piszkozat", finalized: "Véglegesített", sent: "Elküldött", accepted: "Elfogadott", rejected: "Elutasított" };
const statusFilter: Array<"all" | QuotationStatus> = ["all", "draft", "finalized", "sent", "accepted", "rejected"];

export function QuotationManagement({ organizationId, projectId, quotations }: Readonly<{ organizationId: string; projectId: string; quotations: QuotationRecord[] }>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | QuotationStatus>("all");
  const [review, setReview] = useState<QuotationRecord | null>(null);
  const [transition, setTransition] = useState<{ quote: QuotationRecord; target: "sent" | "accepted" | "rejected" } | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<QuotationFinalizeResult & QuotationStatusActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();
  const visible = useMemo(() => quotations.filter((quote) => {
    const haystack = (quote.name + " " + (quote.clientName ?? "")).toLocaleLowerCase("hu-HU");
    return (!query.trim() || haystack.includes(query.trim().toLocaleLowerCase("hu-HU"))) && (status === "all" || quote.status === status);
  }), [quotations, query, status]);
  const finalize = () => {
    if (!review || review.status !== "draft" || !review.currentRevisionId) return;
    const data = new FormData();
    data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("quotationId", review.id); data.set("revisionId", review.currentRevisionId); data.set("version", String(review.version));
    setResult({ ok: false });
    startTransition(async () => { const next = await finalizeQuotationAction(data); setResult(next); if (next.ok) { setReview(null); router.refresh(); } });
  };
  const transitionStatus = () => {
    if (!transition) return;
    const data = new FormData();
    data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("quotationId", transition.quote.id); data.set("targetStatus", transition.target); data.set("version", String(transition.quote.version)); data.set("note", note);
    setResult({ ok: false });
    startTransition(async () => { const next = await transitionQuotationStatusAction(data); setResult(next); if (next.ok) { setTransition(null); setNote(""); router.refresh(); } });
  };
  const duplicate = (quote: QuotationRecord) => {
    const data = new FormData(); data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("quotationId", quote.id);
    startTransition(async () => { const next = await duplicateFinalizedQuotationAction(data); if (next.ok && next.quotationId) router.push("/projektek/" + projectId + "/ajanlatok?organization=" + organizationId + "&edit=" + next.quotationId); else setResult(next); });
  };
  return <>
    <section className="detail-surface quotation-history" aria-labelledby="quotation-list-title">
      <div className="section-heading"><div><p className="section-eyebrow">Ajánlatok és állapotuk</p><h2 id="quotation-list-title">Ajánlatok a projektben</h2></div><span className="status-pill">{visible.length} találat</span></div>
      <GlassToolbar ariaLabel="Ajánlatkeresés és szűrés" className="material-filters quotation-filters quotation-filter-toolbar"><label>Keresés<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Referencia vagy ügyfél" /></label><label>Állapot<select value={status} onChange={(event) => setStatus(event.target.value as "all" | QuotationStatus)}>{statusFilter.map((item) => <option key={item} value={item}>{item === "all" ? "Minden állapot" : statusLabel[item]}</option>)}</select></label></GlassToolbar>
      {result.error && <p className="form-message is-error" role="alert">{result.error}</p>}
      {quotations.length === 0 && <p className="missing-data">Ehhez a projekthez még nincs mentett ajánlat.</p>}
      {quotations.length > 0 && visible.length === 0 && <p className="missing-data">Nincs a szűrésnek megfelelő ajánlat.</p>}
      <div className="quotation-cards">{visible.map((quote) => <article className="quotation-card" key={quote.id}>
        <div><strong>{quote.name}</strong><small>{quote.clientName ?? "Ügyfél nincs megadva"} · létrehozva {new Date(quote.createdAt).toLocaleDateString("hu-HU")}</small></div>
        <span className={"status-pill status-" + quote.status}>{statusLabel[quote.status]}</span>
        <strong>{money(quote.subtotal)}</strong>
        <small>{quote.priceClass === "gross" ? "Bruttó" : quote.priceClass === "net" ? "Nettó" : "Nettó/bruttó hiányzik"} · v{quote.version} · {quote.lines.length} tétel</small>
        <div className="quotation-card-actions">
          {quote.status === "draft" && <><Link className="secondary-button" href={"/projektek/" + projectId + "/ajanlatok?organization=" + organizationId + "&edit=" + quote.id}>Megnyitás és szerkesztés</Link><button className="primary-button" type="button" onClick={() => setReview(quote)}>Áttekintés és véglegesítés</button></>}
          {quote.status === "finalized" && <button className="primary-button" type="button" onClick={() => setTransition({ quote, target: "sent" })}>Elküldöttnek jelölés</button>}
          {quote.status === "sent" && <><button className="primary-button" type="button" onClick={() => setTransition({ quote, target: "accepted" })}>Elfogadottnak jelölés</button><button className="secondary-button" type="button" onClick={() => setTransition({ quote, target: "rejected" })}>Elutasítottnak jelölés</button></>}
          {quote.status === "accepted" && <Link className="primary-button" href={`/projektek/${projectId}?organization=${organizationId}&execution=1&sourceQuotation=${quote.id}`}>Munkanapló létrehozása</Link>}
          {quote.status !== "draft" && <><Link className="secondary-button" href={"/projektek/" + projectId + "/ajanlatok?organization=" + organizationId + "&edit=" + quote.id}>Részletek</Link><button className="secondary-button" type="button" onClick={() => duplicate(quote)} disabled={pending}>Duplikálás új piszkozatként</button></>}
          <QuotationDocumentActions pdfUrl={"/api/projektek/" + projectId + "/ajanlatok/" + quote.id + "/pdf?revision=" + (quote.currentRevisionId ?? "")} />
        </div>
        <small>{quote.statusEvents.length > 0 ? "Státusztörténet: " + quote.statusEvents.length + " esemény" : "Ehhez az ajánlathoz még nincs rögzített státusztörténet."}</small>
      </article>)}</div>
    </section>
    {review && <div className="quotation-review-backdrop" role="presentation"><section className="detail-surface quotation-review" role="dialog" aria-modal="true" aria-labelledby="quotation-review-title"><div className="section-heading"><div><p className="section-eyebrow">Véglegesítés előtti ellenőrzés</p><h2 id="quotation-review-title">{review.name}</h2></div><button className="text-button" type="button" onClick={() => setReview(null)}>Bezárás</button></div><dl><div><dt>Ügyfél</dt><dd>{review.clientName ?? "Hiányzik"}</dd></div><div><dt>Revízió</dt><dd>v{review.version}</dd></div><div><dt>Tételek</dt><dd>{review.lines.length}</dd></div><div><dt>Összesítés</dt><dd>{money(review.subtotal)} · {review.priceClass === "gross" ? "Bruttó" : review.priceClass === "net" ? "Nettó" : "nincs besorolás"}</dd></div></dl><p className="form-message is-error">A véglegesítés után az ajánlat és a kiválasztott revízió nem módosítható. A további változtatásokhoz duplikálj új piszkozatot.</p>{result.error && <p className="form-message is-error" role="alert">{result.error}</p>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setReview(null)}>Mégse</button><button className="primary-button" type="button" onClick={finalize} disabled={pending || !review.currentRevisionId || review.lines.length < 1 || !review.clientId}>{pending ? "Véglegesítés…" : "Véglegesítés megerősítése"}</button></div></section></div>}
    {transition && <div className="quotation-review-backdrop" role="presentation"><section className="detail-surface quotation-review" role="dialog" aria-modal="true" aria-labelledby="quotation-transition-title"><div className="section-heading"><div><p className="section-eyebrow">Státusz rögzítése</p><h2 id="quotation-transition-title">{statusLabel[transition.target]}</h2></div><button className="text-button" type="button" onClick={() => setTransition(null)}>Bezárás</button></div><p>{transition.target === "sent" ? "Az ajánlat elküldését manuálisan rögzíted. A rendszer nem küld automatikusan e-mailt." : transition.target === "accepted" ? "Ez a művelet a felhasználó által rögzített ügyféldöntés; nem elektronikus aláírás és nem szerződés." : "Ez a művelet a felhasználó által rögzített ügyféldöntés; nem jelent kézbesítési vagy jogi bizonyítékot."}</p><label className="project-field">Megjegyzés (opcionális)<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={4} /></label>{result.error && <p className="form-message is-error" role="alert">{result.error}</p>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setTransition(null)}>Mégse</button><button className="primary-button" type="button" onClick={transitionStatus} disabled={pending}>{pending ? "Mentés…" : "Megerősítés"}</button></div></section></div>}
  </>;
}

"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateFinalizedQuotationAction, finalizeQuotationAction, type QuotationFinalizeResult } from "./quotation-actions";
import { QuotationDocumentActions } from "./quotation-document-actions";
import type { QuotationRecord } from "./quotation-data";

const money = (value: string | null) => value == null ? "Nincs összesítés" : `${Number(value).toLocaleString("hu-HU", { minimumFractionDigits: 2 })} HUF`;

export function QuotationManagement({ organizationId, projectId, quotations }: Readonly<{ organizationId: string; projectId: string; quotations: QuotationRecord[] }>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "finalized">("all");
  const [review, setReview] = useState<QuotationRecord | null>(null);
  const [result, setResult] = useState<QuotationFinalizeResult>({ ok: false });
  const [pending, startTransition] = useTransition();
  const visible = useMemo(() => quotations.filter((quote) => {
    const haystack = `${quote.name} ${quote.clientName ?? ""}`.toLocaleLowerCase("hu-HU");
    return (!query.trim() || haystack.includes(query.trim().toLocaleLowerCase("hu-HU"))) && (status === "all" || quote.status === status);
  }), [quotations, query, status]);
  const finalize = () => {
    if (!review || review.status !== "draft" || !review.currentRevisionId) return;
    const data = new FormData();
    data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("quotationId", review.id); data.set("revisionId", review.currentRevisionId); data.set("version", String(review.version));
    setResult({ ok: false });
    startTransition(async () => { const next = await finalizeQuotationAction(data); setResult(next); if (next.ok) { setReview(null); router.refresh(); } });
  };
  const duplicate = (quote: QuotationRecord) => {
    const data = new FormData(); data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("quotationId", quote.id);
    startTransition(async () => { const next = await duplicateFinalizedQuotationAction(data); if (next.ok && next.quotationId) router.push(`/projektek/${projectId}/ajanlatok?organization=${organizationId}&edit=${next.quotationId}`); else setResult(next); });
  };
  return <>
    <section className="detail-surface quotation-history" aria-labelledby="quotation-list-title">
      <div className="section-heading"><div><p className="section-eyebrow">F8.3.1 · Kezelés</p><h2 id="quotation-list-title">Ajánlatok a projektben</h2></div><span className="status-pill">{visible.length} találat</span></div>
      <div className="material-filters quotation-filters"><label>Keresés<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Referencia vagy ügyfél" /></label><label>Állapot<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Minden állapot</option><option value="draft">Piszkozat</option><option value="finalized">Véglegesített</option></select></label></div>
      {result.error && <p className="form-message is-error" role="alert">{result.error}</p>}
      {quotations.length === 0 && <p className="missing-data">Ehhez a projekthez még nincs mentett ajánlat.</p>}
      {quotations.length > 0 && visible.length === 0 && <p className="missing-data">Nincs a szűrésnek megfelelő ajánlat.</p>}
      <div className="quotation-cards">{visible.map((quote) => <article className="quotation-card" key={quote.id}>
        <div><strong>{quote.name}</strong><small>{quote.clientName ?? "Ügyfél nincs megadva"} · létrehozva {new Date(quote.createdAt).toLocaleDateString("hu-HU")}</small></div>
        <span className={`status-pill status-${quote.status}`}>{quote.status === "finalized" ? "Véglegesített" : "Piszkozat"}</span>
        <strong>{money(quote.subtotal)}</strong>
        <small>{quote.priceClass === "gross" ? "Bruttó" : quote.priceClass === "net" ? "Nettó" : "Nettó/bruttó hiányzik"} · v{quote.version} · {quote.lines.length} tétel</small>
        <div className="quotation-card-actions">
          {quote.status === "draft" ? <><Link className="secondary-button" href={`/projektek/${projectId}/ajanlatok?organization=${organizationId}&edit=${quote.id}`}>Megnyitás és szerkesztés</Link><button className="primary-button" type="button" onClick={() => setReview(quote)}>Áttekintés és véglegesítés</button></> : <><Link className="secondary-button" href={`/projektek/${projectId}/ajanlatok?organization=${organizationId}&edit=${quote.id}`}>Részletek</Link><button className="secondary-button" type="button" onClick={() => duplicate(quote)} disabled={pending}>Duplikálás új piszkozatként</button></>}
          <QuotationDocumentActions pdfUrl={`/api/projektek/${projectId}/ajanlatok/${quote.id}/pdf?revision=${quote.currentRevisionId ?? ""}`} />
        </div>
        {quote.status === "finalized" && <small>Véglegesítve: {quote.finalizedAt ? new Date(quote.finalizedAt).toLocaleString("hu-HU") : "ismeretlen időpont"}; a PDF a rögzített revízióhoz kötött.</small>}
      </article>)}</div>
    </section>
    {review && <div className="quotation-review-backdrop" role="presentation"><section className="detail-surface quotation-review" role="dialog" aria-modal="true" aria-labelledby="quotation-review-title"><div className="section-heading"><div><p className="section-eyebrow">Véglegesítés előtti ellenőrzés</p><h2 id="quotation-review-title">{review.name}</h2></div><button className="text-button" type="button" onClick={() => setReview(null)}>Bezárás</button></div><dl><div><dt>Ügyfél</dt><dd>{review.clientName ?? "Hiányzik"}</dd></div><div><dt>Revízió</dt><dd>v{review.version}</dd></div><div><dt>Tételek</dt><dd>{review.lines.length}</dd></div><div><dt>Összesítés</dt><dd>{money(review.subtotal)} · {review.priceClass === "gross" ? "Bruttó" : review.priceClass === "net" ? "Nettó" : "nincs besorolás"}</dd></div></dl><p className="form-message is-error">A véglegesítés után az ajánlat és a kiválasztott revízió nem módosítható. A további változtatásokhoz duplikálj új piszkozatot.</p>{result.error && <p className="form-message is-error" role="alert">{result.error}</p>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setReview(null)}>Mégse</button><button className="primary-button" type="button" onClick={finalize} disabled={pending || !review.currentRevisionId || review.lines.length < 1 || !review.clientId}>{pending ? "Véglegesítés…" : "Véglegesítés megerősítése"}</button></div></section></div>}
  </>;
}

"use client";

import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { GlassSectionHeader } from "@/components/ui/glass-section-header";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { listStandaloneQuotationsAction } from "./standalone-quotation-actions";

type StandaloneRow = { id: string; name: string; version: number; status: string; updated_at: string; subtotal: string | null };
type ProjectRow = { id: string; name: string; projectId: string; projectName: string; clientName: string | null; version: number; status: string; updatedAt: string; subtotal: string | null };
const money = (value: string | null) => value === null ? "Nincs összesítés" : `${Number(value).toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ft nettó`;
const date = (value: string) => new Date(value).toLocaleDateString("hu-HU");

export function QuotationOverview({ organizationId, projectItems, projectHasMore, projectError }: Readonly<{ organizationId: string; projectItems: ProjectRow[]; projectHasMore: boolean; projectError: string }>) {
  const router = useRouter();
  const [standalone, setStandalone] = useState<StandaloneRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const result = await listStandaloneQuotationsAction(organizationId);
    if (result.ok) { setStandalone(result.data.items as StandaloneRow[]); setHasMore(result.data.hasMore); }
    else setError(result.error);
    setLoading(false);
  }, [organizationId]);
  useEffect(() => { void load(); }, [load]);

  return <>
    <GlassPageHeader title="Árajánlatok" actions={<><Link className="secondary-button" href={`/beallitasok/munkadij?organization=${organizationId}`}>Munkadíj-szabályok</Link><Link className="primary-button" href={`/ajanlatok/uj?organization=${organizationId}`}>+ Új árajánlat</Link></>} />
    <section className="quotation-overview-section" aria-labelledby="standalone-quotations-heading"><GlassSectionHeader id="standalone-quotations-heading" title="Önálló ajánlatok" />
      {loading && <p role="status" className="form-message">Ajánlatok betöltése…</p>}
      {error && <div className="form-message is-error" role="alert"><span>{error}</span> <button type="button" className="text-button" onClick={() => void load()}>Újrapróbálom</button></div>}
      {!loading && !error && standalone.length === 0 && <div className="empty-state"><FileText aria-hidden="true" /><div><h2>Még nincs önálló ajánlatod</h2><p>Adj hozzá kézi, munkadíj vagy katalógus alapú tételt, és mentsd piszkozatként.</p><Link className="secondary-button" href={`/ajanlatok/uj?organization=${organizationId}`}>Új árajánlat indítása</Link></div></div>}
      {!loading && standalone.length > 0 && <div className="quotation-overview-list">{standalone.map((quote) => <Link className="quotation-overview-card" key={quote.id} href={`/ajanlatok/${quote.id}?organization=${organizationId}`}><span className="future-module-icon"><FileText aria-hidden="true" /></span><span className="quotation-overview-main"><strong>{quote.name}</strong><small>Önálló · v{quote.version} · módosítva {date(quote.updated_at)}</small></span><span className="quotation-overview-total">Piszkozat <strong>{money(quote.subtotal)}</strong></span><ArrowRight aria-hidden="true" /></Link>)}</div>}
      {hasMore && <p className="missing-data" role="status">Az első 100 önálló ajánlat látható. A lista további lapozása későbbi fejlesztés.</p>}
    </section>
    <section className="quotation-overview-section" aria-labelledby="project-quotations-heading"><GlassSectionHeader id="project-quotations-heading" title="Projektajánlatok" />
      {projectError && <div className="form-message is-error" role="alert"><span>{projectError}</span> <button type="button" className="text-button" onClick={() => router.refresh()}>Újrapróbálom</button></div>}
      {projectItems.length === 0 && !projectError ? <p className="missing-data">Nincs megjeleníthető projektajánlat.</p> : <div className="quotation-overview-list">{projectItems.map((quote) => <Link className="quotation-overview-card" key={quote.id} href={`/projektek/${quote.projectId}/ajanlatok?organization=${organizationId}&edit=${quote.id}`}><span className="future-module-icon"><FileText aria-hidden="true" /></span><span className="quotation-overview-main"><strong>{quote.name}</strong><small>Projekt · {quote.projectName}{quote.clientName ? ` · ${quote.clientName}` : ""} · v{quote.version} · módosítva {date(quote.updatedAt)}</small></span><span className="quotation-overview-total"><span className={`status-pill status-${quote.status}`}>{quote.status === "draft" ? "Piszkozat" : quote.status}</span><strong>{money(quote.subtotal)}</strong></span><ArrowRight aria-hidden="true" /></Link>)}</div>}
      {projectHasMore && <p className="missing-data" role="status">Az első 100 projektajánlat látható; további lapozás még nincs bekötve.</p>}
    </section>
    <p className="quotation-lifecycle-note">Az önálló ajánlatok jelenleg csak piszkozatként menthetők. Véglegesítés, elfogadás, ÁFA-számítás és hivatalos PDF nem érhető el.</p>
  </>;
}

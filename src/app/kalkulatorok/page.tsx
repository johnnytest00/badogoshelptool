import Link from "next/link";
import { Calculator, House, Ruler, Waves } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";

export default async function CalculatorsPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Kalkulátorok</p><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  return <main className="dashboard-shell"><div className="dashboard-container">
    <Link className="back-link" href={`/?organization=${organizationId}`}>← Műhely áttekintése</Link>
    <header className="module-page-header calculator-overview-header"><div><p className="section-eyebrow">Kalkulátorok</p><h1>Válassz számítást</h1><p>A támogatott geometriai és bádogos munkaszámítások projekt nélkül is megnyithatók.</p></div><Link className="secondary-button" href={`/kalkulatorok/mentett?organization=${organizationId}`}>Mentett számításaim →</Link></header>
    <section className="calculator-category"><div className="module-page-header"><h2>Tető és tetőfedés</h2></div>
      <div className="project-module-list calculator-entry-grid"><Link className="detail-surface project-module-link" href={`/kalkulatorok/nyeregteto?organization=${organizationId}`}><span className="future-module-icon"><House aria-hidden="true" /></span><span><strong>Tetőgeometria és tetőfedés</strong><small>Hét tetőforma közös geometriai választója, méretezett rajz és menthető előnézet.</small></span><span className="project-calculator-open">Tetőkalkulátor →</span></Link><Link className="detail-surface project-module-link" href={`/kalkulatorok/cserepeslemez?organization=${organizationId}`}><span className="future-module-icon"><House aria-hidden="true" /></span><span><strong>Cserepeslemez-fedés</strong><small>Nyeregtető-geometria, termékspecifikus lemezméretek és sematikus teljeshossz-kiosztás.</small></span><span className="project-calculator-open">Önálló számítás →</span></Link></div>
    </section>
    <section className="calculator-category"><div className="module-page-header"><h2>Ereszcsatorna</h2></div><div className="project-module-list calculator-entry-grid">
      <Link className="detail-surface project-module-link" href={`/kalkulatorok/ereszcsatorna?organization=${organizationId}`}><span className="future-module-icon"><Waves aria-hidden="true" /></span><span><strong>Ereszcsatorna kalkulátor</strong><small>Szakaszok, lefolyók és kézi tartozékok előzetes becslése.</small></span><span className="project-calculator-open">Megnyitás →</span></Link>
    </div></section>
    <section className="calculator-category"><div className="module-page-header"><h2>Szegélyek és lemezmunka</h2></div><div className="project-module-list calculator-entry-grid">
      <Link className="detail-surface project-module-link" href={`/kalkulatorok/szegelyek?organization=${organizationId}`}><span className="future-module-icon"><Calculator aria-hidden="true" /></span><span><strong>Bádogos szegélyek</strong><small>Kézi szakaszok, szálhossz és előzetes mennyiségek.</small></span><span className="project-calculator-open">Önálló számítás →</span></Link>
      <Link className="detail-surface project-module-link" href={`/kalkulatorok/lemezprofilok?organization=${organizationId}`}><span className="future-module-icon"><Ruler aria-hidden="true" /></span><span><strong>Lemezprofilok és hajtások</strong><small>Profilgeometria és paraméteralapú nettó teríték.</small></span><span className="project-calculator-open">Önálló számítás →</span></Link>
    </div></section>
    <nav className="calculator-project-access" aria-label="Kapcsolódó munkaterületek"><Link href={`/projektek?organization=${organizationId}`}>Projektmunka megnyitása →</Link><span>Az önálló számítás nem igényel projektet.</span></nav>
  </div></main>;
}

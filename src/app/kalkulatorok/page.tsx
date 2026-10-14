import Link from "next/link";
import { Calculator, House, Ruler, Waves } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { projectStatusLabels } from "@/domain/projects/contracts";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectsForOrganization } from "@/features/projects/project-data";

export default async function CalculatorsPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Kalkulátorok</p><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const projects = await getProjectsForOrganization(organizationId, { includeArchived: false, sort: "newest" });
  return <main className="dashboard-shell"><div className="dashboard-container">
    <Link className="back-link" href={`/?organization=${organizationId}`}>← Műhely áttekintése</Link>
    <header className="module-page-header"><p className="section-eyebrow">Kalkulátorok</p><h1>Válassz számítást</h1><p>A geometriai nyeregtető-előnézet és a három bádogos kalkulátor projekt nélkül is megnyitható. Az önálló kalkulátorok jelenleg csak az oldalon számolnak; tartós mentés és anyagkimutatás-átadás projektben érhető el.</p></header>
    <section className="project-module-projects"><div className="module-page-header"><p className="section-eyebrow">Tetők és tetőfedés</p><h2>Geometriai alap</h2><p>Meglévő nyeregtető-motor, projekt nélküli előnézet. Tetőfedési vagy szerkezeti mennyiségszámítás még nem érhető el ezen az útvonalon.</p></div>
      <div className="project-module-list calculator-entry-grid"><Link className="detail-surface project-module-link" href={`/kalkulatorok/nyeregteto?organization=${organizationId}`}><span className="future-module-icon"><House aria-hidden="true" /></span><span><strong>Nyeregtető geometria</strong><small>Felület, geometriai hosszak és műszaki rajz a megadott méretekből.</small></span><span className="project-calculator-open">Előnézet →</span></Link></div>
    </section>
    <section className="project-module-projects"><div className="module-page-header"><p className="section-eyebrow">Bádogos munkák</p><h2>Eresz, szegély és lemezprofil</h2></div><div className="project-module-list calculator-entry-grid">
      <Link className="detail-surface project-module-link" href={`/kalkulatorok/ereszcsatorna?organization=${organizationId}`}><span className="future-module-icon"><Waves aria-hidden="true" /></span><span><strong>Ereszcsatorna</strong><small>Szakaszok, lefolyók és kézi tartozékok előzetes becslése.</small></span><span className="project-calculator-open">Önálló számítás →</span></Link>
      <Link className="detail-surface project-module-link" href={`/kalkulatorok/szegelyek?organization=${organizationId}`}><span className="future-module-icon"><Calculator aria-hidden="true" /></span><span><strong>Bádogos szegélyek</strong><small>Kézi szakaszok, szálhossz és előzetes mennyiségek.</small></span><span className="project-calculator-open">Önálló számítás →</span></Link>
      <Link className="detail-surface project-module-link" href={`/kalkulatorok/lemezprofilok?organization=${organizationId}`}><span className="future-module-icon"><Ruler aria-hidden="true" /></span><span><strong>Lemezprofilok és hajtások</strong><small>Profilgeometria és paraméteralapú nettó teríték.</small></span><span className="project-calculator-open">Önálló számítás →</span></Link>
    </div></section>
    <section className="project-module-projects"><div className="module-page-header"><p className="section-eyebrow">Projektmunka</p><h2>Mentett kalkulációk és források</h2><p>Projekt kiválasztásával a mentett revíziók, tetőgeometriai javaslatok és anyagkimutatás-átadás is elérhető.</p></div>
      {projects.length ? <div className="project-module-list">{projects.map((project) => <section className="detail-surface project-module-card" key={project.id}><div><p className="section-eyebrow">{projectStatusLabels[project.status]}</p><h2>{project.name}</h2><p>{project.clientName ?? "Ügyfél nélkül"}</p></div><div className="project-module-links"><Link href={`/projektek/${project.id}/ereszcsatorna?organization=${organizationId}`}>Ereszcsatorna</Link><Link href={`/projektek/${project.id}/szegelyek?organization=${organizationId}`}>Bádogos szegélyek</Link><Link href={`/projektek/${project.id}/lemezprofilok?organization=${organizationId}`}>Lemezprofilok és hajtások</Link></div></section>)}</div> : <section className="empty-state"><div><h2>Még nincs aktív projekt</h2><p>A projektben mentéshez és átadáshoz hozz létre munkát.</p><Link className="primary-button" href={`/projektek/uj?organization=${organizationId}`}>Projekt létrehozása</Link></div></section>}
    </section>
  </div></main>;
}

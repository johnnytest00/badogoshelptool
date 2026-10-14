import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectsForOrganization } from "@/features/projects/project-data";

export default async function QuotationsIndexPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Árajánlatok</p><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const projects = await getProjectsForOrganization(organizationId, { includeArchived: false, sort: "newest" });
  return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/?organization=${organizationId}`}>← Műhely áttekintése</Link><header className="module-page-header"><p className="section-eyebrow">Árajánlatok</p><h1>Projektajánlatok</h1><p>A piszkozatok, revíziók, státusztörténet és PDF jelenleg egy projekten belül érhető el. Az önálló ajánlatkészítés még nem része a rendszernek.</p></header>{projects.length ? <div className="project-module-list">{projects.map((project) => <Link className="detail-surface project-module-link" href={`/projektek/${project.id}/ajanlatok?organization=${organizationId}`} key={project.id}><span className="future-module-icon"><FileText aria-hidden="true" /></span><span><small>{project.clientName ?? "Ügyfél nélkül"}</small><strong>{project.name}</strong></span><span className="project-calculator-open">Ajánlatok megnyitása <ArrowRight aria-hidden="true" className="size-4" /></span></Link>)}</div> : <section className="empty-state"><div><h2>Még nincs aktív projekt</h2><p>Projekt létrehozása után az adott munkához ajánlatot készíthetsz.</p><Link className="primary-button" href={`/projektek/uj?organization=${organizationId}`}>Projekt létrehozása</Link></div></section>}</div></main>;
}

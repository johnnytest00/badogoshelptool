import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getExecutionOverviewForOrganization } from "@/features/execution/execution-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectsForOrganization } from "@/features/projects/project-data";

export default async function ExecutionIndexPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Kivitelezés</p><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [projects, plans] = await Promise.all([getProjectsForOrganization(organizationId, { includeArchived: true, sort: "newest" }), getExecutionOverviewForOrganization(organizationId)]);
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const visiblePlans = plans.flatMap((plan) => {
    const project = projectsById.get(plan.projectId);
    return project ? [{ plan, project }] : [];
  });
  return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/?organization=${organizationId}`}>← Műhely áttekintése</Link><header className="module-page-header"><p className="section-eyebrow">Kivitelezés</p><h1>Projekttervek áttekintése</h1><p>Olvasási nézet a műhely projektjeinek kivitelezési terveiről. A feladatok, munkanaplók és fotók részletei a projektben nyithatók meg.</p></header>{visiblePlans.length ? <div className="project-module-list">{visiblePlans.map(({ plan, project }) => <Link className="detail-surface project-module-link" href={`/projektek/${project.id}?organization=${organizationId}&execution=1#kivitelezes`} key={plan.id}><span className="future-module-icon"><ClipboardList aria-hidden="true" /></span><span><small>{project.name} · frissítve {new Date(plan.updatedAt).toLocaleDateString("hu-HU")}</small><strong>{plan.title}</strong></span><span className="project-calculator-open">Részletek <ArrowRight aria-hidden="true" className="size-4" /></span></Link>)}</div> : <section className="empty-state"><div><h2>Még nincs kivitelezési terv</h2><p>A tervek projekt részletező oldalán kezelhetők.</p><Link className="text-action" href={`/projektek?organization=${organizationId}`}>Projektek megnyitása <ArrowRight aria-hidden="true" className="size-4" /></Link></div></section>}</div></main>;
}

import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getExecutionOverviewForOrganization } from "@/features/execution/execution-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectsForOrganization } from "@/features/projects/project-data";

type ExecutionOverviewPlan = Awaited<ReturnType<typeof getExecutionOverviewForOrganization>>[number];
type ProjectRecord = Awaited<ReturnType<typeof getProjectsForOrganization>>[number];

export default async function ExecutionIndexPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Kivitelezés</p><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [projects, plans] = await Promise.all([getProjectsForOrganization(organizationId, { includeArchived: true, sort: "newest" }), getExecutionOverviewForOrganization(organizationId)]);
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const visiblePlans: Array<{ plan: ExecutionOverviewPlan; project: ProjectRecord }> = plans.flatMap((plan: ExecutionOverviewPlan) => {
    const project = projectsById.get(plan.projectId);
    return project ? [{ plan, project }] : [];
  });
  const plansByProject = new Map<string, Array<{ plan: ExecutionOverviewPlan; project: ProjectRecord }>>();
  visiblePlans.forEach((row) => plansByProject.set(row.project.id, [...(plansByProject.get(row.project.id) ?? []), row]));
  return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/?organization=${organizationId}`}>← Műhely áttekintése</Link><header className="module-page-header"><p className="section-eyebrow">Kivitelezés</p><h1>Projektmunka áttekintése</h1><p>A rögzített feladatok, munkanaplók és fotók rövid áttekintése. Minden terv és módosítás a saját projektjében nyílik meg.</p></header>{plansByProject.size ? <div className="execution-project-overview">{[...plansByProject.entries()].map(([projectId, rows]) => {
    const project = rows[0].project;
    return <section className="execution-project-group" key={projectId} aria-labelledby={`execution-project-${projectId}`}>
      <header><div><p className="section-eyebrow">Projekt</p><h2 id={`execution-project-${projectId}`}>{project.name}</h2></div><Link href={`/projektek/${projectId}?organization=${organizationId}&execution=1#kivitelezes`}>Projekt kivitelezésének megnyitása <ArrowRight aria-hidden="true" className="size-4" /></Link></header>
      <ul>{rows.map(({ plan }) => <li key={plan.id}><Link href={`/projektek/${projectId}?organization=${organizationId}&execution=1#kivitelezes`}><span className="execution-plan-icon"><ClipboardList aria-hidden="true" /></span><span className="execution-plan-main"><strong>{plan.title}</strong><small>Frissítve {new Date(plan.updatedAt).toLocaleDateString("hu-HU")}</small><span className="execution-plan-counts">{plan.tasks.total ? `${plan.tasks.total} feladat · ${plan.tasks.done} kész · ${plan.tasks.inProgress} folyamatban · ${plan.tasks.todo} teendő` : "Nincs rögzített feladat"} · {plan.journalCount} naplóbejegyzés · {plan.photoCount} fénykép</span>{plan.tasks.nextTasks.length > 0 && <span className="execution-plan-next">Következő teendő: {plan.tasks.nextTasks[0].title}{plan.tasks.nextTasks[0].dueDate ? ` · határidő ${new Date(`${plan.tasks.nextTasks[0].dueDate}T00:00:00`).toLocaleDateString("hu-HU")}` : ""}</span>}</span><span className="project-calculator-open">Részletek <ArrowRight aria-hidden="true" className="size-4" /></span></Link></li>)}</ul>
    </section>;
  })}</div> : <section className="empty-state"><div><h2>Még nincs kivitelezési terv</h2><p>A kivitelezési terv és a feladatok a projekt részletező oldalán kezelhetők.</p><Link className="text-action" href={`/projektek?organization=${organizationId}`}>Projektek megnyitása <ArrowRight aria-hidden="true" className="size-4" /></Link></div></section>}</div></main>;
}

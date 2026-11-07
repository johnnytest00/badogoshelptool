import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { ArrowRight, ClipboardList, Plus } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getExecutionOverviewForOrganization } from "@/features/execution/execution-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { BackNavigation } from "@/components/navigation/back-navigation";

type ExecutionOverviewPlan = { id: string; projectId: string | null; title: string; updatedAt: string; journalCount: number; photoCount: number; tasks: { total: number; done: number; inProgress: number; todo: number; nextTasks: { title: string; dueDate: string | null }[] } };

export default async function ExecutionIndexPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Kivitelezés</p><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const plans: ExecutionOverviewPlan[] = await getExecutionOverviewForOrganization(organizationId);
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container">
    <BackNavigation href={`/?organization=${organizationId}`} label="Vissza a műhelyhez" />
    <GlassPageHeader title="Projektek" actions={<Link className="primary-button" href={`/kivitelezes/uj?organization=${organizationId}`}><Plus aria-hidden="true" className="size-4" /> Új projekt</Link>} />
    {plans.length ? <ul className="execution-direct-plan-list">{plans.map((plan) => { const openTasks = plan.tasks.todo + plan.tasks.inProgress; const activity = [openTasks ? `${openTasks} nyitott feladat` : "Nincs nyitott feladat", plan.journalCount ? `${plan.journalCount} naplóbejegyzés` : "", plan.photoCount ? `${plan.photoCount} fénykép` : ""].filter(Boolean).join(" · "); return <li key={plan.id}><Link href={`/kivitelezes/${plan.id}?organization=${organizationId}`}><span className="execution-plan-icon"><ClipboardList aria-hidden="true" /></span><span className="execution-plan-main"><strong>{plan.title}</strong><small>Frissítve {new Date(plan.updatedAt).toLocaleDateString("hu-HU")}</small><span className="execution-plan-counts">{activity}</span></span><span className="project-calculator-open">Megnyitás <ArrowRight aria-hidden="true" className="size-4" /></span></Link></li>; })}</ul> : <section className="empty-state"><div><h2>Még nincs projekt</h2><p>Hozz létre projektmunkateret önállóan vagy mentett kalkulációból.</p><Link className="primary-button" href={`/kivitelezes/uj?organization=${organizationId}`}><Plus aria-hidden="true" className="size-4" /> Új projekt</Link></div></section>}
  </div></main>;
}

import { PackageOpen, Plus } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getWorkflowMaterialLists } from "@/features/material-takeoffs/material-preparation-data";
import { getExecutionPlanOptionsForOrganization } from "@/features/execution/execution-data";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassPageHeader } from "@/components/ui/glass-page-header";

export default async function MaterialListsPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az anyaglistákhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [lists, plans] = await Promise.all([getWorkflowMaterialLists(organizationId), getExecutionPlanOptionsForOrganization(organizationId)]);
  const planNames = new Map(plans.map((plan) => [plan.id, plan.title]));
  return <main className="dashboard-shell"><div className="dashboard-container workflow-material-lists-index">
    <Link className="back-link" href={`/?organization=${organizationId}`}>← Műhely áttekintése</Link>
    <GlassPageHeader title="Anyaglisták" context="Önállóan vagy kivitelezési tervhez kapcsolva" actions={<Link className="primary-button" href={`/anyaglistak/uj?organization=${organizationId}`}><Plus aria-hidden="true" className="size-4" /> Új anyaglista</Link>} />
    {lists.length ? <div className="workflow-material-list-cards">{lists.map((list) => <Link className="workflow-material-list-card glass-bubble" key={list.id} href={`/anyaglistak/${list.id}?organization=${organizationId}`}><span className="future-module-icon"><PackageOpen aria-hidden="true" /></span><span><strong>{list.name}</strong><small>{list.executionPlanId ? `Terv · ${planNames.get(list.executionPlanId) ?? "Kivitelezési terv"}` : "Önálló anyaglista"} · V{list.version} · {list.currentRevision?.items.length ?? 0} tétel</small></span><span className="workflow-material-list-arrow" aria-hidden="true">↗</span></Link>)}</div> : <section className="empty-state"><PackageOpen aria-hidden="true" /><div><h2>Még nincs anyaglistád</h2><p>Hozz létre önálló listát vagy kapcsold egy kivitelezési tervhez.</p><Link className="primary-button" href={`/anyaglistak/uj?organization=${organizationId}`}><Plus className="size-4" /> Új anyaglista</Link></div></section>}
  </div></main>;
}

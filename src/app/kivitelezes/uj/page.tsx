import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { ExecutionPlanning } from "@/features/execution/execution-planning";
import { getExecutionPlanningWorkspace } from "@/features/execution/execution-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { listExecutionPlanCalculationOptions } from "@/features/calculations/standalone-data";

export default async function NewExecutionPlanPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a munkanaplóhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [workspace, savedCalculations] = await Promise.all([getExecutionPlanningWorkspace(organizationId, null), listExecutionPlanCalculationOptions(organizationId)]);
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/kivitelezes?organization=${organizationId}`} label="Vissza a munkanaplókhoz" /><GlassPageHeader title="Új munkanapló" context="Önálló munkatér" /><ExecutionPlanning organizationId={organizationId} projectId={null} projectName="" clientName={null} location={null} plans={workspace.plans} acceptedQuotations={workspace.acceptedQuotations} savedCalculations={savedCalculations} timelineByPlan={workspace.timelineByPlan} initialCreate showHeading={false} showDescription={false} /></div></main>;
}

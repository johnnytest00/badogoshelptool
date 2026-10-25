import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { ExecutionPlanning } from "@/features/execution/execution-planning";
import { ExecutionLinkedSurveys } from "@/features/execution/execution-linked-surveys";
import { getExecutionPlanForOrganization, getExecutionPlanLinkedSurveys, getExecutionPlanningWorkspace } from "@/features/execution/execution-data";
import { getPlanLinkedDocuments, getStandaloneQuotationCandidates } from "@/features/execution/execution-document-links";
import { ExecutionPlanDocumentLinks } from "@/features/execution/execution-plan-document-links";
import { ExecutionPlanMaterialLists } from "@/features/execution/execution-plan-material-lists";
import { getPlanLinkedCalculations } from "@/features/execution/execution-calculation-links";
import { ExecutionPlanCalculations } from "@/features/execution/execution-plan-calculations";
import { loadOptionalExecutionSection } from "@/features/execution/execution-workspace-read";
import { getWorkflowMaterialLists } from "@/features/material-takeoffs/material-preparation-data";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { BackNavigation } from "@/components/navigation/back-navigation";

export default async function ExecutionPlanPage({ params, searchParams }: Readonly<{ params: Promise<{ planId: string }>; searchParams: Promise<{ organization?: string }> }>) {
  const { planId } = await params;
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(planId)) return <NotFound organizationId={organizationId} />;
  const planOption = await getExecutionPlanForOrganization(organizationId, planId);
  if (!planOption) return <NotFound organizationId={organizationId} />;
  const [workspace, project, linkedSurveys, materialLists, linkedDocuments, quotationCandidates, linkedCalculations] = await Promise.all([
    getExecutionPlanningWorkspace(organizationId, planOption.projectId, planId),
    planOption.projectId ? getProjectForOrganization(organizationId, planOption.projectId) : Promise.resolve(null),
    getExecutionPlanLinkedSurveys(organizationId, planId),
    loadOptionalExecutionSection(() => getWorkflowMaterialLists(organizationId)),
    getPlanLinkedDocuments(organizationId, planId),
    loadOptionalExecutionSection(() => getStandaloneQuotationCandidates(organizationId)),
    getPlanLinkedCalculations(organizationId, planId, selected.auth.userId),
  ]);
  const plan = workspace.plans[0];
  if (!plan) return <NotFound organizationId={organizationId} />;
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container">
    <BackNavigation href={`/kivitelezes?organization=${organizationId}`} label="Vissza a munkanaplókhoz" />
    <GlassPageHeader title={plan.title} context="Munkanapló" />
    <ExecutionPlanning organizationId={organizationId} projectId={planOption.projectId} projectName={project?.name ?? ""} clientName={project?.clientName ?? null} location={project?.location ?? null} plans={workspace.plans} acceptedQuotations={workspace.acceptedQuotations} timelineByPlan={workspace.timelineByPlan} initialPlanId={plan.id} showHeading={false} showDescription={false} showPlanTabs={false} />
    <ExecutionPlanMaterialLists organizationId={organizationId} planId={plan.id} result={materialLists} />
    <ExecutionPlanDocumentLinks organizationId={organizationId} planId={plan.id} documents={linkedDocuments}
      materialListCandidates={materialLists.status === "loaded" ? { status: "loaded", data: materialLists.data.filter((list) => list.executionPlanId !== plan.id).map((list) => ({ kind: "material_list" as const, documentId: list.id, name: list.name, detail: `Anyaglista · V${list.version}` })) } : materialLists}
      quotationCandidates={quotationCandidates} />
    <ExecutionPlanCalculations organizationId={organizationId} planId={plan.id} result={linkedCalculations} />
    <ExecutionLinkedSurveys organizationId={organizationId} result={linkedSurveys} />
  </div></main>;
}

function NotFound({ organizationId }: Readonly<{ organizationId: string }>) {
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><section className="empty-state"><div><h1>A munkanapló nem található</h1><p>Nincs hozzáférhető munkanapló ezzel az azonosítóval.</p><Link className="primary-button" href={`/kivitelezes?organization=${organizationId}`}>Vissza a munkanaplókhoz</Link></div></section></div></main>;
}

import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { getExecutionPlanOptionsForOrganization } from "@/features/execution/execution-data";
import { FieldSurveyEditor } from "@/features/field-surveys/field-survey-editor";

export default async function NewFieldSurveyPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; project?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a felméréshez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const requestedProjectId = query.project && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.project) ? query.project : null;
  const [requestedProject, executionPlans] = await Promise.all([
    requestedProjectId ? getProjectForOrganization(organizationId, requestedProjectId) : Promise.resolve(null),
    getExecutionPlanOptionsForOrganization(organizationId),
  ]);
  const projectOptions = requestedProject ? [{ id: requestedProject.id, name: requestedProject.name }] : [];
  const initialProjectId = requestedProject?.id ?? null;
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container field-survey-page-container"><FieldSurveyEditor organizationId={organizationId} userId={selected.auth.userId} projects={projectOptions} executionPlans={executionPlans} initialProjectId={initialProjectId} /></div></main>;
}

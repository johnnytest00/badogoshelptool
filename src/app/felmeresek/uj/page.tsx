import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization, getProjectsForOrganization } from "@/features/projects/project-data";
import { FieldSurveyEditor } from "@/features/field-surveys/field-survey-editor";

export default async function NewFieldSurveyPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; project?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a felméréshez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const requestedProjectId = query.project && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.project) ? query.project : null;
  const [projects, requestedProject] = await Promise.all([
    getProjectsForOrganization(organizationId, { includeArchived: true, sort: "newest" }),
    requestedProjectId ? getProjectForOrganization(organizationId, requestedProjectId) : Promise.resolve(null),
  ]);
  const projectOptions = projects.map(({ id, name }) => ({ id, name }));
  if (requestedProject && !projectOptions.some((project) => project.id === requestedProject.id)) projectOptions.unshift({ id: requestedProject.id, name: requestedProject.name });
  const initialProjectId = requestedProject?.id ?? null;
  return <main className="dashboard-shell"><div className="dashboard-container"><FieldSurveyEditor organizationId={organizationId} projects={projectOptions} initialProjectId={initialProjectId} /></div></main>;
}

import Link from "next/link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization, getProjectsForOrganization } from "@/features/projects/project-data";
import { getFieldSurvey } from "@/features/field-surveys/field-survey-data";
import { FieldSurveyEditor } from "@/features/field-surveys/field-survey-editor";

export default async function FieldSurveyPage({ params, searchParams }: Readonly<{ params: Promise<{ surveyId: string }>; searchParams: Promise<{ organization?: string }> }>) {
  const { surveyId } = await params;
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a felméréshez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(surveyId)) return <NotFound organizationId={organizationId} />;
  const survey = await getFieldSurvey(organizationId, surveyId);
  if (!survey) return <NotFound organizationId={organizationId} />;
  const [projects, linkedProject] = await Promise.all([
    getProjectsForOrganization(organizationId, { includeArchived: true, sort: "newest" }),
    survey.projectId ? getProjectForOrganization(organizationId, survey.projectId) : Promise.resolve(null),
  ]);
  const projectOptions = projects.map(({ id, name }) => ({ id, name }));
  if (linkedProject && !projectOptions.some((project) => project.id === linkedProject.id)) projectOptions.unshift({ id: linkedProject.id, name: linkedProject.name });
  return <main className="dashboard-shell"><div className="dashboard-container"><FieldSurveyEditor organizationId={organizationId} projects={projectOptions} survey={survey} /></div></main>;
}

function NotFound({ organizationId }: Readonly<{ organizationId: string }>) {
  return <main className="dashboard-shell"><div className="dashboard-container"><section className="field-survey-empty"><h1>A felmérés nem található</h1><p>Nincs hozzáférhető felmérés ezzel az azonosítóval.</p><Link className="primary-button" href={`/felmeresek?organization=${organizationId}`}>Vissza a felmérésekhez</Link></section></div></main>;
}

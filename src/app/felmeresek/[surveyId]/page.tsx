import { getSurveyRelationships } from "@/features/field-surveys/workspace-data";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { getFieldSurvey, getFieldSurveyRevision, getFieldSurveyRevisionVersions } from "@/features/field-surveys/field-survey-data";
import { FieldSurveyEditor } from "@/features/field-surveys/field-survey-editor";
import { getExecutionPlanOptionsForOrganization } from "@/features/execution/execution-data";

export default async function FieldSurveyPage({ params, searchParams }: Readonly<{ params: Promise<{ surveyId: string }>; searchParams: Promise<{ organization?: string; version?: string; section?: string }> }>) {
  const { surveyId } = await params;
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a felméréshez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(surveyId)) return <NotFound organizationId={organizationId} />;
  const survey = await getFieldSurvey(organizationId, surveyId);
  if (!survey) return <NotFound organizationId={organizationId} />;
  const requestedVersion = query.version === undefined ? null : Number(query.version);
  if (requestedVersion !== null && (!Number.isSafeInteger(requestedVersion) || requestedVersion < 1)) return <NotFound organizationId={organizationId} />;
  const [linkedProject, revisionVersions, historicalRevision, executionPlans] = await Promise.all([
    survey.projectId ? getProjectForOrganization(organizationId, survey.projectId) : Promise.resolve(null),
    getFieldSurveyRevisionVersions(organizationId, surveyId),
    requestedVersion !== null && requestedVersion !== survey.version ? getFieldSurveyRevision(organizationId, surveyId, requestedVersion) : Promise.resolve(null),
    getExecutionPlanOptionsForOrganization(organizationId),
  ]);
  if (requestedVersion !== null && requestedVersion !== survey.version && !historicalRevision) return <NotFound organizationId={organizationId} />;
  const relationships = await getSurveyRelationships(organizationId, surveyId);
  const projectOptions = linkedProject ? [{ id: linkedProject.id, name: linkedProject.name }] : [];
  return <main className="dashboard-shell"><div className="dashboard-container"><FieldSurveyEditor key={historicalRevision?.version ?? "current"} organizationId={organizationId} userId={selected.auth.userId} projects={projectOptions} executionPlans={executionPlans} relationships={relationships} survey={survey} initialSectionId={query.section} revisionVersions={revisionVersions} historicalRevision={historicalRevision} /></div></main>;
}

function NotFound({ organizationId }: Readonly<{ organizationId: string }>) {
  return <main className="dashboard-shell"><div className="dashboard-container"><section className="field-survey-empty"><h1>A felmérés nem található</h1><p>Nincs hozzáférhető felmérés ezzel az azonosítóval.</p><Link className="primary-button" href={`/felmeresek?organization=${organizationId}`}>Vissza a felmérésekhez</Link></section></div></main>;
}

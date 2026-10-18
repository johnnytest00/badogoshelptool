import { notFound } from "next/navigation";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getMaterialCategories, getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getExecutionPlanOptionsForOrganization } from "@/features/execution/execution-data";
import { getFieldSurvey, getFieldSurveyRevision } from "@/features/field-surveys/field-survey-data";
import { getSurveyRoofGeometrySources } from "@/features/field-surveys/survey-geometry-source-data";
import { getSurveyRelationships } from "@/features/field-surveys/workspace-data";
import { buildSurveyMaterialSource, defaultSurveyMaterialListName, type SurveyMaterialSource } from "@/features/material-takeoffs/survey-material-source";
import { WorkflowMaterialListEditor } from "@/features/material-takeoffs/workflow-material-list-editor";

export default async function NewMaterialListPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; plan?: string; surveyId?: string; surveyVersion?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az anyaglistához.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [products, plans, categories] = await Promise.all([getMaterialProductsForOrganization(organizationId), getExecutionPlanOptionsForOrganization(organizationId), getMaterialCategories(organizationId, false)]);
  let surveySource: SurveyMaterialSource | null = null;
  let defaultName = "";
  if (query.surveyId || query.surveyVersion) {
    if (!query.surveyId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.surveyId) || query.plan) notFound();
    const sourceSurvey = await getFieldSurvey(organizationId, query.surveyId);
    if (!sourceSurvey) notFound();
    const sourceVersion = query.surveyVersion === undefined ? sourceSurvey.version : Number(query.surveyVersion);
    if (!Number.isSafeInteger(sourceVersion) || sourceVersion < 1) notFound();
    const [sourceRevision, relationships, geometrySources] = await Promise.all([
      getFieldSurveyRevision(organizationId, sourceSurvey.id, sourceVersion),
      getSurveyRelationships(organizationId, sourceSurvey.id),
      getSurveyRoofGeometrySources(organizationId, sourceSurvey.id),
    ]);
    if (!sourceRevision) notFound();
    surveySource = buildSurveyMaterialSource(sourceSurvey, sourceRevision, relationships.calculations, geometrySources);
    defaultName = defaultSurveyMaterialListName(surveySource);
  }
  const requestedPlanId = query.plan && plans.some((plan) => plan.id === query.plan) ? query.plan : "";
  if (query.plan && !requestedPlanId) notFound();
  return <WorkflowMaterialListEditor organizationId={organizationId} products={products} plans={plans} categories={categories} list={null} requestedPlanId={requestedPlanId} surveySource={surveySource} defaultName={defaultName} />;
}

import { notFound } from "next/navigation";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getMaterialCategories, getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getExecutionPlanOptionsForOrganization } from "@/features/execution/execution-data";
import { getFieldSurvey, getFieldSurveyRevision } from "@/features/field-surveys/field-survey-data";
import { getSurveyRelationships } from "@/features/field-surveys/workspace-data";
import { surveySections } from "@/domain/field-surveys/workspace";
import { deriveSurveyMaterialSuggestions } from "@/domain/material-takeoffs/survey-material-suggestions";
import { WorkflowMaterialListEditor } from "@/features/material-takeoffs/workflow-material-list-editor";

export default async function NewMaterialListPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; plan?: string; surveyId?: string; surveyVersion?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az anyaglistához.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [products, plans, categories] = await Promise.all([getMaterialProductsForOrganization(organizationId), getExecutionPlanOptionsForOrganization(organizationId), getMaterialCategories(organizationId, false)]);
  let surveySource = null;
  let defaultName = "";
  if (query.surveyId || query.surveyVersion) {
    if (!query.surveyId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.surveyId) || query.plan) notFound();
    const sourceSurvey = await getFieldSurvey(organizationId, query.surveyId);
    if (!sourceSurvey) notFound();
    const sourceVersion = query.surveyVersion === undefined ? sourceSurvey.version : Number(query.surveyVersion);
    if (!Number.isSafeInteger(sourceVersion) || sourceVersion < 1) notFound();
    const [sourceRevision, relationships] = await Promise.all([
      getFieldSurveyRevision(organizationId, sourceSurvey.id, sourceVersion),
      getSurveyRelationships(organizationId, sourceSurvey.id),
    ]);
    if (!sourceRevision) notFound();
    const sections = surveySections(sourceRevision);
    const calculations = relationships.calculations.filter((link) => link.surveyRevisionId === sourceRevision.id);
    const derived = deriveSurveyMaterialSuggestions({
      surveyId: sourceSurvey.id,
      revisionId: sourceRevision.id,
      version: sourceRevision.version,
      workType: sourceRevision.workType,
      measurements: sourceRevision.measurements,
      sections,
    }, calculations);
    surveySource = {
      surveyId: sourceSurvey.id,
      surveyRevisionId: sourceRevision.id,
      surveyVersion: sourceRevision.version,
      currentSurveyVersion: sourceSurvey.version,
      stale: sourceSurvey.version > sourceRevision.version,
      suggestions: derived.suggestions,
      unavailable: derived.unavailable,
    };
    defaultName = `${sections.map((section) => section.name).join(" · ")} · V${sourceRevision.version} anyaglista`.slice(0, 120);
  }
  const requestedPlanId = query.plan && plans.some((plan) => plan.id === query.plan) ? query.plan : "";
  if (query.plan && !requestedPlanId) notFound();
  return <WorkflowMaterialListEditor organizationId={organizationId} products={products} plans={plans} categories={categories} list={null} requestedPlanId={requestedPlanId} surveySource={surveySource} defaultName={defaultName} />;
}

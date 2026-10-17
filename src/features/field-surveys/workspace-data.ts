import { createClient } from "@/infrastructure/supabase/server";
import type { SurveyCalculationLink, SurveyExecutionPlanLink, SurveyFollowup } from "@/domain/field-surveys/workspace";

export async function getSurveyRelationships(organizationId: string, surveyId: string): Promise<{ calculations: SurveyCalculationLink[]; followups: SurveyFollowup[]; executionPlans: SurveyExecutionPlanLink[] }> {
  const client = await createClient();
  const [links, followups, executionPlanLinks] = await Promise.all([
    client.from("field_survey_calculation_links").select("*").eq("organization_id", organizationId).eq("survey_id", surveyId),
    client.from("field_survey_followups").select("*").eq("organization_id", organizationId).eq("survey_id", surveyId),
    client.from("field_survey_execution_plan_links").select("id,execution_plan_id,survey_revision_id").eq("organization_id", organizationId).eq("survey_id", surveyId),
  ]);
  if (links.error || followups.error || executionPlanLinks.error) throw new Error("A felmérés kapcsolatai nem tölthetők be.");
  const calculations: SurveyCalculationLink[] = [];
  if (links.data?.length) {
    const [revisions, headers, surveys] = await Promise.all([
      client.from("calculation_revisions").select("id,calculation_id,revision_number,output_snapshot,warnings,data_provenance,validation_status").eq("organization_id", organizationId).in("id", links.data.map((link) => link.calculation_revision_id)),
      client.from("calculations").select("id,display_name,calculator_type").eq("organization_id", organizationId).in("id", links.data.map((link) => link.calculation_id)),
      client.from("field_survey_revisions").select("id,version").eq("organization_id", organizationId).eq("survey_id", surveyId),
    ]);
    if (revisions.error || headers.error || surveys.error) throw new Error("A kapcsolt számítások pontos revíziói nem tölthetők be.");
    for (const link of links.data) {
      const revision = revisions.data.find((row) => row.id === link.calculation_revision_id && row.calculation_id === link.calculation_id);
      const header = headers.data.find((row) => row.id === link.calculation_id);
      const survey = surveys.data.find((row) => row.id === link.survey_revision_id);
      if (revision && header && survey) calculations.push({ id: link.id, calculationId: header.id, revisionId: revision.id, revisionNumber: revision.revision_number, sectionId: link.section_id, surveyRevisionId: link.survey_revision_id, surveyVersion: survey.version, calculatorType: header.calculator_type, name: header.display_name, output: revision.output_snapshot, warnings: revision.warnings, provenance: revision.data_provenance, validationStatus: revision.validation_status });
    }
  }
  const executionPlanLinkRows = (executionPlanLinks.data ?? []) as { id: string; execution_plan_id: string; survey_revision_id: string }[];
  const planIds = [...new Set(executionPlanLinkRows.map((row) => row.execution_plan_id))];
  const revisionIds = [...new Set(executionPlanLinkRows.map((row) => row.survey_revision_id))];
  const [plans, surveyRevisions] = await Promise.all([
    planIds.length ? client.from("execution_plans").select("id,title").eq("organization_id", organizationId).in("id", planIds) : Promise.resolve({ data: [], error: null }),
    revisionIds.length ? client.from("field_survey_revisions").select("id,version").eq("organization_id", organizationId).in("id", revisionIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (plans.error || surveyRevisions.error) throw new Error("A kapcsolt munkanaplók pontos forrásai nem tölthetők be.");
  const executionPlans: SurveyExecutionPlanLink[] = executionPlanLinkRows.flatMap((row) => {
    const plan = plans.data?.find((item) => item.id === row.execution_plan_id);
    const revision = surveyRevisions.data?.find((item) => item.id === row.survey_revision_id);
    return plan && revision ? [{ id: row.id, executionPlanId: plan.id, surveyRevisionId: row.survey_revision_id, surveyVersion: revision.version, planTitle: plan.title }] : [];
  });
  return { calculations, executionPlans, followups: (followups.data ?? []).map((row) => ({ id: row.id, kind: row.kind as SurveyFollowup["kind"], projectId: row.project_id, quotationId: row.quotation_id, quotationRevisionId: row.quotation_revision_id, surveyRevisionId: row.survey_revision_id })) };
}

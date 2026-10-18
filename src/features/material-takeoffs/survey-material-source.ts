import { surveySections, type SurveyCalculationLink } from "@/domain/field-surveys/workspace";
import { deriveSurveyMaterialSuggestions, type SurveyMaterialSuggestion } from "@/domain/material-takeoffs/survey-material-suggestions";
import type { FieldSurveyRevisionRecord } from "@/features/field-surveys/field-survey-data";

/** Server-derived, immutable description of what an exact survey revision can safely hand to a material list. */
export type SurveyMaterialSource = Readonly<{
  surveyId: string;
  surveyRevisionId: string;
  surveyName: string;
  surveyVersion: number;
  currentSurveyVersion: number;
  stale: boolean;
  suggestions: readonly SurveyMaterialSuggestion[];
  unavailable: readonly string[];
}>;

export function buildSurveyMaterialSource(
  survey: Readonly<{ id: string; version: number }>,
  revision: FieldSurveyRevisionRecord,
  calculations: readonly SurveyCalculationLink[],
): SurveyMaterialSource {
  const sections = surveySections(revision);
  const derived = deriveSurveyMaterialSuggestions({
    surveyId: survey.id,
    revisionId: revision.id,
    version: revision.version,
    workType: revision.workType,
    measurements: revision.measurements,
    sections,
  }, calculations.filter((link) => link.surveyRevisionId === revision.id));
  return {
    surveyId: survey.id,
    surveyRevisionId: revision.id,
    surveyName: sections.map((section) => section.name).join(" · "),
    surveyVersion: revision.version,
    currentSurveyVersion: survey.version,
    stale: survey.version > revision.version,
    suggestions: derived.suggestions,
    unavailable: derived.unavailable,
  };
}

export const defaultSurveyMaterialListName = (source: Pick<SurveyMaterialSource, "surveyName" | "surveyVersion">) =>
  `${source.surveyName} · V${source.surveyVersion} anyaglista`.slice(0, 120);

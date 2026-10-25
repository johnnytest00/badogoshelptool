import { redirectRetiredSurveyRoute } from "@/features/field-surveys/retired-survey-route";

export default async function RetiredFieldSurveysPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  redirectRetiredSurveyRoute((await searchParams).organization);
}

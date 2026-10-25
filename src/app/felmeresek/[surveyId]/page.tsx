import { redirectRetiredSurveyRoute } from "@/features/field-surveys/retired-survey-route";

export default async function RetiredFieldSurveyPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  redirectRetiredSurveyRoute((await searchParams).organization);
}

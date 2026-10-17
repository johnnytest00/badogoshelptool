import { redirect } from "next/navigation";

/**
 * Keep old survey-to-calculator URLs compatible while moving the user back to
 * the source survey. Historical calculation records remain available from
 * the Calculator section and are never rewritten here.
 */
export default async function FieldSurveyCalculatorHandoffPage({ params, searchParams }: Readonly<{
  params: Promise<{ surveyId: string; calculator: string }>;
  searchParams: Promise<{ organization?: string; version?: string; section?: string }>;
}>) {
  const { surveyId } = await params;
  const query = await searchParams;
  const search = new URLSearchParams();
  if (query.organization) search.set("organization", query.organization);
  if (query.version) search.set("version", query.version);
  if (query.section) search.set("section", query.section);

  const suffix = search.size ? `?${search.toString()}` : "";
  redirect(`/felmeresek/${encodeURIComponent(surveyId)}${suffix}`);
}

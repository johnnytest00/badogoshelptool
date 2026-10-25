import { redirect } from "next/navigation";

/** M5: the separate field survey workflow is retired; dimensions are entered in the calculators. Data is kept, not deleted. */
export function redirectRetiredSurveyRoute(organization?: string): never {
  redirect(organization && /^[0-9a-f-]{36}$/i.test(organization) ? `/kalkulatorok?organization=${organization}` : "/kalkulatorok");
}

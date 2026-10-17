export type CalculatorSuiteQuery = Readonly<{
  calculator?: string;
  organization?: string;
}>;

/** Build a canonical suite URL while retaining the active calculator and organization. */
export function calculatorSuiteHref(query: CalculatorSuiteQuery): string {
  const parameters = new URLSearchParams();
  if (query.calculator) parameters.set("calculator", query.calculator);
  if (query.organization) parameters.set("organization", query.organization);
  const search = parameters.toString();
  return search ? `/kalkulatorok?${search}` : "/kalkulatorok";
}

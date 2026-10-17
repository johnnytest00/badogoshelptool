import { redirect } from "next/navigation";
import { calculatorSuiteHref } from "@/features/calculators/calculator-navigation";

export default async function LegacyConstructionCalculatorsPage({ searchParams }: Readonly<{ searchParams: Promise<{ calculator?: string; organization?: string }> }>) {
  redirect(calculatorSuiteHref(await searchParams));
}

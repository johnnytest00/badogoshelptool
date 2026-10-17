import { BackNavigation } from "@/components/navigation/back-navigation";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { ConstructionCalculatorSuite } from "@/features/calculators/construction-suite";

export default async function IndependentConstructionCalculatorsPage({ searchParams }: Readonly<{ searchParams: Promise<{ calculator?: string; organization?: string }> }>) {
  const query = await searchParams;
  const backHref = query.organization ? `/kalkulatorok?organization=${encodeURIComponent(query.organization)}` : "/kalkulatorok";
  return <main className="dashboard-shell"><div className="dashboard-container">
    <BackNavigation href={backHref} label="Vissza a Kalkulátorokhoz" />
    <GlassPageHeader title="Építési kalkulátorok" context={<span>Önálló, helyben futó geometriai és mennyiségi segédprogramok</span>} />
    <ConstructionCalculatorSuite initialCalculatorId={query.calculator} />
  </div></main>;
}

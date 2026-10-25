import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { ConstructionCalculatorSuite } from "@/features/calculators/construction-suite";
import { getCalculatorMaterialProfiles } from "@/features/materials/material-data";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getConstructionCalculation } from "@/features/calculations/construction-data";
import { getExecutionPlanOptionsForOrganization } from "@/features/execution/execution-data";
import { getPlanLinksForCalculation } from "@/features/execution/execution-calculation-links";

export default async function CalculatorsPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; calculator?: string; calculation?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Kalkulátorok</p><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;

  const organizationId = selected.organization.id;
  // Read-only, organization-scoped; a failure degrades to manual/DEMO mode instead of breaking the calculators.
  const catalog = await getCalculatorMaterialProfiles(organizationId).then((profiles) => ({ profiles, error: false }), () => ({ profiles: [], error: true }));
  const saved = query.calculation && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.calculation)
    ? await getConstructionCalculation(organizationId, query.calculation) : null;
  // Optional work log data for the saved calculation; a failure only hides linking, never the calculator.
  const planLinks = saved ? await Promise.all([getExecutionPlanOptionsForOrganization(organizationId), getPlanLinksForCalculation(organizationId, saved.calculationId)])
    .then(([plans, links]) => ({ plans, links }), () => null) : null;
  if (query.calculation && !saved) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>A mentett kalkuláció nem érhető el.</h1><p>Lehet, hogy másik fiókhoz vagy műhelyhez tartozik.</p><Link className="secondary-button" href={`/kalkulatorok/mentett?organization=${organizationId}`}>Mentett számításaim</Link></section></main>;
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container">
    <BackNavigation href={`/?organization=${organizationId}`} label="Vissza a műhelyhez" />
    <GlassPageHeader title="Kalkulátorok" actions={<Link className="secondary-button" href={`/kalkulatorok/mentett?organization=${organizationId}`}>Mentett számításaim →</Link>} />
    <ConstructionCalculatorSuite key={`${selected.auth.userId}:${organizationId}`} initialCalculatorId={saved?.calculatorId ?? query.calculator} catalogProfiles={catalog.profiles} catalogError={catalog.error} organizationId={organizationId} userId={selected.auth.userId} saved={saved} planLinks={planLinks} />
  </div></main>;
}

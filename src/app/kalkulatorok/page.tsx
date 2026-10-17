import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { ConstructionCalculatorSuite } from "@/features/calculators/construction-suite";

export default async function CalculatorsPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; calculator?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Kalkulátorok</p><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;

  const organizationId = selected.organization.id;
  return <main className="dashboard-shell"><div className="dashboard-container">
    <Link className="back-link" href={`/?organization=${organizationId}`}>← Műhely áttekintése</Link>
    <GlassPageHeader title="Kalkulátorok" actions={<Link className="secondary-button" href={`/kalkulatorok/mentett?organization=${organizationId}`}>Mentett számításaim →</Link>} />
    <ConstructionCalculatorSuite initialCalculatorId={query.calculator} />
  </div></main>;
}

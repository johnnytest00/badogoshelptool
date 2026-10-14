import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { StandaloneGablePreview } from "@/features/roof-models/standalone-gable-preview";
import { getGableTrapezoidalCovering } from "@/features/roof-models/gable-trapezoidal-covering-data";

export default async function StandaloneGablePage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; calculation?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const saved = query.calculation ? await getGableTrapezoidalCovering(selected.organization.id, query.calculation) : null;
  if (query.calculation && (!saved || saved.projectId)) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A mentett fedési számítás nem érhető el.</h1></section></main>;
  return <main className="dashboard-shell"><div className="dashboard-container"><StandaloneGablePreview organizationId={selected.organization.id} saved={saved} /></div></main>;
}

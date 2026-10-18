import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getProjectOrganization } from "@/features/projects/organization";
import { StandaloneGableMetalTilePreview } from "@/features/roof-models/gable-metal-tile-covering-preview";
import { getGableMetalTileCovering } from "@/features/roof-models/gable-metal-tile-covering-data";

export default async function StandaloneMetalTilePage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; calculation?: string; revision?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const saved = query.calculation ? await getGableMetalTileCovering(selected.organization.id, query.calculation) : null;
  if (query.calculation && (!saved || saved.projectId)) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>A mentett cserepeslemez-számítás nem érhető el.</h1></section></main>;
  const requestedRevision = query.revision ? Number(query.revision) : undefined;
  const revisionNumber = Number.isInteger(requestedRevision) && requestedRevision! > 0 ? requestedRevision : undefined;
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/kalkulatorok?organization=${selected.organization.id}`} label="Vissza a kalkulátorokhoz" /><StandaloneGableMetalTilePreview organizationId={selected.organization.id} saved={saved} initialRevisionNumber={revisionNumber} /></div></main>;
}

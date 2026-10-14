import Link from "next/link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { ProfileEditor } from "@/features/sheet-metal/profile-editor";
import { getProfileCatalogCandidates, getSheetMetalProfiles } from "@/features/sheet-metal/profile-data";

export default async function SheetMetalProfilePage({ params, searchParams }: Readonly<{ params: Promise<{ projectId: string }>; searchParams: Promise<{ organization?: string; calculation?: string; revision?: string }> }>) {
  const { projectId } = await params;
  const pageQuery = await searchParams;
  const selected = await getProjectOrganization(pageQuery.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a profil szerkesztéséhez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const project = await getProjectForOrganization(organizationId, projectId);
  if (!project) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A projekt nem található.</h1><Link className="login-secondary-link" href={`/projektek?organization=${organizationId}`}>Vissza a projektekhez</Link></section></main>;
  const [profiles, catalogCandidates] = await Promise.all([getSheetMetalProfiles(organizationId, projectId), getProfileCatalogCandidates(organizationId)]);
  if ((pageQuery.calculation && !profiles.some((profile) => profile.calculationId === pageQuery.calculation)) || (pageQuery.revision && !profiles.some((profile) => profile.revisions.some((revision) => revision.revisionId === pageQuery.revision)))) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A projektprofil nem található.</h1><Link className="login-secondary-link" href={`/projektek/${projectId}/lemezprofilok?organization=${organizationId}`}>Projektprofilok megnyitása</Link></section></main>;
  return <main className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/projektek/${projectId}?organization=${organizationId}`} label="Vissza a projekthez" /><ProfileEditor organizationId={organizationId} projectId={projectId} profiles={profiles} catalogCandidates={catalogCandidates} initialCalculationId={pageQuery.calculation} initialRevisionId={pageQuery.revision} /></div></main>;
}

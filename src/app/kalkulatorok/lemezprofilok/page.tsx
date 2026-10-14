import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getProfileCatalogCandidates } from "@/features/sheet-metal/profile-data";
import { ProfileEditor } from "@/features/sheet-metal/profile-editor";
import { getProjectOrganization } from "@/features/projects/organization";

export default async function StandaloneProfilePage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a kalkulátorhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const catalogCandidates = await getProfileCatalogCandidates(selected.organization.id);
  return <main className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/kalkulatorok?organization=${selected.organization.id}`} label="Vissza a kalkulátorokhoz" /><ProfileEditor organizationId={selected.organization.id} profiles={[]} catalogCandidates={catalogCandidates} /></div></main>;
}

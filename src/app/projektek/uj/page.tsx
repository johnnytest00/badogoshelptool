import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getClientsForOrganization } from "@/features/projects/project-data";
import { ProjectCreateForm } from "@/features/projects/project-forms";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { GlassPageHeader } from "@/components/ui/glass-page-header";

export default async function NewProjectPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt az új projekthez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const clients = await getClientsForOrganization(selected.organization.id);
  return <main className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/projektek?organization=${selected.organization.id}`} label="Vissza a projektekhez" /><GlassPageHeader title="Új projekt" /><section className="form-page-card"><p className="page-lead">A tetőméretek és a kalkulátorok később, a projekt áttekintésében kapcsolódnak hozzá.</p><ProjectCreateForm organizationId={selected.organization.id} clients={clients.map((client) => ({ id: client.id, name: client.name }))} /></section></div></main>;
}

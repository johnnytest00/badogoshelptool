import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { ArrowLeft } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getClientsForOrganization } from "@/features/projects/project-data";
import { ClientEditForm } from "@/features/projects/project-forms";
import { GlassPageHeader } from "@/components/ui/glass-page-header";

export default async function ClientDetailPage({ params, searchParams }: Readonly<{ params: Promise<{ clientId: string }>; searchParams: Promise<{ organization?: string }> }>) {
  const { clientId } = await params; const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt az ügyfélhez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const client = (await getClientsForOrganization(selected.organization.id)).find((item) => item.id === clientId);
  if (!client) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Ügyfél</p><h1>Az ügyfél nem található.</h1><Link className="login-secondary-link" href={`/ugyfelek?organization=${selected.organization.id}`}>Vissza az ügyfelekhez</Link></section></main>;
  return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/ugyfelek?organization=${selected.organization.id}`}><ArrowLeft className="size-4" /> Vissza az ügyfelekhez</Link><GlassPageHeader title={client.name} /><section className="form-page-card"><ClientEditForm organizationId={selected.organization.id} client={client} /></section></div></main>;
}

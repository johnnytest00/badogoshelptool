import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { ArrowLeft } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { ClientCreatePageForm } from "@/features/projects/client-create-page-form";

export default async function NewClientPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt az új ügyfélhez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/ugyfelek?organization=${selected.organization.id}`}><ArrowLeft className="size-4" /> Vissza az ügyfelekhez</Link><section className="form-page-card" aria-labelledby="new-client-title"><p className="section-eyebrow">Kapcsolat</p><h1 id="new-client-title">Új ügyfél</h1><p className="page-lead">Csak a név kötelező; a többi adatot később is megadhatod.</p><ClientCreatePageForm organizationId={selected.organization.id} /></section></div></main>;
}

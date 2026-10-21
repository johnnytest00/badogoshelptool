import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getLaborRates } from "@/features/quotations/labor-rate-data";
import { LaborRateSettings } from "@/features/quotations/labor-rate-settings";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { BackNavigation } from "@/components/navigation/back-navigation";

export default async function LaborRatesPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a munkadíjakhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const membership = selected.auth.organizations.find((o) => o.id === organizationId);
  const rates = await getLaborRates(organizationId);
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container">
    <BackNavigation href={`/ajanlatok?organization=${organizationId}`} label="Vissza az ajánlatokhoz" />
    <GlassPageHeader title="Munkadíj-szabályok" context="Opcionális · szervezeti beállítás" />
    <LaborRateSettings organizationId={organizationId} rates={rates} canEdit={membership?.role === "owner" || membership?.role === "admin"} />
  </div></main>;
}

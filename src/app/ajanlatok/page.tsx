import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getGlobalProjectQuotations } from "@/features/quotations/global-quotation-data";
import { QuotationOverview } from "@/features/quotations/quotation-overview";
import { BackNavigation } from "@/components/navigation/back-navigation";

export default async function QuotationsIndexPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Árajánlatok</p><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  let projectItems: Awaited<ReturnType<typeof getGlobalProjectQuotations>>["items"] = [];
  let projectHasMore = false;
  let projectError = "";
  try {
    const result = await getGlobalProjectQuotations(organizationId);
    projectItems = result.items; projectHasMore = result.hasMore;
  } catch (error) { projectError = error instanceof Error ? error.message : "A projektajánlatok listája nem tölthető be."; }
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/?organization=${organizationId}`} label="Vissza a műhelyhez" /><QuotationOverview organizationId={organizationId} projectItems={projectItems} projectHasMore={projectHasMore} projectError={projectError} /></div></main>;
}

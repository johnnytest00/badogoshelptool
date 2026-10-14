import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { StandaloneQuotationEditor } from "@/features/quotations/standalone-quotation-editor";

export default async function NewStandaloneQuotationPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az ajánlathoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const products = await getMaterialProductsForOrganization(organizationId);
  return <main className="dashboard-shell"><div className="dashboard-container"><StandaloneQuotationEditor userId={selected.auth.userId} organizationId={organizationId} quotationId={null} version={0} currentRevisionId={null} revisions={[]} products={products} /></div></main>;
}

import { notFound } from "next/navigation";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getExecutionPlanOptionsForOrganization } from "@/features/execution/execution-data";
import { WorkflowMaterialListEditor } from "@/features/material-takeoffs/workflow-material-list-editor";

export default async function NewMaterialListPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; plan?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az anyaglistához.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [products, plans] = await Promise.all([getMaterialProductsForOrganization(organizationId), getExecutionPlanOptionsForOrganization(organizationId)]);
  const requestedPlanId = query.plan && plans.some((plan) => plan.id === query.plan) ? query.plan : "";
  if (query.plan && !requestedPlanId) notFound();
  return <WorkflowMaterialListEditor organizationId={organizationId} products={products} plans={plans} list={null} requestedPlanId={requestedPlanId} />;
}

import { notFound } from "next/navigation";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getMaterialCategories, getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getExecutionPlanOptionsForOrganization } from "@/features/execution/execution-data";
import { getWorkflowMaterialLists } from "@/features/material-takeoffs/material-preparation-data";
import { WorkflowMaterialListEditor } from "@/features/material-takeoffs/workflow-material-list-editor";

export default async function MaterialListPage({ params, searchParams }: Readonly<{ params: Promise<{ listId: string }>; searchParams: Promise<{ organization?: string }> }>) {
  const { listId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listId)) notFound();
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az anyaglistához.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [lists, products, plans, categories] = await Promise.all([getWorkflowMaterialLists(organizationId), getMaterialProductsForOrganization(organizationId), getExecutionPlanOptionsForOrganization(organizationId), getMaterialCategories(organizationId, false)]);
  const list = lists.find((item) => item.id === listId);
  if (!list) notFound();
  return <WorkflowMaterialListEditor key={`${list.id}:${list.currentRevisionId ?? "new"}`} organizationId={organizationId} products={products} plans={plans} categories={categories} list={list} />;
}

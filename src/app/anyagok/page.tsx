import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getMaterialCategories, getMaterialManufacturers, getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { MaterialManager } from "@/features/materials/material-manager";

export default async function MaterialsPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt az anyagkezelőhöz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [products, categories, manufacturers] = await Promise.all([
    getMaterialProductsForOrganization(organizationId, { includeArchived: true }),
    getMaterialCategories(organizationId),
    getMaterialManufacturers(organizationId),
  ]);
  return <MaterialManager organizationId={organizationId} products={products} categories={categories} manufacturers={manufacturers} />;
}

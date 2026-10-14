import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { GutterCalculator } from "@/features/gutters/gutter-calculator";

export default async function StandaloneGutterPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a kalkulátorhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const products = await getMaterialProductsForOrganization(selected.organization.id, { includeArchived: false });
  const catalogVariants = products.flatMap((product) => product.variants.map((variant) => ({ id: variant.id, productId: product.id, productName: product.name, category: product.category, variantName: variant.name, sku: variant.sku, purchasingUnit: variant.purchasingUnit, lengthMm: variant.lengthMm, nominalWidthMm: variant.nominalWidthMm, effectiveWidthMm: variant.effectiveWidthMm, technicalSpecs: variant.technicalSpecs, provenance: variant.provenance })));
  return <main className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/kalkulatorok?organization=${selected.organization.id}`} label="Vissza a kalkulátorokhoz" /><GutterCalculator organizationId={selected.organization.id} suggestions={[]} saved={null} catalogVariants={catalogVariants} /></div></main>;
}

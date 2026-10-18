import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { GutterCalculator } from "@/features/gutters/gutter-calculator";
import { getStandaloneCalculation } from "@/features/calculations/standalone-data";
import type { GutterCalculationRecord } from "@/features/gutters/gutter-data";
import { gutterMaterialCalculator } from "@/domain/calculations/gutter-material";

export default async function StandaloneGutterPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; calculation?: string }> }>) {
  const params = await searchParams;
  const selected = await getProjectOrganization(params.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a kalkulátorhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const products = await getMaterialProductsForOrganization(selected.organization.id, { includeArchived: false });
  const catalogVariants = products.flatMap((product) => product.variants.map((variant) => ({ id: variant.id, productId: product.id, productName: product.name, category: product.category, variantName: variant.name, sku: variant.sku, purchasingUnit: variant.purchasingUnit, lengthMm: variant.lengthMm, nominalWidthMm: variant.nominalWidthMm, effectiveWidthMm: variant.effectiveWidthMm, technicalSpecs: variant.technicalSpecs, provenance: variant.provenance })));
  const candidate = params.calculation ? await getStandaloneCalculation(selected.organization.id, params.calculation) : null;
  const standalone = candidate?.calculatorType === gutterMaterialCalculator.id ? candidate : null;
  const current = standalone?.revisions.find((revision) => revision.revisionId === standalone.currentRevisionId);
  const saved = standalone && current ? { calculationId: standalone.calculationId, ...current, sourceRoofRevisionId: null, revisions: standalone.revisions } as unknown as GutterCalculationRecord : null;
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/kalkulatorok?organization=${selected.organization.id}`} label="Vissza a kalkulátorokhoz" /><GutterCalculator organizationId={selected.organization.id} suggestions={[]} saved={saved} standaloneName={standalone?.displayName} catalogVariants={catalogVariants} /></div></main>;
}

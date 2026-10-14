import Link from "next/link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { GutterCalculator } from "@/features/gutters/gutter-calculator";
import { getGutterCalculation, getGutterGeometrySuggestions } from "@/features/gutters/gutter-data";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";

export default async function GutterCalculatorPage({ params, searchParams }: Readonly<{ params: Promise<{ projectId: string }>; searchParams: Promise<{ organization?: string; calculation?: string; revision?: string }> }>) {
  const { projectId } = await params;
  const pageQuery = await searchParams;
  const selected = await getProjectOrganization(pageQuery.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt az ereszcsatorna-kalkulátorhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const project = await getProjectForOrganization(organizationId, projectId);
  if (!project) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A projekt nem található.</h1><Link className="login-secondary-link" href={`/projektek?organization=${organizationId}`}>Vissza a projektekhez</Link></section></main>;
  const [suggestions, saved, products] = await Promise.all([getGutterGeometrySuggestions(organizationId, projectId), getGutterCalculation(organizationId, projectId), getMaterialProductsForOrganization(organizationId, { includeArchived: false })]);
  if ((pageQuery.calculation && saved?.calculationId !== pageQuery.calculation) || (pageQuery.revision && saved?.revisionId !== pageQuery.revision)) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A projektkalkuláció nem található.</h1><Link className="login-secondary-link" href={`/projektek/${projectId}/ereszcsatorna?organization=${organizationId}`}>Projektkalkuláció megnyitása</Link></section></main>;
  const catalogVariants = products.flatMap((product) => product.variants.map((variant) => ({ id: variant.id, productId: product.id, productName: product.name, category: product.category, variantName: variant.name, sku: variant.sku, purchasingUnit: variant.purchasingUnit, lengthMm: variant.lengthMm, nominalWidthMm: variant.nominalWidthMm, effectiveWidthMm: variant.effectiveWidthMm, technicalSpecs: variant.technicalSpecs, provenance: variant.provenance })));
  return <main className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/projektek/${projectId}?organization=${organizationId}`} label="Vissza a projekthez" /><GutterCalculator organizationId={organizationId} projectId={projectId} suggestions={suggestions} saved={saved} catalogVariants={catalogVariants} /></div></main>;
}

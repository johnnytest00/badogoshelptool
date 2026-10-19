import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { Plus } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getMaterialCategories, getMaterialManufacturers, getMaterialProductForOrganization } from "@/features/materials/material-data";
import { materialProvenanceLabels, materialPurchasingUnitLabels } from "@/domain/materials/contracts";
import { MaterialProductForm, ProductStatusForm, VariantForm } from "@/features/materials/material-forms";
import { PriceOptionsPanel } from "@/features/materials/price-options-panel";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { BackNavigation } from "@/components/navigation/back-navigation";

export default async function MaterialProductPage({ params, searchParams }: Readonly<{ params: Promise<{ productId: string }>; searchParams: Promise<{ organization?: string }> }>) {
  const route = await params; const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organization = selected.organization;
  const [product, manufacturers, categories] = await Promise.all([getMaterialProductForOrganization(organization.id, route.productId), getMaterialManufacturers(organization.id), getMaterialCategories(organization.id)]);
  if (!product) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Az anyag nem található.</h1><Link className="login-secondary-link" href={`/anyagok?organization=${organization.id}`}>Vissza</Link></section></main>;
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container materials-workspace"><BackNavigation href={`/anyagok?organization=${organization.id}`} label="Vissza az anyagkezelőhöz" /><GlassPageHeader title={product.name} context={[product.categoryName, product.manufacturerName ?? "Gyártó nincs megadva", product.productCode].filter(Boolean).join(" · ")} actions={<ProductStatusForm organizationId={organization.id} product={product} />} /><section className="material-editor-card"><div className="material-section-title"><h2>Termékadatok</h2><span className="provenance-badge">{materialProvenanceLabels[product.provenance]}</span></div><MaterialProductForm organizationId={organization.id} manufacturers={manufacturers} categories={categories} product={product} /></section><section className="material-editor-card"><div className="material-section-title"><h2>Egységek és variánsok</h2><span className="missing-data">{product.variants.length} db</span></div><div className="material-variant-list">{product.variants.map((variant) => <details className="material-variant" key={variant.id} open={product.variants.length === 1}><summary><span><strong>{product.variants.length === 1 && variant.name === "Alap egység" ? "Alap egység" : variant.name}</strong>{variant.sku ? ` · ${variant.sku}` : ""}</span><small>{materialPurchasingUnitLabels[variant.purchasingUnit]}{variant.latestPrice ? ` · ${variant.latestPrice.amount.toLocaleString("hu-HU")} Ft/${materialPurchasingUnitLabels[variant.latestPrice.purchasingUnit]}` : variant.priceOptions.length ? ` · ${variant.priceOptions.filter((o) => o.status === "active" && o.current).length} beszállítói ár` : " · Ár nincs megadva"}</small></summary><VariantForm organizationId={organization.id} productId={product.id} variant={variant} /><PriceOptionsPanel organizationId={organization.id} variant={variant} /></details>)}</div><details className="material-add-variant"><summary><Plus className="size-4" /> Új egység / variáns hozzáadása</summary><VariantForm organizationId={organization.id} productId={product.id} /></details></section></div></main>;
}

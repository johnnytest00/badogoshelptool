import { materialProvenances, roofTechnicalSpecError, type MaterialProvenance } from "@/domain/materials/contracts";
import type { MaterialGroup, MaterialProfile, SpecValue } from "./roof-material-spec";

/** Structural subset of the Anyagkezelő records (MaterialProductRecord satisfies it); keeps the domain free of feature imports. */
export type CatalogVariantInput = Readonly<{ id: string; name: string; sku: string | null; purchasingUnit: string; nominalWidthMm: number | null; effectiveWidthMm: number | null; lengthMm: number | null; technicalSpecs: Readonly<Record<string, string>>; provenance: MaterialProvenance; sourceName: string | null }>;
export type CatalogProductInput = Readonly<{ id: string; name: string; manufacturerName: string | null; category: string; categoryActive: boolean; status: string; provenance: MaterialProvenance; sourceName: string | null; variants: readonly CatalogVariantInput[] }>;

/** Technical category (legacy enum) → calculator groups a product may serve. Custom categories map to `other` and are not offered. */
const GROUPS_BY_CATEGORY: Readonly<Record<string, readonly MaterialGroup[]>> = { roof_covering: ["covering"], insulation: ["underlay"], timber: ["rafter", "batten"] };

const number = (raw: string | undefined): number | undefined => raw === undefined || roofTechnicalSpecError("side_overlap_mm", raw) !== null ? undefined : Number(raw.trim().replace(",", "."));
const positive = (value: number | null | undefined) => value !== null && value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;
const weakest = (...items: MaterialProvenance[]): MaterialProvenance => items.reduce((worst, item) => materialProvenances.indexOf(item) > materialProvenances.indexOf(worst) ? item : worst);

/** Only properties actually present (and valid) in the variant are returned; absence stays absence. */
function valuesFor(group: MaterialGroup, variant: CatalogVariantInput): Record<string, SpecValue> {
  const specs = variant.technicalSpecs;
  const positiveSpec = (key: string) => positive(number(specs[key]));
  const candidates: Record<string, SpecValue | undefined> = group === "covering"
    ? { nominalWidthMm: positive(variant.nominalWidthMm), effectiveCoveringWidthMm: positive(variant.effectiveWidthMm), physicalLengthMm: positive(variant.lengthMm), usableCoveringLengthMm: positiveSpec("usable_covering_length_mm") }
    : group === "underlay"
      ? { rollWidthMm: positiveSpec("roll_width_mm"), rollLengthMm: positiveSpec("roll_length_mm"), sideOverlapMm: number(specs.side_overlap_mm), endOverlapMm: number(specs.end_overlap_mm), installationDirection: specs.installation_direction === "eave-to-ridge" || specs.installation_direction === "ridge-to-eave" ? specs.installation_direction : undefined }
      : { sectionWidthMm: positiveSpec("section_width_mm"), sectionHeightMm: positiveSpec("section_height_mm") };
  return Object.fromEntries(Object.entries(candidates).filter((entry): entry is [string, SpecValue] => entry[1] !== undefined));
}

/** Active catalog products → calculator profiles. IDs are variant UUIDs; values and provenance come from the catalog only. */
export function catalogProfilesFromProducts(products: readonly CatalogProductInput[]): MaterialProfile[] {
  return products.filter((product) => product.status === "active" && product.categoryActive).flatMap((product) =>
    (GROUPS_BY_CATEGORY[product.category] ?? []).flatMap((group) => product.variants.map((variant): MaterialProfile => {
      const source = [product.manufacturerName, product.name, variant.name !== product.name ? variant.name : null].filter(Boolean).join(" · ");
      const variantSource = variant.sourceName ?? product.sourceName;
      return {
        id: variant.id, group, label: source, verification: weakest(product.provenance, variant.provenance),
        sourceReference: `Anyagkezelő: ${source}${variantSource ? ` (forrás: ${variantSource})` : ""}`,
        catalog: { productId: product.id, variantId: variant.id, productName: product.name, variantName: variant.name, manufacturerName: product.manufacturerName, sku: variant.sku, purchasingUnit: variant.purchasingUnit },
        values: valuesFor(group, variant),
      };
    })));
}

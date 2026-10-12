import { metalSheetLayoutCalculator, type MetalSheetLayoutOutput } from "@/domain/calculations/metal-sheet-layout";
import { gableRoofCalculator, type GableRoofOutput } from "@/domain/calculations/gable-roof";
import { hasRelevantMaterialSpecificationChanged, mapCatalogVariantToSheetLayout, storedSheetLayoutInputSchema, type SheetLayoutMaterialCatalog, type StoredSheetLayoutInput } from "@/domain/calculations/sheet-layout-material";
import { getMaterialProductsForOrganization, type MaterialProductRecord } from "@/features/materials/material-data";
import { createClient } from "@/infrastructure/supabase/server";

export type SheetLayoutMaterialOption = Readonly<{
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  catalog: SheetLayoutMaterialCatalog;
}>;

export type SavedSheetLayoutRevision = Readonly<{
  id: string;
  revisionNumber: number;
  createdAt: string;
  createdBy: string | null;
  input: StoredSheetLayoutInput;
  output: MetalSheetLayoutOutput;
  geometryOutput: GableRoofOutput;
  geometryStale: boolean;
  materialStale: boolean;
  current: boolean;
}>;

export type SavedSheetLayout = Readonly<{
  calculationId: string;
  displayName: string;
  currentRevisionNumber: number;
  revisions: readonly SavedSheetLayoutRevision[];
}>;

export function toSheetLayoutMaterialOptions(products: readonly MaterialProductRecord[]): SheetLayoutMaterialOption[] {
  return products.flatMap((product) => product.status !== "active" ? [] : product.variants.map((variant) => ({
    productId: product.id,
    productName: product.name,
    variantId: variant.id,
    variantName: variant.name,
    catalog: mapCatalogVariantToSheetLayout({ ...variant, productName: product.name }),
  })));
}

export async function getSheetLayoutMaterials(organizationId: string) {
  const products = await getMaterialProductsForOrganization(organizationId);
  return toSheetLayoutMaterialOptions(products.filter((product) => product.category === "roof_covering" || product.category === "sheet_metal"));
}

export async function getSavedSheetLayout(organizationId: string, projectId: string, roofModelId: string, currentRoofRevisionId: string | null): Promise<SavedSheetLayout | null> {
  const supabase = await createClient();
  const { data: calculation, error } = await supabase.from("calculations")
    .select("id, display_name, current_revision_id")
    .eq("organization_id", organizationId).eq("project_id", projectId).eq("roof_model_id", roofModelId)
    .eq("calculator_type", "covering.metal-sheets.layout").maybeSingle();
  if (error) throw new Error("A mentett lemezkiosztás betöltése nem sikerült.");
  if (!calculation) return null;
  const { data: revisions, error: revisionError } = await supabase.from("calculation_revisions")
    .select("id, revision_number, input_snapshot, output_snapshot, material_variant_id, created_at, created_by")
    .eq("organization_id", organizationId).eq("calculation_id", calculation.id).order("revision_number", { ascending: false });
  if (revisionError) throw new Error("A lemezkiosztás előzményeinek betöltése nem sikerült.");
  const materials = await getSheetLayoutMaterials(organizationId);
  const currentCatalogs = new Map(materials.map((item) => [item.variantId, item.catalog]));
  const revisionIds = (revisions ?? []).map((revision) => revision.id);
  const { data: dependencies } = revisionIds.length ? await supabase.from("calculation_dependencies")
    .select("downstream_calculation_revision_id, upstream_calculation_revision_id, dependency_type")
    .eq("organization_id", organizationId).in("downstream_calculation_revision_id", revisionIds).eq("dependency_type", "geometry_calculation") : { data: [] };
  const geometryRevisionIds = (dependencies ?? []).flatMap((item) => item.upstream_calculation_revision_id ? [item.upstream_calculation_revision_id] : []);
  const { data: geometryRevisions } = geometryRevisionIds.length ? await supabase.from("calculation_revisions")
    .select("id, output_snapshot").eq("organization_id", organizationId).in("id", geometryRevisionIds) : { data: [] };
  const parsed = (revisions ?? []).flatMap((revision): SavedSheetLayoutRevision[] => {
    const input = storedSheetLayoutInputSchema.safeParse(revision.input_snapshot);
    const output = metalSheetLayoutCalculator.outputSchema.safeParse(revision.output_snapshot);
    const dependency = (dependencies ?? []).find((item) => item.downstream_calculation_revision_id === revision.id);
    const geometrySnapshot = (geometryRevisions ?? []).find((item) => item.id === dependency?.upstream_calculation_revision_id);
    const geometryOutput = gableRoofCalculator.outputSchema.safeParse(geometrySnapshot?.output_snapshot);
    if (!input.success || !output.success || !geometryOutput.success) return [];
    const currentCatalog = revision.material_variant_id ? currentCatalogs.get(revision.material_variant_id) : undefined;
    return [{
      id: revision.id,
      revisionNumber: revision.revision_number,
      createdAt: revision.created_at,
      createdBy: revision.created_by,
      input: input.data,
      output: output.data,
      geometryOutput: geometryOutput.data,
      geometryStale: input.data.source.roofRevisionId !== currentRoofRevisionId,
      materialStale: !currentCatalog || hasRelevantMaterialSpecificationChanged(input.data.material.catalogSnapshot, currentCatalog),
      current: revision.id === calculation.current_revision_id,
    }];
  });
  return { calculationId: calculation.id, displayName: calculation.display_name, currentRevisionNumber: parsed.find((item) => item.current)?.revisionNumber ?? 0, revisions: parsed };
}

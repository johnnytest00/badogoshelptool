import { executeCalculator } from "@/domain/calculations/engine";
import { sheetMetalProfileCalculator, sheetMetalProfileInputSchema, type SheetMetalProfileInput, type SheetMetalProfileOutput } from "@/domain/calculations/sheet-metal-profile";
import { createClient } from "@/infrastructure/supabase/server";
import type { ProfileCatalogCandidate } from "@/domain/calculations/profile-material-compatibility";

export type SavedProfileRevision = { revisionId: string; revisionNumber: number; createdAt: string; input: SheetMetalProfileInput; output: SheetMetalProfileOutput };
export type SavedProfile = { calculationId: string; displayName: string; currentRevisionNumber: number; revisions: SavedProfileRevision[] };
export type ProfileCatalogPreviewCandidate = ProfileCatalogCandidate & {
  price: { amount: number; currency: string; sourceName: string | null } | null;
};

export async function getProfileCatalogCandidates(organizationId: string): Promise<ProfileCatalogPreviewCandidate[]> {
  const supabase = await createClient();
  const { data: products, error: productError } = await supabase.from("material_products")
    .select("id, name, category, status").eq("organization_id", organizationId).eq("category", "sheet_metal").eq("status", "active");
  if (productError) throw new Error("Az anyagkatalógus nem tölthető be.");
  if (!products?.length) return [];
  const { data: variants, error: variantError } = await supabase.from("material_variants")
    .select("id, product_id, name, purchasing_unit, thickness_mm, technical_specs, data_provenance, source_name")
    .eq("organization_id", organizationId).in("product_id", products.map((product) => product.id));
  if (variantError) throw new Error("A katalógusvariánsok nem tölthetők be.");
  if (!variants?.length) return [];
  const { data: prices, error: priceError } = await supabase.from("material_prices")
    .select("id, variant_id, amount, currency, source_name, effective_date, recorded_at")
    .eq("organization_id", organizationId).eq("purchasing_unit", "square_meter")
    .in("variant_id", variants.map((variant) => variant.id))
    .order("effective_date", { ascending: false }).order("recorded_at", { ascending: false }).order("id", { ascending: false });
  if (priceError) throw new Error("A katalógusárak nem tölthetők be.");
  const productById = new Map(products.map((product) => [product.id, product]));
  return variants.flatMap((variant) => {
    const product = productById.get(variant.product_id);
    if (!product) return [];
    const specs = variant.technical_specs;
    const materialSpec = specs && typeof specs === "object" && !Array.isArray(specs) && typeof specs.profileMaterialSpec === "string" ? specs.profileMaterialSpec : null;
    return [{ productId: product.id, productName: product.name, variantId: variant.id, variantName: variant.name,
      category: product.category, status: product.status, purchasingUnit: variant.purchasing_unit,
      thicknessMm: variant.thickness_mm === null ? null : Number(variant.thickness_mm), materialSpec,
      provenance: variant.data_provenance, sourceName: variant.source_name,
      price: (() => { const price = prices?.find((item) => item.variant_id === variant.id); return price
        ? { amount: Number(price.amount), currency: price.currency, sourceName: price.source_name } : null; })() }];
  });
}

function persistedResultMatches(value: unknown, output: SheetMetalProfileOutput): boolean {
  if (!value || typeof value !== "object") return false;
  const stored = value as { schemaVersion?: unknown; flatPattern?: { widthMm?: unknown }; bends?: unknown; materialRequirement?: { lengthPerPieceMm?: unknown; pieceCount?: unknown; netBlankAreaPerPieceSqM?: unknown; totalNetBlankAreaSqM?: unknown } };
  if (stored.schemaVersion !== "1.0.0" || !stored.flatPattern || !Array.isArray(stored.bends)) return false;
  const width = stored.flatPattern.widthMm;
  if (width !== null && (typeof width !== "number" || !Number.isFinite(width))) return false;
  if ((width === null) !== (output.flatPattern.widthMm === null)
    || (width !== null && output.flatPattern.widthMm !== null && Math.abs(width - output.flatPattern.widthMm) > 1e-9)) return false;
  if (stored.materialRequirement) {
    const requirement = output.materialRequirement;
    for (const key of ["lengthPerPieceMm", "pieceCount", "netBlankAreaPerPieceSqM", "totalNetBlankAreaSqM"] as const) {
      const storedValue = stored.materialRequirement[key], expected = requirement[key];
      if (storedValue === null && expected === null) continue;
      if (typeof storedValue !== "number" || expected === null || !Number.isFinite(storedValue)
        || Math.abs(storedValue - expected) > Math.max(1e-9, Math.abs(expected) * 1e-12)) return false;
    }
  } else if (output.materialRequirement.pieceCount !== null) return false;
  if (stored.bends.length !== output.bends.length) return false;
  return stored.bends.every((bend, index) => {
    if (!bend || typeof bend !== "object") return false;
    const row = bend as { id?: unknown; allowanceMm?: unknown };
    const calculated = output.bends[index];
    return row.id === calculated.id && (row.allowanceMm === null
      ? calculated.allowanceMm === null
      : typeof row.allowanceMm === "number" && calculated.allowanceMm !== null && Math.abs(row.allowanceMm - calculated.allowanceMm) <= 1e-9);
  });
}

export async function getSheetMetalProfiles(organizationId: string, projectId: string): Promise<SavedProfile[]> {
  const supabase = await createClient();
  const { data: calculations, error } = await supabase.from("calculations").select("id, display_name, current_revision_id")
    .eq("organization_id", organizationId).eq("project_id", projectId).is("roof_model_id", null)
    .eq("calculator_type", sheetMetalProfileCalculator.id).order("created_at", { ascending: false });
  if (error || !calculations?.length) return [];
  const ids = calculations.map((calculation) => calculation.id);
  const { data: rows, error: revisionError } = await supabase.from("calculation_revisions")
    .select("id, calculation_id, revision_number, input_snapshot, output_snapshot, created_at, input_schema_version, calculator_implementation_version")
    .eq("organization_id", organizationId).in("calculation_id", ids).order("revision_number", { ascending: false });
  if (revisionError || !rows) return [];
  return calculations.flatMap((calculation) => {
    const revisions = rows.flatMap((row) => {
      if (row.calculation_id !== calculation.id || row.input_schema_version !== sheetMetalProfileCalculator.inputSchemaVersion
        || row.calculator_implementation_version !== sheetMetalProfileCalculator.implementationVersion) return [];
      const input = sheetMetalProfileInputSchema.safeParse(row.input_snapshot);
      if (!input.success || input.data.profileId !== calculation.id) return [];
      const result = executeCalculator(sheetMetalProfileCalculator, input.data);
      if (!result.ok || !persistedResultMatches(row.output_snapshot, result.output)) return [];
      const hasSavedRequirement = row.output_snapshot && typeof row.output_snapshot === "object" && !Array.isArray(row.output_snapshot)
        && "materialRequirement" in row.output_snapshot;
      const output = hasSavedRequirement ? result.output : { ...result.output, materialRequirement: {
        ...result.output.materialRequirement, netBlankAreaPerPieceSqM: null, totalNetBlankAreaSqM: null } };
      return [{ revisionId: row.id, revisionNumber: row.revision_number, createdAt: row.created_at, input: input.data, output }];
    });
    if (!revisions.length) return [];
    return [{ calculationId: calculation.id, displayName: calculation.display_name,
      currentRevisionNumber: revisions[0].revisionNumber, revisions }];
  });
}

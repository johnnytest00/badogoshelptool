import { createClient } from "@/infrastructure/supabase/server";
import type { Database } from "@/infrastructure/supabase/database";
import { buildPriceOptions, defaultPrice, type PriceOption, type PriceOptionRow } from "@/domain/pricing";
import { materialFilterSchema, type MaterialCategory, type MaterialPriceKind, type MaterialProvenance, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { catalogProfilesFromProducts, type CatalogProductInput } from "@/domain/calculations/roof-material-catalog";

type ManufacturerRow = Database["public"]["Tables"]["material_manufacturers"]["Row"];
type CategoryRow = Database["public"]["Tables"]["material_categories"]["Row"];
type ProductRow = Database["public"]["Tables"]["material_products"]["Row"];
type VariantRow = Database["public"]["Tables"]["material_variants"]["Row"];
type PriceRow = Database["public"]["Tables"]["material_prices"]["Row"];

export type MaterialManufacturerRecord = { id: string; name: string; website: string | null; notes: string | null; createdAt: string; updatedAt: string };
export type MaterialCategoryRecord = { id: string; organizationId: string; name: string; legacyCategory: MaterialCategory; isDefault: boolean; isActive: boolean; createdAt: string; updatedAt: string };
export type MaterialPriceRecord = { id: string; optionId: string | null; amount: number; currency: string; purchasingUnit: MaterialPurchasingUnit; priceKind: MaterialPriceKind; priceSource: string | null; effectiveDate: string; recordedAt: string; provenance: MaterialProvenance; sourceName: string | null; sourceUrl: string | null; sourceDate: string | null; sourceNotes: string | null };
export type MaterialVariantRecord = { id: string; productId: string; name: string; sku: string | null; purchasingUnit: MaterialPurchasingUnit; nominalWidthMm: number | null; effectiveWidthMm: number | null; thicknessMm: number | null; lengthMm: number | null; packagingQuantity: number | null; technicalSpecs: Record<string, string>; provenance: MaterialProvenance; sourceName: string | null; sourceUrl: string | null; sourceDate: string | null; sourceNotes: string | null; prices: MaterialPriceRecord[]; priceOptions: PriceOption[]; /** Pre-selected price: only when exactly one active supplier line exists, never the cheapest of several. */ latestPrice: MaterialPriceRecord | null };
export type MaterialProductRecord = { id: string; organizationId: string; manufacturerId: string | null; manufacturerName: string | null; category: MaterialCategory; categoryId: string; categoryName: string; categoryActive: boolean; name: string; description: string | null; productCode: string | null; status: "active" | "archived"; provenance: MaterialProvenance; sourceName: string | null; sourceUrl: string | null; sourceDate: string | null; sourceNotes: string | null; createdAt: string; updatedAt: string; variants: MaterialVariantRecord[] };

function mapManufacturer(row: ManufacturerRow): MaterialManufacturerRecord { return { id: row.id, name: row.name, website: row.website, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapPrice(row: PriceRow): MaterialPriceRecord { return { id: row.id, optionId: row.option_id, amount: Number(row.amount), currency: row.currency, purchasingUnit: row.purchasing_unit, priceKind: row.price_kind, priceSource: row.price_source, effectiveDate: row.effective_date, recordedAt: row.recorded_at, provenance: row.data_provenance, sourceName: row.source_name, sourceUrl: row.source_url, sourceDate: row.source_date, sourceNotes: row.source_notes }; }
function mapVariant(row: VariantRow, prices: MaterialPriceRecord[], optionRows: PriceOptionRow[]): MaterialVariantRecord { const priceOptions = buildPriceOptions(prices, optionRows); const technicalSpecs = row.technical_specs && typeof row.technical_specs === "object" && !Array.isArray(row.technical_specs) ? row.technical_specs as Record<string, string> : {}; return { id: row.id, productId: row.product_id, name: row.name, sku: row.sku, purchasingUnit: row.purchasing_unit, nominalWidthMm: row.nominal_width_mm === null ? null : Number(row.nominal_width_mm), effectiveWidthMm: row.effective_width_mm === null ? null : Number(row.effective_width_mm), thicknessMm: row.thickness_mm === null ? null : Number(row.thickness_mm), lengthMm: row.length_mm === null ? null : Number(row.length_mm), packagingQuantity: row.packaging_quantity === null ? null : Number(row.packaging_quantity), technicalSpecs, provenance: row.data_provenance, sourceName: row.source_name, sourceUrl: row.source_url, sourceDate: row.source_date, sourceNotes: row.source_notes, prices, priceOptions, latestPrice: (defaultPrice(priceOptions, row.purchasing_unit) as MaterialPriceRecord | null) }; }

function mapCategory(row: CategoryRow): MaterialCategoryRecord { return { id: row.id, organizationId: row.organization_id, name: row.name, legacyCategory: row.legacy_category, isDefault: row.is_default, isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapProduct(row: ProductRow, manufacturers: Map<string, MaterialManufacturerRecord>, categories: Map<string, MaterialCategoryRecord>, variants: MaterialVariantRecord[]): MaterialProductRecord { const category = categories.get(row.category_id); return { id: row.id, organizationId: row.organization_id, manufacturerId: row.manufacturer_id, manufacturerName: row.manufacturer_id ? manufacturers.get(row.manufacturer_id)?.name ?? null : null, category: row.category, categoryId: row.category_id, categoryName: category?.name ?? materialCategoryFallback(row.category), categoryActive: category?.isActive ?? false, name: row.name, description: row.description, productCode: row.product_code, status: row.status, provenance: row.data_provenance, sourceName: row.source_name, sourceUrl: row.source_url, sourceDate: row.source_date, sourceNotes: row.source_notes, createdAt: row.created_at, updatedAt: row.updated_at, variants }; }

function materialCategoryFallback(category: MaterialCategory) { return ({ roof_covering: "Tetőfedés", sheet_metal: "Lemez", gutter: "Ereszcsatorna", flashing: "Szegély és bádog", insulation: "Szigetelés", timber: "Faanyag", accessory: "Kiegészítő", other: "Egyéb anyag" })[category]; }

async function loadRelated(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, products: ProductRow[]) {
  const productIds = products.map((item) => item.id);
  const [{ data: manufacturers, error: manufacturerError }, { data: variants, error: variantError }, { data: categories, error: categoryError }] = await Promise.all([
    supabase.from("material_manufacturers").select("id, organization_id, name, website, notes, created_by, created_at, updated_at").eq("organization_id", organizationId).order("name"),
    productIds.length ? supabase.from("material_variants").select("id, organization_id, product_id, name, sku, purchasing_unit, nominal_width_mm, effective_width_mm, thickness_mm, length_mm, packaging_quantity, technical_specs, data_provenance, source_name, source_url, source_date, source_notes, created_by, created_at, updated_at").eq("organization_id", organizationId).in("product_id", productIds).order("name") : Promise.resolve({ data: [], error: null }),
    supabase.from("material_categories").select("id, organization_id, name, legacy_category, is_default, is_active, created_by, created_at, updated_at").eq("organization_id", organizationId),
  ]);
  if (manufacturerError || variantError || categoryError) throw new Error("Az anyagkapcsolatok betöltése nem sikerült.");
  const variantIds = (variants ?? []).map((item) => item.id);
  const { data: prices, error: priceError } = variantIds.length ? await supabase.from("material_prices").select("id, organization_id, variant_id, option_id, amount, currency, purchasing_unit, price_kind, price_source, effective_date, recorded_at, data_provenance, source_name, source_url, source_date, source_notes, created_by, created_at").eq("organization_id", organizationId).in("variant_id", variantIds).order("effective_date", { ascending: false }).order("recorded_at", { ascending: false }).order("id", { ascending: false }) : { data: [], error: null };
  if (priceError) throw new Error("Az árverziók betöltése nem sikerült.");
  const { data: optionData, error: optionError } = variantIds.length ? await supabase.from("material_price_options").select("id, variant_id, label, status").eq("organization_id", organizationId).in("variant_id", variantIds) : { data: [], error: null };
  if (optionError) throw new Error("Az áropciók betöltése nem sikerült.");
  const optionMap = new Map<string, PriceOptionRow[]>(); for (const row of optionData ?? []) { const list = optionMap.get(row.variant_id) ?? []; list.push({ id: row.id, label: row.label, status: row.status === "archived" ? "archived" : "active" }); optionMap.set(row.variant_id, list); }
  const priceMap = new Map<string, MaterialPriceRecord[]>(); for (const row of prices ?? []) { const list = priceMap.get(row.variant_id) ?? []; list.push(mapPrice(row)); priceMap.set(row.variant_id, list); }
  const variantRecords = new Map<string, MaterialVariantRecord>(); for (const row of variants ?? []) variantRecords.set(row.id, mapVariant(row, priceMap.get(row.id) ?? [], optionMap.get(row.id) ?? []));
  return { manufacturers: new Map((manufacturers ?? []).map((row) => { const item = mapManufacturer(row); return [item.id, item] as const; })), categories: new Map((categories ?? []).map((row) => { const item = mapCategory(row); return [item.id, item] as const; })), variantRecords };
}

export async function getMaterialManufacturers(organizationId: string) { const supabase = await createClient(); const { data, error } = await supabase.from("material_manufacturers").select("id, organization_id, name, website, notes, created_by, created_at, updated_at").eq("organization_id", organizationId).order("name"); if (error) throw new Error("A gyártók betöltése nem sikerült."); return (data ?? []).map(mapManufacturer); }

export async function getMaterialCategories(organizationId: string, includeInactive = true) { const supabase = await createClient(); let query = supabase.from("material_categories").select("id, organization_id, name, legacy_category, is_default, is_active, created_by, created_at, updated_at").eq("organization_id", organizationId).order("name"); if (!includeInactive) query = query.eq("is_active", true); const { data, error } = await query; if (error) throw new Error("Az anyagkategóriák betöltése nem sikerült."); return (data ?? []).map(mapCategory); }

export async function getMaterialProductsForOrganization(organizationId: string, rawFilters: unknown = {}) {
  const filters = materialFilterSchema.parse(rawFilters); const supabase = await createClient(); let query = supabase.from("material_products").select("id, organization_id, manufacturer_id, category, category_id, name, description, product_code, status, data_provenance, source_name, source_url, source_date, source_notes, created_by, created_at, updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(200);
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,product_code.ilike.%${filters.search}%`); if (filters.category) query = query.eq("category", filters.category); if (filters.categoryId) query = query.eq("category_id", filters.categoryId); if (filters.manufacturerId) query = query.eq("manufacturer_id", filters.manufacturerId); if (!filters.includeArchived) query = query.eq("status", "active");
  const { data, error } = await query; if (error) throw new Error("Az anyagkatalógus betöltése nem sikerült."); const products = data ?? []; const related = await loadRelated(supabase, organizationId, products); return products.map((row) => mapProduct(row, related.manufacturers, related.categories, related.variantRecords ? [...related.variantRecords.values()].filter((item) => item.productId === row.id) : []));
}

/** Calculator profiles need technical catalog fields, but never material price history. */
export async function getCalculatorMaterialProfiles(organizationId: string) {
  const supabase = await createClient();
  const { data: products, error: productError } = await supabase.from("material_products")
    .select("id, manufacturer_id, category, category_id, name, status, data_provenance, source_name")
    .eq("organization_id", organizationId).eq("status", "active").order("updated_at", { ascending: false }).limit(200);
  if (productError) throw new Error("Az anyagkatalógus betöltése nem sikerült.");
  if (!products?.length) return [];

  const manufacturerIds = [...new Set(products.flatMap((product) => product.manufacturer_id ? [product.manufacturer_id] : []))];
  const categoryIds = [...new Set(products.map((product) => product.category_id))];
  const productIds = products.map((product) => product.id);
  const [{ data: manufacturers, error: manufacturerError }, { data: categories, error: categoryError }, { data: variants, error: variantError }] = await Promise.all([
    manufacturerIds.length ? supabase.from("material_manufacturers").select("id, name").eq("organization_id", organizationId).in("id", manufacturerIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("material_categories").select("id, name, is_active").eq("organization_id", organizationId).in("id", categoryIds),
    supabase.from("material_variants").select("id, product_id, name, sku, purchasing_unit, nominal_width_mm, effective_width_mm, length_mm, technical_specs, data_provenance, source_name").eq("organization_id", organizationId).in("product_id", productIds).order("name"),
  ]);
  if (manufacturerError || categoryError || variantError) throw new Error("Az anyagkapcsolatok betöltése nem sikerült.");

  const manufacturerNames = new Map((manufacturers ?? []).map((item) => [item.id, item.name]));
  const categoryById = new Map((categories ?? []).map((item) => [item.id, item]));
  const variantsByProduct = new Map<string, CatalogProductInput["variants"][number][]>();
  for (const variant of variants ?? []) {
    const technicalSpecs = variant.technical_specs && typeof variant.technical_specs === "object" && !Array.isArray(variant.technical_specs) ? variant.technical_specs as Record<string, string> : {};
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push({ id: variant.id, name: variant.name, sku: variant.sku, purchasingUnit: variant.purchasing_unit, nominalWidthMm: variant.nominal_width_mm === null ? null : Number(variant.nominal_width_mm), effectiveWidthMm: variant.effective_width_mm === null ? null : Number(variant.effective_width_mm), lengthMm: variant.length_mm === null ? null : Number(variant.length_mm), technicalSpecs, provenance: variant.data_provenance, sourceName: variant.source_name });
    variantsByProduct.set(variant.product_id, list);
  }
  return catalogProfilesFromProducts(products.map((product) => {
    const category = categoryById.get(product.category_id);
    return { id: product.id, name: product.name, manufacturerName: product.manufacturer_id ? manufacturerNames.get(product.manufacturer_id) ?? null : null, category: product.category, categoryId: product.category_id, categoryName: category?.name ?? materialCategoryFallback(product.category), categoryActive: category?.is_active ?? false, status: product.status, provenance: product.data_provenance, sourceName: product.source_name, variants: variantsByProduct.get(product.id) ?? [] } satisfies CatalogProductInput;
  }));
}

/** Loads full catalog records for several categories while sharing the related-row reads. */
export async function getMaterialProductsForCategories(organizationId: string, requestedCategories: readonly MaterialCategory[]) {
  const categories = [...new Set(requestedCategories)];
  if (!categories.length) return [];
  const supabase = await createClient();
  const productGroups = await Promise.all(categories.map(async (category) => {
    const query = supabase.from("material_products").select("id, organization_id, manufacturer_id, category, category_id, name, description, product_code, status, data_provenance, source_name, source_url, source_date, source_notes, created_by, created_at, updated_at").eq("organization_id", organizationId).eq("category", category).eq("status", "active").order("updated_at", { ascending: false }).limit(200);
    const { data, error } = await query;
    if (error) throw new Error("Az anyagkatalógus betöltése nem sikerült.");
    return data ?? [];
  }));
  const products = productGroups.flat();
  if (!products.length) return [];
  const related = await loadRelated(supabase, organizationId, products);
  return products.map((row) => mapProduct(row, related.manufacturers, related.categories, related.variantRecords ? [...related.variantRecords.values()].filter((item) => item.productId === row.id) : []));
}

export async function getMaterialProductForOrganization(organizationId: string, productId: string) { const products = await getMaterialProductsForOrganization(organizationId, { includeArchived: true }); return products.find((item) => item.id === productId) ?? null; }

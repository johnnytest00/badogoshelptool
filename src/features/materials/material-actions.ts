"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { materialCategoryNameSchema, materialManagerProductInputSchema, materialManufacturerInputSchema, materialPriceInputSchema, materialProductInputSchema, materialVariantInputSchema, parseOptionalNumber } from "@/domain/materials/contracts";
import { decimalToScaled, scaledToDecimal } from "@/domain/quotations/money";

export type MaterialActionResult = { ok: boolean; error?: string; fieldErrors?: Record<string, string>; productId?: string; manufacturerId?: string; variantId?: string; categoryId?: string; reused?: boolean };
const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

async function authorizeOrganization(organizationId: string) {
  const auth = await getAuthContext();
  if (!auth) return { error: "A munkamenet lejárt. Jelentkezz be újra." } as const;
  const organization = auth.organizations.find((item) => item.id === organizationId);
  if (!organization) return { error: "Ehhez a műhelyhez nincs hozzáférésed." } as const;
  return { auth, organization } as const;
}

function validationError(error: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> }): MaterialActionResult {
  const fieldErrors = Object.fromEntries(error.issues.map((issue) => [typeof issue.path[0] === "symbol" ? "form" : String(issue.path[0] ?? "form"), issue.message]));
  return { ok: false, error: error.issues[0]?.message ?? "Ellenőrizd a megjelölt mezőket.", fieldErrors };
}
function dateOrNull(value: string) { return value || null; }
function refreshCatalog(productId?: string) { revalidatePath("/"); revalidatePath("/anyagok"); revalidatePath("/anyaglistak"); revalidatePath("/ajanlatok"); revalidatePath("/kivitelezes"); if (productId) revalidatePath(`/anyagok/${productId}`); }

export async function createMaterialCategoryAction(formData: FormData): Promise<MaterialActionResult> {
  const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const parsed = materialCategoryNameSchema.safeParse(text(formData, "name")); if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient(); const { data, error } = await supabase.from("material_categories").insert({ organization_id: organizationId, name: parsed.data, created_by: access.auth.userId }).select("id").single();
  if (error || !data) return { ok: false, error: "A kategória mentése nem sikerült. Ellenőrizd, hogy nincs-e már ilyen nevű kategória." };
  refreshCatalog(); return { ok: true, categoryId: data.id };
}

export async function renameMaterialCategoryAction(formData: FormData): Promise<MaterialActionResult> {
  const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const categoryId = text(formData, "categoryId"); const parsed = materialCategoryNameSchema.safeParse(text(formData, "name")); if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient(); const { data, error } = await supabase.from("material_categories").update({ name: parsed.data }).eq("id", categoryId).eq("organization_id", organizationId).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "A kategória nem található vagy ilyen név már létezik." };
  refreshCatalog(); return { ok: true, categoryId: data.id };
}

export async function setMaterialCategoryActiveAction(formData: FormData): Promise<MaterialActionResult> {
  const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const categoryId = text(formData, "categoryId"); const rawActive = text(formData, "isActive");
  if (rawActive !== "true" && rawActive !== "false") return { ok: false, error: "Érvénytelen kategóriaállapot." };
  const supabase = await createClient(); const { data, error } = await supabase.from("material_categories").update({ is_active: rawActive === "true" }).eq("id", categoryId).eq("organization_id", organizationId).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "A kategória állapotát nem sikerült módosítani." };
  refreshCatalog(); return { ok: true, categoryId: data.id };
}

export async function createMaterialManagerProductAction(formData: FormData): Promise<MaterialActionResult> {
  const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const parsed = materialManagerProductInputSchema.safeParse({
    requestId: text(formData, "requestId"), categoryId: text(formData, "categoryId"), name: text(formData, "name"),
    purchasingUnit: text(formData, "purchasingUnit"), priceAmount: text(formData, "priceAmount"),
    priceKind: text(formData, "priceKind") || undefined, priceEffectiveDate: text(formData, "priceEffectiveDate"),
  });
  if (!parsed.success) return validationError(parsed.error);
  const rawPrice = parsed.data.priceAmount.replace(",", ".");
  let price: string | null;
  try { price = rawPrice ? scaledToDecimal(decimalToScaled(rawPrice, 2), 2) : null; }
  catch { return { ok: false, error: "Adj meg legfeljebb két tizedesjegyű HUF árat." }; }
  const priceKind = rawPrice ? parsed.data.priceKind ?? null : null;
  const effectiveDate = rawPrice ? parsed.data.priceEffectiveDate : null;
  const supabase = await createClient();
  const managerRpc = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ product_id: string; variant_id: string; reused: boolean }> | null; error: { code?: string; message?: string } | null }> };
  const { data, error } = await managerRpc.rpc("create_material_manager_product", {
    p_organization_id: organizationId, p_request_id: parsed.data.requestId, p_category_id: parsed.data.categoryId,
    p_name: parsed.data.name, p_purchasing_unit: parsed.data.purchasingUnit,
    p_price_amount: price, p_price_kind: priceKind, p_price_effective_date: effectiveDate,
  });
  if (error || !data?.[0]) {
    if (error?.code === "40001") return { ok: false, error: "A mentési kérés adatai megváltoztak. Ellenőrizd, majd próbáld újra." };
    return { ok: false, error: "A termék mentése nem sikerült. Ellenőrizd a kategóriát, egységet és árat." };
  }
  refreshCatalog(data[0].product_id);
  return { ok: true, productId: data[0].product_id, variantId: data[0].variant_id, reused: data[0].reused };
}

export async function createManufacturerAction(formData: FormData): Promise<MaterialActionResult> {
  const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const parsed = materialManufacturerInputSchema.safeParse({ name: text(formData, "name"), website: text(formData, "website"), notes: text(formData, "notes") }); if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient(); const { data, error } = await supabase.from("material_manufacturers").insert({ organization_id: organizationId, name: parsed.data.name, website: parsed.data.website || null, notes: parsed.data.notes || null, created_by: access.auth.userId }).select("id").single();
  if (error || !data) return { ok: false, error: "A gyártó mentése nem sikerült. Lehet, hogy már létezik ilyen nevű gyártó." }; refreshCatalog(); return { ok: true, manufacturerId: data.id };
}

export async function updateManufacturerAction(formData: FormData): Promise<MaterialActionResult> {
  const id = text(formData, "manufacturerId"); const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const parsed = materialManufacturerInputSchema.safeParse({ name: text(formData, "name"), website: text(formData, "website"), notes: text(formData, "notes") }); if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient(); const { data, error } = await supabase.from("material_manufacturers").update({ name: parsed.data.name, website: parsed.data.website || null, notes: parsed.data.notes || null }).eq("id", id).eq("organization_id", organizationId).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "A gyártó nem található vagy nem módosítható." }; refreshCatalog(); return { ok: true, manufacturerId: data.id };
}

function productPayload(formData: FormData) { return { name: text(formData, "name"), categoryId: text(formData, "categoryId"), manufacturerId: text(formData, "manufacturerId") || null, description: text(formData, "description"), productCode: text(formData, "productCode"), dataProvenance: text(formData, "dataProvenance") || "user_provided", sourceName: text(formData, "sourceName"), sourceUrl: text(formData, "sourceUrl"), sourceDate: text(formData, "sourceDate"), sourceNotes: text(formData, "sourceNotes") }; }

async function getActiveCategory(organizationId: string, categoryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("material_categories").select("id, legacy_category, is_active").eq("id", categoryId).eq("organization_id", organizationId).maybeSingle();
  return error ? null : data;
}

export async function createMaterialProductAction(formData: FormData): Promise<MaterialActionResult> {
  const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const parsed = materialProductInputSchema.safeParse(productPayload(formData)); if (!parsed.success) return validationError(parsed.error);
  const category = await getActiveCategory(organizationId, parsed.data.categoryId); if (!category?.is_active) return { ok: false, error: "Válassz aktív kategóriát ebben a műhelyben." };
  const supabase = await createClient(); const { data, error } = await supabase.from("material_products").insert({ organization_id: organizationId, category_id: parsed.data.categoryId, manufacturer_id: parsed.data.manufacturerId, category: category.legacy_category, name: parsed.data.name, description: parsed.data.description || null, product_code: parsed.data.productCode || null, data_provenance: parsed.data.dataProvenance, source_name: parsed.data.sourceName || null, source_url: parsed.data.sourceUrl || null, source_date: dateOrNull(parsed.data.sourceDate), source_notes: parsed.data.sourceNotes || null, created_by: access.auth.userId }).select("id").single();
  if (error || !data) return { ok: false, error: "A termék mentése nem sikerült. Ellenőrizd a gyártó-hozzárendelést." }; refreshCatalog(data.id); return { ok: true, productId: data.id };
}

export async function updateMaterialProductAction(formData: FormData): Promise<MaterialActionResult> {
  const id = text(formData, "productId"); const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const parsed = materialProductInputSchema.safeParse(productPayload(formData)); if (!parsed.success) return validationError(parsed.error);
  const category = await getActiveCategory(organizationId, parsed.data.categoryId);
  const supabase = await createClient();
  const { data: currentProduct } = await supabase.from("material_products").select("category_id").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (!category || (!category.is_active && currentProduct?.category_id !== category.id)) return { ok: false, error: "Új vagy áthelyezett termékhez aktív kategóriát válassz." };
  const { data, error } = await supabase.from("material_products").update({ manufacturer_id: parsed.data.manufacturerId, category_id: parsed.data.categoryId, category: category.legacy_category, name: parsed.data.name, description: parsed.data.description || null, product_code: parsed.data.productCode || null, data_provenance: parsed.data.dataProvenance, source_name: parsed.data.sourceName || null, source_url: parsed.data.sourceUrl || null, source_date: dateOrNull(parsed.data.sourceDate), source_notes: parsed.data.sourceNotes || null }).eq("id", id).eq("organization_id", organizationId).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "A termék nem található vagy nem módosítható." }; refreshCatalog(id); return { ok: true, productId: data.id };
}

export async function changeMaterialProductStatusAction(formData: FormData): Promise<MaterialActionResult> {
  const id = text(formData, "productId"); const organizationId = text(formData, "organizationId"); const status = text(formData, "status"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  if (status !== "active" && status !== "archived") return { ok: false, error: "Érvénytelen termékállapot." };
  const supabase = await createClient(); const { data, error } = await supabase.from("material_products").update({ status }).eq("id", id).eq("organization_id", organizationId).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "A termék állapotát nem sikerült módosítani." }; refreshCatalog(id); return { ok: true, productId: data.id };
}

function variantPayload(formData: FormData) { return { productId: text(formData, "productId"), name: text(formData, "name"), sku: text(formData, "sku"), purchasingUnit: text(formData, "purchasingUnit"), nominalWidthMm: parseOptionalNumber(formData.get("nominalWidthMm")), effectiveWidthMm: parseOptionalNumber(formData.get("effectiveWidthMm")), thicknessMm: parseOptionalNumber(formData.get("thicknessMm")), lengthMm: parseOptionalNumber(formData.get("lengthMm")), packagingQuantity: parseOptionalNumber(formData.get("packagingQuantity")), technicalSpecs: (() => { try { const parsed = JSON.parse(text(formData, "technicalSpecs") || "{}"); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null; const profileMaterialSpec = text(formData, "profileMaterialSpec"); if (profileMaterialSpec) parsed.profileMaterialSpec = profileMaterialSpec; else delete parsed.profileMaterialSpec; return parsed; } catch { return null; } })(), dataProvenance: text(formData, "dataProvenance") || "user_provided", sourceName: text(formData, "sourceName"), sourceUrl: text(formData, "sourceUrl"), sourceDate: text(formData, "sourceDate"), sourceNotes: text(formData, "sourceNotes") }; }

export async function createMaterialVariantAction(formData: FormData): Promise<MaterialActionResult> {
  const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const payload = variantPayload(formData); const parsed = materialVariantInputSchema.safeParse(payload); if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient(); const { data, error } = await supabase.from("material_variants").insert({ organization_id: organizationId, product_id: parsed.data.productId, name: parsed.data.name, sku: parsed.data.sku || null, purchasing_unit: parsed.data.purchasingUnit, nominal_width_mm: parsed.data.nominalWidthMm, effective_width_mm: parsed.data.effectiveWidthMm, thickness_mm: parsed.data.thicknessMm, length_mm: parsed.data.lengthMm, packaging_quantity: parsed.data.packagingQuantity, technical_specs: parsed.data.technicalSpecs, data_provenance: parsed.data.dataProvenance, source_name: parsed.data.sourceName || null, source_url: parsed.data.sourceUrl || null, source_date: dateOrNull(parsed.data.sourceDate), source_notes: parsed.data.sourceNotes || null, created_by: access.auth.userId }).select("id, product_id").single();
  if (error || !data) return { ok: false, error: "A variáns mentése nem sikerült." }; refreshCatalog(data.product_id); return { ok: true, variantId: data.id, productId: data.product_id };
}

export async function updateMaterialVariantAction(formData: FormData): Promise<MaterialActionResult> {
  const id = text(formData, "variantId"); const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const payload = variantPayload(formData); const parsed = materialVariantInputSchema.safeParse(payload); if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient(); const { data, error } = await supabase.from("material_variants").update({ name: parsed.data.name, sku: parsed.data.sku || null, purchasing_unit: parsed.data.purchasingUnit, nominal_width_mm: parsed.data.nominalWidthMm, effective_width_mm: parsed.data.effectiveWidthMm, thickness_mm: parsed.data.thicknessMm, length_mm: parsed.data.lengthMm, packaging_quantity: parsed.data.packagingQuantity, technical_specs: parsed.data.technicalSpecs, data_provenance: parsed.data.dataProvenance, source_name: parsed.data.sourceName || null, source_url: parsed.data.sourceUrl || null, source_date: dateOrNull(parsed.data.sourceDate), source_notes: parsed.data.sourceNotes || null }).eq("id", id).eq("organization_id", organizationId).select("id, product_id").maybeSingle();
  if (error?.code === "23514") return { ok: false, error: "Ehhez az egységhez már ár tartozik. Az előzmények megőrzéséhez hozz létre új variánst az új egységgel." };
  if (error || !data) return { ok: false, error: "A variáns nem található vagy nem módosítható." }; refreshCatalog(data.product_id); return { ok: true, variantId: data.id, productId: data.product_id };
}

function pricePayload(formData: FormData) { const amountRaw = text(formData, "amount").replace(",", "."); return { variantId: text(formData, "variantId"), amount: amountRaw ? Number(amountRaw) : Number.NaN, purchasingUnit: text(formData, "purchasingUnit"), priceKind: text(formData, "priceKind"), priceSource: text(formData, "priceSource"), effectiveDate: text(formData, "effectiveDate"), dataProvenance: text(formData, "dataProvenance") || "user_provided", sourceName: text(formData, "sourceName"), sourceUrl: text(formData, "sourceUrl"), sourceDate: text(formData, "sourceDate"), sourceNotes: text(formData, "sourceNotes") }; }

export async function createMaterialPriceAction(formData: FormData): Promise<MaterialActionResult> {
  const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const parsed = materialPriceInputSchema.safeParse(pricePayload(formData)); if (!parsed.success) return validationError(parsed.error);
  let amountExact: string;
  try { amountExact = scaledToDecimal(decimalToScaled(text(formData, "amount").replace(",", "."), 2), 2); }
  catch { return { ok: false, error: "Adj meg érvényes, legfeljebb két tizedesjegyű árat." }; }
  const supabase = await createClient(); const { data: variant } = await supabase.from("material_variants").select("id, purchasing_unit").eq("id", parsed.data.variantId).eq("organization_id", organizationId).maybeSingle();
  if (!variant) return { ok: false, error: "A variáns nem található ebben a műhelyben." };
  if (variant.purchasing_unit !== parsed.data.purchasingUnit) return { ok: false, error: `Az ár egysége egyezzen a termék egységével (${variant.purchasing_unit}).` };
  const priceDb = supabase as unknown as { from: (table: "material_prices") => { insert: (value: Record<string, unknown>) => { select: (columns: string) => { single: () => Promise<{ data: { id: string } | null; error: { code?: string; message?: string } | null }> } } } };
  const { data, error } = await priceDb.from("material_prices").insert({ organization_id: organizationId, variant_id: parsed.data.variantId, amount: amountExact, currency: "HUF", purchasing_unit: parsed.data.purchasingUnit, price_kind: parsed.data.priceKind, price_source: parsed.data.priceSource || null, effective_date: parsed.data.effectiveDate, data_provenance: parsed.data.dataProvenance, source_name: parsed.data.sourceName || null, source_url: parsed.data.sourceUrl || null, source_date: dateOrNull(parsed.data.sourceDate), source_notes: parsed.data.sourceNotes || null, created_by: access.auth.userId }).select("id").single();
  if (error || !data) return { ok: false, error: "Az árverzió mentése nem sikerült." }; refreshCatalog(); return { ok: true };
}

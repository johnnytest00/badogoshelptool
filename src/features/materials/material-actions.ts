"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { materialManufacturerInputSchema, materialPriceInputSchema, materialProductInputSchema, materialVariantInputSchema, parseOptionalNumber } from "@/domain/materials/contracts";

export type MaterialActionResult = { ok: boolean; error?: string; fieldErrors?: Record<string, string>; productId?: string; manufacturerId?: string; variantId?: string };
const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

async function authorizeOrganization(organizationId: string) {
  const auth = await getAuthContext();
  if (!auth) return { error: "A munkamenet lejárt. Jelentkezz be újra." } as const;
  const organization = auth.organizations.find((item) => item.id === organizationId);
  if (!organization) return { error: "Ehhez a műhelyhez nincs hozzáférésed." } as const;
  return { auth, organization } as const;
}

function validationError(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }): MaterialActionResult {
  return { ok: false, error: "Ellenőrizd a megjelölt mezőket.", fieldErrors: Object.fromEntries(Object.entries(error.flatten().fieldErrors).flatMap(([key, value]) => value?.[0] ? [[key, value[0]]] : [])) };
}
function dateOrNull(value: string) { return value || null; }
function refreshCatalog(productId?: string) { revalidatePath("/"); revalidatePath("/anyagok"); if (productId) revalidatePath(`/anyagok/${productId}`); }

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

function productPayload(formData: FormData) { return { name: text(formData, "name"), category: text(formData, "category"), manufacturerId: text(formData, "manufacturerId") || null, description: text(formData, "description"), productCode: text(formData, "productCode"), dataProvenance: text(formData, "dataProvenance") || "user_provided", sourceName: text(formData, "sourceName"), sourceUrl: text(formData, "sourceUrl"), sourceDate: text(formData, "sourceDate"), sourceNotes: text(formData, "sourceNotes") }; }

export async function createMaterialProductAction(formData: FormData): Promise<MaterialActionResult> {
  const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const parsed = materialProductInputSchema.safeParse(productPayload(formData)); if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient(); const { data, error } = await supabase.from("material_products").insert({ organization_id: organizationId, manufacturer_id: parsed.data.manufacturerId, category: parsed.data.category, name: parsed.data.name, description: parsed.data.description || null, product_code: parsed.data.productCode || null, data_provenance: parsed.data.dataProvenance, source_name: parsed.data.sourceName || null, source_url: parsed.data.sourceUrl || null, source_date: dateOrNull(parsed.data.sourceDate), source_notes: parsed.data.sourceNotes || null, created_by: access.auth.userId }).select("id").single();
  if (error || !data) return { ok: false, error: "A termék mentése nem sikerült. Ellenőrizd a gyártó-hozzárendelést." }; refreshCatalog(data.id); return { ok: true, productId: data.id };
}

export async function updateMaterialProductAction(formData: FormData): Promise<MaterialActionResult> {
  const id = text(formData, "productId"); const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const parsed = materialProductInputSchema.safeParse(productPayload(formData)); if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient(); const { data, error } = await supabase.from("material_products").update({ manufacturer_id: parsed.data.manufacturerId, category: parsed.data.category, name: parsed.data.name, description: parsed.data.description || null, product_code: parsed.data.productCode || null, data_provenance: parsed.data.dataProvenance, source_name: parsed.data.sourceName || null, source_url: parsed.data.sourceUrl || null, source_date: dateOrNull(parsed.data.sourceDate), source_notes: parsed.data.sourceNotes || null }).eq("id", id).eq("organization_id", organizationId).select("id").maybeSingle();
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
  if (error || !data) return { ok: false, error: "A variáns nem található vagy nem módosítható." }; refreshCatalog(data.product_id); return { ok: true, variantId: data.id, productId: data.product_id };
}

function pricePayload(formData: FormData) { const amountRaw = text(formData, "amount").replace(",", "."); return { variantId: text(formData, "variantId"), amount: amountRaw ? Number(amountRaw) : Number.NaN, purchasingUnit: text(formData, "purchasingUnit"), priceKind: text(formData, "priceKind"), priceSource: text(formData, "priceSource"), effectiveDate: text(formData, "effectiveDate"), dataProvenance: text(formData, "dataProvenance") || "user_provided", sourceName: text(formData, "sourceName"), sourceUrl: text(formData, "sourceUrl"), sourceDate: text(formData, "sourceDate"), sourceNotes: text(formData, "sourceNotes") }; }

export async function createMaterialPriceAction(formData: FormData): Promise<MaterialActionResult> {
  const organizationId = text(formData, "organizationId"); const access = await authorizeOrganization(organizationId); if ("error" in access) return { ok: false, error: access.error };
  const parsed = materialPriceInputSchema.safeParse(pricePayload(formData)); if (!parsed.success) return validationError(parsed.error);
  const supabase = await createClient(); const { data, error } = await supabase.from("material_prices").insert({ organization_id: organizationId, variant_id: parsed.data.variantId, amount: parsed.data.amount, currency: "HUF", purchasing_unit: parsed.data.purchasingUnit, price_kind: parsed.data.priceKind, price_source: parsed.data.priceSource || null, effective_date: parsed.data.effectiveDate, data_provenance: parsed.data.dataProvenance, source_name: parsed.data.sourceName || null, source_url: parsed.data.sourceUrl || null, source_date: dateOrNull(parsed.data.sourceDate), source_notes: parsed.data.sourceNotes || null, created_by: access.auth.userId }).select("id").single();
  if (error || !data) return { ok: false, error: "Az árverzió mentése nem sikerült." }; refreshCatalog(); return { ok: true };
}

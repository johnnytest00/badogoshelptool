"use server";

import { matchProfileMaterial } from "@/domain/calculations/profile-material-compatibility";
import { sheetMetalProfileCalculator, type SheetMetalProfileInput } from "@/domain/calculations/sheet-metal-profile";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database";
import { prepareStandaloneRevision, standaloneCalculatorTypes, type StandaloneCalculatorType } from "./standalone-persistence";

export type StandaloneSaveResult = { ok: true; calculationId: string; revisionId: string; revisionNumber: number } | { ok: false; error: string };
const read = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);


async function validateProfileCatalog(input: SheetMetalProfileInput, organizationId: string): Promise<string | null> {
  if (!input.material?.catalogVariantId) return null;
  const supabase = await createClient();
  const { data: variant } = await supabase.from("material_variants")
    .select("id, product_id, purchasing_unit, thickness_mm, technical_specs, data_provenance, source_name")
    .eq("id", input.material.catalogVariantId).eq("organization_id", organizationId).maybeSingle();
  const { data: product } = variant ? await supabase.from("material_products").select("id, category, status")
    .eq("id", variant.product_id).eq("organization_id", organizationId).maybeSingle() : { data: null };
  const specs = variant?.technical_specs;
  const materialSpec = specs && typeof specs === "object" && !Array.isArray(specs) && typeof specs.profileMaterialSpec === "string" ? specs.profileMaterialSpec : null;
  const match = matchProfileMaterial(variant && product ? {
    productId: product.id, productName: "", variantId: variant.id, variantName: "", category: product.category, status: product.status,
    purchasingUnit: variant.purchasing_unit, thicknessMm: variant.thickness_mm === null ? null : Number(variant.thickness_mm),
    materialSpec, provenance: variant.data_provenance, sourceName: variant.source_name,
  } : null, input.material.materialSpec ?? "", input.thicknessMm);
  return match === "TECHNICALLY_MATCHED_PARAMETERS" ? null : "A katalógusvariáns nem igazolt ehhez a profilhoz vagy nem tartozik ehhez a műhelyhez.";
}

export async function saveStandaloneCalculationAction(data: FormData): Promise<StandaloneSaveResult> {
  const organizationId = read(data, "organizationId"), calculationId = read(data, "calculationId");
  const calculatorType = read(data, "calculatorType");
  if (!isUuid(organizationId) || !isUuid(calculationId)) return { ok: false, error: "Érvénytelen műhely- vagy kalkulációazonosító." };
  if (!standaloneCalculatorTypes.includes(calculatorType as StandaloneCalculatorType)) return { ok: false, error: "Ez a kalkulátortípus nem támogat standalone mentést." };
  const name = read(data, "name");
  if (!name || name.length > 200) return { ok: false, error: "Adj meg érvényes kalkulációnevet." };
  const expectedRevisionNumber = Number(read(data, "expectedRevisionNumber"));
  if (!Number.isSafeInteger(expectedRevisionNumber) || expectedRevisionNumber < 0) return { ok: false, error: "Érvénytelen várt revíziószám." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };

  let rawInput: unknown;
  try { rawInput = JSON.parse(read(data, "input")); } catch { return { ok: false, error: "A kalkulációs bemenet formátuma hibás." }; }
  const prepared = prepareStandaloneRevision(calculatorType, rawInput, calculationId, name);
  if (!prepared.ok) return prepared;
  if (calculatorType === sheetMetalProfileCalculator.id) {
    const catalogError = await validateProfileCatalog(prepared.value.input as SheetMetalProfileInput, organizationId);
    if (catalogError) return { ok: false, error: catalogError };
  }

  const supabase = await createClient();
  const common = {
    p_organization_id: organizationId,
    p_calculation_id: calculationId,
    p_name: name,
    p_input_data: prepared.value.input as unknown as Json,
    p_output_data: prepared.value.output as Json,
    p_expected_revision_number: expectedRevisionNumber,
  };
  const { data: saved, error } = await supabase.rpc("save_standalone_profile_calculation", common);
  if (error || !saved?.[0]) return { ok: false, error: error?.code === "40001"
    ? "A számítás időközben új revíziót kapott. Töltsd be az aktuális változatot, majd ments újra."
    : error?.code === "42501" ? "A számítás vagy a műhely nem érhető el a fiókod számára."
      : error?.code === "P0002" ? "A mentéshez szükséges forrásadat hiányzik vagy már nem érhető el."
        : error?.code === "22023" ? "A számítás adatai nem felelnek meg a mentési feltételeknek. Ellenőrizd a megadott értékeket."
      : "A számítás mentése nem sikerült." };
  return { ok: true, calculationId: saved[0].calculation_id, revisionId: saved[0].calculation_revision_id, revisionNumber: saved[0].revision_number };
}

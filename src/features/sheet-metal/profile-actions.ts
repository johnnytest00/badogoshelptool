"use server";

import { revalidatePath } from "next/cache";
import { executeCalculator } from "@/domain/calculations/engine";
import { sheetMetalProfileCalculator, sheetMetalProfileInputSchema } from "@/domain/calculations/sheet-metal-profile";
import { matchProfileMaterial } from "@/domain/calculations/profile-material-compatibility";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database.types";

export type ProfileSaveResult = { ok: boolean; error?: string; calculationId?: string; revisionId?: string; revisionNumber?: number };
export type ProfileTransferResult = { ok: boolean; error?: string; takeoffId?: string };
const read = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function saveSheetMetalProfileAction(data: FormData): Promise<ProfileSaveResult> {
  const organizationId = read(data, "organizationId"), projectId = read(data, "projectId"), calculationId = read(data, "calculationId");
  if (![organizationId, projectId, calculationId].every(isUuid)) return { ok: false, error: "Érvénytelen projekt-, műhely- vagy profilazonosító." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  let raw: unknown;
  try { raw = JSON.parse(read(data, "input")); } catch { return { ok: false, error: "A profiladatok formátuma hibás." }; }
  const parsed = sheetMetalProfileInputSchema.safeParse(raw);
  if (!parsed.success || (parsed.data.profileId && parsed.data.profileId !== calculationId)) return { ok: false, error: "Ellenőrizd a profil geometriáját és paramétereit." };
  const input = sheetMetalProfileInputSchema.parse({ ...parsed.data, profileId: calculationId });
  const calculation = executeCalculator(sheetMetalProfileCalculator, input);
  if (!calculation.ok) return { ok: false, error: calculation.errors[0]?.message ?? "A profil geometriája vagy paraméterezése érvénytelen." };
  const expectedRevision = Number(read(data, "expectedRevisionNumber"));
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return { ok: false, error: "Érvénytelen várt revíziószám." };
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("organization_id", organizationId).maybeSingle();
  if (!project) return { ok: false, error: "A projekt nem érhető el ebben a műhelyben." };
  if (input.material?.catalogVariantId) {
    const { data: variant } = await supabase.from("material_variants")
      .select("id, product_id, purchasing_unit, thickness_mm, technical_specs, data_provenance, source_name")
      .eq("id", input.material.catalogVariantId).eq("organization_id", organizationId).maybeSingle();
    const { data: product } = variant ? await supabase.from("material_products").select("id, category, status")
      .eq("id", variant.product_id).eq("organization_id", organizationId).maybeSingle() : { data: null };
    const specs = variant?.technical_specs;
    const spec = specs && typeof specs === "object" && !Array.isArray(specs) && typeof specs.profileMaterialSpec === "string" ? specs.profileMaterialSpec : null;
    const match = matchProfileMaterial(variant && product ? { productId: product.id, productName: "", variantId: variant.id, variantName: "",
      category: product.category, status: product.status, purchasingUnit: variant.purchasing_unit,
      thicknessMm: variant.thickness_mm === null ? null : Number(variant.thickness_mm), materialSpec: spec,
      provenance: variant.data_provenance, sourceName: variant.source_name } : null,
    input.material.materialSpec ?? "", input.thicknessMm);
    if (match !== "TECHNICALLY_MATCHED_PARAMETERS") return { ok: false, error: "A katalógusvariáns anyagazonosítója, vastagsága, m² egysége vagy forrása nem igazolt ehhez a profilhoz." };
  }
  const { data: saved, error } = await supabase.rpc("save_sheet_metal_profile_calculation", {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_calculation_id: calculationId,
    p_name: input.label,
    p_input_data: input as unknown as Json,
    p_expected_revision_number: expectedRevision,
  });
  if (error || !saved?.[0]) return { ok: false, error: error?.code === "40001" ? "A profil időközben új revíziót kapott. Töltsd be az aktuális verziót, majd ments újra." : error?.code === "42501" ? "Ehhez a műhelyhez vagy profilhoz nincs hozzáférésed." : "A profil mentése nem sikerült." };
  revalidatePath(`/projektek/${projectId}/lemezprofilok`);
  return { ok: true, calculationId: saved[0].calculation_id, revisionId: saved[0].calculation_revision_id, revisionNumber: saved[0].revision_number };
}

export async function createProfileTakeoffDraftAction(data: FormData): Promise<ProfileTransferResult> {
  const organizationId = read(data, "organizationId"), projectId = read(data, "projectId");
  const calculationId = read(data, "calculationId"), revisionId = read(data, "revisionId");
  const variantId = read(data, "variantId"), requestKey = read(data, "requestKey");
  const name = read(data, "name");
  if (![organizationId, projectId, calculationId, revisionId, variantId, requestKey].every(isUuid))
    return { ok: false, error: "Érvénytelen projekt-, profil-, revízió-, variáns- vagy kérésazonosító." };
  if (!name || name.length > 200) return { ok: false, error: "Adj meg érvényes piszkozatnevet." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId))
    return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  const supabase = await createClient();
  const [{ data: project }, { data: source }] = await Promise.all([
    supabase.from("projects").select("id").eq("id", projectId).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("calculations").select("id, current_revision_id").eq("id", calculationId)
      .eq("organization_id", organizationId).eq("project_id", projectId)
      .eq("calculator_type", sheetMetalProfileCalculator.id).is("roof_model_id", null).maybeSingle(),
  ]);
  if (!project || source?.current_revision_id !== revisionId)
    return { ok: false, error: "A projekt vagy az aktuális mentett profilrevízió nem érhető el." };
  const { data: revision } = await supabase.from("calculation_revisions")
    .select("input_snapshot, output_snapshot, input_schema_version, calculator_implementation_version")
    .eq("id", revisionId).eq("organization_id", organizationId).eq("calculation_id", calculationId).maybeSingle();
  if (!revision || revision.input_schema_version !== sheetMetalProfileCalculator.inputSchemaVersion
    || revision.calculator_implementation_version !== sheetMetalProfileCalculator.implementationVersion)
    return { ok: false, error: "A mentett profilrevízió nem támogatott vagy nem érhető el." };
  const input = sheetMetalProfileInputSchema.safeParse(revision.input_snapshot);
  if (!input.success || input.data.profileId !== calculationId || input.data.material?.catalogVariantId !== variantId)
    return { ok: false, error: "A mentett profil anyagkapcsolata vagy bemenete érvénytelen." };
  const calculated = executeCalculator(sheetMetalProfileCalculator, input.data);
  if (!calculated.ok || calculated.output.flatPattern.widthMm === null
    || calculated.output.materialRequirement.totalNetBlankAreaSqM === null)
    return { ok: false, error: "A profil geometriája, BA/K paramétere vagy nettó blankterülete nem számítható." };
  const stored = revision.output_snapshot as { flatPattern?: { widthMm?: unknown }; materialRequirement?: { totalNetBlankAreaSqM?: unknown } } | null;
  const width = stored?.flatPattern?.widthMm, area = stored?.materialRequirement?.totalNetBlankAreaSqM;
  if (typeof width !== "number" || typeof area !== "number"
    || Math.abs(width - calculated.output.flatPattern.widthMm) > 1e-9
    || Math.abs(area - calculated.output.materialRequirement.totalNetBlankAreaSqM) > 1e-9)
    return { ok: false, error: "A mentett profil eredménye eltér az újraszámolt értéktől." };
  const { data: result, error } = await supabase.rpc("create_profile_takeoff_draft", {
    p_organization_id: organizationId, p_project_id: projectId, p_calculation_id: calculationId,
    p_revision_id: revisionId, p_variant_id: variantId, p_name: name, p_request_key: requestKey,
  });
  if (error || !result?.[0]) return { ok: false, error: error?.code === "42501"
    ? "A profilhoz, projekthez vagy katalógusvariánshoz nincs hozzáférésed."
    : error?.code === "P0002" ? "A mentett profilrevízió már nem aktuális vagy nem ehhez a projekthez tartozik."
    : error?.message?.includes("BA/K") || error?.message?.includes("blankterület") || error?.message?.includes("terítékszélesség")
      ? error.message : error?.message?.includes("request key") ? "A kéréskulcsot más adatokkal már felhasználták."
        : "Az átadás nem sikerült. Ellenőrizd az aktuális revíziót, a területet és a katalóguskapcsolatot." };
  revalidatePath(`/projektek/${projectId}/anyagkimutatas`);
  return { ok: true, takeoffId: result[0].takeoff_id };
}


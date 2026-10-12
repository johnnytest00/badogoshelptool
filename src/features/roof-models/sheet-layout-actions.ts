"use server";

import { revalidatePath } from "next/cache";
import { calculateMetalSheetLayout, metalSheetLayoutInputSchema } from "@/domain/calculations/metal-sheet-layout";
import { mapCatalogVariantToSheetLayout, resolveSheetLayoutMaterial } from "@/domain/calculations/sheet-layout-material";
import { gableRoofCalculator } from "@/domain/calculations/gable-roof";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database.types";

export type SheetLayoutActionResult = { ok: boolean; error?: string; revisionNumber?: number; revisionCreated?: boolean; takeoffId?: string };
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const uuid = (data: FormData, key: string) => { const item = value(data, key); return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item) ? item : null; };
const optionalNumber = (data: FormData, key: string) => { const item = value(data, key).replace(",", "."); if (!item) return undefined; const parsed = Number(item); return Number.isFinite(parsed) ? parsed : Number.NaN; };

async function authorize(organizationId: string) {
  const auth = await getAuthContext();
  return auth?.organizations.some((organization) => organization.id === organizationId) ? auth : null;
}

export async function saveSheetLayoutAction(_state: SheetLayoutActionResult, data: FormData): Promise<SheetLayoutActionResult> {
  const organizationId = uuid(data, "organizationId"), projectId = uuid(data, "projectId"), roofModelId = uuid(data, "roofModelId"), variantId = uuid(data, "variantId");
  if (!organizationId || !projectId || !roofModelId || !variantId) return { ok: false, error: "Érvénytelen projekt- vagy anyagazonosító." };
  if (!await authorize(organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  const supabase = await createClient();
  const [{ data: roof }, { data: geometry }, { data: variant }] = await Promise.all([
    supabase.from("roof_models").select("id, current_revision_id, name").eq("id", roofModelId).eq("organization_id", organizationId).eq("project_id", projectId).maybeSingle(),
    supabase.from("calculations").select("id, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("roof_model_id", roofModelId).eq("calculator_type", "roof.gable").maybeSingle(),
    supabase.from("material_variants").select("id, product_id, name, sku, purchasing_unit, nominal_width_mm, effective_width_mm, technical_specs, data_provenance, source_name, source_url, source_date, source_notes").eq("id", variantId).eq("organization_id", organizationId).maybeSingle(),
  ]);
  if (!roof?.current_revision_id || !geometry?.current_revision_id) return { ok: false, error: "A mentéshez aktuális, mentett tetőgeometria szükséges." };
  if (!variant) return { ok: false, error: "Az anyagváltozat nem található ebben a műhelyben." };
  const [{ data: geometryRevision }, { data: product }] = await Promise.all([
    supabase.from("calculation_revisions").select("output_snapshot, calculator_implementation_version, input_schema_version, validation_status").eq("id", geometry.current_revision_id).eq("calculation_id", geometry.id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("material_products").select("name, status").eq("id", variant.product_id).eq("organization_id", organizationId).maybeSingle(),
  ]);
  if (!geometryRevision || geometryRevision.validation_status !== "verified") return { ok: false, error: "A forrásgeometria nem ellenőrzött." };
  if (!product || product.status !== "active") return { ok: false, error: "Csak aktív katalógustermék választható." };
  const geometryOutput = gableRoofCalculator.outputSchema.safeParse(geometryRevision.output_snapshot);
  if (!geometryOutput.success) return { ok: false, error: "A forrásgeometria formátuma nem támogatott." };
  let resolved;
  try {
    const technicalSpecs = variant.technical_specs && typeof variant.technical_specs === "object" && !Array.isArray(variant.technical_specs) ? variant.technical_specs as Record<string, string> : {};
    const catalog = mapCatalogVariantToSheetLayout({
      id: variant.id, productName: product.name, name: variant.name, sku: variant.sku, purchasingUnit: variant.purchasing_unit,
      effectiveWidthMm: variant.effective_width_mm === null ? null : Number(variant.effective_width_mm), nominalWidthMm: variant.nominal_width_mm === null ? null : Number(variant.nominal_width_mm),
      technicalSpecs, provenance: variant.data_provenance, sourceName: variant.source_name, sourceUrl: variant.source_url, sourceDate: variant.source_date, sourceNotes: variant.source_notes,
    });
    resolved = resolveSheetLayoutMaterial(catalog, {
      effectiveCoveringWidthMm: optionalNumber(data, "effectiveCoveringWidthMm"), nominalSheetWidthMm: optionalNumber(data, "nominalSheetWidthMm"),
      minimumSheetLengthMm: optionalNumber(data, "minimumSheetLengthMm"), maximumSheetLengthMm: optionalNumber(data, "maximumSheetLengthMm"), endAllowanceMm: optionalNumber(data, "endAllowanceMm"),
    });
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Érvénytelen anyagparaméterek." }; }
  const vertices = geometryOutput.data.planes.flatMap((plane) => plane.vertices);
  const calculatorInputResult = metalSheetLayoutInputSchema.safeParse({
    roof: { startXmm: Math.min(...vertices.map((point) => point.xMm)), endXmm: Math.max(...vertices.map((point) => point.xMm)), slopeLengthMm: geometryOutput.data.lengths.slopeLengthIncludingEaveMm },
    effectiveCoveringWidthMm: resolved.values.effectiveCoveringWidthMm, nominalSheetWidthMm: resolved.values.nominalSheetWidthMm,
    alignment: value(data, "alignment") === "right" ? "right" : "left", minimumSheetLengthMm: resolved.values.minimumSheetLengthMm,
    maximumSheetLengthMm: resolved.values.maximumSheetLengthMm, endAllowanceMm: resolved.values.endAllowanceMm,
  });
  if (!calculatorInputResult.success) return { ok: false, error: "Ellenőrizd a kiosztás számszerű paramétereit." };
  const calculatorInput = calculatorInputResult.data;
  let output;
  try { output = calculateMetalSheetLayout(calculatorInput); } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "A kiosztás nem számítható ki." }; }
  const inputSnapshot = { calculatorInput, source: { roofRevisionId: roof.current_revision_id, geometryCalculationRevisionId: geometry.current_revision_id }, material: { catalogSnapshot: resolved.catalogSnapshot, effectiveValues: { effectiveCoveringWidthMm: resolved.values.effectiveCoveringWidthMm, nominalSheetWidthMm: resolved.values.nominalSheetWidthMm, minimumSheetLengthMm: resolved.values.minimumSheetLengthMm, maximumSheetLengthMm: resolved.values.maximumSheetLengthMm, endAllowanceMm: resolved.values.endAllowanceMm }, parameterSources: resolved.parameterSources } };
  const expectedRevision = Number(value(data, "expectedRevisionNumber") || "0");
  const layoutCalculationId = uuid(data, "layoutCalculationId");
  const { data: saved, error } = await supabase.rpc("save_metal_sheet_layout", {
    p_organization_id: organizationId, p_project_id: projectId, p_roof_model_id: roofModelId, p_source_roof_revision_id: roof.current_revision_id,
    p_source_geometry_calculation_revision_id: geometry.current_revision_id, p_layout_calculation_id: layoutCalculationId as never,
    p_material_variant_id: variantId, p_display_name: value(data, "displayName") || `${roof.name} lemezkiosztás`, p_input_data: inputSnapshot as unknown as Json,
    p_output_data: output as unknown as Json, p_data_provenance: { material: resolved.parameterSources, calculation: "server_verified" }, p_warnings: output.manufacturingIssues as unknown as Json,
    p_expected_revision_number: expectedRevision,
  });
  if (error || !saved?.[0]) return { ok: false, error: error?.code === "40001" ? "A forrás vagy a kiosztás időközben megváltozott; töltsd újra az oldalt." : "A kiosztás mentése nem sikerült." };
  revalidatePath(`/projektek/${projectId}/tetomodellek/${roofModelId}`);
  return { ok: true, revisionNumber: saved[0].revision_number, revisionCreated: saved[0].revision_created };
}

export async function createSheetLayoutTakeoffAction(_state: SheetLayoutActionResult, data: FormData): Promise<SheetLayoutActionResult> {
  const organizationId = uuid(data, "organizationId"), projectId = uuid(data, "projectId"), calculationId = uuid(data, "layoutCalculationId"), revisionId = uuid(data, "layoutRevisionId");
  if (!organizationId || !projectId || !calculationId || !revisionId) return { ok: false, error: "Érvénytelen kiosztáshivatkozás." };
  if (!await authorize(organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  const allowance = optionalNumber(data, "allowancePercent") ?? 0;
  const supabase = await createClient();
  const { data: takeoffId, error } = await supabase.rpc("create_sheet_layout_takeoff_draft", { p_organization_id: organizationId, p_project_id: projectId, p_layout_calculation_id: calculationId, p_layout_revision_id: revisionId, p_name: value(data, "name") || "Lemezkiosztás anyagtervezet", p_allowance_percent: allowance });
  if (error || !takeoffId) return { ok: false, error: error?.message.includes("négyzetméteres") ? "Ehhez a beszerzési egységhez nincs biztonságos automatikus átváltás; használd a kézi anyagkimutatási folyamatot." : "Az anyagkimutatás-tervezet létrehozása nem sikerült." };
  revalidatePath(`/projektek/${projectId}/anyagkimutatas`);
  return { ok: true, takeoffId };
}

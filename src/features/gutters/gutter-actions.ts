"use server";

import { revalidatePath } from "next/cache";
import { executeCalculator } from "@/domain/calculations/engine";
import { gutterMaterialCalculator, gutterMaterialInputSchema } from "@/domain/calculations/gutter-material";
import { buildGutterTakeoffCandidates, gutterTakeoffMappingSchema } from "@/domain/calculations/gutter-material-integration";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database.types";

export type GutterSaveResult = { ok: boolean; error?: string; revisionNumber?: number };
export type GutterTakeoffResult = { ok: boolean; error?: string; takeoffId?: string };
const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const uuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value) ? value : null;

export async function saveGutterCalculationAction(data: FormData): Promise<GutterSaveResult> {
  const organizationId = uuid(text(data, "organizationId")); const projectId = uuid(text(data, "projectId"));
  if (!organizationId || !projectId) return { ok: false, error: "Érvénytelen projektazonosító." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  let raw: unknown;
  try { raw = JSON.parse(text(data, "input")); } catch { return { ok: false, error: "A kalkulációs adatok formátuma hibás." }; }
  const parsed = gutterMaterialInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Ellenőrizd az ereszszakaszok és lefolyók adatait." };
  const calculated = executeCalculator(gutterMaterialCalculator, parsed.data);
  if (!calculated.ok) return { ok: false, error: calculated.errors[0]?.message ?? "A kalkuláció nem számítható ki." };
  const sourceRoofRevisionId = uuid(text(data, "sourceRoofRevisionId"));
  if (!sourceRoofRevisionId) return { ok: false, error: "A projektforrásként használt tetőrevízió hiányzik." };
  const expectedRevision = Number(text(data, "expectedRevisionNumber") || "0");
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return { ok: false, error: "Érvénytelen revíziószám." };
  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("save_gutter_material_calculation", {
    p_organization_id: organizationId, p_project_id: projectId, p_name: text(data, "name") || "Ereszcsatorna-becslés",
    p_input_data: parsed.data as unknown as Json, p_output_data: calculated.output as unknown as Json,
    p_data_provenance: { input: "user_provided", output: "server_calculation", calculator: calculated.metadata.calculatorId },
    p_warnings: calculated.output.warnings as unknown as Json, p_source_roof_revision_id: sourceRoofRevisionId,
    p_expected_revision_number: expectedRevision,
  });
  if (error || !result?.[0]) return { ok: false, error: error?.code === "40001" ? "A kalkuláció időközben megváltozott; töltsd újra az oldalt." : "A kalkuláció mentése nem sikerült." };
  revalidatePath(`/projektek/${projectId}`); revalidatePath(`/projektek/${projectId}/ereszcsatorna`);
  return { ok: true, revisionNumber: result[0].revision_number };
}

export async function createGutterTakeoffDraftAction(data: FormData): Promise<GutterTakeoffResult> {
  const organizationId = uuid(text(data, "organizationId"));
  const projectId = uuid(text(data, "projectId"));
  const sourceRevisionId = uuid(text(data, "sourceRevisionId"));
  const requestKey = uuid(text(data, "requestKey"));
  if (!organizationId || !projectId || !sourceRevisionId || !requestKey) return { ok: false, error: "Érvénytelen forrás-, projekt- vagy műveletazonosító." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  let rawMappings: unknown;
  try { rawMappings = JSON.parse(text(data, "mappings") || "[]"); } catch { return { ok: false, error: "A katalógus-hozzárendelések formátuma hibás." }; }
  if (!Array.isArray(rawMappings) || rawMappings.length === 0) return { ok: false, error: "Legalább egy kompatibilis katalógusváltozatot válassz ki." };
  const mappings = rawMappings.flatMap((item) => { const parsed = gutterTakeoffMappingSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }).sort((left, right) => left.candidateId.localeCompare(right.candidateId) || left.variantId.localeCompare(right.variantId));
  if (mappings.length !== rawMappings.length) return { ok: false, error: "Érvénytelen katalógus-hozzárendelés." };
  if (new Set(mappings.map((mapping) => mapping.candidateId)).size !== mappings.length) return { ok: false, error: "Egy számítási tétel csak egyszer adható át." };
  const supabase = await createClient();
  const { data: calculation, error: calculationError } = await supabase.from("calculations").select("id, project_id, current_revision_id, calculator_type").eq("id", text(data, "calculationId")).eq("organization_id", organizationId).eq("project_id", projectId).is("roof_model_id", null).eq("calculator_type", "gutters.material-estimate").maybeSingle();
  if (calculationError || !calculation || calculation.current_revision_id !== sourceRevisionId) return { ok: false, error: "A kiválasztott kalkuláció nem aktuális mentett revízió; töltsd újra és ellenőrizd." };
  const { data: revision } = await supabase.from("calculation_revisions").select("id, input_snapshot, validation_status").eq("id", sourceRevisionId).eq("calculation_id", calculation.id).eq("organization_id", organizationId).maybeSingle();
  if (!revision || revision.validation_status !== "verified") return { ok: false, error: "A forrásrevízió nem ellenőrzött." };
  const parsedInput = gutterMaterialInputSchema.safeParse(revision.input_snapshot);
  if (!parsedInput.success) return { ok: false, error: "A forrásrevízió bemenete nem érvényes." };
  const calculated = executeCalculator(gutterMaterialCalculator, parsedInput.data);
  if (!calculated.ok) return { ok: false, error: "A forrásrevízió újraellenőrzése sikertelen." };
  const candidates = buildGutterTakeoffCandidates(calculated.input, calculated.output);
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const variantIds = mappings.map((mapping) => mapping.variantId);
  const { data: variants } = await supabase.from("material_variants").select("id, product_id, name, sku, purchasing_unit, nominal_width_mm, effective_width_mm, thickness_mm, length_mm, packaging_quantity, technical_specs, data_provenance").eq("organization_id", organizationId).in("id", variantIds);
  if (!variants || variants.length !== new Set(variantIds).size) return { ok: false, error: "Egy vagy több katalógusváltozat nem tartozik ehhez a műhelyhez." };
  const productIds = [...new Set(variants.map((variant) => variant.product_id))];
  const { data: products } = await supabase.from("material_products").select("id, name, category, status").eq("organization_id", organizationId).in("id", productIds);
  const productMap = new Map((products ?? []).map((product) => [product.id, product]));
  for (const mapping of mappings) {
    const candidate = candidateMap.get(mapping.candidateId);
    const variant = variants.find((item) => item.id === mapping.variantId);
    const product = variant ? productMap.get(variant.product_id) : null;
    if (!candidate || !variant || !product || product.status !== "active") return { ok: false, error: "Érvénytelen vagy inaktív katalógus-hozzárendelés." };
    if (!["gutter", "accessory", "other"].includes(product.category)) return { ok: false, error: `${product.name}: a katalóguskategória nem támogatott ereszcsatorna-tételhez.` };
    if (variant.purchasing_unit !== candidate.unit) return { ok: false, error: `${candidate.label}: nincs támogatott egységátváltás (${candidate.unit} → ${variant.purchasing_unit}).` };
  }
  const name = text(data, "name") || "Ereszcsatorna anyagkimutatás";
  const { data: result, error } = await supabase.rpc("create_gutter_takeoff_draft", { p_organization_id: organizationId, p_project_id: projectId, p_calculation_id: calculation.id, p_revision_id: sourceRevisionId, p_name: name, p_request_key: requestKey, p_mappings: mappings as unknown as Json });
  if (error || !result?.[0]) {
    if (error?.code === "42501") return { ok: false, error: "A projekt vagy a katalógusváltozat nem érhető el ebben a műhelyben." };
    if (error?.code === "22023") return { ok: false, error: "A műveletazonosító már eltérő tartalomhoz tartozik, vagy a hozzárendelés nem kompatibilis." };
    if (error?.code === "P0002") return { ok: false, error: "A forrás nem az aktuális, ellenőrzött gutter-revízió." };
    return { ok: false, error: "Az anyagkimutatás-piszkozat létrehozása nem sikerült." };
  }
  revalidatePath(`/projektek/${projectId}/anyagkimutatas`);
  return { ok: true, takeoffId: result[0].takeoff_id };
}

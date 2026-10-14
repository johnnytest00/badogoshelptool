"use server";

import { flashingMaterialCalculator } from "@/domain/calculations/flashing-material";
import { gutterMaterialCalculator } from "@/domain/calculations/gutter-material";
import { matchProfileMaterial } from "@/domain/calculations/profile-material-compatibility";
import { sheetMetalProfileCalculator, type SheetMetalProfileInput } from "@/domain/calculations/sheet-metal-profile";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database.types";
import { prepareStandaloneRevision, standaloneCalculatorTypes, type StandaloneCalculatorType } from "./standalone-persistence";

export type StandaloneSaveResult = { ok: true; calculationId: string; revisionId: string; revisionNumber: number } | { ok: false; error: string };
export type StandaloneAssociationResult = { ok: true; associationId: string; calculationId: string; revisionId: string; revisionNumber: number; reused: boolean } | { ok: false; error: string; requiresReload?: boolean; retrySameOperation?: boolean };
export type StandaloneAssociationProject = Readonly<{ id: string; name: string; location: string | null; projectType: string; status: string; version: number }>;
export type StandaloneAssociationTarget = Readonly<{ project: StandaloneAssociationProject; expectedProjectRevisionNumber: number }>;
const read = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** A bounded, organization-scoped picker read model. It returns no client or customer fields. */
export async function searchStandaloneAssociationProjects(organizationId: string, rawSearch: string): Promise<StandaloneAssociationProject[]> {
  const auth = await getAuthContext();
  if (!isUuid(organizationId) || !auth?.organizations.some((organization) => organization.id === organizationId)) {
    throw new Error("Ehhez a műhelyhez nincs hozzáférésed.");
  }
  const search = rawSearch.trim().slice(0, 80).replace(/[\\%_]/g, " ");
  const supabase = await createClient();
  let query = supabase.from("projects").select("id, name, location, project_type, status, version")
    .eq("organization_id", organizationId).neq("status", "archived").not("name", "ilike", "DEMO%").order("updated_at", { ascending: false }).limit(50);
  if (search) query = query.ilike("name", `%${search}%`);
  const { data, error } = await query;
  if (error) throw new Error("A projektek betöltése nem sikerült.");
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, location: row.location, projectType: row.project_type, status: row.status, version: row.version }));
}

/** Resolves the authorized destination and exact project calculation revision to confirm against. */
export async function getStandaloneAssociationTarget(organizationId: string, projectId: string, calculatorType: string): Promise<StandaloneAssociationTarget | null> {
  const auth = await getAuthContext();
  if (!isUuid(organizationId) || !isUuid(projectId) || !auth?.organizations.some((organization) => organization.id === organizationId)
    || !standaloneCalculatorTypes.includes(calculatorType as StandaloneCalculatorType)) return null;
  const supabase = await createClient();
  const [{ data: project, error: projectError }, { data: calculation, error: calculationError }] = await Promise.all([
    supabase.from("projects").select("id, name, location, project_type, status, version").eq("id", projectId).eq("organization_id", organizationId).maybeSingle(),
    calculatorType === sheetMetalProfileCalculator.id
      ? Promise.resolve({ data: null, error: null })
      : supabase.from("calculations").select("current_revision_id").eq("project_id", projectId).eq("organization_id", organizationId).eq("calculator_type", calculatorType).eq("ownership_scope", "project").maybeSingle(),
  ]);
  if (projectError || calculationError) throw new Error("A kiválasztott projekt adatai nem tölthetők be.");
  if (!project || project.status === "archived") return null;
  let expectedProjectRevisionNumber = 0;
  if (calculation?.current_revision_id) {
    const { data: revision, error } = await supabase.from("calculation_revisions").select("revision_number").eq("id", calculation.current_revision_id).eq("organization_id", organizationId).maybeSingle();
    if (error || !revision) throw new Error("A projekt aktuális kalkulációs revíziója nem tölthető be.");
    expectedProjectRevisionNumber = revision.revision_number;
  }
  return { project: { id: project.id, name: project.name, location: project.location, projectType: project.project_type, status: project.status, version: project.version }, expectedProjectRevisionNumber };
}

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
  const rpc = calculatorType === gutterMaterialCalculator.id ? "save_standalone_gutter_calculation"
    : calculatorType === flashingMaterialCalculator.id ? "save_standalone_flashing_calculation"
      : "save_standalone_profile_calculation";
  const { data: saved, error } = await supabase.rpc(rpc, common);
  if (error || !saved?.[0]) return { ok: false, error: error?.code === "40001"
    ? "A számítás időközben új revíziót kapott. Töltsd be az aktuális változatot, majd ments újra."
    : error?.code === "42501" ? "A számítás vagy a műhely nem érhető el a fiókod számára."
      : error?.code === "P0002" ? "A mentéshez szükséges forrásadat hiányzik vagy már nem érhető el."
        : error?.code === "22023" ? "A számítás adatai nem felelnek meg a mentési feltételeknek. Ellenőrizd a megadott értékeket."
      : "A számítás mentése nem sikerült." };
  return { ok: true, calculationId: saved[0].calculation_id, revisionId: saved[0].calculation_revision_id, revisionNumber: saved[0].revision_number };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : item);
}

/** Copies a current standalone snapshot into the existing project revision workflow. */
export async function associateStandaloneCalculationAction(data: FormData): Promise<StandaloneAssociationResult> {
  const organizationId = read(data, "organizationId"), projectId = read(data, "projectId");
  const sourceCalculationId = read(data, "sourceCalculationId"), sourceRevisionId = read(data, "sourceRevisionId");
  const operationId = read(data, "operationId"), projectCalculationId = read(data, "projectCalculationId");
  const nameInput = read(data, "name");
  const expectedProjectRevisionNumber = Number(read(data, "expectedProjectRevisionNumber"));
  if (![organizationId, projectId, sourceCalculationId, sourceRevisionId, operationId].every(isUuid)) {
    return { ok: false, error: "A projektkapcsolás azonosítója érvénytelen." };
  }
  if (!Number.isSafeInteger(expectedProjectRevisionNumber) || expectedProjectRevisionNumber < 0
    || (projectCalculationId && !isUuid(projectCalculationId))) {
    return { ok: false, error: "A célprojekt revízióadata érvénytelen." };
  }
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) {
    return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  }

  const supabase = await createClient();
  const { data: source, error: sourceError } = await supabase.from("calculations")
    .select("id, organization_id, ownership_scope, created_by, calculator_type, display_name, current_revision_id")
    .eq("id", sourceCalculationId).eq("organization_id", organizationId).eq("ownership_scope", "standalone").maybeSingle();
  if (sourceError || !source || source.created_by !== auth.userId) {
    return { ok: false, error: "A forrásszámítás nem érhető el a fiókod számára." };
  }
  if (!standaloneCalculatorTypes.includes(source.calculator_type as StandaloneCalculatorType)) {
    return { ok: false, error: "Ez a kalkulátortípus nem kapcsolható projekthez." };
  }
  if (source.current_revision_id !== sourceRevisionId) {
    return { ok: false, error: "A forrásszámítás időközben új revíziót kapott. Frissítsd az oldalt, majd ellenőrizd újra a projektpéldányt.", requiresReload: true };
  }
  const [{ data: project }, { data: revision, error: revisionError }] = await Promise.all([
    supabase.from("projects").select("id").eq("id", projectId).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("calculation_revisions")
      .select("id, calculation_id, input_snapshot, output_snapshot, data_provenance, validation_status, input_schema_version, calculator_implementation_version, warnings")
      .eq("id", sourceRevisionId).eq("calculation_id", sourceCalculationId).eq("organization_id", organizationId).maybeSingle(),
  ]);
  if (!project) return { ok: false, error: "A projekt nem található a kiválasztott műhelyben." };
  if (revisionError || !revision || !["estimated", "user_provided", "demo"].includes(revision.validation_status)
    || revision.input_schema_version !== "1.0.0" || revision.calculator_implementation_version !== "1.0.0") {
    return { ok: false, error: "A kiválasztott forrásrevízió hiányzik vagy nem támogatott." };
  }

  const targetProfileId = source.calculator_type === "sheet_metal.profiles.flat-pattern" ? projectCalculationId : sourceCalculationId;
  if (source.calculator_type === "sheet_metal.profiles.flat-pattern" && !projectCalculationId) {
    return { ok: false, error: "A lemezprofil új projektazonosítója hiányzik." };
  }
  const name = nameInput || source.display_name;
  const rawInput = source.calculator_type === "sheet_metal.profiles.flat-pattern" && revision.input_snapshot
    && typeof revision.input_snapshot === "object" && !Array.isArray(revision.input_snapshot)
    ? { ...revision.input_snapshot, profileId: targetProfileId }
    : revision.input_snapshot;
  const prepared = prepareStandaloneRevision(source.calculator_type, rawInput, targetProfileId, name);
  if (!prepared.ok) return prepared;
  const sameSourceInputs = source.calculator_type === "sheet_metal.profiles.flat-pattern"
    ? stableJson({ ...(prepared.value.input as Record<string, unknown>), profileId: (revision.input_snapshot as Record<string, unknown>).profileId }) === stableJson(revision.input_snapshot)
    : stableJson(prepared.value.input) === stableJson(revision.input_snapshot);
  if (!sameSourceInputs || stableJson(prepared.value.output) !== stableJson(revision.output_snapshot)) {
    return { ok: false, error: "A forrássnapshot és az újraszámított eredmény nem egyezik." };
  }

  const rpcArgs = {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_source_calculation_id: sourceCalculationId,
    p_source_revision_id: sourceRevisionId,
    p_operation_id: operationId,
    p_name: name,
    p_expected_project_revision_number: expectedProjectRevisionNumber,
    p_project_calculation_id: source.calculator_type === "sheet_metal.profiles.flat-pattern" ? projectCalculationId : null,
    p_input_data: prepared.value.input as unknown as Json,
    p_output_data: prepared.value.output as Json,
  };
  const { data: associated, error } = await supabase.rpc("associate_standalone_calculation_to_project", rpcArgs);
  if (error || !associated?.[0]) return { ok: false, requiresReload: error?.code === "40001", retrySameOperation: !!error && !error.code, error: error?.code === "40001"
    ? "A forrás vagy a projekt számítása időközben megváltozott. Frissítsd az oldalt, majd ellenőrizd újra a projektpéldányt."
    : error?.code === "42501" ? "A forrás vagy a projekt nem érhető el a fiókod számára."
      : error?.code === "P0002" ? "A kiválasztott forrásrevízió hiányzik vagy nem használható."
        : error?.code === "22023" ? "A projektkapcsolás adatai érvénytelenek, vagy a műveletazonosító más adatokhoz tartozik."
          : "A projektkapcsolás nem sikerült." };
  return { ok: true, associationId: associated[0].association_id, calculationId: associated[0].project_calculation_id,
    revisionId: associated[0].project_revision_id, revisionNumber: associated[0].revision_number, reused: associated[0].reused };
}


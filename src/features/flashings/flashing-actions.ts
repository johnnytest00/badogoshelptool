"use server";

import { revalidatePath } from "next/cache";
import { executeCalculator } from "@/domain/calculations/engine";
import { FLASHING_MATERIAL_CALCULATOR_VERSION, FLASHING_MATERIAL_INPUT_SCHEMA_VERSION, flashingMaterialCalculator, flashingMaterialInputSchema } from "@/domain/calculations/flashing-material";
import { buildFlashingTakeoffCandidates, checkFlashingMappings, flashingTakeoffMappingSchema } from "@/domain/calculations/flashing-material-integration";
import { getAuthContext } from "@/features/auth/auth.server";
import { getFlashingCatalogVariants } from "@/features/flashings/flashing-data";
import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database.types";
import { getVerifiedMultiRoofSources } from "@/features/roof-models/multi-roof-source-data";
import { persistMultiRoofFlashing } from "@/infrastructure/supabase/multi-roof-flashing-writer";

export type FlashingSaveResult = { ok: boolean; error?: string; calculationId?: string; revisionId?: string; revisionNumber?: number };
export type FlashingTakeoffResult = { ok: boolean; error?: string; takeoffId?: string };
const read = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const stableJson = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : item);
const edgeRules = new Map([
  ["left-eave", { field: "lengths.eachEaveEdgeMm", category: "eaves" }],
  ["right-eave", { field: "lengths.eachEaveEdgeMm", category: "eaves" }],
  ["ridge", { field: "lengths.ridgeLineMm", category: "ridge" }],
  ["left-front-gable", { field: "lengths.eachSlopingGableEdgeMm", category: "verge" }],
  ["left-rear-gable", { field: "lengths.eachSlopingGableEdgeMm", category: "verge" }],
  ["right-front-gable", { field: "lengths.eachSlopingGableEdgeMm", category: "verge" }],
  ["right-rear-gable", { field: "lengths.eachSlopingGableEdgeMm", category: "verge" }],
]);

export async function saveFlashingCalculationAction(data: FormData): Promise<FlashingSaveResult> {
  const organizationId = read(data, "organizationId"), projectId = read(data, "projectId");
  if (!isUuid(organizationId) || !isUuid(projectId)) return { ok: false, error: "Érvénytelen projekt- vagy műhelyazonosító." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  let raw: unknown;
  try { raw = JSON.parse(read(data, "input")); } catch { return { ok: false, error: "A kalkulációs adatok formátuma hibás." }; }
  const parsed = flashingMaterialInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Ellenőrizd a szegélyszakaszok és a szálparaméterek adatait." };
  const calculated = executeCalculator(flashingMaterialCalculator, parsed.data);
  if (!calculated.ok) return { ok: false, error: calculated.errors[0]?.message ?? "A kalkuláció nem számítható ki." };
  const expectedRevision = Number(read(data, "expectedRevisionNumber") || "0");
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return { ok: false, error: "Érvénytelen revíziószám." };
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("organization_id", organizationId).maybeSingle();
  if (!project) return { ok: false, error: "A projekt nem érhető el ebben a műhelyben." };

  const references = parsed.data.runs.flatMap((run) => run.roofEdgeReference ? [{ run, reference: run.roofEdgeReference }] : []);
  const multiReferences = references.filter(({ reference }) => reference.outputField === "edges");
  if (multiReferences.length) {
    const sources = await getVerifiedMultiRoofSources(organizationId, projectId);
    const category = { eave: "eaves", ridge: "ridge", rake: "verge", hip: "hip", valley: "valley" } as const;
    const seen = new Set<string>();
    for (const { run, reference } of multiReferences) {
      const source = sources.find((item) => item.roofModelId === reference.roofModelId && item.roofModelRevisionId === reference.roofModelRevisionId && item.calculationId === reference.calculationId && item.calculationRevisionId === reference.calculationRevisionId);
      const edge = source?.geometry.edges.find((item) => item.id === reference.edgeId && item.kind !== "upper");
      const key = `${reference.roofModelId}:${reference.edgeId}`;
      if (!source || !edge || seen.has(key) || run.lengthSource !== "geometry" || run.category !== category[edge.kind as keyof typeof category]
        || edge.lengthMm !== reference.suggestedLengthMm || (!reference.lengthOverridden && run.lengthMm !== Math.ceil(edge.lengthMm))) return { ok: false, error: "A kijelölt tetőél forrása, típusa vagy hossza nem egyezik a mentett geometriával." };
      seen.add(key);
    }
  }
  const gableReferences = references.filter(({ reference }) => reference.outputField !== "edges");
  if (gableReferences.length) {
    for (const { run, reference } of gableReferences) {
      const rule = edgeRules.get(reference.edgeId);
      if (!rule || rule.field !== reference.outputField || rule.category !== run.category || run.lengthSource !== "geometry") return { ok: false, error: "A tetőél-hozzárendelés nem támogatott vagy nem egyezik a szegélykategóriával." };
    }
    const modelIds = [...new Set(gableReferences.map(({ reference }) => reference.roofModelId))];
    const { data: models, error: modelsError } = await supabase.from("roof_models").select("id, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("roof_type", "gable").in("id", modelIds);
    if (modelsError || models?.length !== modelIds.length) return { ok: false, error: "Egy tetőmodell nem tartozik ehhez a projekthez." };
    if (gableReferences.some(({ reference }) => models?.find((model) => model.id === reference.roofModelId)?.current_revision_id !== reference.roofModelRevisionId)) return { ok: false, error: "A forrás tetőgeometria megváltozott; töltsd újra a javaslatokat." };
    const { data: roofRevisions, error: roofRevisionError } = await supabase.from("roof_model_revisions").select("id, roof_model_id, validation_status").eq("organization_id", organizationId).in("id", [...new Set(gableReferences.map(({ reference }) => reference.roofModelRevisionId))]);
    if (roofRevisionError || gableReferences.some(({ reference }) => !roofRevisions?.some((revision) => revision.id === reference.roofModelRevisionId && revision.roof_model_id === reference.roofModelId && revision.validation_status === "verified"))) return { ok: false, error: "A forrás tetőrevízió nem ellenőrzött." };
    const calculationRevisionIds = [...new Set(gableReferences.map(({ reference }) => reference.calculationRevisionId))];
    const [{ data: geometryRevisions, error: geometryError }, { data: geometryDependencies, error: dependencyError }] = await Promise.all([
      supabase.from("calculation_revisions").select("id, calculation_id, output_snapshot, validation_status").eq("organization_id", organizationId).in("id", calculationRevisionIds),
      supabase.from("calculation_dependencies").select("downstream_calculation_revision_id, upstream_roof_model_revision_id").in("downstream_calculation_revision_id", calculationRevisionIds),
    ]);
    const calculationIds = [...new Set(gableReferences.map(({ reference }) => reference.calculationId))];
    const { data: geometryCalculations, error: calculationsError } = calculationIds.length ? await supabase.from("calculations").select("id, roof_model_id, current_revision_id, calculator_type").eq("organization_id", organizationId).eq("project_id", projectId).eq("calculator_type", "roof.gable").in("id", calculationIds) : { data: [], error: null };
    if (geometryError || dependencyError || calculationsError || gableReferences.some(({ reference }) => {
      const revision = geometryRevisions?.find((item) => item.id === reference.calculationRevisionId);
      const calculation = geometryCalculations?.find((item) => item.id === reference.calculationId);
      const output = revision?.output_snapshot as { lengths?: Record<string, unknown> } | null;
      const outputLength = output?.lengths?.[reference.outputField.split(".")[1]];
      const sourcePairIsLinked = geometryDependencies?.some((dependency) => dependency.downstream_calculation_revision_id === reference.calculationRevisionId && dependency.upstream_roof_model_revision_id === reference.roofModelRevisionId);
      return !sourcePairIsLinked || !revision || revision.calculation_id !== reference.calculationId || revision.validation_status !== "verified" || !calculation || calculation.roof_model_id !== reference.roofModelId || calculation.current_revision_id !== reference.calculationRevisionId || typeof outputLength !== "number" || outputLength !== reference.suggestedLengthMm || (!reference.lengthOverridden && runLength(parsed.data.runs, reference) !== Math.ceil(reference.suggestedLengthMm));
    })) return { ok: false, error: "A forráskalkuláció elavult vagy a javasolt élhossz nem egyezik a mentett geometriával." };
  }

  if (multiReferences.length) {
    const operationId = read(data, "operationId");
    if (!isUuid(operationId)) return { ok: false, error: "Érvénytelen mentési műveletazonosító." };
    try {
      const result = await persistMultiRoofFlashing({ organizationId, projectId, name: read(data, "name") || "Bádogos szegély becslés", input: parsed.data, output: calculated.output, expectedRevisionNumber: expectedRevision, operationId, actorId: auth.userId });
      revalidatePath(`/projektek/${projectId}`);
      revalidatePath(`/projektek/${projectId}/szegelyek`);
      return { ok: true, calculationId: result.calculation_id, revisionId: result.calculation_revision_id, revisionNumber: result.revision_number };
    } catch (cause) {
      return { ok: false, error: cause && typeof cause === "object" && "code" in cause && cause.code === "40001" ? "A kalkuláció vagy a forrás időközben megváltozott; töltsd újra az oldalt." : "A szegélyszámítás mentése nem sikerült." };
    }
  }
  const { data: result, error } = await supabase.rpc("save_flashing_material_calculation", {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_name: read(data, "name") || "Bádogos szegély becslés",
    p_input_data: parsed.data as unknown as Json,
    p_output_data: calculated.output as unknown as Json,
    p_data_provenance: { input: "user_provided", output: "server_calculation", calculator: calculated.metadata.calculatorId, displayName: read(data, "name") || "Bádogos szegély becslés" },
    p_warnings: calculated.output.warnings as unknown as Json,
    p_expected_revision_number: expectedRevision,
  });
  if (error || !result?.[0]) return { ok: false, error: error?.code === "40001" ? "A kalkuláció vagy a forrás időközben megváltozott; töltsd újra az oldalt." : "A kalkuláció mentése nem sikerült." };
  revalidatePath(`/projektek/${projectId}`);
  revalidatePath(`/projektek/${projectId}/szegelyek`);
  return { ok: true, calculationId: result[0].calculation_id, revisionId: result[0].calculation_revision_id, revisionNumber: result[0].revision_number };
}

export async function createFlashingTakeoffDraftAction(data: FormData): Promise<FlashingTakeoffResult> {
  const organizationId = read(data, "organizationId"), projectId = read(data, "projectId");
  const calculationId = read(data, "calculationId"), revisionId = read(data, "revisionId");
  const requestKey = read(data, "requestKey"), name = read(data, "name");
  if (![organizationId, projectId, calculationId, revisionId, requestKey].every(isUuid)) return { ok: false, error: "Érvénytelen projekt-, kalkuláció-, revízió- vagy kérésazonosító." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  let rawMappings: unknown;
  try { rawMappings = JSON.parse(read(data, "mappings")); } catch { return { ok: false, error: "Az anyag-hozzárendelések formátuma hibás." }; }
  if (!Array.isArray(rawMappings) || !rawMappings.length) return { ok: false, error: "Legalább egy katalógustételt rendelj hozzá." };
  const mappings = rawMappings.map((item) => flashingTakeoffMappingSchema.safeParse(item));
  if (mappings.some((item) => !item.success)) return { ok: false, error: "Egy anyag-hozzárendelés érvénytelen." };
  const validMappings = mappings.map((item) => item.success ? item.data : null).filter((item): item is NonNullable<typeof item> => item !== null);
  if (new Set(validMappings.map((item) => item.candidateId)).size !== validMappings.length) return { ok: false, error: "Egy becslési tétel többször szerepel." };
  const roots = validMappings.flatMap((item) => item.candidateId.startsWith("run-") ? [item.candidateId.split(":")[1]] : []);
  if (new Set(roots).size !== roots.length) return { ok: false, error: "Egy szakaszhoz csak egy mennyiségi módot válassz." };
  const supabase = await createClient();
  const [{ data: project }, { data: calculation, error: calculationError }] = await Promise.all([
    supabase.from("projects").select("id").eq("id", projectId).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("calculations").select("id, current_revision_id, calculator_type, project_id, organization_id, roof_model_id").eq("id", calculationId).eq("organization_id", organizationId).eq("project_id", projectId).eq("calculator_type", flashingMaterialCalculator.id).is("roof_model_id", null).maybeSingle(),
  ]);
  if (!project || calculationError || !calculation || calculation.current_revision_id !== revisionId) return { ok: false, error: "A projekt vagy a mentett aktuális szegélyrevízió nem érhető el." };
  const { data: revision, error: revisionError } = await supabase.from("calculation_revisions").select("id, input_snapshot, output_snapshot, validation_status, calculator_implementation_version, input_schema_version").eq("id", revisionId).eq("calculation_id", calculationId).eq("organization_id", organizationId).maybeSingle();
  if (revisionError || !revision || revision.validation_status !== "verified" || revision.calculator_implementation_version !== FLASHING_MATERIAL_CALCULATOR_VERSION || revision.input_schema_version !== FLASHING_MATERIAL_INPUT_SCHEMA_VERSION) return { ok: false, error: "A mentett szegélyrevízió nem ellenőrzött, nem támogatott verziójú vagy nem ehhez a kalkulációhoz tartozik." };
  const input = flashingMaterialInputSchema.safeParse(revision.input_snapshot);
  const output = flashingMaterialCalculator.outputSchema.safeParse(revision.output_snapshot);
  if (!input.success || !output.success) return { ok: false, error: "A mentett számítási adatok nem értelmezhetők." };
  const recalc = executeCalculator(flashingMaterialCalculator, input.data);
  if (!recalc.ok || stableJson(recalc.output) !== stableJson(output.data)) return { ok: false, error: "A mentett eredmény nem egyezik az aktuális kalkulációval; frissítsd a revíziót." };
  const candidates = buildFlashingTakeoffCandidates(input.data, output.data);
  if (validMappings.some((mapping) => !candidates.some((candidate) => candidate.id === mapping.candidateId))) return { ok: false, error: "Egy hozzárendelt mennyiség nem található a mentett revízióban." };
  const variants = await getFlashingCatalogVariants(organizationId);
  const mappingChecks = checkFlashingMappings(candidates.filter((candidate) => validMappings.some((mapping) => mapping.candidateId === candidate.id)), validMappings, variants);
  const invalid = mappingChecks.find((check) => check.status !== "compatible");
  if (invalid) return { ok: false, error: `${invalid.candidate.label}: ${invalid.message}` };
  const { data: result, error } = await supabase.rpc("create_flashing_takeoff_draft", {
    p_organization_id: organizationId, p_project_id: projectId, p_calculation_id: calculationId,
    p_revision_id: revisionId, p_name: name || `Szegélyanyagok · ${new Date().toLocaleDateString("hu-HU")}`,
    p_request_key: requestKey, p_mappings: validMappings as unknown as Json,
  });
  if (error || !result?.[0]) return { ok: false, error: error?.code === "42501" ? "A műhelyhez vagy katalógusváltozathoz nincs hozzáférés." : error?.code === "22023" ? "Az átadás adatai megváltoztak vagy nem kompatibilisek; ellenőrizd a mennyiséget és a katalógust." : "Az anyagkimutatás draft nem jött létre." };
  revalidatePath(`/projektek/${projectId}/anyagkimutatas`);
  return { ok: true, takeoffId: result[0].takeoff_id };
}

function runLength(runs: readonly { lengthMm: number; roofEdgeReference?: { edgeId: string; roofModelId: string; roofModelRevisionId: string } | null }[], reference: { edgeId: string; roofModelId: string; roofModelRevisionId: string }) {
  return runs.find((run) => run.roofEdgeReference?.edgeId === reference.edgeId && run.roofEdgeReference.roofModelId === reference.roofModelId && run.roofEdgeReference.roofModelRevisionId === reference.roofModelRevisionId)?.lengthMm;
}

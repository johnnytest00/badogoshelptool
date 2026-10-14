"use server";

import { revalidatePath } from "next/cache";
import { GABLE_CALCULATOR_VERSION, GABLE_INPUT_SCHEMA_VERSION, gableRoofInputSchema } from "@/domain/calculations/gable-roof";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import { persistGableMetalTileCovering } from "@/infrastructure/supabase/gable-metal-tile-covering-writer";
import { calculateMetalTileSnapshot, GABLE_METAL_TILE_COVERING_ID, gableMetalTileCoveringSaveSchema } from "./gable-metal-tile-covering-persistence";
import { getGableMetalTileCovering } from "./gable-metal-tile-covering-data";

export type MetalTileCoveringSaveResult = { ok: boolean; error?: string; calculationId?: string; revisionId?: string; revisionNumber?: number; reused?: boolean };

export async function readGableMetalTileCovering(organizationId: string, calculationId: string, revisionNumber?: number) {
  return getGableMetalTileCovering(organizationId, calculationId, revisionNumber);
}

export async function saveGableMetalTileCovering(input: unknown): Promise<MetalTileCoveringSaveResult> {
  const parsed = gableMetalTileCoveringSaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "A mentési adatok hibásak vagy hiányosak." };
  const request = parsed.data;
  const name = request.name?.trim() || "Cserepeslemez-fedés";
  const auth = await getAuthContext();
  if (!auth || !auth.organizations.some((organization) => organization.id === request.organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  const supabase = await createClient();
  let geometryInput: unknown;
  let source: Record<string, unknown>;
  let projectId: string | null = null;
  let roofModelId: string | null = null;
  let sourceRoofRevisionId: string | null = null;

  if (request.scope.kind === "project") {
    projectId = request.scope.projectId;
    roofModelId = request.scope.roofModelId;
    sourceRoofRevisionId = request.scope.roofModelRevisionId;
    const { data: model } = await supabase.from("roof_models").select("id, project_id, roof_type")
      .eq("id", roofModelId).eq("project_id", projectId).eq("organization_id", request.organizationId).eq("roof_type", "gable").maybeSingle();
    const { data: roofRevision } = await supabase.from("roof_model_revisions").select("id, input_data, validation_status, schema_version")
      .eq("id", sourceRoofRevisionId).eq("roof_model_id", roofModelId).eq("organization_id", request.organizationId).maybeSingle();
    if (!model || !roofRevision || roofRevision.validation_status !== "verified" || roofRevision.schema_version !== GABLE_INPUT_SCHEMA_VERSION) {
      return { ok: false, error: "A megadott projekt-tetőrevízió nem érhető el vagy nem támogatott." };
    }
    const parsedGeometry = gableRoofInputSchema.safeParse(roofRevision.input_data);
    if (!parsedGeometry.success) return { ok: false, error: "A forrás tetőrevízió bemenete érvénytelen." };
    geometryInput = parsedGeometry.data;
    const { data: dependencies } = await supabase.from("calculation_dependencies").select("downstream_calculation_revision_id")
      .eq("organization_id", request.organizationId).eq("upstream_roof_model_revision_id", sourceRoofRevisionId).eq("dependency_type", "roof_model_input");
    const revisionIds = (dependencies ?? []).map((item) => item.downstream_calculation_revision_id);
    const { data: linked } = revisionIds.length ? await supabase.from("calculation_revisions").select("id, calculation_id, calculator_implementation_version, input_schema_version, validation_status")
      .in("id", revisionIds).eq("organization_id", request.organizationId).eq("calculator_implementation_version", GABLE_CALCULATOR_VERSION).eq("input_schema_version", GABLE_INPUT_SCHEMA_VERSION).eq("validation_status", "verified") : { data: [] };
    const linkedCalculationIds = (linked ?? []).map((item) => item.calculation_id);
    const { data: roofCalculations } = linkedCalculationIds.length ? await supabase.from("calculations").select("id, project_id, roof_model_id, calculator_type")
      .in("id", linkedCalculationIds).eq("organization_id", request.organizationId).eq("project_id", projectId).eq("roof_model_id", roofModelId).eq("calculator_type", "roof.gable") : { data: [] };
    const calculation = roofCalculations?.[0];
    const linkedRevision = linked?.find((revision) => revision.calculation_id === calculation?.id);
    if (!calculation || !linkedRevision) return { ok: false, error: "A tetőrevízióhoz nem található ellenőrzött, pontos roof.gable forrás." };
    const snapshot = calculateMetalTileSnapshot(geometryInput, request.productInput);
    if (!snapshot) return { ok: false, error: "A cserepeslemez-adatok hiányosak, hibásak vagy nem támogatott kiosztást adnak." };
    source = { mode: "project", projectId, roofModelId, roofModelRevisionId: sourceRoofRevisionId,
      geometryCalculationId: calculation.id, geometryCalculationRevisionId: linkedRevision.id, geometryInput: snapshot.geometryInput };
  } else {
    if (!request.geometryInput) return { ok: false, error: "Az önálló számításhoz add meg a nyeregtető geometriáját." };
    geometryInput = request.geometryInput;
    const snapshot = calculateMetalTileSnapshot(geometryInput, request.productInput);
    if (!snapshot) return { ok: false, error: "A geometria vagy a cserepeslemez-adatok hiányosak, hibásak vagy nem támogatott kiosztást adnak." };
    source = { mode: "standalone", geometrySource: "manual_user_input", geometryInput: snapshot.geometryInput };
  }

  const result = calculateMetalTileSnapshot(source.geometryInput, request.productInput);
  if (!result) return { ok: false, error: "A számítás nem érvényes teljes hosszúságú kiosztás, ezért nem menthető." };
  const scope = request.scope.kind;
  const savedInput = { calculatorType: GABLE_METAL_TILE_COVERING_ID, scope, source, productInput: result.productInput };
  const provenance = {
    geometry: scope === "project" ? "saved_verified_roof_model_revision" : "manual_user_provided",
    productParameters: "user_provided",
    lengthCompatibility: "user_confirmed_from_provided_reference",
    lengthDataSource: result.productInput.lengthDataSource,
    manufacturerCertification: false,
    calculation: "server_recomputed",
  };
  try {
    const saved = await persistGableMetalTileCovering({
      organizationId: request.organizationId, calculationId: request.calculationId, operationId: request.operationId,
      expectedRevisionNumber: request.expectedRevisionNumber, name, projectId, roofModelId, sourceRoofRevisionId,
      input: savedInput, output: { geometry: result.geometry, covering: result.output }, provenance, actorId: auth.userId,
    });
    if (projectId && roofModelId) revalidatePath(`/projektek/${projectId}/tetomodellek/${roofModelId}`);
    return { ok: true, calculationId: saved.calculation_id, revisionId: saved.calculation_revision_id, revisionNumber: saved.revision_number, reused: saved.reused };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    return { ok: false, error: code === "40001" ? "A számítás időközben új revíziót kapott; frissítsd az adatokat." : code === "42501" ? "A forrás vagy a műhely nem érhető el a fiókod számára." : "A cserepeslemez-számítás mentése nem sikerült." };
  }
}

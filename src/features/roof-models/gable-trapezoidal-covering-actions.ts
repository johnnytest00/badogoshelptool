"use server";

import { revalidatePath } from "next/cache";
import { GABLE_TRAPEZOIDAL_COVERING_ID, calculateCoveringSnapshot, gableTrapezoidalCoveringSaveSchema } from "./gable-trapezoidal-covering-persistence";
import { GABLE_CALCULATOR_VERSION, GABLE_INPUT_SCHEMA_VERSION, gableRoofInputSchema } from "@/domain/calculations/gable-roof";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import { persistGableCovering } from "@/infrastructure/supabase/covering-writer";

export type CoveringSaveResult = { ok: boolean; error?: string; calculationId?: string; revisionId?: string; revisionNumber?: number; reused?: boolean };

export async function saveGableTrapezoidalCovering(input: unknown): Promise<CoveringSaveResult> {
  const parsed = gableTrapezoidalCoveringSaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "A mentési adatok hibásak vagy hiányosak." };
  const request = parsed.data;
  const auth = await getAuthContext();
  if (!auth || !auth.organizations.some((organization) => organization.id === request.organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };
  const supabase = await createClient();
  let source: Record<string, unknown>;
  let provenance: Record<string, unknown>;

  if (request.scope.kind === "project") {
    const { data: model } = await supabase.from("roof_models").select("id, project_id, roof_type").eq("id", request.scope.roofModelId).eq("project_id", request.scope.projectId).eq("organization_id", request.organizationId).eq("roof_type", "gable").maybeSingle();
    const { data: roofRevision } = await supabase.from("roof_model_revisions").select("id, input_data, validation_status, schema_version").eq("id", request.scope.roofModelRevisionId).eq("roof_model_id", request.scope.roofModelId).eq("organization_id", request.organizationId).maybeSingle();
    if (!model || !roofRevision || roofRevision.validation_status !== "verified" || roofRevision.schema_version !== GABLE_INPUT_SCHEMA_VERSION) return { ok: false, error: "A megadott projekt-tetőrevízió nem érhető el vagy nem támogatott." };
    const geometryInput = gableRoofInputSchema.safeParse(roofRevision.input_data);
    if (!geometryInput.success) return { ok: false, error: "A forrás tetőrevízió bemenete érvénytelen." };
    // Resolve an exact roof calculation dependency without accepting a client-supplied geometry output.
    const { data: dependencies } = await supabase.from("calculation_dependencies").select("downstream_calculation_revision_id").eq("organization_id", request.organizationId).eq("upstream_roof_model_revision_id", request.scope.roofModelRevisionId).eq("dependency_type", "roof_model_input");
    const revisionIds = (dependencies ?? []).map((item) => item.downstream_calculation_revision_id);
    const { data: linked } = revisionIds.length ? await supabase.from("calculation_revisions").select("id, calculation_id, calculator_implementation_version, input_schema_version, validation_status").in("id", revisionIds).eq("organization_id", request.organizationId).eq("calculator_implementation_version", GABLE_CALCULATOR_VERSION).eq("input_schema_version", GABLE_INPUT_SCHEMA_VERSION).eq("validation_status", "verified") : { data: [] };
    const selected = linked?.[0];
    const { data: calculation } = selected ? await supabase.from("calculations").select("id, project_id, roof_model_id, calculator_type").eq("id", selected.calculation_id).eq("organization_id", request.organizationId).eq("project_id", request.scope.projectId).eq("roof_model_id", request.scope.roofModelId).eq("calculator_type", "roof.gable").maybeSingle() : { data: null };
    if (!calculation) return { ok: false, error: "A tetőrevízióhoz nem található ellenőrzött, pontos roof.gable forrás." };
    const result = calculateCoveringSnapshot(geometryInput.data, request.coveringInput);
    if (!result) return { ok: false, error: "A fedési bemenet hibás vagy nem támogatott, ezért nem menthető." };
    source = { mode: "project", projectId: request.scope.projectId, roofModelId: request.scope.roofModelId, roofModelRevisionId: request.scope.roofModelRevisionId, geometryCalculationId: calculation.id, geometryCalculationRevisionId: selected!.id, geometryInput: result.geometryInput };
    provenance = { geometry: "saved_verified_roof_model_revision", coveringParameters: "user_provided", calculation: "server_recomputed", professionalApproval: false };
  } else {
    const result = calculateCoveringSnapshot(request.geometryInput, request.coveringInput);
    if (!result) return { ok: false, error: "A geometria vagy a fedési bemenet hibás vagy nem támogatott, ezért nem menthető." };
    source = { mode: "standalone", geometrySource: "manual_user_input", geometryInput: result.geometryInput };
    provenance = { geometry: "manual_user_provided", coveringParameters: "user_provided", calculation: "server_recomputed", professionalApproval: false };
  }
  const geometryInput = source.geometryInput;
  const result = calculateCoveringSnapshot(geometryInput, request.coveringInput);
  if (!result) return { ok: false, error: "A számítás nem menthető." };
  const savedInput = { calculatorType: GABLE_TRAPEZOIDAL_COVERING_ID, scope: request.scope.kind, source, coveringInput: result.coveringInput };
  let saved;
  try {
    saved = await persistGableCovering({
      organizationId: request.organizationId, calculationId: request.calculationId, operationId: request.operationId,
      expectedRevisionNumber: request.expectedRevisionNumber, name: request.name,
      projectId: request.scope.kind === "project" ? request.scope.projectId : null,
      roofModelId: request.scope.kind === "project" ? request.scope.roofModelId : null,
      sourceRoofRevisionId: request.scope.kind === "project" ? request.scope.roofModelRevisionId : null,
      input: savedInput, output: { geometry: result.geometry, covering: result.output }, provenance, actorId: auth.userId,
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    return { ok: false, error: code === "40001" ? "A számítás időközben új revíziót kapott; frissítsd az adatokat." : code === "42501" ? "A forrás vagy a műhely nem érhető el a fiókod számára." : "A fedési számítás mentése nem sikerült." };
  }
  if (request.scope.kind === "project") revalidatePath(`/projektek/${request.scope.projectId}/tetomodellek/${request.scope.roofModelId}`);
  return { ok: true, calculationId: saved.calculation_id, revisionId: saved.calculation_revision_id, revisionNumber: saved.revision_number, reused: saved.reused };
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/features/auth/auth.server";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { createGableCoveringTakeoffDraft } from "@/infrastructure/supabase/gable-covering-takeoff-writer";
import { getGableTrapezoidalCovering } from "./gable-trapezoidal-covering-data";
import { deriveGableCoveringTakeoffQuantity } from "@/domain/material-takeoffs/gable-covering-transfer";

const requestSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  calculationId: z.string().uuid(),
  revisionId: z.string().uuid(),
  variantId: z.string().uuid(),
  operationId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
});

export type GableCoveringTakeoffResult = Readonly<{
  ok: boolean;
  code?: "INVALID_REQUEST" | "UNAUTHORIZED" | "SOURCE_NOT_FOUND" | "INVALID_SOURCE" | "UNSUPPORTED_LAYOUT" | "INCOMPATIBLE_MAPPING" | "REVISION_CONFLICT" | "NETWORK_ERROR";
  error?: string;
  takeoffId?: string;
  takeoffItemId?: string;
  created?: boolean;
  staleSource?: boolean;
  takeoffUrl?: string;
  source?: Readonly<{ calculationId: string; revisionId: string; revisionNumber: number; roofModelId: string; roofModelRevisionId: string }>;
}>;

function failure(code: NonNullable<GableCoveringTakeoffResult["code"]>, error: string): GableCoveringTakeoffResult {
  return { ok: false, code, error };
}

export async function createGableCoveringTakeoffAction(rawRequest: unknown): Promise<GableCoveringTakeoffResult> {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return failure("INVALID_REQUEST", "Az átadási kérés hiányos vagy hibás.");
  const request = parsed.data;
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === request.organizationId)) {
    return failure("UNAUTHORIZED", "Ehhez a műhelyhez nincs hozzáférésed.");
  }
  const project = await getProjectForOrganization(request.organizationId, request.projectId);
  if (!project) return failure("UNAUTHORIZED", "A projekt nem érhető el ebben a műhelyben.");

  const saved = await getGableTrapezoidalCovering(request.organizationId, request.calculationId);
  if (!saved || saved.projectId !== request.projectId || !saved.roofModelId) {
    return failure("SOURCE_NOT_FOUND", "A mentett projektfedési számítás nem található.");
  }
  const revision = saved.revisions.find((item) => item.revisionId === request.revisionId);
  if (!revision) return failure("SOURCE_NOT_FOUND", "A kiválasztott fedési változat nem található vagy nem olvasható.");
  const derived = deriveGableCoveringTakeoffQuantity(revision.input, revision.output);
  if (!derived.ok) return failure(derived.code ?? "INVALID_SOURCE", derived.error ?? "A kiválasztott fedési változat nem adható át.");
  const source = {
    calculationId: saved.calculationId,
    revisionId: revision.revisionId,
    revisionNumber: revision.revisionNumber,
    roofModelId: saved.roofModelId,
    roofModelRevisionId: derived.source!.roofModelRevisionId,
  };

  try {
    const result = await createGableCoveringTakeoffDraft({
      organizationId: request.organizationId,
      projectId: request.projectId,
      calculationId: request.calculationId,
      revisionId: request.revisionId,
      variantId: request.variantId,
      name: request.name,
      operationId: request.operationId,
      actorId: auth.userId,
    });
    revalidatePath(`/projektek/${request.projectId}/anyagkimutatas`);
    return {
      ok: true,
      takeoffId: result.takeoff_id,
      takeoffItemId: result.takeoff_item_id,
      created: result.draft_created,
      staleSource: result.stale_source,
      takeoffUrl: `/projektek/${request.projectId}/anyagkimutatas?takeoff=${result.takeoff_id}`,
      source,
    };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "22023") return failure("INCOMPATIBLE_MAPPING", "A kiválasztott termékegység, méret vagy fedési kiosztás nem támogatott.");
    if (code === "40001") return failure("REVISION_CONFLICT", "A forrás vagy a céladat időközben megváltozott. Frissítsd az adatokat, majd indíts új átadást.");
    if (code === "42501") return failure("UNAUTHORIZED", "A projekt, forrásváltozat vagy anyagváltozat nem érhető el a fiókod számára.");
    if (code === "P0002") return failure("SOURCE_NOT_FOUND", "A pontos mentett forrásváltozat már nem érhető el.");
    return failure("NETWORK_ERROR", "Az átadás eredménye bizonytalan. Azonos műveletazonosítóval biztonságosan újrapróbálható.");
  }
}

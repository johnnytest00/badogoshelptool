"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/features/auth/auth.server";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { createGableMetalTileTakeoffDraft } from "@/infrastructure/supabase/gable-metal-tile-takeoff-writer";
import { getGableMetalTileCovering } from "./gable-metal-tile-covering-data";
import { deriveGableMetalTileTakeoff } from "@/domain/material-takeoffs/gable-metal-tile-transfer";

const requestSchema = z.object({
  organizationId: z.string().uuid(), projectId: z.string().uuid(), calculationId: z.string().uuid(),
  revisionId: z.string().uuid(), variantId: z.string().uuid(), operationId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
});
export type GableMetalTileTakeoffResult = Readonly<{
  ok: boolean; code?: "INVALID_REQUEST" | "UNAUTHORIZED" | "SOURCE_NOT_FOUND" | "INVALID_SOURCE" | "UNSUPPORTED_LAYOUT" | "INCOMPATIBLE_MAPPING" | "REVISION_CONFLICT" | "NETWORK_ERROR";
  error?: string; takeoffId?: string; takeoffItemId?: string; created?: boolean; staleSource?: boolean; takeoffUrl?: string;
  source?: Readonly<{ calculationId: string; revisionId: string; revisionNumber: number; roofModelId: string; roofModelRevisionId: string }>;
}>;
const failure = (code: NonNullable<GableMetalTileTakeoffResult["code"]>, error: string): GableMetalTileTakeoffResult => ({ ok: false, code, error });

export async function createGableMetalTileTakeoffAction(rawRequest: unknown): Promise<GableMetalTileTakeoffResult> {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return failure("INVALID_REQUEST", "Az átadási kérés hiányos vagy hibás.");
  const request = parsed.data;
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === request.organizationId)) return failure("UNAUTHORIZED", "Ehhez a műhelyhez nincs hozzáférésed.");
  const project = await getProjectForOrganization(request.organizationId, request.projectId);
  if (!project) return failure("UNAUTHORIZED", "A projekt nem érhető el ebben a műhelyben.");
  const saved = await getGableMetalTileCovering(request.organizationId, request.calculationId);
  if (!saved || saved.projectId !== request.projectId || !saved.roofModelId) return failure("SOURCE_NOT_FOUND", "A mentett projekt-cserepeslemez-számítás nem található.");
  const revision = saved.revisions.find((item) => item.revisionId === request.revisionId);
  if (!revision) return failure("SOURCE_NOT_FOUND", "A kiválasztott cserepeslemez-revízió nem található vagy nem olvasható.");
  const transfer = deriveGableMetalTileTakeoff(revision.input, revision.output);
  if (!transfer.ok) return failure(transfer.code ?? "INVALID_SOURCE", transfer.error ?? "A mentett forrás nem adható át.");
  try {
    const result = await createGableMetalTileTakeoffDraft({ ...request, actorId: auth.userId });
    revalidatePath(`/projektek/${request.projectId}/anyagkimutatas`);
    return { ok: true, takeoffId: result.takeoff_id, takeoffItemId: result.takeoff_item_id,
      created: result.draft_created, staleSource: result.stale_source,
      takeoffUrl: `/projektek/${request.projectId}/anyagkimutatas?takeoff=${result.takeoff_id}`,
      source: { calculationId: saved.calculationId, revisionId: revision.revisionId, revisionNumber: revision.revisionNumber,
        roofModelId: saved.roofModelId, roofModelRevisionId: transfer.source!.roofModelRevisionId } };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "22023") return failure("INCOMPATIBLE_MAPPING", "A katalógusvariáns vagy a mentett modulméret nem egyezik a forrással. Frissítsd a katalógust, vagy válassz kompatibilis, db egységű variánst.");
    if (code === "40001") return failure("REVISION_CONFLICT", "A forrás vagy a céladat időközben megváltozott. Frissítsd az adatokat, majd próbáld újra.");
    if (code === "42501") return failure("UNAUTHORIZED", "A projekt, forrásrevízió vagy anyagváltozat nem érhető el a fiókod számára.");
    if (code === "P0002") return failure("SOURCE_NOT_FOUND", "A pontos mentett forrásrevízió már nem érhető el.");
    return failure("NETWORK_ERROR", "Az átadás eredménye bizonytalan. Azonos műveletazonosítóval biztonságosan újrapróbálható.");
  }
}

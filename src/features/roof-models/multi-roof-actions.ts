"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculateRoofGeometry, roofGeometryInputSchema } from "@/domain/calculations/roof-geometry";
import { getAuthContext } from "@/features/auth/auth.server";
import { persistRoofGeometry, persistStandaloneRoofGeometry } from "@/infrastructure/supabase/roof-geometry-writer";

const saveSchema = z.object({
  organizationId: z.string().uuid(), projectId: z.string().uuid(), roofModelId: z.string().uuid(), operationId: z.string().uuid(),
  expectedRevisionNumber: z.number().int().nonnegative(), name: z.string().trim().min(1).max(200),
  input: roofGeometryInputSchema,
});

export async function saveMultiRoofAction(raw: unknown): Promise<{ ok: boolean; error?: string; roofModelId?: string; revisionNumber?: number }> {
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success || parsed.data.input.type === "gable") return { ok: false, error: "Érvénytelen tetőgeometriai adatok." };
  const request = parsed.data;
  const auth = await getAuthContext();
  if (!auth || !auth.organizations.some((organization) => organization.id === request.organizationId)) return { ok: false, error: "A műhelyhez nincs hozzáférésed." };
  try {
    const output = calculateRoofGeometry(request.input);
    const saved = await persistRoofGeometry({ ...request, output, actorId: auth.userId });
    revalidatePath(`/projektek/${request.projectId}`);
    revalidatePath(`/projektek/${request.projectId}/tetomodellek/${saved.roof_model_id}`);
    return { ok: true, roofModelId: saved.roof_model_id, revisionNumber: saved.revision_number };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "40001") return { ok: false, error: "A tetőmodell időközben megváltozott. Töltsd újra az oldalt." };
    return { ok: false, error: "A tetőmodell mentése nem sikerült." };
  }
}

const standaloneSaveSchema = z.object({
  organizationId: z.string().uuid(), calculationId: z.string().uuid(), operationId: z.string().uuid(),
  expectedRevisionNumber: z.number().int().nonnegative(), name: z.string().trim().min(1).max(200),
  input: roofGeometryInputSchema,
});

export async function saveStandaloneMultiRoofAction(raw: unknown): Promise<{ ok: boolean; error?: string; calculationId?: string; revisionNumber?: number }> {
  const parsed = standaloneSaveSchema.safeParse(raw);
  if (!parsed.success || parsed.data.input.type === "gable") return { ok: false, error: "Érvénytelen tetőgeometriai adatok." };
  const request = parsed.data;
  const auth = await getAuthContext();
  if (!auth || !auth.organizations.some((organization) => organization.id === request.organizationId)) return { ok: false, error: "A műhelyhez nincs hozzáférésed." };
  try {
    const output = calculateRoofGeometry(request.input);
    const saved = await persistStandaloneRoofGeometry({ ...request, output, actorId: auth.userId });
    revalidatePath("/kalkulatorok/nyeregteto");
    return { ok: true, calculationId: saved.calculation_id, revisionNumber: saved.revision_number };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "40001") return { ok: false, error: "A számítás időközben megváltozott. Töltsd újra az oldalt." };
    return { ok: false, error: "A tetőgeometria mentése nem sikerült." };
  }
}

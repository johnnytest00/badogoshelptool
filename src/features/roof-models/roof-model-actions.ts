"use server";

import { revalidatePath } from "next/cache";
import { gableRoofInputSchema, calculateGableRoof } from "@/domain/calculations/gable-roof";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { persistGableRoof } from "@/infrastructure/supabase/gable-roof-writer";

export type RoofModelActionResult = {
  ok: boolean;
  error?: string;
  roofModelId?: string;
  fieldErrors?: Record<string, string>;
};

function text(data: FormData, key: string): string { return String(data.get(key) ?? "").trim(); }
function uuid(value: string): string | null { return /^[0-9a-f-]{36}$/i.test(value) ? value : null; }
function number(data: FormData, key: string): number | undefined {
  const value = text(data, key);
  if (!value) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validationResult(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }): RoofModelActionResult {
  const fieldErrors = Object.fromEntries(Object.entries(error.flatten().fieldErrors).flatMap(([key, value]) => value?.[0] ? [[key, value[0]]] : []));
  return { ok: false, error: "Ellenőrizd a megjelölt mezőket.", fieldErrors };
}

export async function saveGableRoofAction(formData: FormData): Promise<RoofModelActionResult> {
  const organizationId = uuid(text(formData, "organizationId"));
  const projectId = uuid(text(formData, "projectId"));
  const roofModelId = uuid(text(formData, "roofModelId"));
  const operationId = uuid(text(formData, "operationId"));
  const newRoofModelId = uuid(text(formData, "newRoofModelId"));
  if (!organizationId || !projectId) return { ok: false, error: "Érvénytelen projektazonosító." };
  if (!operationId || (!roofModelId && !newRoofModelId)) return { ok: false, error: "Érvénytelen mentési művelet." };
  const auth = await getAuthContext();
  if (!auth) return { ok: false, error: "A munkamenet lejárt. Jelentkezz be újra." };
  if (!auth.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };

  const inputMode = text(formData, "inputMode");
  const rawInput = {
    inputMode,
    buildingLengthMm: number(formData, "buildingLengthMm"),
    buildingWidthMm: number(formData, "buildingWidthMm"),
    roofRiseMm: inputMode === "height" ? number(formData, "roofRiseMm") : undefined,
    roofPitchDegrees: inputMode === "angle" ? number(formData, "roofPitchDegrees") : undefined,
    eaveOverhangMm: number(formData, "eaveOverhangMm"),
    frontGableOverhangMm: number(formData, "frontGableOverhangMm"),
    rearGableOverhangMm: number(formData, "rearGableOverhangMm"),
  };
  const parsed = gableRoofInputSchema.safeParse(rawInput);
  if (!parsed.success) return validationResult(parsed.error);
  const name = text(formData, "name");
  if (!name) return { ok: false, error: "A tetőmodell neve kötelező.", fieldErrors: { name: "Adj nevet a tetőmodellnek." } };
  const expectedRevision = Number(text(formData, "expectedRevisionNumber") || "0");
  const output = calculateGableRoof(parsed.data);
  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase.from("projects").select("id").eq("id", projectId).eq("organization_id", organizationId).maybeSingle();
  if (projectError || !project) return { ok: false, error: "A projekt nem található ebben a műhelyben." };

  let saved: Awaited<ReturnType<typeof persistGableRoof>>;
  try {
    saved = await persistGableRoof({ organizationId, projectId, roofModelId: roofModelId ?? newRoofModelId!, operationId,
      expectedRevisionNumber: expectedRevision, name, input: parsed.data, output,
      provenance: { input: "user_provided", output: "verified", verifiedBy: "server_calculation" }, actorId: auth.userId });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "40001") return { ok: false, error: "A tetőmodell időközben megváltozott; töltsd újra az oldalt." };
    return { ok: false, error: "A tetőmodell mentése nem sikerült." };
  }
  revalidatePath(`/projektek/${projectId}`);
  revalidatePath(`/projektek/${projectId}/tetomodellek/${saved.roof_model_id}`);
  revalidatePath(`/projektek/${projectId}/tetomodellek/uj`);
  return { ok: true, roofModelId: saved.roof_model_id };
}

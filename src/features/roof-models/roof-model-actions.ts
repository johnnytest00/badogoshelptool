"use server";

import { revalidatePath } from "next/cache";
import { gableRoofInputSchema, calculateGableRoof } from "@/domain/calculations/gable-roof";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import type { Json } from "@/infrastructure/supabase/database.types";

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
  if (!organizationId || !projectId) return { ok: false, error: "Érvénytelen projektazonosító." };
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

  const { data, error } = await supabase.rpc("save_gable_roof_calculation", {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_roof_model_id: (roofModelId ?? null) as unknown as string,
    p_name: name,
    p_input_data: parsed.data,
    p_output_data: output as unknown as Json,
    p_data_provenance: { input: "user_provided", output: "verified", verifiedBy: "server_calculation" },
    p_warnings: [],
    p_expected_revision_number: expectedRevision,
  });
  if (error || !data?.[0]) {
    if (error?.code === "40001") return { ok: false, error: "A tetőmodell időközben megváltozott; töltsd újra az oldalt." };
    return { ok: false, error: "A tetőmodell mentése nem sikerült." };
  }
  const saved = data[0];
  revalidatePath(`/projektek/${projectId}`);
  revalidatePath(`/projektek/${projectId}/tetomodellek/${saved.roof_model_id}`);
  revalidatePath(`/projektek/${projectId}/tetomodellek/uj`);
  return { ok: true, roofModelId: saved.roof_model_id };
}

"use server";

import { revalidatePath } from "next/cache";
import { executeCalculator } from "@/domain/calculations/engine";
import { gutterMaterialCalculator, gutterMaterialInputSchema } from "@/domain/calculations/gutter-material";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/infrastructure/supabase/database.types";

export type GutterSaveResult = { ok: boolean; error?: string; revisionNumber?: number };
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

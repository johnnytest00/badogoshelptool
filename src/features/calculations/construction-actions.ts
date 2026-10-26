"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DEMO_MATERIAL_PROFILES, type MaterialProfile } from "@/domain/calculations/roof-material-spec";
import { getAuthContext } from "@/features/auth/auth.server";
import { loadConstructionCalculatorDefinition } from "@/features/calculators/construction-calculator-loading";
import {
  computeConstruction, constructionCalculatorType, constructionInputSnapshotSchema, constructionOutputSnapshot, isSaveableComputation,
  isSaveableConstructionCalculator, materialStateFromSnapshot, usesMaterialInputs,
} from "@/features/calculators/construction-computation";
import { getCalculatorMaterialProfiles } from "@/features/materials/material-data";
import { listRafterCutTransferSources, type RafterCutTransferSource } from "./construction-data";
import { persistStandaloneConstructionCalculation } from "@/infrastructure/supabase/construction-calculation-writer";

const saveSchema = z.object({
  organizationId: z.string().uuid(), calculationId: z.string().uuid(), operationId: z.string().uuid(),
  expectedRevisionNumber: z.number().int().nonnegative(), name: z.string().trim().min(1).max(200),
  input: constructionInputSnapshotSchema,
  /** M10 Fázis 0: the source revision whose HAP/ridge-connection fields were copied in, recorded as a calculation_dependencies row. */
  sourceCalculationRevisionId: z.string().uuid().optional(),
});

/** Saved roof.rafter-cut calculations offered for "Adatok átvétele" in roof.material-takeoff/roof.timber-cutlist. */
export async function listRafterCutTransferSourcesAction(organizationId: string): Promise<readonly RafterCutTransferSource[]> {
  if (!z.string().uuid().safeParse(organizationId).success) return [];
  return listRafterCutTransferSources(organizationId);
}

export type ConstructionSaveResult = { ok: true; calculationId: string; revisionId: string; revisionNumber: number } | { ok: false; error: string; conflict?: boolean };

/** The browser sends only the input; the authoritative output is recomputed here with the same engines. */
export async function saveConstructionCalculationAction(raw: unknown): Promise<ConstructionSaveResult> {
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "A mentendő kalkuláció adatai hiányosak vagy hibásak." };
  const request = parsed.data;
  const calculatorId = request.input.calculatorId;
  if (!isSaveableConstructionCalculator(calculatorId)) return { ok: false, error: "Ez a kalkulátor még nem menthető." };
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === request.organizationId)) return { ok: false, error: "Ehhez a műhelyhez nincs hozzáférésed." };

  const definition = await loadConstructionCalculatorDefinition(calculatorId);
  if (!definition) return { ok: false, error: "Ez a kalkulátor még nem menthető." };
  const knownKeys = new Set(definition.fields.map((field) => field.key));
  if (Object.keys(request.input.fields).some((key) => !knownKeys.has(key))) return { ok: false, error: "A kalkuláció ismeretlen mezőt tartalmaz." };
  if (usesMaterialInputs(calculatorId) !== (request.input.material !== null)) return { ok: false, error: "A kalkuláció anyagadatai hiányosak vagy feleslegesek." };
  if (request.sourceCalculationRevisionId && calculatorId !== "roof.material-takeoff" && calculatorId !== "roof.timber-cutlist") return { ok: false, error: "Ehhez a kalkulátorhoz nem vehető át adat." };

  const material = materialStateFromSnapshot(request.input);
  let profiles: readonly MaterialProfile[] = DEMO_MATERIAL_PROFILES;
  if (material) {
    const catalog = await getCalculatorMaterialProfiles(request.organizationId).catch(() => null);
    const needsCatalog = Object.values(material.specs).some((spec) => spec.mode === "product" && spec.profileId !== null && !DEMO_MATERIAL_PROFILES.some((profile) => profile.id === spec.profileId));
    if (!catalog && needsCatalog) return { ok: false, error: "Az Anyagkezelő termékei most nem tölthetők be, ezért a kiválasztott termékkel nem menthető. Próbáld újra később." };
    profiles = [...(catalog ?? []), ...DEMO_MATERIAL_PROFILES];
  }
  const computation = computeConstruction(definition, request.input.fields, material, profiles);
  if (!isSaveableComputation(computation)) return { ok: false, error: computation.error ?? (computation.completeness.status === "invalid" ? computation.completeness.reasons[0] : undefined) ?? "Csak teljes, kiszámítható eredmény menthető." };

  try {
    const saved = await persistStandaloneConstructionCalculation({
      organizationId: request.organizationId, calculationId: request.calculationId, operationId: request.operationId,
      expectedRevisionNumber: request.expectedRevisionNumber, calculatorType: constructionCalculatorType(calculatorId), name: request.name,
      input: request.input, output: constructionOutputSnapshot(calculatorId, computation), actorId: auth.userId,
      sourceCalculationRevisionId: request.sourceCalculationRevisionId,
    });
    revalidatePath("/kalkulatorok/mentett");
    return { ok: true, calculationId: saved.calculation_id, revisionId: saved.calculation_revision_id, revisionNumber: saved.revision_number };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "40001") return { ok: false, conflict: true, error: "A számítás időközben új revíziót kapott. Töltsd be az aktuális változatot, majd ments újra." };
    if (code === "42501") return { ok: false, error: "A számítás vagy a műhely nem érhető el a fiókod számára." };
    if (code === "22023") return { ok: false, error: "A számítás adatai nem felelnek meg a mentési feltételeknek." };
    return { ok: false, error: "A számítás mentése nem sikerült. Az eredmény nincs mentve; próbáld újra." };
  }
}

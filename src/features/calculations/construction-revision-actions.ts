"use server";

import { z } from "zod";
import { getConstructionRevisionPage, type ConstructionRevisionPage } from "./construction-data";

const pageSchema = z.object({
  organizationId: z.string().uuid(),
  calculationId: z.string().uuid(),
  beforeRevisionNumber: z.number().int().positive().optional(),
});

export type ConstructionRevisionPageResult = { ok: true; data: ConstructionRevisionPage } | { ok: false; error: string };

/** Server-side cursor boundary for the history picker; RLS and organization checks remain in the data loader. */
export async function loadConstructionRevisionPageAction(raw: unknown): Promise<ConstructionRevisionPageResult> {
  const parsed = pageSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "A revíziólista kérése hibás." };
  try {
    const page = await getConstructionRevisionPage(parsed.data.organizationId, parsed.data.calculationId, parsed.data.beforeRevisionNumber);
    return page ? { ok: true, data: page } : { ok: false, error: "A kalkuláció vagy a revíziólista nem érhető el." };
  } catch {
    return { ok: false, error: "A régebbi revíziók most nem tölthetők be. Próbáld újra." };
  }
}

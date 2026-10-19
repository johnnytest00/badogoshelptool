"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { userFacingActionError } from "@/lib/user-facing-action-error";

export type LaborRateResult = { ok: true } | { ok: false; error: string };
type Rpc = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>> | null; error: { code?: string } | null }> };
const uuid = z.string().uuid();
const createInput = z.object({
  organizationId: uuid, requestKey: uuid, name: z.string().trim().min(1, "Add meg a szabály nevét.").max(120),
  basis: z.enum(["roof_area_m2", "run_length_m"]), priceClass: z.enum(["net", "gross"]),
  rateAmount: z.string().trim().regex(/^\d{1,12}(?:[.,]\d{1,2})?$/, "A díj HUF-ban, legfeljebb két tizedesjeggyel adható meg.").transform((v) => v.replace(",", ".")),
});
const reviseInput = createInput.extend({ rateId: uuid });
const archiveInput = z.object({ organizationId: uuid, rateId: uuid });

async function allowed(organizationId: string) {
  const auth = await getAuthContext();
  return Boolean(auth?.organizations.some((o) => o.id === organizationId && (o.role === "owner" || o.role === "admin")));
}
const fail = (error: { code?: string } | null): string => error?.code === "42501" ? "Munkadíj-szabályt csak tulajdonos vagy adminisztrátor kezelhet."
  : error?.code === "22023" ? "A szabály adatai érvénytelenek, vagy eltérnek egy korábbi kéréstől." : userFacingActionError(error, "A művelet nem sikerült.");

export async function createLaborRateAction(raw: z.input<typeof createInput>): Promise<LaborRateResult> {
  const parsed = createInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ellenőrizd a szabály adatait." };
  const i = parsed.data;
  if (!await allowed(i.organizationId)) return { ok: false, error: "Munkadíj-szabályt csak tulajdonos vagy adminisztrátor kezelhet." };
  const db = await createClient() as unknown as Rpc;
  const { data, error } = await db.rpc("create_organization_labor_rate", { p_organization_id: i.organizationId, p_name: i.name, p_basis: i.basis, p_rate_amount: i.rateAmount, p_price_class: i.priceClass, p_request_key: i.requestKey });
  if (error || !data?.[0]) return { ok: false, error: fail(error) };
  revalidatePath("/beallitasok/munkadij"); revalidatePath("/ajanlatok");
  return { ok: true };
}

export async function archiveLaborRateAction(raw: z.input<typeof archiveInput>): Promise<LaborRateResult> {
  const parsed = archiveInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Érvénytelen szabály." };
  if (!await allowed(parsed.data.organizationId)) return { ok: false, error: "Munkadíj-szabályt csak tulajdonos vagy adminisztrátor kezelhet." };
  const db = await createClient() as unknown as Rpc;
  const { data, error } = await db.rpc("archive_organization_labor_rate", { p_organization_id: parsed.data.organizationId, p_rate_id: parsed.data.rateId });
  if (error || !data?.[0]) return { ok: false, error: fail(error) };
  revalidatePath("/beallitasok/munkadij"); revalidatePath("/ajanlatok");
  return { ok: true };
}

/** "Editing" a rate = atomic, idempotent replacement: a new immutable rate, the old one archived. Applied quotation lines keep their stored rate snapshot. */
export async function reviseLaborRateAction(raw: z.input<typeof reviseInput>): Promise<LaborRateResult> {
  const parsed = reviseInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ellenőrizd a szabály adatait." };
  const i = parsed.data;
  if (!await allowed(i.organizationId)) return { ok: false, error: "Munkadíj-szabályt csak tulajdonos vagy adminisztrátor kezelhet." };
  const db = await createClient() as unknown as Rpc;
  const { data, error } = await db.rpc("revise_organization_labor_rate", { p_organization_id: i.organizationId, p_rate_id: i.rateId, p_name: i.name, p_basis: i.basis, p_rate_amount: i.rateAmount, p_price_class: i.priceClass, p_request_key: i.requestKey });
  if (error || !data?.[0]) return { ok: false, error: fail(error) };
  revalidatePath("/beallitasok/munkadij"); revalidatePath("/ajanlatok");
  return { ok: true };
}

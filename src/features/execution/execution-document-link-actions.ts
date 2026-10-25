"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { userFacingActionError } from "@/lib/user-facing-action-error";

export type DocumentLinkResult = { ok: true; planId?: string; created?: boolean } | { ok: false; error: string };
type Rpc = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>> | null; error: { code?: string; message?: string } | null }> };

const uuid = z.string().uuid();
const documentKind = z.enum(["material_list", "quotation", "calculation"]);
/** For a calculation, documentId is the exact saved revision. */
const linkInput = z.object({ organizationId: uuid, planId: uuid, kind: documentKind, documentId: uuid, requestKey: uuid });
const unlinkInput = z.object({ organizationId: uuid, linkId: uuid, planId: uuid, kind: documentKind, documentId: uuid });
const createInput = z.object({ organizationId: uuid, title: z.string().trim().min(1).max(200), kind: documentKind, documentId: uuid, planRequestKey: uuid, linkRequestKey: uuid });

async function allowed(organizationId: string) {
  const auth = await getAuthContext();
  return Boolean(auth?.organizations.some((organization) => organization.id === organizationId));
}

function failure(error: { code?: string; message?: string } | null, fallback: string): string {
  if (error?.code === "42501" && error.message?.includes("calculation")) return "Csak a saját, mentett kalkulációd kapcsolható munkanaplóhoz.";
  if (error?.code === "42501") return "Nincs hozzáférésed ehhez a munkanaplóhoz vagy dokumentumhoz.";
  if (error?.code === "23505") return "Ez a dokumentum már ehhez a munkanaplóhoz tartozik.";
  if (error?.code === "22023") return "A kapcsolat adatai nem egyeznek egy korábbi kéréssel. Töltsd újra az oldalt, és próbáld újra.";
  return userFacingActionError(error, fallback);
}

function revalidate(planId: string, kind: z.infer<typeof documentKind>, documentId: string) {
  revalidatePath("/kivitelezes"); revalidatePath(`/kivitelezes/${planId}`);
  revalidatePath(kind === "material_list" ? `/anyaglistak/${documentId}` : kind === "quotation" ? `/ajanlatok/${documentId}` : "/kalkulatorok");
}

export async function linkExecutionPlanDocumentAction(raw: z.input<typeof linkInput>): Promise<DocumentLinkResult> {
  const parsed = linkInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Válassz érvényes munkanaplót és dokumentumot." };
  const input = parsed.data;
  if (!await allowed(input.organizationId)) return { ok: false, error: "Nincs hozzáférésed ehhez a műhelyhez." };
  const db = await createClient() as unknown as Rpc;
  const { data, error } = await db.rpc("link_execution_plan_document", {
    p_organization_id: input.organizationId, p_execution_plan_id: input.planId, p_document_kind: input.kind,
    p_document_id: input.documentId, p_request_key: input.requestKey,
  });
  if (error || !data?.[0]) return { ok: false, error: failure(error, "A kapcsolás nem sikerült. Azonos választással biztonságosan újrapróbálható.") };
  revalidate(input.planId, input.kind, input.documentId);
  return { ok: true, planId: input.planId, created: data[0].created === true };
}

export async function unlinkExecutionPlanDocumentAction(raw: z.input<typeof unlinkInput>): Promise<DocumentLinkResult> {
  const parsed = unlinkInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Érvénytelen kapcsolat." };
  const input = parsed.data;
  if (!await allowed(input.organizationId)) return { ok: false, error: "Nincs hozzáférésed ehhez a műhelyhez." };
  const db = await createClient() as unknown as Rpc;
  const { data, error } = await db.rpc("unlink_execution_plan_document", { p_organization_id: input.organizationId, p_link_id: input.linkId });
  if (error || !data?.[0]) return { ok: false, error: failure(error, "A leválasztás nem sikerült.") };
  revalidate(input.planId, input.kind, input.documentId);
  return { ok: true, planId: input.planId };
}

/** Creates a standalone work log (no project) and links the document to it; both steps are idempotent per request key. */
export async function createExecutionPlanAndLinkDocumentAction(raw: z.input<typeof createInput>): Promise<DocumentLinkResult> {
  const parsed = createInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Adj meg egy érvényes munkanapló-nevet." };
  const input = parsed.data;
  if (!await allowed(input.organizationId)) return { ok: false, error: "Nincs hozzáférésed ehhez a műhelyhez." };
  const db = await createClient() as unknown as Rpc;
  const plan = await db.rpc("create_execution_plan", {
    p_organization_id: input.organizationId, p_project_id: null, p_title: input.title, p_description: null,
    p_source_quotation_id: null, p_source_revision_id: null, p_request_key: input.planRequestKey,
  });
  const planId = plan.data?.[0]?.plan_id;
  if (plan.error || typeof planId !== "string") return { ok: false, error: failure(plan.error, "A munkanapló létrehozása nem sikerült.") };
  const link = await db.rpc("link_execution_plan_document", {
    p_organization_id: input.organizationId, p_execution_plan_id: planId, p_document_kind: input.kind,
    p_document_id: input.documentId, p_request_key: input.linkRequestKey,
  });
  if (link.error || !link.data?.[0]) return { ok: false, error: `A munkanapló elkészült, de a kapcsolás nem sikerült: ${failure(link.error, "próbáld újra ugyanazzal a gombbal")}` };
  revalidate(planId, input.kind, input.documentId);
  return { ok: true, planId, created: true };
}

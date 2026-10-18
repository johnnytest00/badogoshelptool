"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/features/auth/auth.server";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getWorkflowMaterialLists } from "@/features/material-takeoffs/material-preparation-data";
import { getQuotationsForMaterialLists } from "@/features/material-takeoffs/material-list-links";
import { emptyQuotationDocumentDraft } from "@/domain/quotations/document-readiness";
import { quotationLinesFromMaterialList } from "./material-list-quotation-import";
import { saveStandaloneQuotationDraftAction } from "./standalone-quotation-actions";

export type MaterialListQuotationResult =
  | { ok: true; quotationId: string; created: boolean; unpricedLines: number; totalLines: number }
  | { ok: false; error: string };

const input = z.object({
  organizationId: z.string().uuid(),
  listId: z.string().uuid(),
  operationId: z.string().uuid(),
  /** Explicitly request another draft even though one already exists for this exact list revision. */
  allowAdditional: z.boolean().default(false),
});

/**
 * Creates a real standalone DRAFT quotation from the current revision of a material list using the
 * same line import and save RPC as the quotation editor. Prices are carried over only where the list
 * holds a verified snapshot; everything else stays explicitly missing. Never finalises the quotation.
 */
export async function createQuotationDraftFromMaterialListAction(raw: z.input<typeof input>): Promise<MaterialListQuotationResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Az anyaglista vagy a mentési azonosító érvénytelen." };
  const { organizationId, listId, operationId, allowAdditional } = parsed.data;
  const auth = await getAuthContext();
  if (!auth) return { ok: false, error: "Jelentkezz be az ajánlat létrehozásához." };
  if (!auth.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Nincs jogosultságod ehhez a műhelyhez." };
  const [lists, products] = await Promise.all([getWorkflowMaterialLists(organizationId, listId), getMaterialProductsForOrganization(organizationId)]);
  const list = lists[0];
  const revision = list?.currentRevision;
  if (!list || !revision || !list.currentRevisionId) return { ok: false, error: "Az anyaglista nem található, vagy nem érhető el." };
  if (!revision.items.length) return { ok: false, error: "Az anyaglistában még nincs tétel, ezért nem készíthető belőle ajánlat." };

  if (!allowAdditional) {
    const existing = (await getQuotationsForMaterialLists(organizationId, [list.id])).get(list.id)?.find((quotation) => quotation.sourceListVersion === revision.revisionNumber);
    if (existing) return { ok: true, quotationId: existing.quotationId, created: false, unpricedLines: 0, totalLines: revision.items.length };
  }

  const lines = quotationLinesFromMaterialList(revision, products);
  const form = new FormData();
  form.set("organizationId", organizationId);
  form.set("operationId", operationId);
  form.set("version", "0");
  form.set("name", `${list.name} – ajánlata`.slice(0, 200));
  form.set("clientId", "");
  form.set("lines", JSON.stringify(lines));
  form.set("materialListId", list.id);
  form.set("materialRevisionId", list.currentRevisionId);
  form.set("document", JSON.stringify(emptyQuotationDocumentDraft()));
  const saved = await saveStandaloneQuotationDraftAction(form);
  if (!saved.ok) return { ok: false, error: saved.error };
  revalidatePath("/ajanlatok");
  revalidatePath(`/anyaglistak/${list.id}`);
  return { ok: true, quotationId: saved.data.quotation_id, created: true, unpricedLines: lines.filter((line) => !line.unitPrice).length, totalLines: lines.length };
}

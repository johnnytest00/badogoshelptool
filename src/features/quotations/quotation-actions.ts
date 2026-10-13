"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { quotationDraftSchema, type QuotationLine } from "@/domain/quotations/contracts";
import { lineTotal, scaledToDecimal, sumMoney } from "@/domain/quotations/money";

export type QuotationActionResult = { ok: boolean; error?: string; quotationId?: string };
export type QuotationFinalizeResult = { ok: boolean; error?: string; quotationId?: string; revisionId?: string };
export type QuotationStatusActionResult = { ok: boolean; error?: string; quotationId?: string; eventId?: string };
type LooseQuery = { select: (columns: string) => LooseQuery; eq: (column: string, value: string | null) => LooseQuery; maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> };
const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export async function saveQuotationDraftAction(data: FormData): Promise<QuotationActionResult> {
  const organizationId = text(data, "organizationId");
  const projectId = text(data, "projectId");
  const quotationId = text(data, "quotationId") || null;
  const currentVersion = Number(text(data, "version") || "0");
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Nincs jogosultságod ehhez a műhelyhez." };
  let rawLines: unknown;
  try { rawLines = JSON.parse(text(data, "lines") || "[]"); } catch { return { ok: false, error: "A tételek formátuma érvénytelen." }; }
  const parsed = quotationDraftSchema.safeParse({ name: text(data, "name"), clientId: text(data, "clientId"), currency: "HUF", lines: rawLines });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ellenőrizd az ajánlati adatokat." };
  const draft = parsed.data;
  const priceClasses = new Set(draft.lines.map((line) => line.priceClass));
  if (priceClasses.size > 1) return { ok: false, error: "Nettó és bruttó tételek nem keverhetők ugyanabban az összesítésben." };
  const supabase = await createClient();
  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ quotation_id: string }> | null; error: { code?: string; message?: string } | null }> };
  const lineSnapshots: Array<Record<string, unknown>> = [];
  for (const [index, line] of draft.lines.entries()) {
    const material = line.variantId ? await loadMaterialSnapshot(supabase, organizationId, line) : null;
    if (line.type === "MATERIAL" && !material) return { ok: false, error: `A(z) ${index + 1}. anyagtételhez érvényes katalógusváltozat szükséges.` };
    const takeoff = line.takeoffItemId ? await loadTakeoffSnapshot(supabase, organizationId, projectId, line.takeoffItemId) : null;
    if (line.takeoffItemId && !takeoff) return { ok: false, error: `A(z) ${index + 1}. forrás csak jóváhagyott, azonos projekthez tartozó kimutatásból importálható.` };
    const total = lineTotal(line.quantity, line.unitPrice);
    lineSnapshots.push({ ...line, quantity: line.quantity.replace(",", "."), unitPrice: line.unitPrice.replace(",", "."), lineTotal: scaledToDecimal(total.minor, 2), materialSnapshot: material, takeoffSnapshot: takeoff });
  }
  const subtotal = sumMoney(lineSnapshots.map((line) => lineTotal(String(line.quantity), String(line.unitPrice))));
  const [projectResponse, clientResponse] = await Promise.all([
    supabase.from("projects").select("name, location, description").eq("id", projectId).eq("organization_id", organizationId).maybeSingle(),
    draft.clientId ? supabase.from("clients").select("name, email, phone, billing_address").eq("id", draft.clientId).eq("organization_id", organizationId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!projectResponse.data) return { ok: false, error: "A projektdokumentum pillanatképe nem tölthető be." };
  const documentSnapshot = {
    project: projectResponse.data,
    client: clientResponse.data ? { name: clientResponse.data.name, email: clientResponse.data.email, phone: clientResponse.data.phone, billingAddress: clientResponse.data.billing_address } : null,
  };
  const categorySubtotal = (type: QuotationLine["type"]) => scaledToDecimal(sumMoney(lineSnapshots.filter((line) => line.type === type).map((line) => lineTotal(String(line.quantity), String(line.unitPrice)))).minor, 2);
  const totalsSnapshot = { priceClass: [...priceClasses][0] ?? null, subtotal: scaledToDecimal(subtotal.minor, 2), materialSubtotal: categorySubtotal("MATERIAL"), laborSubtotal: categorySubtotal("LABOR"), otherSubtotal: categorySubtotal("OTHER"), currency: "HUF", complete: draft.lines.every((line) => line.unitPrice !== "") };
  const snapshot = { name: draft.name, clientId: draft.clientId || null, currency: "HUF", priceClass: [...priceClasses][0] ?? null, lines: lineSnapshots, documentSnapshot, precision: { quantityScale: 6, moneyScale: 2, rounding: "half_up" } };
  const { data: result, error } = await db.rpc("save_quotation_draft", { p_organization_id: organizationId, p_project_id: projectId, p_quotation_id: quotationId, p_name: draft.name, p_client_id: draft.clientId || null, p_currency: "HUF", p_input_snapshot: snapshot, p_line_items_snapshot: lineSnapshots, p_totals_snapshot: totalsSnapshot, p_subtotal: scaledToDecimal(subtotal.minor, 2), p_expected_version: currentVersion });
  if (error || !result?.[0]) return { ok: false, error: error?.code === "40001" ? "Az ajánlat időközben megváltozott; töltsd újra az oldalt." : error?.message ?? "Az ajánlat mentése nem sikerült." };
  revalidatePath(`/projektek/${projectId}/ajanlatok`);
  return { ok: true, quotationId: result[0].quotation_id };
}

export async function finalizeQuotationAction(data: FormData): Promise<QuotationFinalizeResult> {
  const organizationId = text(data, "organizationId");
  const projectId = text(data, "projectId");
  const quotationId = text(data, "quotationId");
  const revisionId = text(data, "revisionId");
  const expectedVersion = Number(text(data, "version") || "0");
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Nincs jogosultságod ehhez a műhelyhez." };
  if (!quotationId || !revisionId || !Number.isInteger(expectedVersion)) return { ok: false, error: "A véglegesítéshez hiányos adatok érkeztek." };
  const supabase = await createClient();
  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ quotation_id: string; revision_id: string }> | null; error: { code?: string; message?: string } | null }> };
  const { data: result, error } = await db.rpc("finalize_quotation", { p_organization_id: organizationId, p_project_id: projectId, p_quotation_id: quotationId, p_revision_id: revisionId, p_expected_version: expectedVersion });
  if (error || !result?.[0]) {
    const message = error?.code === "40001" ? "Az ajánlat időközben megváltozott; töltsd újra az oldalt." : error?.code === "55000" ? "Ez az ajánlat már véglegesítve van, vagy már nem módosítható." : error?.message ?? "A véglegesítés nem sikerült.";
    return { ok: false, error: message };
  }
  revalidatePath(`/projektek/${projectId}/ajanlatok`);
  return { ok: true, quotationId: result[0].quotation_id, revisionId: result[0].revision_id };
}

export async function duplicateFinalizedQuotationAction(data: FormData): Promise<QuotationActionResult> {
  const organizationId = text(data, "organizationId");
  const projectId = text(data, "projectId");
  const quotationId = text(data, "quotationId");
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Nincs jogosultságod ehhez a műhelyhez." };
  const supabase = await createClient();
  const db = supabase as unknown as { from: (table: string) => LooseQuery; rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ quotation_id: string }> | null; error: { message?: string } | null }> };
  const { data: quote } = await db.from("quotations").select("id, name, client_id, status, current_revision_id, finalized_revision_id, project_id").eq("id", quotationId).eq("organization_id", organizationId).eq("project_id", projectId).maybeSingle();
  if (!quote || quote.status !== "finalized" || typeof quote.finalized_revision_id !== "string") return { ok: false, error: "Csak véglegesített, ehhez a projekthez tartozó ajánlat másolható." };
  const { data: revision } = await db.from("quotation_revisions").select("input_snapshot, line_items_snapshot, totals_snapshot, subtotal, currency").eq("id", quote.finalized_revision_id).eq("quotation_id", String(quote.id)).eq("organization_id", organizationId).maybeSingle();
  if (!revision) return { ok: false, error: "A véglegesített revízió nem található." };
  const snapshot = revision.input_snapshot;
  const { data: result, error } = await db.rpc("save_quotation_draft", { p_organization_id: organizationId, p_project_id: projectId, p_quotation_id: null, p_name: `${String(quote.name)} · új piszkozat`, p_client_id: typeof quote.client_id === "string" ? quote.client_id : null, p_currency: String(revision.currency), p_input_snapshot: snapshot, p_line_items_snapshot: revision.line_items_snapshot, p_totals_snapshot: revision.totals_snapshot, p_subtotal: revision.subtotal, p_expected_version: 0 });
  if (error || !result?.[0]) return { ok: false, error: error?.message ?? "A piszkozat létrehozása nem sikerült." };
  revalidatePath(`/projektek/${projectId}/ajanlatok`);
  return { ok: true, quotationId: result[0].quotation_id };
}

export async function transitionQuotationStatusAction(data: FormData): Promise<QuotationStatusActionResult> {
  const organizationId = text(data, "organizationId");
  const projectId = text(data, "projectId");
  const quotationId = text(data, "quotationId");
  const targetStatus = text(data, "targetStatus");
  const expectedVersion = Number(text(data, "version") || "0");
  const note = text(data, "note") || null;
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) return { ok: false, error: "Nincs jogosultságod ehhez a műhelyhez." };
  if (!quotationId || !["sent", "accepted", "rejected"].includes(targetStatus) || !Number.isInteger(expectedVersion)) return { ok: false, error: "A státuszváltáshoz hiányos adatok érkeztek." };
  const supabase = await createClient();
  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ quotation_id: string; event_id: string }> | null; error: { code?: string; message?: string } | null }> };
  const { data: result, error } = await db.rpc("transition_quotation_status", { p_organization_id: organizationId, p_project_id: projectId, p_quotation_id: quotationId, p_target_status: targetStatus, p_expected_version: expectedVersion, p_note: note });
  if (error || !result?.[0]) {
    const message = error?.code === "40001" ? "Az ajánlat időközben megváltozott; töltsd újra az oldalt." : error?.code === "55000" ? "Az ajánlat jelenlegi állapotából ez a művelet nem végezhető el." : error?.message ?? "A státusz mentése nem sikerült.";
    return { ok: false, error: message };
  }
  revalidatePath(`/projektek/${projectId}/ajanlatok`);
  return { ok: true, quotationId: result[0].quotation_id, eventId: result[0].event_id };
}

async function loadMaterialSnapshot(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, line: QuotationLine) {
  const { data: variant } = await supabase.from("material_variants").select("id, product_id, name, sku, purchasing_unit, data_provenance").eq("id", line.variantId ?? "").eq("organization_id", organizationId).maybeSingle();
  if (!variant) return null;
  const { data: product } = await supabase.from("material_products").select("id, name, category, status").eq("id", variant.product_id).eq("organization_id", organizationId).maybeSingle();
  if (!product || product.status !== "active") return null;
  let price = null;
  if (line.priceId) { const response = await supabase.from("material_prices").select("id, amount, currency, purchasing_unit, price_kind, effective_date, data_provenance").eq("id", line.priceId).eq("variant_id", variant.id).eq("organization_id", organizationId).maybeSingle(); price = response.data; if (!price) return null; }
  return { variantId: variant.id, productId: product.id, productName: product.name, category: product.category, variantName: variant.name, sku: variant.sku, purchasingUnit: variant.purchasing_unit, provenance: variant.data_provenance, price: price ? { id: price.id, amount: String(price.amount), currency: price.currency, purchasingUnit: price.purchasing_unit, priceKind: price.price_kind, effectiveDate: price.effective_date, provenance: price.data_provenance } : null };
}

async function loadTakeoffSnapshot(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, projectId: string, itemId: string) {
  const { data } = await supabase.from("material_takeoff_items").select("id, takeoff_id, final_quantity, quantity_unit, material_snapshot, price_snapshot, material_takeoffs!inner(project_id, status)").eq("id", itemId).eq("organization_id", organizationId).eq("material_takeoffs.project_id", projectId).eq("material_takeoffs.status", "approved").maybeSingle();
  return data ? { id: data.id, takeoffId: data.takeoff_id, quantity: String(data.final_quantity), unit: data.quantity_unit, materialSnapshot: data.material_snapshot, priceSnapshot: data.price_snapshot } : null;
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { quotationDraftSchema, type QuotationLine } from "@/domain/quotations/contracts";
import { lineTotal, scaledToDecimal, sumMoney } from "@/domain/quotations/money";

export type QuotationActionResult = { ok: boolean; error?: string; quotationId?: string };
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
  const snapshot = { name: draft.name, clientId: draft.clientId || null, currency: "HUF", priceClass: [...priceClasses][0] ?? null, lines: lineSnapshots, precision: { quantityScale: 6, moneyScale: 2, rounding: "half_up" } };
  const { data: result, error } = await db.rpc("save_quotation_draft", { p_organization_id: organizationId, p_project_id: projectId, p_quotation_id: quotationId, p_name: draft.name, p_client_id: draft.clientId || null, p_currency: "HUF", p_input_snapshot: snapshot, p_line_items_snapshot: lineSnapshots, p_totals_snapshot: { priceClass: [...priceClasses][0] ?? null, subtotal: scaledToDecimal(subtotal.minor, 2), currency: "HUF", complete: draft.lines.every((line) => line.unitPrice !== "") }, p_subtotal: scaledToDecimal(subtotal.minor, 2), p_expected_version: currentVersion });
  if (error || !result?.[0]) return { ok: false, error: error?.code === "40001" ? "Az ajánlat időközben megváltozott; töltsd újra az oldalt." : error?.message ?? "Az ajánlat mentése nem sikerült." };
  revalidatePath(`/projektek/${projectId}/ajanlatok`);
  return { ok: true, quotationId: result[0].quotation_id };
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

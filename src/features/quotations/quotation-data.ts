import { createClient } from "@/infrastructure/supabase/server";
import { getMaterialProductsForOrganization, type MaterialVariantRecord } from "@/features/materials/material-data";

export type QuotationRecord = { id: string; name: string; version: number; clientId: string | null; currentRevisionId: string | null; status: "draft"; lines: Array<Record<string, unknown>>; subtotal: string | null; priceClass: "net" | "gross" | null; currency: string; revisions: Array<{ id: string; number: number; createdAt: string; subtotal: string | null }> };
type QuotationQuery = { select: (columns: string) => QuotationQuery; eq: (column: string, value: string) => QuotationQuery; order: (column: string, options: { ascending: boolean }) => Promise<{ data: Array<{ id: string; name: string; version: number; client_id: string | null; current_revision_id: string | null; status: "draft"; currency: string }> | null; error: { message: string } | null }> };

export async function getQuotationWorkspace(organizationId: string, projectId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as { from: (table: string) => QuotationQuery };
  const [{ data: clients }, { data: quotations, error }, variants, { data: takeoffItems }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("organization_id", organizationId).order("name"),
    db.from("quotations").select("id, name, version, client_id, current_revision_id, status, currency").eq("organization_id", organizationId).eq("project_id", projectId).order("updated_at", { ascending: false }),
    getMaterialProductsForOrganization(organizationId),
    supabase.from("material_takeoff_items").select("id, final_quantity, quantity_unit, material_snapshot, material_takeoffs!inner(project_id, status)").eq("organization_id", organizationId).eq("material_takeoffs.project_id", projectId).eq("material_takeoffs.status", "approved"),
  ]);
  if (error) throw new Error("Az ajánlatok betöltése nem sikerült.");
  const records: QuotationRecord[] = [];
  for (const quote of quotations ?? []) {
    const { data: revisions } = await db.from("quotation_revisions").select("id, revision_number, line_items_snapshot, subtotal, price_class, currency, created_at, totals_snapshot").eq("organization_id", organizationId).eq("quotation_id", quote.id).order("revision_number", { ascending: false }) as { data: Array<{ id: string; revision_number: number; line_items_snapshot: unknown; subtotal: string | number | null; price_class: "net" | "gross" | null; currency: string; created_at: string; totals_snapshot: unknown }> | null };
    const current = (revisions ?? []).find((revision) => revision.id === quote.current_revision_id);
    records.push({ id: quote.id, name: quote.name, version: quote.version, clientId: quote.client_id, currentRevisionId: quote.current_revision_id, status: quote.status, lines: Array.isArray(current?.line_items_snapshot) ? current.line_items_snapshot as Array<Record<string, unknown>> : [], subtotal: current?.subtotal ? String(current.subtotal) : null, priceClass: current?.price_class ?? null, currency: quote.currency, revisions: (revisions ?? []).map((revision) => ({ id: revision.id, number: revision.revision_number, createdAt: revision.created_at, subtotal: revision.subtotal ? String(revision.subtotal) : null })) });
  }
  return { clients: clients ?? [], quotations: records, variants: variants.flatMap((product) => product.variants), takeoffItems: (takeoffItems ?? []).map((item) => ({ id: item.id, quantity: String(item.final_quantity), unit: item.quantity_unit, materialSnapshot: item.material_snapshot })) };
}

export type QuotationVariant = MaterialVariantRecord;

import { createClient } from "@/infrastructure/supabase/server";
import { getMaterialProductsForOrganization, type MaterialVariantRecord } from "@/features/materials/material-data";
import type { QuotationStatus } from "@/domain/quotations/status";

export type { QuotationStatus } from "@/domain/quotations/status";

export type QuotationStatusEvent = { id: string; fromStatus: QuotationStatus; toStatus: QuotationStatus; eventAt: string; actedBy: string | null; note: string | null; finalizedRevisionId: string | null };
export type QuotationRecord = { id: string; name: string; version: number; clientId: string | null; clientName: string | null; currentRevisionId: string | null; finalizedRevisionId: string | null; finalizedAt: string | null; status: QuotationStatus; createdAt: string; updatedAt: string; lines: Array<Record<string, unknown>>; subtotal: string | null; priceClass: "net" | "gross" | null; currency: string; statusEvents: QuotationStatusEvent[]; revisions: Array<{ id: string; number: number; createdAt: string; subtotal: string | null }> };
type QuotationQuery = { select: (columns: string) => QuotationQuery; eq: (column: string, value: string) => QuotationQuery; order: (column: string, options: { ascending: boolean }) => Promise<{ data: Array<{ id: string; name: string; version: number; client_id: string | null; current_revision_id: string | null; finalized_revision_id: string | null; finalized_at: string | null; status: "draft" | "finalized"; currency: string; created_at: string; updated_at: string }> | null; error: { message: string } | null }> };

export async function getQuotationWorkspace(organizationId: string, projectId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as { from: (table: string) => QuotationQuery };
  const [{ data: clients, error: clientsError }, { data: quotations, error }, variants, { data: takeoffItems, error: takeoffItemsError }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("organization_id", organizationId).order("name"),
    db.from("quotations").select("id, name, version, client_id, current_revision_id, finalized_revision_id, finalized_at, status, currency, created_at, updated_at").eq("organization_id", organizationId).eq("project_id", projectId).order("updated_at", { ascending: false }),
    getMaterialProductsForOrganization(organizationId),
    supabase.from("material_takeoff_items").select("id, final_quantity, quantity_unit, material_snapshot, material_takeoffs!inner(project_id, status)").eq("organization_id", organizationId).eq("material_takeoffs.project_id", projectId).eq("material_takeoffs.status", "approved"),
  ]);
  if (error) throw new Error("Az ajánlatok betöltése nem sikerült.");
  if (clientsError) throw new Error("Az ügyféllista betöltése nem sikerült.");
  if (takeoffItemsError) throw new Error("A jóváhagyott anyagforrások betöltése nem sikerült.");
  const records: QuotationRecord[] = [];
  for (const quote of quotations ?? []) {
    const revisionResponse = await db.from("quotation_revisions").select("id, revision_number, line_items_snapshot, subtotal, price_class, currency, created_at, totals_snapshot").eq("organization_id", organizationId).eq("quotation_id", quote.id).order("revision_number", { ascending: false }) as { data: Array<{ id: string; revision_number: number; line_items_snapshot: unknown; subtotal: string | number | null; price_class: "net" | "gross" | null; currency: string; created_at: string; totals_snapshot: unknown }> | null; error: { message: string } | null };
    if (revisionResponse.error) throw new Error("Az ajánlati revíziók betöltése nem sikerült.");
    const revisions = revisionResponse.data;
    const current = (revisions ?? []).find((revision) => revision.id === quote.current_revision_id);
    const statusResponse = await db.from("quotation_status_events").select("id, from_status, to_status, event_at, acted_by, note, finalized_revision_id").eq("organization_id", organizationId).eq("quotation_id", quote.id).order("event_at", { ascending: true }) as unknown as { data: Array<{ id: string; from_status: QuotationStatus; to_status: QuotationStatus; event_at: string; acted_by: string | null; note: string | null; finalized_revision_id: string | null }> | null; error: { message: string } | null };
    if (statusResponse.error) throw new Error("Az ajánlat státusztörténete nem tölthető be.");
    const statusEvents = statusResponse.data;
    records.push({ id: quote.id, name: quote.name, version: quote.version, clientId: quote.client_id, clientName: (clients ?? []).find((client) => client.id === quote.client_id)?.name ?? null, currentRevisionId: quote.current_revision_id, finalizedRevisionId: quote.finalized_revision_id, finalizedAt: quote.finalized_at, status: quote.status, createdAt: quote.created_at, updatedAt: quote.updated_at, lines: Array.isArray(current?.line_items_snapshot) ? current.line_items_snapshot as Array<Record<string, unknown>> : [], subtotal: current?.subtotal != null ? String(current.subtotal) : null, priceClass: current?.price_class ?? null, currency: quote.currency, statusEvents: (statusEvents ?? []).map((event) => ({ id: event.id, fromStatus: event.from_status, toStatus: event.to_status, eventAt: event.event_at, actedBy: event.acted_by, note: event.note, finalizedRevisionId: event.finalized_revision_id })), revisions: (revisions ?? []).map((revision) => ({ id: revision.id, number: revision.revision_number, createdAt: revision.created_at, subtotal: revision.subtotal != null ? String(revision.subtotal) : null })) });
  }
  return { clients: clients ?? [], quotations: records, variants: variants.flatMap((product) => product.variants), takeoffItems: (takeoffItems ?? []).map((item) => ({ id: item.id, quantity: String(item.final_quantity), unit: item.quantity_unit, materialSnapshot: item.material_snapshot })) };
}

export type QuotationVariant = MaterialVariantRecord;

"use server";

import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { quotationDraftSchema, type QuotationLine } from "@/domain/quotations/contracts";
import { validateStandaloneLines } from "@/domain/quotations/standalone";
import { userFacingActionError } from "@/lib/user-facing-action-error";

export type StandaloneQuotationResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "NOT_FOUND" | "CATALOG_SOURCE" | "LIFECYCLE" | "INTERNAL"; error: string };

type SavedDraft = { quotation_id: string; revision_id: string; revision_number: number; revision_created: boolean; totals_snapshot: Record<string, unknown> };
type RevisionRow = { id: string; quotation_id: string; revision_number: number; currency: string; price_class: "net" | "gross" | null; input_snapshot: unknown; line_items_snapshot: unknown; subtotal: string | number | null; totals_snapshot: Record<string, unknown>; created_at: string; created_by: string };
const formText = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const failure = <T>(code: Extract<StandaloneQuotationResult<T>, { ok: false }>["code"], error: string): StandaloneQuotationResult<T> => ({ ok: false, code, error });
const classify = (error: { code?: string; message?: string } | null, fallback: string) => {
  if (error?.code === "42501") return { code: "FORBIDDEN" as const, error: "Nincs jogosultságod ehhez az önálló ajánlathoz." };
  if (error?.code === "40001") return { code: "CONFLICT" as const, error: "Az ajánlat időközben megváltozott. Töltsd újra, majd próbáld újra a mentést." };
  if (error?.code === "23503") return { code: "NOT_FOUND" as const, error: "Az ajánlat vagy a kiválasztott adatforrás nem található." };
  if (error?.code === "55000") return { code: "LIFECYCLE" as const, error: "Ez az ajánlat az aktuális állapotában nem módosítható." };
  if (error?.code === "22023") return { code: "VALIDATION" as const, error: "Ellenőrizd az ajánlat tételeit és pénzügyi adatait." };
  return { code: "INTERNAL" as const, error: userFacingActionError(error, fallback) };
};

async function authorizeOrganization(organizationId: string) {
  const auth = await getAuthContext();
  if (!auth) return { auth: null, allowed: false };
  return { auth, allowed: auth.organizations.some((organization) => organization.id === organizationId) };
}

/** The operation UUID must be generated once per logical save and reused for network retries. */
export async function saveStandaloneQuotationDraftAction(form: FormData): Promise<StandaloneQuotationResult<SavedDraft>> {
  const organizationId = formText(form, "organizationId");
  const quotationId = formText(form, "quotationId") || null;
  const operationId = formText(form, "operationId");
  const expectedVersion = Number(formText(form, "version") || "0");
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be az önálló ajánlat mentéséhez.");
  if (!access.allowed) return failure("FORBIDDEN", "Nincs jogosultságod ehhez a műhelyhez.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operationId)
    || (quotationId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quotationId))
    || !Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return failure("VALIDATION", "A mentési azonosító vagy a várt revíziószám érvénytelen.");
  }
  let rawLines: unknown;
  try { rawLines = JSON.parse(formText(form, "lines") || "[]"); } catch { return failure("VALIDATION", "Az ajánlati tételek formátuma érvénytelen."); }
  const parsed = quotationDraftSchema.safeParse({ name: formText(form, "name"), clientId: formText(form, "clientId"), currency: "HUF", lines: rawLines });
  if (!parsed.success) return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Ellenőrizd az ajánlati adatokat.");
  const validation = validateStandaloneLines(parsed.data.lines);
  if (!validation.ok) return failure("VALIDATION", validation.error);
  const lines = validation.lines.map(normalizeLine);

  const supabase = await createClient();
  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: SavedDraft[] | null; error: { code?: string; message?: string } | null }> };
  const { data, error } = await db.rpc("save_standalone_quotation_draft", {
    p_organization_id: organizationId, p_operation_id: operationId, p_quotation_id: quotationId,
    p_name: parsed.data.name, p_client_id: parsed.data.clientId || null,
    p_lines: lines, p_expected_version: expectedVersion,
  });
  if (error || !data?.[0]) {
    const issue = error?.code === "23503" && lines.some((line) => line.variantId || line.priceId)
      ? { code: "CATALOG_SOURCE" as const, error: "A kiválasztott katalógus- vagy árforrás nem érvényes ebben a műhelyben." }
      : classify(error, "Az önálló ajánlat mentése nem sikerült.");
    return failure(issue.code, issue.error);
  }
  return { ok: true, data: data[0] };
}

export async function listStandaloneQuotationsAction(organizationId: string): Promise<StandaloneQuotationResult<Array<Record<string, unknown>>>> {
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be az ajánlatok megtekintéséhez.");
  if (!access.allowed) return failure("FORBIDDEN", "Nincs jogosultságod ehhez a műhelyhez.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("quotations").select("id, name, client_id, current_revision_id, version, status, currency, created_by, created_at, updated_at")
    .eq("organization_id", organizationId).eq("ownership_scope" as never, "standalone" as never).order("updated_at", { ascending: false }).limit(100);
  if (error) return failure("INTERNAL", "Az önálló ajánlatok listája nem tölthető be.");
  return { ok: true, data: (data ?? []) as unknown as Array<Record<string, unknown>> };
}

export async function readStandaloneQuotationAction(organizationId: string, quotationId: string, revisionId?: string): Promise<StandaloneQuotationResult<RevisionRow[]>> {
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be az ajánlat megtekintéséhez.");
  if (!access.allowed) return failure("FORBIDDEN", "Nincs jogosultságod ehhez a műhelyhez.");
  const supabase = await createClient();
  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: RevisionRow[] | null; error: { code?: string; message?: string } | null }> };
  const { data, error } = await db.rpc("get_standalone_quotation_revision", { p_organization_id: organizationId, p_quotation_id: quotationId, p_revision_id: revisionId ?? null });
  if (error) { const issue = classify(error, "Az ajánlati revízió nem tölthető be."); return failure(issue.code, issue.error); }
  if (!data?.length) return failure("NOT_FOUND", "Az ajánlat vagy a kért revízió nem található.");
  return { ok: true, data };
}

/** Returns an authorized catalog snapshot and selected price; clients never supply this snapshot as proof. */
export async function resolveStandaloneQuotationCatalogItemAction(
  organizationId: string, variantId: string, priceId?: string,
): Promise<StandaloneQuotationResult<Record<string, unknown>>> {
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be a katalógus megnyitásához.");
  if (!access.allowed) return failure("FORBIDDEN", "Nincs jogosultságod ehhez a műhelyhez.");
  const supabase = await createClient();
  const { data: variant } = await supabase.from("material_variants").select("id, product_id, name, sku, purchasing_unit, data_provenance")
    .eq("id", variantId).eq("organization_id", organizationId).maybeSingle();
  if (!variant) return failure("CATALOG_SOURCE", "A katalógusváltozat nem található ebben a műhelyben.");
  const { data: product } = await supabase.from("material_products").select("id, name, category, status")
    .eq("id", variant.product_id).eq("organization_id", organizationId).maybeSingle();
  if (!product || product.status !== "active") return failure("CATALOG_SOURCE", "A katalógustermék nem elérhető.");
  let priceSnapshot: Record<string, unknown> | null = null;
  if (priceId) {
    const { data: price } = await supabase.from("material_prices").select("id, amount, currency, purchasing_unit, price_kind, effective_date, data_provenance")
      .eq("id", priceId).eq("variant_id", variant.id).eq("organization_id", organizationId).maybeSingle();
    if (!price || price.currency !== "HUF" || price.purchasing_unit !== variant.purchasing_unit) return failure("CATALOG_SOURCE", "A kiválasztott árforrás érvénytelen vagy nem HUF pénznemű.");
    priceSnapshot = { id: price.id, amount: String(price.amount), currency: price.currency, purchasingUnit: price.purchasing_unit, priceKind: price.price_kind, effectiveDate: price.effective_date, provenance: price.data_provenance };
  }
  return { ok: true, data: { variantId: variant.id, productId: product.id, productName: product.name, category: product.category, variantName: variant.name, sku: variant.sku, purchasingUnit: variant.purchasing_unit, provenance: variant.data_provenance, price: priceSnapshot, manualPriceOverride: !priceId } };
}

export async function validateStandaloneQuotationLinesAction(lines: unknown): Promise<StandaloneQuotationResult<{ lines: QuotationLine[]; subtotal: string; currency: "HUF"; priceClass: string | null }>> {
  const validation = validateStandaloneLines(lines);
  if (!validation.ok) return failure("VALIDATION", validation.error);
  return { ok: true, data: { lines: validation.lines, ...validation.totals } };
}

function normalizeLine(line: QuotationLine): QuotationLine {
  return { ...line, quantity: line.quantity.replace(",", "."), unitPrice: line.unitPrice.replace(",", ".") };
}

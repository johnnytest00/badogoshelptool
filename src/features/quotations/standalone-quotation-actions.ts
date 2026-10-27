"use server";

import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { standaloneQuotationDraftSchema, type QuotationLine } from "@/domain/quotations/contracts";
import { validateStandaloneLines } from "@/domain/quotations/standalone";
import { decimalToScaled } from "@/domain/quotations/money";
import { calculateQuotationFinancialContract } from "@/domain/quotations/financial-contract";
import { userFacingActionError } from "@/lib/user-facing-action-error";
import { z } from "zod";
import { validateQuotationDocumentReadiness, type IssuerDocumentProfile, type QuotationDocumentDraft } from "@/domain/quotations/document-readiness";
import { isCompleteConstructionRevision } from "@/features/calculations/construction-data";

export type StandaloneQuotationResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "NOT_FOUND" | "CATALOG_SOURCE" | "LIFECYCLE" | "INTERNAL"; error: string };

type SavedDraft = { quotation_id: string; revision_id: string; revision_number: number; revision_created: boolean; totals_snapshot: Record<string, unknown> };
type RevisionRow = { id: string; quotation_id: string; revision_number: number; currency: string; price_class: "net" | "gross" | null; input_snapshot: unknown; line_items_snapshot: unknown; subtotal: string | number | null; totals_snapshot: Record<string, unknown>; created_at: string; created_by: string };
const formText = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const nullableText = (value: string) => value.trim() || null;
const documentSchema = z.object({
  recipientSource: z.enum(["manual", "client"]), recipientClientId: z.string().max(36),
  recipientName: z.string().max(200), recipientAddress: z.string().max(500), recipientEmail: z.string().max(320),
  recipientPhone: z.string().max(80), recipientTaxIdentifier: z.string().max(120), reference: z.string().max(120),
  validUntil: z.string().max(10), notes: z.string().max(2000), terms: z.string().max(5000),
});
const issuerProfileSchema = z.object({
  businessName: z.string().trim().max(200), businessAddress: z.string().trim().max(500),
  contactEmail: z.string().trim().max(320).refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "A kapcsolati e-mail-cím formátuma érvénytelen."),
  contactPhone: z.string().trim().max(80), taxIdentifier: z.string().trim().max(120),
});
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
  let rawDocument: unknown;
  try { rawDocument = JSON.parse(formText(form, "document") || "{}"); } catch { return failure("VALIDATION", "Az ajánlat dokumentumadatai érvénytelenek."); }
  const documentResult = documentSchema.safeParse(rawDocument);
  if (!documentResult.success) return failure("VALIDATION", documentResult.error.issues[0]?.message ?? "Ellenőrizd az ajánlati dokumentum adatait.");
  const document = documentResult.data;
  if (document.recipientSource === "client" && (!document.recipientClientId || document.recipientClientId !== formText(form, "clientId"))) {
    return failure("VALIDATION", "Válassz egy műhelyhez tartozó címzettet.");
  }
  if (document.recipientSource === "manual" && formText(form, "clientId")) return failure("VALIDATION", "Kézi címzetthez ne válassz ügyfélrekordot.");
  const parsed = standaloneQuotationDraftSchema.safeParse({ name: formText(form, "name"), clientId: formText(form, "clientId"), currency: "HUF", lines: rawLines });
  if (!parsed.success) return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Ellenőrizd az ajánlati adatokat.");
  const validation = validateStandaloneLines(parsed.data.lines);
  if (!validation.ok) return failure("VALIDATION", validation.error);
  const calculationRevisionId = formText(form, "calculationRevisionId") || null;
  const calculationSourceMap = validation.lines.flatMap((line, quotationLineIndex) => line.calculationSourceKey ? [{ quotationLineIndex, sourceKey: line.calculationSourceKey }] : []);
  // The source key travels separately; the shared draft RPC keeps its existing line contract.
  const lines = validation.lines.map(normalizeLine).map(({ calculationSourceKey, ...line }) => { void calculationSourceKey; return line; });
  const materialListId = formText(form, "materialListId") || null;
  const materialRevisionId = formText(form, "materialRevisionId") || null;
  const sourceLineMap = lines.flatMap((line, quotationLineIndex) => line.sourceMaterialItemId ? [{ materialItemId: line.sourceMaterialItemId, quotationLineIndex }] : []);
  if (Boolean(materialListId) !== Boolean(materialRevisionId)
    || (sourceLineMap.length > 0 && !materialListId)
    || new Set(sourceLineMap.map((source) => source.materialItemId)).size !== sourceLineMap.length) {
    return failure("VALIDATION", "Az anyaglista-forrás és a forrástételek kapcsolata érvénytelen.");
  }
  if ((calculationSourceMap.length > 0 && !calculationRevisionId)
    || (calculationRevisionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(calculationRevisionId))) {
    return failure("VALIDATION", "A kalkulációs forrás és a forrástételek kapcsolata érvénytelen.");
  }
  if (materialListId && (!/^[0-9a-f-]{36}$/i.test(materialListId) || !/^[0-9a-f-]{36}$/i.test(materialRevisionId ?? ""))) {
    return failure("VALIDATION", "A forrás anyaglista vagy revízió azonosítója érvénytelen.");
  }
  if (calculationSourceMap.length > 0 && (!calculationRevisionId || !await isCompleteConstructionRevision(organizationId, calculationRevisionId))) {
    return failure("VALIDATION", "Csak teljes, elérhető kalkulációs revízió használható ajánlati forrásként.");
  }

  const supabase = await createClient();
  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: SavedDraft[] | null; error: { code?: string; message?: string } | null }> };
  const hasMaterialSource = Boolean(materialListId) && sourceLineMap.length > 0;
  const hasCalculationSource = calculationSourceMap.length > 0;
  const rpcName = hasMaterialSource && hasCalculationSource ? "save_standalone_quotation_from_material_list_and_calculation"
    : hasCalculationSource ? "save_standalone_quotation_from_calculation"
      : hasMaterialSource ? "save_standalone_quotation_from_material_list"
        : "save_standalone_quotation_draft_with_document";
  const rpcArgs = {
    p_organization_id: organizationId, p_operation_id: operationId, p_quotation_id: quotationId,
    p_name: parsed.data.name, p_client_id: document.recipientSource === "client" ? document.recipientClientId : null,
    p_lines: lines, p_expected_version: expectedVersion,
    p_document: { ...document, recipientClientId: undefined },
    ...(rpcName === "save_standalone_quotation_from_material_list" ? {
      p_material_list_id: materialListId,
      p_material_revision_id: materialRevisionId,
      p_source_line_map: sourceLineMap,
    } : {}),
    ...(rpcName === "save_standalone_quotation_from_calculation" ? {
      p_calculation_revision_id: calculationRevisionId,
      p_source_line_map: calculationSourceMap,
    } : {}),
    ...(rpcName === "save_standalone_quotation_from_material_list_and_calculation" ? {
      p_material_list_id: materialListId,
      p_material_revision_id: materialRevisionId,
      p_material_source_line_map: sourceLineMap,
      p_calculation_revision_id: calculationRevisionId,
      p_calculation_source_line_map: calculationSourceMap,
    } : {}),
  };
  const { data, error } = await db.rpc(rpcName, rpcArgs);
  if (error || !data?.[0]) {
    const issue = error?.code === "23503" && lines.some((line) => line.variantId || line.priceId)
      ? { code: "CATALOG_SOURCE" as const, error: "A kiválasztott katalógus- vagy árforrás nem érvényes ebben a műhelyben." }
      : hasCalculationSource && /calculation|layout|cut-list/.test(error?.message ?? "")
        ? { code: "VALIDATION" as const, error: "A kalkulációs forrás nem érhető el, vagy a kiválasztott mennyiség nem szerepel a mentett revízióban." }
        : classify(error, "Az önálló ajánlat mentése nem sikerült.");
    return failure(issue.code, issue.error);
  }
  return { ok: true, data: data[0] };
}

export async function getStandaloneQuotationMaterialSourceAction(organizationId: string, quotationId: string, revisionId: string): Promise<StandaloneQuotationResult<{
  materialListId: string; materialRevisionId: string; listName: string; revisionNumber: number;
  currentRevisionId: string | null; currentVersion: number; executionPlanId: string | null;
  sourceLineMap: Array<{ materialItemId: string; quotationLineIndex: number }>;
} | null>> {
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be az ajánlati forrás megnyitásához.");
  if (!access.allowed) return failure("FORBIDDEN", "Nincs jogosultságod ehhez a műhelyhöz.");
  const supabase = await createClient();
  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{
    material_list_id: string; material_revision_id: string; list_name: string; revision_number: number;
    current_revision_id: string | null; current_version: number; execution_plan_id: string | null; source_line_map: unknown;
  }> | null; error: { code?: string; message?: string } | null }> };
  const { data, error } = await db.rpc("get_standalone_quotation_material_source", {
    p_organization_id: organizationId, p_quotation_id: quotationId, p_quotation_revision_id: revisionId,
  });
  if (error) return failure(error.code === "42501" ? "FORBIDDEN" : "INTERNAL", "Az ajánlat anyaglista-forrása nem tölthető be.");
  const row = data?.[0];
  if (!row) return { ok: true, data: null };
  const sourceLineMap = Array.isArray(row.source_line_map) ? row.source_line_map.flatMap((value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
    const record = value as Record<string, unknown>;
    return typeof record.materialItemId === "string" && Number.isInteger(record.quotationLineIndex)
      ? [{ materialItemId: record.materialItemId, quotationLineIndex: Number(record.quotationLineIndex) }] : [];
  }) : [];
  return { ok: true, data: {
    materialListId: row.material_list_id, materialRevisionId: row.material_revision_id, listName: row.list_name,
    revisionNumber: row.revision_number, currentRevisionId: row.current_revision_id, currentVersion: row.current_version,
    executionPlanId: row.execution_plan_id, sourceLineMap,
  } };
}

export type StandaloneDocumentSources = {
  issuer: IssuerDocumentProfile & { organizationName: string };
  canEditIssuer: boolean;
};

export async function getStandaloneDocumentSourcesAction(organizationId: string): Promise<StandaloneQuotationResult<StandaloneDocumentSources>> {
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be az ajánlat adataihoz.");
  const membership = access.auth.organizations.find((organization) => organization.id === organizationId);
  if (!membership) return failure("FORBIDDEN", "Nincs jogosultságod ehhez a műhelyhöz.");
  const supabase = await createClient();
  const { data: organization, error: organizationError } = await supabase.from("organizations")
    .select("name, business_name, business_address, contact_email, contact_phone, tax_identifier")
    .eq("id", organizationId).maybeSingle();
  if (organizationError || !organization) return failure("INTERNAL", "A kibocsátói adatok nem tölthetők be.");
  return { ok: true, data: {
    issuer: { organizationName: organization.name, businessName: organization.business_name, businessAddress: organization.business_address, contactEmail: organization.contact_email, contactPhone: organization.contact_phone, taxIdentifier: organization.tax_identifier },
    canEditIssuer: membership.role === "owner" || membership.role === "admin",
  } };
}

export async function updateStandaloneIssuerProfileAction(organizationId: string, rawProfile: unknown): Promise<StandaloneQuotationResult<IssuerDocumentProfile>> {
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be a kibocsátói adatok mentéséhez.");
  const membership = access.auth.organizations.find((organization) => organization.id === organizationId);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) return failure("FORBIDDEN", "A kibocsátói adatokat csak műhelytulajdonos vagy admin módosíthatja.");
  const parsed = issuerProfileSchema.safeParse(rawProfile);
  if (!parsed.success) return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Ellenőrizd a kibocsátói adatokat.");
  const profile = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").update({
    business_name: nullableText(profile.businessName), business_address: nullableText(profile.businessAddress),
    contact_email: nullableText(profile.contactEmail), contact_phone: nullableText(profile.contactPhone), tax_identifier: nullableText(profile.taxIdentifier),
  }).eq("id", organizationId).select("business_name, business_address, contact_email, contact_phone, tax_identifier").maybeSingle();
  if (error || !data) return failure(error?.code === "42501" ? "FORBIDDEN" : "INTERNAL", error?.code === "42501" ? "A kibocsátói adatokat csak műhelytulajdonos vagy admin módosíthatja." : "A kibocsátói adatok mentése nem sikerült.");
  return { ok: true, data: { businessName: data.business_name, businessAddress: data.business_address, contactEmail: data.contact_email, contactPhone: data.contact_phone, taxIdentifier: data.tax_identifier } };
}

export async function validateStandaloneQuotationDocumentAction(organizationId: string, rawDocument: unknown, quotationId: string | null = null): Promise<StandaloneQuotationResult<ReturnType<typeof validateQuotationDocumentReadiness>>> {
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be az ajánlati adatok ellenőrzéséhez.");
  if (!access.allowed) return failure("FORBIDDEN", "Nincs jogosultságod ehhez a műhelyhöz.");
  const parsed = documentSchema.safeParse(rawDocument);
  if (!parsed.success) return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Ellenőrizd az ajánlati dokumentum adatait.");
  const supabase = await createClient();
  let financial: Parameters<typeof validateQuotationDocumentReadiness>[3];
  let persistedDocumentSnapshot: Record<string, unknown> | null = null;
  let issuerSnapshot: Record<string, unknown> | null = null;
  if (quotationId) {
    const { data: quotation, error } = await supabase.from("quotations")
      .select("id, created_by, ownership_scope, current_revision_id, currency")
      .eq("id", quotationId).eq("organization_id", organizationId).maybeSingle();
    if (error) return failure("INTERNAL", "Az ajánlat revíziójának ellenőrzése nem sikerült.");
    if (!quotation || quotation.ownership_scope !== "standalone" || quotation.created_by !== access.auth.userId) {
      return failure("FORBIDDEN", "Az ajánlat ellenőrzéséhez a saját önálló piszkozatod szükséges.");
    }
    let hasCompleteLines = false;
    let monetaryValuesConsistent = false;
    let priceBasis: "net" | "gross" | null = null;
    let revisionCurrency: string | null = quotation.currency;
    if (quotation.current_revision_id) {
      const { data: revision, error: revisionError } = await supabase.from("quotation_revisions")
        .select("id, revision_number, currency, price_class, subtotal, line_items_snapshot, totals_snapshot, quotation_id, input_snapshot")
        .eq("id", quotation.current_revision_id).eq("quotation_id", quotation.id).eq("organization_id", organizationId).maybeSingle();
      if (revisionError) return failure("INTERNAL", "Az ajánlat pénzügyi pillanatképe nem tölthető be.");
      if (revision) {
        const inputSnapshot = revision.input_snapshot && typeof revision.input_snapshot === "object" && !Array.isArray(revision.input_snapshot)
          ? revision.input_snapshot as Record<string, unknown> : {};
        const savedDocument = inputSnapshot.document && typeof inputSnapshot.document === "object" && !Array.isArray(inputSnapshot.document)
          ? inputSnapshot.document as Record<string, unknown> : null;
        persistedDocumentSnapshot = savedDocument;
        issuerSnapshot = savedDocument?.issuer && typeof savedDocument.issuer === "object" && !Array.isArray(savedDocument.issuer)
          ? savedDocument.issuer as Record<string, unknown> : null;
        revisionCurrency = revision.currency;
        priceBasis = revision.price_class;
        const lines = Array.isArray(revision.line_items_snapshot) ? revision.line_items_snapshot : [];
        const validated = validateStandaloneLines(lines);
        hasCompleteLines = validated.ok && validated.totals.complete && lines.length > 0 && revision.price_class !== null;
        if (validated.ok && revision.subtotal !== null && revision.price_class === validated.totals.priceClass) {
          try {
            const expected = decimalToScaled(String(revision.subtotal), 2);
            const actual = decimalToScaled(validated.totals.subtotal, 2);
            const contract = validated.totals.complete ? calculateQuotationFinancialContract(validated.lines) : null;
            const savedTotals = revision.totals_snapshot && typeof revision.totals_snapshot === "object" && !Array.isArray(revision.totals_snapshot)
              ? revision.totals_snapshot as Record<string, unknown> : null;
            monetaryValuesConsistent = expected === actual && (contract ? contract.priceBasis === revision.price_class : savedTotals?.complete === false);
          } catch { monetaryValuesConsistent = false; }
        }
      }
    }
    financial = {
      hasCurrentRevision: Boolean(quotation.current_revision_id), hasCompleteLines, monetaryValuesConsistent,
      currency: revisionCurrency, priceBasis, taxTreatment: "unresolved",
    };
  } else {
    financial = { hasCurrentRevision: false, hasCompleteLines: false, monetaryValuesConsistent: false, currency: null, priceBasis: null, taxTreatment: "unresolved" };
  }
  const { data: organization, error: organizationError } = await supabase.from("organizations")
    .select("business_name, business_address, contact_email, contact_phone, tax_identifier")
    .eq("id", organizationId).maybeSingle();
  if (organizationError || !organization) return failure("INTERNAL", "A kibocsátói adatok nem tölthetők be.");
  const issuer: IssuerDocumentProfile = {
    businessName: issuerSnapshot ? (typeof issuerSnapshot.businessName === "string" ? issuerSnapshot.businessName : null) : organization.business_name,
    businessAddress: issuerSnapshot ? (typeof issuerSnapshot.businessAddress === "string" ? issuerSnapshot.businessAddress : null) : organization.business_address,
    contactEmail: issuerSnapshot ? (typeof issuerSnapshot.contactEmail === "string" ? issuerSnapshot.contactEmail : null) : organization.contact_email,
    contactPhone: issuerSnapshot ? (typeof issuerSnapshot.contactPhone === "string" ? issuerSnapshot.contactPhone : null) : organization.contact_phone,
    taxIdentifier: issuerSnapshot ? (typeof issuerSnapshot.taxIdentifier === "string" ? issuerSnapshot.taxIdentifier : null) : organization.tax_identifier,
  };
  const document: QuotationDocumentDraft = parsed.data;
  if (document.recipientSource === "client" && document.recipientClientId) {
    const { data: client, error } = await supabase.from("clients").select("name, billing_address, email, phone")
      .eq("id", document.recipientClientId).eq("organization_id", organizationId).maybeSingle();
    if (error) return failure("INTERNAL", "A címzett adatainak ellenőrzése nem sikerült.");
    if (!client) return failure("NOT_FOUND", "A kiválasztott címzett nem található ebben a műhelyben.");
    document.recipientName = client.name; document.recipientAddress = client.billing_address ?? "";
    document.recipientEmail = client.email ?? ""; document.recipientPhone = client.phone ?? "";
  }
  let documentSnapshotMatches = false;
  let validationDocument = document;
  if (persistedDocumentSnapshot) {
    const recipient = persistedDocumentSnapshot.recipient && typeof persistedDocumentSnapshot.recipient === "object" && !Array.isArray(persistedDocumentSnapshot.recipient)
      ? persistedDocumentSnapshot.recipient as Record<string, unknown> : {};
    const saved = {
      recipientSource: recipient.source === "linked_client" ? "client" : "manual",
      recipientClientId: typeof recipient.clientId === "string" ? recipient.clientId : "",
      recipientName: typeof recipient.name === "string" ? recipient.name : "",
      recipientAddress: typeof recipient.address === "string" ? recipient.address : "",
      recipientEmail: typeof recipient.email === "string" ? recipient.email : "",
      recipientPhone: typeof recipient.phone === "string" ? recipient.phone : "",
      recipientTaxIdentifier: typeof recipient.taxIdentifier === "string" ? recipient.taxIdentifier : "",
      reference: typeof persistedDocumentSnapshot.reference === "string" ? persistedDocumentSnapshot.reference : "",
      validUntil: typeof persistedDocumentSnapshot.validUntil === "string" ? persistedDocumentSnapshot.validUntil : "",
      notes: typeof persistedDocumentSnapshot.notes === "string" ? persistedDocumentSnapshot.notes : "",
      terms: typeof persistedDocumentSnapshot.terms === "string" ? persistedDocumentSnapshot.terms : "",
    };
    const snapshotKeys: Array<keyof typeof saved> = saved.recipientSource === "client"
      ? ["recipientSource", "recipientClientId", "reference", "validUntil", "notes", "terms"]
      : Object.keys(saved) as Array<keyof typeof saved>;
    documentSnapshotMatches = snapshotKeys.every((key) => String(document[key]).trim() === saved[key]);
    if (saved.recipientSource === "client") {
      validationDocument = { ...document, recipientName: saved.recipientName, recipientAddress: saved.recipientAddress, recipientEmail: saved.recipientEmail, recipientPhone: saved.recipientPhone, recipientTaxIdentifier: saved.recipientTaxIdentifier };
    }
  }
  financial = { ...financial, documentSnapshotMatches };
  return { ok: true, data: validateQuotationDocumentReadiness(issuer, validationDocument, undefined, financial) };
}

export async function listStandaloneQuotationsAction(organizationId: string): Promise<StandaloneQuotationResult<{ items: Array<Record<string, unknown>>; hasMore: boolean }>> {
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be az ajánlatok megtekintéséhez.");
  if (!access.allowed) return failure("FORBIDDEN", "Nincs jogosultságod ehhez a műhelyhez.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("quotations").select("id, name, client_id, current_revision_id, version, status, currency, created_by, created_at, updated_at")
    .eq("organization_id", organizationId).eq("ownership_scope" as never, "standalone" as never).order("updated_at", { ascending: false }).limit(101);
  if (error) return failure("INTERNAL", "Az önálló ajánlatok listája nem tölthető be.");
  const rows = data ?? [];
  const visibleRows = rows.slice(0, 100);
  const revisionIds = visibleRows.flatMap((row) => row.current_revision_id ? [row.current_revision_id] : []);
  const { data: revisions, error: revisionsError } = revisionIds.length
    ? await supabase.from("quotation_revisions").select("id, subtotal").eq("organization_id", organizationId).in("id", revisionIds)
    : { data: [], error: null };
  if (revisionsError) return failure("INTERNAL", "Az önálló ajánlatok összege nem tölthető be.");
  const totals = new Map((revisions ?? []).map((revision) => [revision.id, revision.subtotal === null ? null : String(revision.subtotal)]));
  return { ok: true, data: { items: visibleRows.map((row) => ({ ...row, subtotal: row.current_revision_id ? totals.get(row.current_revision_id) ?? null : null })) as unknown as Array<Record<string, unknown>>, hasMore: rows.length > 100 } };
}

export async function listStandaloneQuotationRevisionsAction(organizationId: string, quotationId: string): Promise<StandaloneQuotationResult<Array<{ id: string; revisionNumber: number; createdAt: string; subtotal: string | null }>>> {
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be az ajánlat megtekintéséhez.");
  if (!access.allowed) return failure("FORBIDDEN", "Nincs jogosultságod ehhez a műhelyhez.");
  const supabase = await createClient();
  const { data: quotation, error: quotationError } = await supabase.from("quotations")
    .select("id").eq("organization_id", organizationId).eq("id", quotationId).eq("ownership_scope" as never, "standalone" as never).maybeSingle();
  if (quotationError) return failure("INTERNAL", "Az ajánlat előzményei nem tölthetők be.");
  if (!quotation) return failure("NOT_FOUND", "Az önálló ajánlat nem található.");
  const { data, error } = await supabase.from("quotation_revisions")
    .select("id, revision_number, created_at, subtotal")
    .eq("organization_id", organizationId).eq("quotation_id", quotationId)
    .order("revision_number", { ascending: false }).limit(100);
  if (error) return failure("INTERNAL", "Az ajánlati előzmények nem tölthetők be.");
  return { ok: true, data: (data ?? []).map((row) => ({ id: row.id, revisionNumber: row.revision_number, createdAt: row.created_at, subtotal: row.subtotal === null ? null : String(row.subtotal) })) };
}

export async function getStandaloneQuotationHeaderAction(organizationId: string, quotationId: string): Promise<StandaloneQuotationResult<{ id: string; name: string; clientId: string | null; currentRevisionId: string | null; version: number; status: string; updatedAt: string }>> {
  const access = await authorizeOrganization(organizationId);
  if (!access.auth) return failure("UNAUTHENTICATED", "Jelentkezz be az ajánlat megtekintéséhez.");
  if (!access.allowed) return failure("FORBIDDEN", "Nincs jogosultságod ehhez a műhelyhez.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("quotations")
    .select("id, name, client_id, current_revision_id, version, status, updated_at")
    .eq("organization_id", organizationId).eq("id", quotationId).eq("ownership_scope" as never, "standalone" as never).maybeSingle();
  if (error) return failure("INTERNAL", "Az ajánlat nem tölthető be.");
  if (!data) return failure("NOT_FOUND", "Az ajánlat nem található.");
  return { ok: true, data: { id: data.id, name: data.name, clientId: data.client_id, currentRevisionId: data.current_revision_id, version: data.version, status: data.status, updatedAt: data.updated_at } };
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
  const { data: product } = await supabase.from("material_products").select("id, name, category, category_id, status")
    .eq("id", variant.product_id).eq("organization_id", organizationId).maybeSingle();
  if (!product || product.status !== "active") return failure("CATALOG_SOURCE", "A katalógustermék nem elérhető.");
  let priceSnapshot: Record<string, unknown> | null = null;
  if (priceId) {
    const { data: price } = await supabase.from("material_prices").select("id, amount, currency, purchasing_unit, price_kind, effective_date, data_provenance")
      .eq("id", priceId).eq("variant_id", variant.id).eq("organization_id", organizationId).maybeSingle();
    if (!price || price.currency !== "HUF" || price.purchasing_unit !== variant.purchasing_unit) return failure("CATALOG_SOURCE", "A kiválasztott árforrás érvénytelen vagy nem HUF pénznemű.");
    priceSnapshot = { id: price.id, amount: String(price.amount), currency: price.currency, purchasingUnit: price.purchasing_unit, priceKind: price.price_kind, effectiveDate: price.effective_date, provenance: price.data_provenance };
  }
  return { ok: true, data: { variantId: variant.id, productId: product.id, productName: product.name, category: product.category, categoryId: product.category_id, variantName: variant.name, sku: variant.sku, purchasingUnit: variant.purchasing_unit, provenance: variant.data_provenance, price: priceSnapshot, manualPriceOverride: !priceId } };
}

export async function validateStandaloneQuotationLinesAction(lines: unknown): Promise<StandaloneQuotationResult<{ lines: QuotationLine[]; subtotal: string; currency: "HUF"; priceClass: string | null }>> {
  const validation = validateStandaloneLines(lines);
  if (!validation.ok) return failure("VALIDATION", validation.error);
  return { ok: true, data: { lines: validation.lines, ...validation.totals } };
}

function normalizeLine(line: QuotationLine): QuotationLine {
  return { ...line, quantity: line.quantity.replace(",", "."), unitPrice: line.unitPrice.replace(",", ".") };
}

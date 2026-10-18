import { createClient } from "@/infrastructure/supabase/server";

export type DocumentKind = "material_list" | "quotation";

export type DocumentPlanLink = Readonly<{
  /** Null for the immutable association a material list received when it was created inside a work log. */
  linkId: string | null;
  planId: string;
  planTitle: string;
  origin: "link" | "creation";
}>;

export type PlanLinkedDocument = Readonly<{
  kind: DocumentKind;
  documentId: string;
  name: string;
  detail: string;
  linkId: string | null;
  origin: "link" | "creation";
}>;

export type LinkCandidate = Readonly<{ kind: DocumentKind; documentId: string; name: string; detail: string }>;

type LinkRow = { id: string; execution_plan_id: string; document_kind: DocumentKind; material_list_id: string | null; quotation_id: string | null };
type Untyped = { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: unknown) => { eq: (column: string, value: unknown) => { is: (column: string, value: null) => Promise<{ data: LinkRow[] | null; error: unknown }> } } } } };

async function activeLinks(organizationId: string, column: "execution_plan_id" | "material_list_id" | "quotation_id", value: string): Promise<LinkRow[]> {
  const client = await createClient() as unknown as Untyped;
  const { data, error } = await client.from("execution_plan_document_links")
    .select("id, execution_plan_id, document_kind, material_list_id, quotation_id")
    .eq("organization_id", organizationId).eq(column, value).is("unlinked_at", null);
  if (error) throw new Error("A munkanapló-kapcsolatok nem tölthetők be.");
  return data ?? [];
}

/** Work logs a single material list or quotation belongs to (creation-time plan plus removable links). */
export async function getPlanLinksForDocument(organizationId: string, kind: DocumentKind, documentId: string, creationPlanId: string | null = null): Promise<DocumentPlanLink[]> {
  const rows = await activeLinks(organizationId, kind === "material_list" ? "material_list_id" : "quotation_id", documentId);
  const planIds = [...new Set([...rows.map((row) => row.execution_plan_id), ...(creationPlanId ? [creationPlanId] : [])])];
  if (!planIds.length) return [];
  const supabase = await createClient();
  const { data: plans, error } = await supabase.from("execution_plans").select("id, title").eq("organization_id", organizationId).in("id", planIds);
  if (error) throw new Error("A kapcsolt munkanaplók nem tölthetők be.");
  const title = new Map((plans ?? []).map((plan) => [plan.id, plan.title]));
  return [
    ...(creationPlanId && title.has(creationPlanId) ? [{ linkId: null, planId: creationPlanId, planTitle: title.get(creationPlanId)!, origin: "creation" as const }] : []),
    ...rows.flatMap((row) => title.has(row.execution_plan_id) ? [{ linkId: row.id, planId: row.execution_plan_id, planTitle: title.get(row.execution_plan_id)!, origin: "link" as const }] : []),
  ];
}

/** Material lists and quotations linked to a work log by removable links; creation-time lists are added by the caller. */
export async function getPlanLinkedDocuments(organizationId: string, planId: string): Promise<PlanLinkedDocument[]> {
  const rows = await activeLinks(organizationId, "execution_plan_id", planId);
  if (!rows.length) return [];
  const supabase = await createClient();
  const listIds = rows.flatMap((row) => row.material_list_id ? [row.material_list_id] : []);
  const quotationIds = rows.flatMap((row) => row.quotation_id ? [row.quotation_id] : []);
  const [lists, quotations] = await Promise.all([
    listIds.length ? supabase.from("material_preparation_lists").select("id, name, version").eq("organization_id", organizationId).in("id", listIds) : Promise.resolve({ data: [], error: null }),
    quotationIds.length ? supabase.from("quotations").select("id, name, status").eq("organization_id", organizationId).in("id", quotationIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (lists.error || quotations.error) throw new Error("A kapcsolt dokumentumok nem tölthetők be.");
  const listById = new Map((lists.data ?? []).map((row) => [row.id, row]));
  const quotationById = new Map((quotations.data ?? []).map((row) => [row.id, row]));
  return rows.flatMap((row): PlanLinkedDocument[] => {
    if (row.document_kind === "material_list" && row.material_list_id) {
      const list = listById.get(row.material_list_id);
      return list ? [{ kind: "material_list", documentId: list.id, name: list.name, detail: `Anyaglista · V${list.version}`, linkId: row.id, origin: "link" }] : [];
    }
    const quotation = row.quotation_id ? quotationById.get(row.quotation_id) : undefined;
    return quotation ? [{ kind: "quotation", documentId: quotation.id, name: quotation.name, detail: `Ajánlat · ${quotation.status === "draft" ? "piszkozat" : quotation.status}`, linkId: row.id, origin: "link" }] : [];
  });
}

/** Standalone quotations visible to the caller, for the work log's "link existing" picker. */
export async function getStandaloneQuotationCandidates(organizationId: string): Promise<LinkCandidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("quotations").select("id, name, status")
    .eq("organization_id", organizationId).eq("ownership_scope" as never, "standalone" as never).order("updated_at", { ascending: false }).limit(100);
  if (error) throw new Error("Az ajánlatok nem tölthetők be.");
  return (data ?? []).map((row) => ({ kind: "quotation" as const, documentId: row.id, name: row.name, detail: `Ajánlat · ${row.status === "draft" ? "piszkozat" : row.status}` }));
}

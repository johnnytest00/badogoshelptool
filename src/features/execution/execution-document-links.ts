import { createClient } from "@/infrastructure/supabase/server";
import { SupabaseReadError, readSupabase } from "@/infrastructure/supabase/read-error";
import { loadOptionalExecutionSection, type ExecutionWorkspaceSection } from "./execution-workspace-read";

export type DocumentKind = "material_list" | "quotation" | "calculation";

export type DocumentPlanLink = Readonly<{
  /** Null for the immutable association a material list received when it was created inside a work log. */
  linkId: string | null;
  planId: string;
  planTitle: string;
  origin: "link" | "creation";
  /** Exact linked record when it differs from the shown document (a calculation revision). */
  documentId?: string;
  detail?: string;
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
export type PlanLinkedDocumentsResult =
  | { status: "unavailable" | "access_denied" }
  | { status: "loaded"; materialLists: ExecutionWorkspaceSection<readonly PlanLinkedDocument[]>; quotations: ExecutionWorkspaceSection<readonly PlanLinkedDocument[]> };

type LinkRow = { id: string; execution_plan_id: string; document_kind: DocumentKind; material_list_id: string | null; quotation_id: string | null };
type Untyped = { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: unknown) => { eq: (column: string, value: unknown) => { is: (column: string, value: null) => Promise<{ data: LinkRow[] | null; error: unknown }> } } } } };

async function activeLinks(organizationId: string, column: "execution_plan_id" | "material_list_id" | "quotation_id", value: string): Promise<LinkRow[]> {
  const client = await createClient() as unknown as Untyped;
  const { data } = await readSupabase(client.from("execution_plan_document_links")
    .select("id, execution_plan_id, document_kind, material_list_id, quotation_id")
    .eq("organization_id", organizationId).eq(column, value).is("unlinked_at", null), "A munkanapló-kapcsolatok nem tölthetők be.");
  return data ?? [];
}

/** Work logs a single material list or quotation belongs to (creation-time plan plus removable links). */
export async function getPlanLinksForDocument(organizationId: string, kind: DocumentKind, documentId: string, creationPlanId: string | null = null): Promise<DocumentPlanLink[]> {
  const rows = await activeLinks(organizationId, kind === "material_list" ? "material_list_id" : "quotation_id", documentId);
  const planIds = [...new Set([...rows.map((row) => row.execution_plan_id), ...(creationPlanId ? [creationPlanId] : [])])];
  if (!planIds.length) return [];
  const supabase = await createClient();
  const { data: plans } = await readSupabase(supabase.from("execution_plans").select("id, title").eq("organization_id", organizationId).in("id", planIds), "A kapcsolt munkanaplók nem tölthetők be.");
  const title = new Map((plans ?? []).map((plan) => [plan.id, plan.title]));
  return [
    ...(creationPlanId && title.has(creationPlanId) ? [{ linkId: null, planId: creationPlanId, planTitle: title.get(creationPlanId)!, origin: "creation" as const }] : []),
    ...rows.flatMap((row) => title.has(row.execution_plan_id) ? [{ linkId: row.id, planId: row.execution_plan_id, planTitle: title.get(row.execution_plan_id)!, origin: "link" as const }] : []),
  ];
}

/** Material lists and quotations linked to a work log by removable links; creation-time lists are added by the caller. */
export async function getPlanLinkedDocuments(organizationId: string, planId: string): Promise<PlanLinkedDocumentsResult> {
  const links = await loadOptionalExecutionSection(() => activeLinks(organizationId, "execution_plan_id", planId));
  if (links.status !== "loaded") return links;
  const rows = links.data;
  if (!rows.length) return { status: "loaded", materialLists: { status: "loaded", data: [] }, quotations: { status: "loaded", data: [] } };
  const supabase = await createClient();
  const listIds = rows.flatMap((row) => row.material_list_id ? [row.material_list_id] : []);
  const quotationIds = rows.flatMap((row) => row.quotation_id ? [row.quotation_id] : []);
  const [lists, quotations] = await Promise.all([
    loadOptionalExecutionSection(async () => {
      const { data } = await readSupabase(listIds.length ? supabase.from("material_preparation_lists").select("id, name, version").eq("organization_id", organizationId).in("id", listIds) : Promise.resolve({ data: [], error: null }), "A kapcsolt anyaglisták nem tölthetők be.");
      const byId = new Map((data ?? []).map((row) => [row.id, row]));
      const linked = rows.filter((row) => row.document_kind === "material_list");
      if (linked.some((row) => !byId.has(row.material_list_id ?? ""))) throw new SupabaseReadError("Egy kapcsolt anyaglista pontos forrása nem érhető el.", "unavailable");
      return linked.flatMap((row): PlanLinkedDocument[] => {
        const list = byId.get(row.material_list_id!);
        return list ? [{ kind: "material_list", documentId: list.id, name: list.name, detail: `Anyaglista · V${list.version}`, linkId: row.id, origin: "link" }] : [];
      });
    }),
    loadOptionalExecutionSection(async () => {
      const { data } = await readSupabase(quotationIds.length ? supabase.from("quotations").select("id, name, status").eq("organization_id", organizationId).in("id", quotationIds) : Promise.resolve({ data: [], error: null }), "A kapcsolt ajánlatok nem tölthetők be.");
      const byId = new Map((data ?? []).map((row) => [row.id, row]));
      const linked = rows.filter((row) => row.document_kind === "quotation");
      if (linked.some((row) => !byId.has(row.quotation_id ?? ""))) throw new SupabaseReadError("Egy kapcsolt ajánlat pontos forrása nem érhető el.", "unavailable");
      return linked.flatMap((row): PlanLinkedDocument[] => {
        const quotation = row.quotation_id ? byId.get(row.quotation_id) : undefined;
        return quotation ? [{ kind: "quotation", documentId: quotation.id, name: quotation.name, detail: `Ajánlat · ${quotation.status === "draft" ? "piszkozat" : quotation.status}`, linkId: row.id, origin: "link" }] : [];
      });
    }),
  ]);
  return { status: "loaded", materialLists: lists, quotations };
}

/** Standalone quotations visible to the caller, for the work log's "link existing" picker. */
export async function getStandaloneQuotationCandidates(organizationId: string): Promise<LinkCandidate[]> {
  const supabase = await createClient();
  const { data } = await readSupabase(supabase.from("quotations").select("id, name, status, version, updated_at")
    .eq("organization_id", organizationId).eq("ownership_scope" as never, "standalone" as never).order("updated_at", { ascending: false }).limit(100), "Az ajánlatok nem tölthetők be.");
  return (data ?? []).map((row) => ({ kind: "quotation" as const, documentId: row.id, name: row.name, detail: `Ajánlat · ${row.status === "draft" ? "piszkozat" : row.status} · v${row.version} · ${row.updated_at.slice(0, 10)}` }));
}

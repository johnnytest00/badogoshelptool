import { createClient } from "@/infrastructure/supabase/server";
import { SupabaseReadError, readSupabase } from "@/infrastructure/supabase/read-error";
import type { ResultLine } from "@/features/calculators/construction-calculator-types";
import type { DocumentPlanLink } from "./execution-document-links";
import { loadOptionalExecutionSection, type ExecutionWorkspaceSection } from "./execution-workspace-read";

export type PlanLinkedCalculation = Readonly<{
  linkId: string;
  calculationId: string;
  revisionId: string;
  revisionNumber: number;
  name: string;
  calculatorId: string;
  /** Only the creator edits, saves new revisions or removes the link; members read the linked revision. */
  ownedByViewer: boolean;
  lines: readonly ResultLine[];
}>;

type CalculationLinkRow = { id: string; execution_plan_id: string; calculation_id: string; calculation_revision_id: string };
type Untyped = { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: unknown) => { eq: (column: string, value: unknown) => { eq: (column: string, value: unknown) => { is: (column: string, value: null) => Promise<{ data: CalculationLinkRow[] | null; error: unknown }> } } } } } };

async function activeCalculationLinks(organizationId: string, column: "execution_plan_id" | "calculation_id", value: string): Promise<CalculationLinkRow[]> {
  const client = await createClient() as unknown as Untyped;
  const { data } = await readSupabase(client.from("execution_plan_document_links")
    .select("id, execution_plan_id, calculation_id, calculation_revision_id")
    .eq("organization_id", organizationId).eq("document_kind", "calculation").eq(column, value).is("unlinked_at", null), "A kalkulációs kapcsolatok nem tölthetők be.");
  return data ?? [];
}

const outputLines = (output: unknown): ResultLine[] => {
  const lines = output && typeof output === "object" && "lines" in output && Array.isArray(output.lines) ? output.lines : [];
  return lines.flatMap((line: unknown) => line && typeof line === "object" && "label" in line && "value" in line && "unit" in line
    && typeof line.label === "string" && (typeof line.value === "number" || typeof line.value === "string") && typeof line.unit === "string"
    ? [{ label: line.label, value: line.value, unit: line.unit }] : []);
};

/** Calculations linked to a work log, each with its exact revision; a missing linked source is reported, never hidden. */
export async function getPlanLinkedCalculations(organizationId: string, planId: string, viewerId: string): Promise<ExecutionWorkspaceSection<readonly PlanLinkedCalculation[]>> {
  return loadOptionalExecutionSection(async () => {
    const links = await activeCalculationLinks(organizationId, "execution_plan_id", planId);
    if (!links.length) return [];
    const supabase = await createClient();
    const [{ data: calculations }, { data: revisions }] = await Promise.all([
      readSupabase(supabase.from("calculations").select("id, display_name, calculator_type, created_by").eq("organization_id", organizationId).in("id", [...new Set(links.map((link) => link.calculation_id))]), "A kapcsolt kalkulációk nem tölthetők be."),
      readSupabase(supabase.from("calculation_revisions").select("id, calculation_id, revision_number, output_snapshot").eq("organization_id", organizationId).in("id", links.map((link) => link.calculation_revision_id)), "A kapcsolt kalkulációs revíziók nem tölthetők be."),
    ]);
    const calculationById = new Map((calculations ?? []).map((row) => [row.id, row]));
    const revisionById = new Map((revisions ?? []).map((row) => [row.id, row]));
    if (links.some((link) => !calculationById.has(link.calculation_id) || revisionById.get(link.calculation_revision_id)?.calculation_id !== link.calculation_id)) {
      throw new SupabaseReadError("Egy kapcsolt kalkuláció pontos revíziója nem érhető el.", "unavailable");
    }
    return links.map((link) => {
      const calculation = calculationById.get(link.calculation_id)!;
      const revision = revisionById.get(link.calculation_revision_id)!;
      return {
        linkId: link.id, calculationId: calculation.id, revisionId: revision.id, revisionNumber: revision.revision_number, name: calculation.display_name,
        calculatorId: calculation.calculator_type.replace(/^construction\./, ""), ownedByViewer: calculation.created_by === viewerId, lines: outputLines(revision.output_snapshot),
      };
    }).sort((a, b) => a.name.localeCompare(b.name, "hu") || a.revisionNumber - b.revisionNumber);
  });
}

/** Work logs one calculation is linked to, labelled with the exact revision of each link. */
export async function getPlanLinksForCalculation(organizationId: string, calculationId: string): Promise<DocumentPlanLink[]> {
  const links = await activeCalculationLinks(organizationId, "calculation_id", calculationId);
  if (!links.length) return [];
  const supabase = await createClient();
  const [{ data: plans }, { data: revisions }] = await Promise.all([
    readSupabase(supabase.from("execution_plans").select("id, title").eq("organization_id", organizationId).in("id", [...new Set(links.map((link) => link.execution_plan_id))]), "A kapcsolt munkanaplók nem tölthetők be."),
    readSupabase(supabase.from("calculation_revisions").select("id, revision_number").eq("organization_id", organizationId).in("id", links.map((link) => link.calculation_revision_id)), "A kapcsolt revíziók nem tölthetők be."),
  ]);
  const title = new Map((plans ?? []).map((plan) => [plan.id, plan.title]));
  const revisionNumber = new Map((revisions ?? []).map((revision) => [revision.id, revision.revision_number]));
  return links.flatMap((link) => title.has(link.execution_plan_id) ? [{
    linkId: link.id, planId: link.execution_plan_id, planTitle: title.get(link.execution_plan_id)!, origin: "link" as const,
    documentId: link.calculation_revision_id, detail: revisionNumber.has(link.calculation_revision_id) ? `V${revisionNumber.get(link.calculation_revision_id)}` : "revízió nem érhető el",
  }] : []);
}

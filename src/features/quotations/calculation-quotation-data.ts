import { getConstructionCalculation } from "@/features/calculations/construction-data";
import { createClient } from "@/infrastructure/supabase/server";
import { calculationQuoteCandidates, type QuotationCalculationSource } from "./calculation-quotation-source";

/** A saved calculation revision as a quotation source for a new draft (creator-scoped like the calculation itself). */
export async function getCalculationQuotationSource(organizationId: string, calculationId: string, revisionId?: string): Promise<QuotationCalculationSource | null> {
  const calculation = await getConstructionCalculation(organizationId, calculationId);
  const revision = calculation?.revisions.find((candidate) => revisionId ? candidate.revisionId === revisionId : candidate.revisionNumber === calculation.currentRevisionNumber);
  if (!calculation || !revision) return null;
  return {
    calculationId, calculationRevisionId: revision.revisionId, calculationName: calculation.displayName, calculatorId: calculation.calculatorId,
    revisionNumber: revision.revisionNumber, ...calculationQuoteCandidates(revision.output), sourceLineMap: [],
  };
}

type SourceRow = { calculation_id: string; calculation_revision_id: string; source_line_map: unknown };
type Untyped = { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: unknown) => { eq: (column: string, value: unknown) => { maybeSingle: () => Promise<{ data: SourceRow | null; error: unknown }> } } } } };

/** The calculation source recorded for one quotation revision, or null when that revision has none. */
export async function getQuotationRevisionCalculationSource(organizationId: string, quotationRevisionId: string): Promise<QuotationCalculationSource | null> {
  const client = await createClient() as unknown as Untyped;
  const { data, error } = await client.from("quotation_calculation_sources").select("calculation_id, calculation_revision_id, source_line_map")
    .eq("organization_id", organizationId).eq("quotation_revision_id", quotationRevisionId).maybeSingle();
  if (error) throw new Error("Az ajánlat kalkulációs forrása nem tölthető be.");
  if (!data) return null;
  const source = await getCalculationQuotationSource(organizationId, data.calculation_id, data.calculation_revision_id);
  if (!source) throw new Error("Az ajánlat kalkulációs forrásrevíziója nem érhető el.");
  const sourceLineMap = Array.isArray(data.source_line_map) ? data.source_line_map.flatMap((entry: unknown) => {
    const value = entry as { sourceKey?: unknown; quotationLineIndex?: unknown };
    return typeof value.sourceKey === "string" && Number.isInteger(value.quotationLineIndex) ? [{ sourceKey: value.sourceKey, quotationLineIndex: value.quotationLineIndex as number }] : [];
  }) : [];
  return { ...source, sourceLineMap };
}

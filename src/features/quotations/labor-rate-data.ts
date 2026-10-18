import { createClient } from "@/infrastructure/supabase/server";
import { getWorkflowMaterialLists } from "@/features/material-takeoffs/material-preparation-data";
import { quantityAtSix, type LaborBase, type LaborBasis, type LaborRate } from "@/domain/quotations/labor-rate";

export type LaborRateRecord = LaborRate & Readonly<{ createdAt: string; archived: boolean }>;
type Row = { id: string; name: string; basis: LaborBasis; rate_amount: string | number; price_class: "net" | "gross"; created_at: string; archived_at: string | null };
type Untyped = { from: (t: string) => { select: (c: string) => { eq: (c: string, v: unknown) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null; error: unknown }> } } } };

const money = (value: string | number) => Number(value).toFixed(2);

export async function getLaborRates(organizationId: string): Promise<LaborRateRecord[]> {
  const client = await createClient() as unknown as Untyped;
  const { data, error } = await client.from("organization_labor_rates")
    .select("id, name, basis, rate_amount, price_class, created_at, archived_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
  if (error) throw new Error("A munkadíj-szabályok nem tölthetők be.");
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, basis: row.basis, rateAmount: money(row.rate_amount), priceClass: row.price_class, createdAt: row.created_at, archived: row.archived_at !== null }));
}

/** Active rules plus the verified survey quantities of the exact source list revision (none without a survey source). */
export async function getLaborContext(organizationId: string, source: Readonly<{ materialListId: string; materialRevisionId: string }> | null): Promise<{ rates: LaborRateRecord[]; bases: LaborBase[] }> {
  const [records, lists] = await Promise.all([getLaborRates(organizationId), source ? getWorkflowMaterialLists(organizationId, source.materialListId) : Promise.resolve([])]);
  const revision = lists[0]?.history.find((candidate) => candidate.id === source?.materialRevisionId);
  const bases = (revision?.surveySource?.items ?? []).flatMap((item): LaborBase[] => {
    const listItem = revision?.items.find((candidate) => candidate.id === item.itemId);
    if (!listItem || !/^\d+(?:\.\d+)?$/.test(item.sourceValue) || !(Number(item.sourceValue) > 0)) return [];
    // Calculated geometry (e.g. roof area) is stored at full precision; quotation quantities carry six decimals, so the offer shows the six-decimal value and the exact source stays in provenance.
    return [{ itemId: item.itemId, label: item.sourceLabel, quantity: quantityAtSix(item.sourceValue), unit: item.sourceUnit }];
  });
  return { rates: records.filter((rate) => !rate.archived), bases };
}

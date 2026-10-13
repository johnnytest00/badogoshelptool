import { createClient } from "@/infrastructure/supabase/server";
import { GABLE_CALCULATOR_ID, GABLE_CALCULATOR_VERSION, GABLE_INPUT_SCHEMA_VERSION, gableRoofCalculator } from "@/domain/calculations/gable-roof";
import { getMaterialProductsForOrganization, type MaterialVariantRecord } from "@/features/materials/material-data";

export type SavedGableCalculation = { id: string; revisionId: string; displayName: string; revisionNumber: number; current: boolean; output: ReturnType<typeof gableRoofCalculator.calculate> };
export type TakeoffRecord = { id: string; projectId: string; name: string; status: "draft" | "approved"; version: number; sourceCalculationId: string; sourceRevisionId: string; sourceDisplayName: string; sourceCurrentRevisionId: string | null; items: Array<{ id: string; variantName: string; sku: string | null; productName: string | null; productCategory: string | null; provenance: string; technicalDetails: string | null; priceDetails: string | null; quantity: number; unit: string; method: string; source: string; warning: string | null }> };

function profileTransferDetails(snapshot: Record<string, unknown>): string | null {
  if (snapshot.quantityKind !== "preliminary_net_blank_area") return null;
  const bends = Array.isArray(snapshot.bendParameterSources) ? snapshot.bendParameterSources : [];
  const sources = bends.flatMap((bend) => {
    if (!bend || typeof bend !== "object") return [];
    const row = bend as { id?: unknown; allowance?: { mode?: unknown; source?: { label?: unknown } } };
    return [`${String(row.id ?? "hajtás")}: ${String(row.allowance?.mode ?? "ismeretlen")} · ${String(row.allowance?.source?.label ?? "forrás nincs")}`];
  });
  return [`Profil V${String(snapshot.sourceRevisionNumber ?? "?")}`,
    `teríték ${String(snapshot.flatPatternWidthMm ?? "?")} mm`,
    `darabhossz ${String(snapshot.pieceLengthMm ?? "?")} mm × ${String(snapshot.pieceCount ?? "?")} db`,
    `anyag ${String(snapshot.materialSpec ?? "?")}`,
    `számítás ${String(snapshot.calculationClassification ?? "?")}`,
    `katalógus ${String(snapshot.compatibility ?? "?")}`,
    ...sources].join(" · ");
}

export async function getSavedGableCalculations(organizationId: string, projectId: string): Promise<SavedGableCalculation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("calculations").select("id, display_name, current_revision_id, calculator_type, status, roof_model_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("calculator_type", GABLE_CALCULATOR_ID).order("updated_at", { ascending: false });
  if (error) throw new Error("A mentett kalkulációk betöltése nem sikerült.");
  const rows = data ?? [];
  const revisionIds = rows.flatMap((row) => row.current_revision_id ? [row.current_revision_id] : []);
  if (!revisionIds.length) return [];
  const { data: revisions, error: revisionError } = await supabase.from("calculation_revisions").select("id, calculation_id, revision_number, calculator_implementation_version, input_schema_version, output_snapshot, validation_status").eq("organization_id", organizationId).in("id", revisionIds);
  if (revisionError) throw new Error("A kalkulációs snapshotok betöltése nem sikerült.");
  return rows.flatMap((row) => {
    const revision = (revisions ?? []).find((item) => item.id === row.current_revision_id);
    if (!revision || revision.calculator_implementation_version !== GABLE_CALCULATOR_VERSION || revision.input_schema_version !== GABLE_INPUT_SCHEMA_VERSION) return [];
    const parsed = gableRoofCalculator.outputSchema.safeParse(revision.output_snapshot);
    if (!parsed.success || revision.validation_status !== "verified") return [];
    return [{ id: row.id, revisionId: revision.id, displayName: row.display_name, revisionNumber: revision.revision_number, current: row.status === "current", output: parsed.data }];
  });
}

export async function getTakeoffVariants(organizationId: string): Promise<MaterialVariantRecord[]> {
  const products = await getMaterialProductsForOrganization(organizationId);
  return products.flatMap((product) => product.variants.filter(() => product.status === "active"));
}

export async function getMaterialTakeoffs(organizationId: string, projectId: string): Promise<TakeoffRecord[]> {
  const supabase = await createClient();
  const { data: takeoffs, error } = await supabase.from("material_takeoffs").select("id, project_id, name, status, version, source_calculation_id, source_calculation_revision_id").eq("organization_id", organizationId).eq("project_id", projectId).order("updated_at", { ascending: false });
  if (error) throw new Error("Az anyagkimutatások betöltése nem sikerült.");
  if (!takeoffs?.length) return [];
  const calcIds = takeoffs.map((item) => item.source_calculation_id);
  const { data: calculations } = await supabase.from("calculations").select("id, display_name, current_revision_id").in("id", calcIds).eq("organization_id", organizationId);
  const { data: items } = await supabase.from("material_takeoff_items").select("id, takeoff_id, variant_id, final_quantity, quantity_unit, estimation_method, measurement_source, warnings, material_snapshot, price_snapshot, data_provenance").in("takeoff_id", takeoffs.map((item) => item.id)).eq("organization_id", organizationId);
  const variants = await getTakeoffVariants(organizationId); const variantMap = new Map(variants.map((item) => [item.id, item]));
  return takeoffs.map((takeoff) => { const calc = (calculations ?? []).find((item) => item.id === takeoff.source_calculation_id); return { id: takeoff.id, projectId: takeoff.project_id, name: takeoff.name, status: takeoff.status, version: takeoff.version, sourceCalculationId: takeoff.source_calculation_id, sourceRevisionId: takeoff.source_calculation_revision_id, sourceDisplayName: calc?.display_name ?? "Ismeretlen kalkuláció", sourceCurrentRevisionId: calc?.current_revision_id ?? null, items: (items ?? []).filter((item) => item.takeoff_id === takeoff.id).map((item) => { const snapshot = item.material_snapshot as Record<string, unknown>; const price = item.price_snapshot as Record<string, unknown> | null; const details = [profileTransferDetails(snapshot), snapshot.lengthMm ? `hossz ${snapshot.lengthMm} mm` : null, snapshot.nominalWidthMm ? `névleges szélesség ${snapshot.nominalWidthMm} mm` : null, snapshot.effectiveWidthMm ? `hasznos szélesség ${snapshot.effectiveWidthMm} mm` : null, snapshot.thicknessMm ? `vastagság ${snapshot.thicknessMm} mm` : null, snapshot.technicalSpecs && typeof snapshot.technicalSpecs === "object" ? Object.entries(snapshot.technicalSpecs as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") : null].filter(Boolean).join(" · "); const priceDetails = price ? `${String(price.amount)} ${String(price.currency)}/${String(price.purchasingUnit)} · ${String(price.sourceName ?? price.provenance ?? "forrás nincs megadva")} · ${String(price.effectiveDate)}` : null; const firstWarning = Array.isArray(item.warnings) && typeof item.warnings[0] === "string" ? item.warnings[0] : null; return { id: item.id, variantName: String(snapshot.variantName ?? variantMap.get(item.variant_id)?.name ?? "Ismeretlen változat"), sku: typeof snapshot.sku === "string" ? snapshot.sku : variantMap.get(item.variant_id)?.sku ?? null, productName: typeof snapshot.productName === "string" ? snapshot.productName : null, productCategory: typeof snapshot.productCategory === "string" ? snapshot.productCategory : null, provenance: item.data_provenance, technicalDetails: details || null, priceDetails, quantity: Number(item.final_quantity), unit: item.quantity_unit, method: item.estimation_method, source: item.measurement_source, warning: firstWarning }; }) }; });
}

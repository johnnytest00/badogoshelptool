import { executeCalculator } from "@/domain/calculations/engine";
import { flashingMaterialCalculator, flashingMaterialInputSchema, type FlashingMaterialOutput } from "@/domain/calculations/flashing-material";
import { gutterMaterialCalculator, gutterMaterialInputSchema } from "@/domain/calculations/gutter-material";
import { sheetMetalProfileCalculator, sheetMetalProfileInputSchema, type SheetMetalProfileOutput } from "@/domain/calculations/sheet-metal-profile";
import { getAuthContext } from "@/features/auth/auth.server";
import { persistedResultMatches } from "@/features/sheet-metal/profile-data";
import { createClient } from "@/infrastructure/supabase/server";
import { standaloneCalculatorTypes, type StandaloneCalculatorType } from "./standalone-persistence";
import { GABLE_TRAPEZOIDAL_COVERING_ID } from "@/features/roof-models/gable-trapezoidal-covering-persistence";

export type ListedStandaloneCalculatorType = StandaloneCalculatorType | typeof GABLE_TRAPEZOIDAL_COVERING_ID;

export type StandaloneCalculationSummary = Readonly<{
  calculationId: string;
  calculatorType: ListedStandaloneCalculatorType;
  displayName: string;
  currentRevisionId: string | null;
  currentRevisionNumber: number;
  createdAt: string;
  updatedAt: string;
}>;
export type StandaloneCalculationRevision = Readonly<{
  revisionId: string;
  revisionNumber: number;
  input: unknown;
  output: unknown;
  dataProvenance: unknown;
  validationStatus: string;
  createdAt: string;
}>;
export type StandaloneCalculationRecord = StandaloneCalculationSummary & Readonly<{ revisions: readonly StandaloneCalculationRevision[] }>;

const stableJson = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : item);

async function assertOrganizationMember(organizationId: string) {
  const auth = await getAuthContext();
  if (!auth?.organizations.some((organization) => organization.id === organizationId)) throw new Error("Ehhez a műhelyhez nincs hozzáférésed.");
}

export async function listStandaloneCalculations(organizationId: string, calculatorType?: string): Promise<StandaloneCalculationSummary[]> {
  await assertOrganizationMember(organizationId);
  if (calculatorType && ![...standaloneCalculatorTypes, GABLE_TRAPEZOIDAL_COVERING_ID].includes(calculatorType as StandaloneCalculatorType)) return [];
  const supabase = await createClient();
  let query = supabase.from("calculations").select("id, calculator_type, display_name, current_revision_id, created_at, updated_at")
    .eq("organization_id", organizationId).eq("ownership_scope", "standalone").order("updated_at", { ascending: false }).limit(100);
  if (calculatorType) query = query.eq("calculator_type", calculatorType);
  const { data: calculations, error } = await query;
  if (error) throw new Error("A mentett önálló számítások listája nem tölthető be.");
  const ids = (calculations ?? []).flatMap((item) => item.current_revision_id ? [item.current_revision_id] : []);
  const { data: currentRevisions, error: revisionError } = ids.length
    ? await supabase.from("calculation_revisions").select("id, revision_number").eq("organization_id", organizationId).in("id", ids)
    : { data: [], error: null };
  if (revisionError) throw new Error("A számítások aktuális revíziói nem tölthetők be.");
  return (calculations ?? []).flatMap((calculation) => [...standaloneCalculatorTypes, GABLE_TRAPEZOIDAL_COVERING_ID].includes(calculation.calculator_type as StandaloneCalculatorType) ? [{
    calculationId: calculation.id,
    calculatorType: calculation.calculator_type as ListedStandaloneCalculatorType,
    displayName: calculation.display_name,
    currentRevisionId: calculation.current_revision_id,
    currentRevisionNumber: currentRevisions?.find((revision) => revision.id === calculation.current_revision_id)?.revision_number ?? 0,
    createdAt: calculation.created_at,
    updatedAt: calculation.updated_at,
  }] : []);
}

export async function getStandaloneCalculation(organizationId: string, calculationId: string, revisionNumber?: number): Promise<StandaloneCalculationRecord | null> {
  await assertOrganizationMember(organizationId);
  const supabase = await createClient();
  const { data: calculation, error } = await supabase.from("calculations")
    .select("id, calculator_type, display_name, current_revision_id, ownership_scope, created_at, updated_at")
    .eq("id", calculationId).eq("organization_id", organizationId).eq("ownership_scope", "standalone").maybeSingle();
  if (error) throw new Error("A mentett önálló számítás nem tölthető be.");
  if (!calculation || !standaloneCalculatorTypes.includes(calculation.calculator_type as StandaloneCalculatorType)) return null;
  const { data: currentRevision, error: currentRevisionError } = calculation.current_revision_id
    ? await supabase.from("calculation_revisions").select("revision_number").eq("id", calculation.current_revision_id).eq("organization_id", organizationId).maybeSingle()
    : { data: null, error: null };
  if (currentRevisionError) throw new Error("A számítás aktuális revíziója nem tölthető be.");
  let revisionQuery = supabase.from("calculation_revisions")
    .select("id, revision_number, input_snapshot, output_snapshot, data_provenance, validation_status, created_at, input_schema_version, calculator_implementation_version")
    .eq("calculation_id", calculationId).eq("organization_id", organizationId);
  if (revisionNumber !== undefined) revisionQuery = revisionQuery.eq("revision_number", revisionNumber);
  const { data: rows, error: revisionError } = await revisionQuery.order("revision_number", { ascending: false }).limit(revisionNumber === undefined ? 100 : 1);
  if (revisionError) throw new Error("A számítási revíziók nem tölthetők be.");
  const revisions: StandaloneCalculationRevision[] = [];
  for (const row of rows ?? []) {
    if (row.input_schema_version !== "1.0.0" || row.calculator_implementation_version !== "1.0.0") continue;
    if (calculation.calculator_type === gutterMaterialCalculator.id) {
      const parsed = gutterMaterialInputSchema.safeParse(row.input_snapshot);
      const calculated = parsed.success ? executeCalculator(gutterMaterialCalculator, parsed.data) : null;
      const saved = gutterMaterialCalculator.outputSchema.safeParse(row.output_snapshot);
      if (!calculated?.ok || !saved.success || stableJson(calculated.output) !== stableJson(saved.data)) continue;
      revisions.push({ revisionId: row.id, revisionNumber: row.revision_number, input: parsed.data, output: calculated.output, dataProvenance: row.data_provenance, validationStatus: row.validation_status, createdAt: row.created_at });
      continue;
    }
    if (calculation.calculator_type === flashingMaterialCalculator.id) {
      const parsed = flashingMaterialInputSchema.safeParse(row.input_snapshot);
      const calculated = parsed.success ? executeCalculator(flashingMaterialCalculator, parsed.data) : null;
      const saved = flashingMaterialCalculator.outputSchema.safeParse(row.output_snapshot);
      if (!calculated?.ok || !saved.success || stableJson(calculated.output) !== stableJson(saved.data)) continue;
      revisions.push({ revisionId: row.id, revisionNumber: row.revision_number, input: parsed.data, output: calculated.output as FlashingMaterialOutput, dataProvenance: row.data_provenance, validationStatus: row.validation_status, createdAt: row.created_at });
      continue;
    }
    const parsed = sheetMetalProfileInputSchema.safeParse(row.input_snapshot);
    const calculated = parsed.success && parsed.data.profileId === calculationId ? executeCalculator(sheetMetalProfileCalculator, parsed.data) : null;
    if (!calculated?.ok || !persistedResultMatches(row.output_snapshot, calculated.output)) continue;
    revisions.push({ revisionId: row.id, revisionNumber: row.revision_number, input: parsed.data, output: calculated.output as SheetMetalProfileOutput, dataProvenance: row.data_provenance, validationStatus: row.validation_status, createdAt: row.created_at });
  }
  const current = revisions.find((revision) => revision.revisionId === calculation.current_revision_id);
  if (!current && revisionNumber === undefined) return null;
  return {
    calculationId: calculation.id, calculatorType: calculation.calculator_type as StandaloneCalculatorType,
    displayName: calculation.display_name, currentRevisionId: calculation.current_revision_id,
    currentRevisionNumber: currentRevision?.revision_number ?? 0, createdAt: calculation.created_at, updatedAt: calculation.updated_at, revisions,
  };
}

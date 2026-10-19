import { createClient } from "@/infrastructure/supabase/server";
import { GABLE_CALCULATOR_ID, GABLE_CALCULATOR_VERSION, GABLE_INPUT_SCHEMA_VERSION, gableRoofCalculator } from "@/domain/calculations/gable-roof";
import { getMaterialProductsForOrganization, type MaterialPriceRecord, type MaterialVariantRecord } from "@/features/materials/material-data";
import { materialPurchasingUnitLabels, type MaterialPurchasingUnit } from "@/domain/materials/contracts";

export type SavedGableCalculation = { id: string; revisionId: string; displayName: string; revisionNumber: number; current: boolean; output: ReturnType<typeof gableRoofCalculator.calculate> };
export type GableCoveringTakeoffOption = Readonly<{
  id: string; productId: string; productName: string; productCode: string | null;
  productCategory: "roof_covering" | "sheet_metal"; variantName: string;
  purchasingUnit: string; nominalWidthMm: number | null; effectiveWidthMm: number | null; lengthMm: number | null;
  technicalSpecs?: Readonly<Record<string, string>>;
  provenance: string; sourceName: string | null; latestPrice: Pick<MaterialPriceRecord, "amount" | "currency" | "purchasingUnit" | "priceKind" | "effectiveDate" | "sourceName"> | null;
}>;
export type TakeoffRecord = { id: string; projectId: string | null; name: string; status: "draft" | "approved"; version: number; sourceCalculationId: string; sourceRevisionId: string; sourceDisplayName: string; sourceCurrentRevisionId: string | null; sourceRoofModelId: string | null; sourceRoofRevisionId: string | null; staleRoofSource: boolean; items: Array<{ id: string; variantId: string; materialSnapshot: Record<string, unknown>; priceSnapshot: Record<string, unknown> | null; quantityExact: string; quantityUnit: string; variantName: string; sku: string | null; productName: string | null; productCategory: string | null; provenance: string; technicalDetails: string | null; priceDetails: string | null; quantity: number; unit: string; method: string; source: string; warning: string | null }> };

const profileStateLabels: Record<string, string> = {
  INCOMPLETE: "Hiányos terítékadat", PARAMETER_BASED_ESTIMATE: "Paraméteralapú becslés", GEOMETRICALLY_DETERMINED: "Geometriai eredmény", UNSUPPORTED: "Nem támogatott",
  TECHNICALLY_MATCHED_PARAMETERS: "Paraméterek egyeznek", UNRESOLVED: "Paraméterek hiányoznak", INCOMPATIBLE: "Eltérő paraméterek",
  explicit_ba: "Megadott BA", k_factor: "K-tényező", unknown: "Ismeretlen hajlítási pótlék",
};
const profileStateLabel = (value: unknown) => profileStateLabels[String(value)] ?? "Nincs besorolva";

function profileTransferDetails(snapshot: Record<string, unknown>): string | null {
  if (snapshot.quantityKind !== "preliminary_net_blank_area") return null;
  const bends = Array.isArray(snapshot.bendParameterSources) ? snapshot.bendParameterSources : [];
  const sources = bends.flatMap((bend) => {
    if (!bend || typeof bend !== "object") return [];
    const row = bend as { id?: unknown; allowance?: { mode?: unknown; source?: { label?: unknown } } };
    return [`${String(row.id ?? "hajtás")}: ${profileStateLabel(row.allowance?.mode)} · ${String(row.allowance?.source?.label ?? "forrás nincs")}`];
  });
  return [`Profil V${String(snapshot.sourceRevisionNumber ?? "?")}`,
    `teríték ${String(snapshot.flatPatternWidthMm ?? "?")} mm`,
    `darabhossz ${String(snapshot.pieceLengthMm ?? "?")} mm × ${String(snapshot.pieceCount ?? "?")} db`,
    `anyag ${String(snapshot.materialSpec ?? "?")}`,
    `számítás ${profileStateLabel(snapshot.calculationClassification)}`,
    `katalógus ${profileStateLabel(snapshot.compatibility)}`,
    ...sources].join(" · ");
}

function coveringTransferDetails(snapshot: Record<string, unknown>): string | null {
  if (snapshot.transferKind !== "gable_trapezoidal_covering_piece_count") return null;
  const roofArea = Number(snapshot.roofSurfaceAreaMm2);
  const nominalArea = Number(snapshot.nominalPurchasedSheetAreaMm2);
  const catalog = snapshot.catalogSnapshot && typeof snapshot.catalogSnapshot === "object"
    ? snapshot.catalogSnapshot as Record<string, unknown> : {};
  return [
    `Fedés V${String(snapshot.sourceCalculationRevisionNumber ?? "?")}`,
    `${String(snapshot.columnsPerPlane ?? "?")} oszlop/sík × ${String(snapshot.rowsPerPlane ?? "?")} sor/sík`,
    `${String(snapshot.sheetCount ?? "?")} lemez · ${String(snapshot.sheetLengthMm ?? "?")} mm hossz`,
    `névleges/hasznos szélesség ${String(snapshot.nominalWidthMm ?? "?")} / ${String(snapshot.effectiveWidthMm ?? "?")} mm`,
    Number.isFinite(roofArea) ? `tetőfelület ${(roofArea / 1_000_000).toLocaleString("hu-HU")} m²` : null,
    Number.isFinite(nominalArea) ? `névleges beszerzett lemezterület ${(nominalArea / 1_000_000).toLocaleString("hu-HU")} m²; nem igazolt vágási veszteség` : null,
    `tetőmodell ${String(snapshot.sourceRoofModelId ?? "?")} · V${String(snapshot.sourceRoofModelRevisionNumber ?? "?")} (${String(snapshot.sourceRoofModelRevisionId ?? "?")})`,
    `katalóguskapcsolat: ${String(snapshot.catalogCompatibility ?? "nem ellenőrzött")}`,
    `anyagváltozat: ${String(catalog.variantId ?? "?")}`,
  ].filter(Boolean).join(" · ");
}

function metalTileTransferDetails(snapshot: Record<string, unknown>): string | null {
  if (snapshot.transferKind !== "gable_metal_tile_covering_piece_count") return null;
  const modular = snapshot.isModular === true;
  const moduleDetails = modular
    ? `modul ${String(snapshot.moduleBaseLengthMm ?? "?")} mm + ${String(snapshot.moduleCount ?? "?")} × ${String(snapshot.modulePitchMm ?? "?")} mm`
    : "nem moduláris";
  return [
    `Cserepeslemez V${String(snapshot.sourceCalculationRevisionNumber ?? "?")}`,
    `${String(snapshot.columnsPerPlane ?? "?")} oszlop/sík × ${String(snapshot.rowsPerPlane ?? "?")} sor/sík`,
    `${String(snapshot.sheetCount ?? "?")} db lemez · fizikai ${String(snapshot.physicalSheetLengthMm ?? "?")} mm · fedési ${String(snapshot.effectiveCoveringLengthMm ?? "?")} mm`,
    `névleges/hasznos szélesség ${String(snapshot.nominalWidthMm ?? "?")} / ${String(snapshot.effectiveWidthMm ?? "?")} mm`,
    moduleDetails,
    `hosszadat: ${String(snapshot.lengthCompatibility ?? "nincs ellenőrizve")} · ${String(snapshot.lengthDataSource ?? "forrás nincs megadva")}`,
    `tetőmodell ${String(snapshot.sourceRoofModelId ?? "?")} · V${String(snapshot.sourceRoofModelRevisionNumber ?? "?")} (${String(snapshot.sourceRoofModelRevisionId ?? "?")})`,
    `katalóguskapcsolat: ${String(snapshot.catalogCompatibility ?? "nem ellenőrzött")}`,
  ].join(" · ");
}

export async function getSavedGableCalculations(organizationId: string, projectId: string): Promise<SavedGableCalculation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("calculations").select("id, display_name, current_revision_id, calculator_type, status, roof_model_id").eq("organization_id", organizationId).eq("project_id", projectId).eq("calculator_type", GABLE_CALCULATOR_ID).order("updated_at", { ascending: false });
  if (error) throw new Error("A mentett kalkulációk betöltése nem sikerült.");
  const rows = data ?? [];
  const revisionIds = rows.flatMap((row) => row.current_revision_id ? [row.current_revision_id] : []);
  if (!revisionIds.length) return [];
  const { data: revisions, error: revisionError } = await supabase.from("calculation_revisions").select("id, calculation_id, revision_number, calculator_implementation_version, input_schema_version, output_snapshot, validation_status").eq("organization_id", organizationId).in("id", revisionIds);
  if (revisionError) throw new Error("A mentett számítási adatok betöltése nem sikerült.");
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

export async function getGableCoveringTakeoffOptions(organizationId: string): Promise<GableCoveringTakeoffOption[]> {
  const [roofCovering, sheetMetal] = await Promise.all([
    getMaterialProductsForOrganization(organizationId, { category: "roof_covering" }),
    getMaterialProductsForOrganization(organizationId, { category: "sheet_metal" }),
  ]);
  return [...roofCovering, ...sheetMetal].filter((product) => product.status === "active")
    .flatMap((product) => product.variants.filter((variant) => variant.purchasingUnit === "piece").map((variant) => ({
      id: variant.id, productId: product.id, productName: product.name, productCode: product.productCode,
      productCategory: product.category as "roof_covering" | "sheet_metal", variantName: variant.name,
      purchasingUnit: variant.purchasingUnit, nominalWidthMm: variant.nominalWidthMm,
      effectiveWidthMm: variant.effectiveWidthMm, lengthMm: variant.lengthMm,
      technicalSpecs: variant.technicalSpecs,
      provenance: variant.provenance, sourceName: variant.sourceName, latestPrice: variant.latestPrice,
    })));
}

export async function getMaterialTakeoffs(organizationId: string, projectId: string): Promise<TakeoffRecord[]> {
  return loadTakeoffs(organizationId, { projectId });
}

/** Independent (project-less) drafts; RLS limits them to their creator. */
export async function getStandaloneTakeoffs(organizationId: string, filter: { takeoffId?: string; calculationId?: string } = {}): Promise<TakeoffRecord[]> {
  return loadTakeoffs(organizationId, { projectId: null, ...filter });
}

async function loadTakeoffs(organizationId: string, scope: { projectId: string | null; takeoffId?: string; calculationId?: string }): Promise<TakeoffRecord[]> {
  const supabase = await createClient();
  let query = supabase.from("material_takeoffs").select("id, project_id, name, status, version, source_calculation_id, source_calculation_revision_id, source_roof_model_id, source_roof_model_revision_id").eq("organization_id", organizationId);
  query = scope.projectId === null ? query.is("project_id", null) : query.eq("project_id", scope.projectId);
  if (scope.takeoffId) query = query.eq("id", scope.takeoffId);
  if (scope.calculationId) query = query.eq("source_calculation_id", scope.calculationId);
  const { data: takeoffs, error } = await query.order("updated_at", { ascending: false });
  if (error) throw new Error("Az anyagkimutatások betöltése nem sikerült.");
  if (!takeoffs?.length) return [];
  const calcIds = takeoffs.map((item) => item.source_calculation_id);
  const roofModelIds = takeoffs.flatMap((item) => item.source_roof_model_id ? [item.source_roof_model_id] : []);
  const { data: calculations, error: calculationsError } = await supabase.from("calculations").select("id, display_name, current_revision_id").in("id", calcIds).eq("organization_id", organizationId);
  if (calculationsError) throw new Error("Az anyagkimutatások forrásszámításai nem tölthetők be.");
  const { data: roofModels, error: roofModelsError } = roofModelIds.length
    ? await supabase.from("roof_models").select("id, current_revision_id").in("id", roofModelIds).eq("organization_id", organizationId)
    : { data: [], error: null };
  if (roofModelsError) throw new Error("Az anyagkimutatások tetőforrásai nem tölthetők be.");
  const { data: items, error: itemsError } = await supabase.from("material_takeoff_items").select("id, takeoff_id, variant_id, final_quantity, quantity_unit, estimation_method, measurement_source, warnings, material_snapshot, price_snapshot, data_provenance").in("takeoff_id", takeoffs.map((item) => item.id)).eq("organization_id", organizationId);
  if (itemsError) throw new Error("Az anyagkimutatás tételei nem tölthetők be.");
  const catalogProducts = await getMaterialProductsForOrganization(organizationId, { includeArchived: true });
  const variantMap = new Map(catalogProducts.flatMap((product) => product.variants.map((variant) => [variant.id, variant] as const)));
  const productMap = new Map(catalogProducts.map((product) => [product.id, product] as const));
  return takeoffs.map((takeoff) => {
    const calc = (calculations ?? []).find((item) => item.id === takeoff.source_calculation_id);
    const roofModel = (roofModels ?? []).find((item) => item.id === takeoff.source_roof_model_id);
    return {
      id: takeoff.id, projectId: takeoff.project_id, name: takeoff.name, status: takeoff.status, version: takeoff.version,
      sourceCalculationId: takeoff.source_calculation_id, sourceRevisionId: takeoff.source_calculation_revision_id,
      sourceDisplayName: calc?.display_name ?? "Ismeretlen kalkuláció", sourceCurrentRevisionId: calc?.current_revision_id ?? null,
      sourceRoofModelId: takeoff.source_roof_model_id, sourceRoofRevisionId: takeoff.source_roof_model_revision_id,
      staleRoofSource: Boolean(takeoff.source_roof_model_revision_id && roofModel && takeoff.source_roof_model_revision_id !== roofModel.current_revision_id),
      items: (items ?? []).filter((item) => item.takeoff_id === takeoff.id).map((item) => {
        const snapshot = item.material_snapshot as Record<string, unknown>;
        const price = item.price_snapshot as Record<string, unknown> | null;
        const catalogVariant = variantMap.get(item.variant_id);
        const catalogProduct = productMap.get(catalogVariant?.productId ?? String(snapshot.productId ?? ""));
        const details = [coveringTransferDetails(snapshot), metalTileTransferDetails(snapshot), profileTransferDetails(snapshot), snapshot.lengthMm ? `hossz ${snapshot.lengthMm} mm` : null, snapshot.nominalWidthMm ? `névleges szélesség ${snapshot.nominalWidthMm} mm` : null, snapshot.effectiveWidthMm ? `hasznos szélesség ${snapshot.effectiveWidthMm} mm` : null, snapshot.thicknessMm ? `vastagság ${snapshot.thicknessMm} mm` : null, snapshot.technicalSpecs && typeof snapshot.technicalSpecs === "object" ? Object.entries(snapshot.technicalSpecs as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") : null].filter(Boolean).join(" · ");
        const priceDetails = price ? `${String(price.amount)} ${String(price.currency)}/${materialPurchasingUnitLabels[String(price.purchasingUnit) as MaterialPurchasingUnit] ?? String(price.purchasingUnit)} · ${String(price.sourceName ?? price.provenance ?? "forrás nincs megadva")} · ${String(price.effectiveDate)}` : null;
        const firstWarning = Array.isArray(item.warnings) && typeof item.warnings[0] === "string" ? item.warnings[0] : null;
        return {
          id: item.id, variantId: item.variant_id, materialSnapshot: snapshot, priceSnapshot: price,
          quantityExact: String(item.final_quantity), quantityUnit: item.quantity_unit,
          variantName: String(snapshot.variantName ?? variantMap.get(item.variant_id)?.name ?? "Ismeretlen változat"),
          sku: typeof snapshot.sku === "string" ? snapshot.sku : variantMap.get(item.variant_id)?.sku ?? null,
          productName: typeof snapshot.productName === "string" ? snapshot.productName : catalogProduct?.name ?? null,
          productCategory: typeof snapshot.productCategory === "string" ? snapshot.productCategory : catalogProduct?.category ?? null,
          provenance: item.data_provenance, technicalDetails: details || null, priceDetails,
          quantity: Number(item.final_quantity), unit: item.quantity_unit, method: item.estimation_method,
          source: item.measurement_source, warning: firstWarning,
        };
      }),
    };
  });
}

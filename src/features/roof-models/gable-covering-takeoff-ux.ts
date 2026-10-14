import type { GableCoveringTakeoffOption } from "@/features/material-takeoffs/takeoff-data";
import type { SavedGableCovering, SavedGableCoveringRevision } from "./gable-trapezoidal-covering-data";
import { coveringRevisionView } from "./gable-trapezoidal-covering-ux";

export type GableCoveringTakeoffOperation = Readonly<{ signature: string; operationId: string }>;

export function sameOrNewGableCoveringTakeoffOperation(
  previous: GableCoveringTakeoffOperation | null,
  signature: string,
  createId: () => string,
): GableCoveringTakeoffOperation {
  return previous?.signature === signature ? previous : { signature, operationId: createId() };
}

export function supportedTakeoffRevision(
  saved: SavedGableCovering,
  revision: SavedGableCoveringRevision,
  projectId: string,
  roofModelId: string,
): { ok: true; view: ReturnType<typeof coveringRevisionView> } | { ok: false; reason: string } {
  if (revision.scope !== "project" || saved.projectId !== projectId || saved.roofModelId !== roofModelId) {
    return { ok: false, reason: "Csak a megnyitott projekt mentett fedési változatából készülhet anyagkimutatás." };
  }
  if (revision.validationStatus !== "estimated") {
    return { ok: false, reason: "A kiválasztott mentett változat nem használható átadási forrásként." };
  }
  const view = coveringRevisionView(revision);
  if (view.covering.status !== "VALID") return { ok: false, reason: "A mentett fedési kiosztás érvénytelen vagy nem támogatott." };
  if (view.covering.planeCount !== 2 || view.covering.rowsPerPlane !== 1
    || view.covering.columnsPerPlane === null || view.covering.totalSheetCount === null
    || view.covering.totalSheetCount !== view.covering.columnsPerPlane * 2
    || !Number.isSafeInteger(view.covering.totalSheetCount)) {
    return { ok: false, reason: "A jelenlegi átadás síkonként egy teljes hosszú lemezsort támogat." };
  }
  if (view.coveringInput.selectedSheetLengthMm === null || view.coveringInput.nominalSheetWidthMm === null
    || view.coveringInput.effectiveCoveringWidthMm === null
    || view.coveringInput.selectedSheetLengthMm < view.covering.requiredCoveringLengthMm
    || (view.coveringInput.longitudinalOverlapMm ?? 0) !== 0) {
    return { ok: false, reason: "A kiválasztott változat nem teljes hosszú, átlapolás nélküli kiosztás." };
  }
  return { ok: true, view };
}

function dimensionsCompatible(option: GableCoveringTakeoffOption, dimensions: { nominalWidthMm: number; effectiveWidthMm: number; lengthMm: number }) {
  return (option.nominalWidthMm === null || option.nominalWidthMm === dimensions.nominalWidthMm)
    && (option.effectiveWidthMm === null || option.effectiveWidthMm === dimensions.effectiveWidthMm)
    && (option.lengthMm === null || option.lengthMm === dimensions.lengthMm);
}

export function compatibleGableCoveringTakeoffOptions(
  options: readonly GableCoveringTakeoffOption[],
  dimensions: { nominalWidthMm: number | null; effectiveWidthMm: number | null; lengthMm: number | null },
): GableCoveringTakeoffOption[] {
  if (dimensions.nominalWidthMm === null || dimensions.effectiveWidthMm === null || dimensions.lengthMm === null) return [];
  return options.filter((option) => (option.productCategory === "roof_covering" || option.productCategory === "sheet_metal")
    && option.purchasingUnit === "piece" && dimensionsCompatible(option, {
      nominalWidthMm: dimensions.nominalWidthMm!,
      effectiveWidthMm: dimensions.effectiveWidthMm!,
      lengthMm: dimensions.lengthMm!,
    }));
}

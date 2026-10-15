import type { GableCoveringTakeoffOption } from "@/features/material-takeoffs/takeoff-data";
import { deriveGableMetalTileTakeoff, type GableMetalTileTransferResult } from "@/domain/material-takeoffs/gable-metal-tile-transfer";
import type { SavedMetalTileCovering, SavedMetalTileCoveringRevision } from "./gable-metal-tile-covering-data";

export type GableMetalTileTakeoffOperation = Readonly<{ signature: string; operationId: string }>;

export function sameOrNewGableMetalTileTakeoffOperation(
  previous: GableMetalTileTakeoffOperation | null,
  signature: string,
  createId: () => string,
): GableMetalTileTakeoffOperation {
  return previous?.signature === signature ? previous : { signature, operationId: createId() };
}

export function supportedMetalTileTakeoffRevision(
  saved: SavedMetalTileCovering,
  revision: SavedMetalTileCoveringRevision,
  projectId: string,
  roofModelId: string,
): { ok: true; transfer: GableMetalTileTransferResult } | { ok: false; reason: string } {
  if (revision.scope !== "project" || saved.projectId !== projectId || saved.roofModelId !== roofModelId) {
    return { ok: false, reason: "Csak a megnyitott projekt mentett cserepeslemez-változatából készülhet anyagkimutatás." };
  }
  if (revision.validationStatus !== "estimated") {
    return { ok: false, reason: "A kiválasztott mentett változat nem használható átadási forrásként." };
  }
  const transfer = deriveGableMetalTileTakeoff(revision.input, revision.output);
  if (!transfer.ok) return { ok: false, reason: transfer.error ?? "A mentett cserepeslemez-kiosztás nem adható át." };
  return { ok: true, transfer };
}

function knownDimensionMatches(candidate: number | null, source: number): boolean {
  return candidate === null || candidate === source;
}

function moduleSpecMatches(option: GableCoveringTakeoffOption, key: string, expected: number): boolean {
  const raw = option.technicalSpecs?.[key];
  if (raw === undefined || raw.trim() === "") return true;
  const actual = Number(raw.trim().replace(",", "."));
  return Number.isFinite(actual) && actual === expected;
}

export function compatibleGableMetalTileTakeoffOptions(
  options: readonly GableCoveringTakeoffOption[],
  transfer: GableMetalTileTransferResult,
): GableCoveringTakeoffOption[] {
  if (!transfer.ok || !transfer.productInput) return [];
  const input = transfer.productInput;
  if (input.nominalSheetWidthMm === null || input.effectiveCoveringWidthMm === null || input.physicalSheetLengthMm === null) return [];
  return options.filter((option) => (option.productCategory === "roof_covering" || option.productCategory === "sheet_metal")
    && option.purchasingUnit === "piece"
    && knownDimensionMatches(option.nominalWidthMm, input.nominalSheetWidthMm!)
    && knownDimensionMatches(option.effectiveWidthMm, input.effectiveCoveringWidthMm!)
    && knownDimensionMatches(option.lengthMm, input.physicalSheetLengthMm!)
    && (!input.isModular || (moduleSpecMatches(option, "moduleBaseLengthMm", input.moduleBaseLengthMm!)
      && moduleSpecMatches(option, "modulePitchMm", input.modulePitchMm!)
      && moduleSpecMatches(option, "moduleCount", input.moduleCount!))));
}

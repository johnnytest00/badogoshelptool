import { executeCalculator, type CalculationResult } from "@/domain/calculations/engine";
import { sheetMetalProfileCalculator, type SheetMetalProfileInput, type SheetMetalProfileOutput } from "@/domain/calculations/sheet-metal-profile";

export type Template = "l" | "u" | "custom";
type ParameterSource = { kind: "user_provided" | "catalog_snapshot" | "machine_calibration" | "demo"; label: string; sourceUrl?: string | null; sourceDate?: string | null; catalogVariantId?: string | null; machineId?: string | null; toolingId?: string | null; calibrationId?: string | null; manuallyOverridden?: boolean };
export type EditableStraight = { id: string; length: string; dimensionSource: SheetMetalProfileInput["straights"][number]["dimensionSource"] };
export type EditableBend = { id: string; angle: string; radius: string; mode: "unknown" | "explicit_ba" | "k_factor"; value: string; source: string; sourceMetadata?: ParameterSource };
export type ProfileDraft = { profileId?: string; profileType: Template; template: Template; label: string; thickness: string; materialSpec: string; catalogVariantId: string; lengthPerPiece: string; pieceCount: string; straights: EditableStraight[]; bends: EditableBend[]; material?: SheetMetalProfileInput["material"]; notes?: string[]; nextId: number; dirty: boolean };
export type Selection = { kind: "straight" | "bend"; id: string } | null;

const demoBend = (id: string, angle: string): EditableBend => ({ id, angle, radius: "2", mode: "unknown", value: "", source: "" });

export function createTemplate(template: Template): ProfileDraft {
  const lengths = template === "l" ? ["60", "40"] : template === "u" ? ["40", "60", "40"] : ["60", "40"];
  const angles = template === "u" ? ["90", "90"] : ["90"];
  return { profileType: template, template, label: template === "l" ? "DEMO L-profil" : template === "u" ? "DEMO U-profil" : "DEMO egyedi nyitott profil",
    thickness: "1", materialSpec: "", catalogVariantId: "", lengthPerPiece: "", pieceCount: "", straights: lengths.map((length, index) => ({ id: `s${index + 1}`, length, dimensionSource: { kind: "demo", label: "DEMO sablonméret" } })),
    bends: angles.map((angle, index) => demoBend(`b${index + 1}`, angle)), nextId: Math.max(lengths.length, angles.length) + 1, dirty: false };
}

export function editStraight(draft: ProfileDraft, id: string, length: string): ProfileDraft {
  return { ...draft, dirty: true, straights: draft.straights.map((item) => item.id === id ? { ...item, length, dimensionSource: { ...item.dimensionSource, kind: "user_provided", label: "Felhasználói méret" } } : item) };
}

export function editBend(draft: ProfileDraft, id: string, changes: Partial<EditableBend>): ProfileDraft {
  return { ...draft, dirty: true, bends: draft.bends.map((item) => {
    if (item.id !== id) return item;
    const parameterChanged = changes.mode !== undefined || changes.value !== undefined || changes.source !== undefined;
    const sourceMetadata = parameterChanged && item.sourceMetadata ? { ...item.sourceMetadata, manuallyOverridden: true } : item.sourceMetadata;
    return { ...item, ...changes, sourceMetadata };
  }) };
}

export function addBend(draft: ProfileDraft): ProfileDraft {
  if (draft.bends.length >= 50) return draft;
  const id = draft.nextId;
  return { ...draft, template: "custom", profileType: "custom", dirty: true, nextId: id + 1,
    bends: [...draft.bends, demoBend(`b${id}`, "90")], straights: [...draft.straights, { id: `s${id}`, length: "40", dimensionSource: { kind: "demo", label: "DEMO sablonméret" } }] };
}

export function removeBend(draft: ProfileDraft, index: number): ProfileDraft {
  if (index < 0 || index >= draft.bends.length) return draft;
  return { ...draft, template: "custom", profileType: "custom", dirty: true,
    bends: draft.bends.filter((_, position) => position !== index),
    straights: draft.straights.filter((_, position) => position !== index + 1) };
}

function numeric(raw: string): number {
  const trimmed = raw.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed.replace(",", "."));
}

export function toDomainInput(draft: ProfileDraft): SheetMetalProfileInput {
  return { schemaVersion: "1.0.0", ...(draft.profileId ? { profileId: draft.profileId } : {}), profileType: draft.profileType, label: draft.label, coordinateConvention: "x-right-y-up", dimensionConvention: "finished_tangent",
    thicknessMm: numeric(draft.thickness),
    ...(draft.materialSpec.trim() || draft.catalogVariantId ? { material: { ...(draft.catalogVariantId ? { catalogVariantId: draft.catalogVariantId } : {}), materialSpec: draft.materialSpec.trim(),
      provenance: draft.catalogVariantId ? { kind: "catalog_snapshot" as const, label: draft.material?.provenance.label ?? "Katalógusvariáns", catalogVariantId: draft.catalogVariantId }
        : { kind: "user_provided" as const, label: "Felhasználói anyagmegadás" },
      ...(draft.material?.catalogSnapshot && draft.material.catalogVariantId === draft.catalogVariantId && draft.material.materialSpec === draft.materialSpec.trim() ? { catalogSnapshot: draft.material.catalogSnapshot } : {}) } } : {}),
    ...(draft.lengthPerPiece.trim() ? { formedRunLengthMm: numeric(draft.lengthPerPiece) } : {}),
    ...(draft.pieceCount.trim() ? { pieceCount: numeric(draft.pieceCount) } : {}), ...(draft.notes ? { notes: draft.notes } : {}),
    straights: draft.straights.map((straight) => ({ id: straight.id, tangentLengthMm: numeric(straight.length), dimensionSource: straight.dimensionSource })),
    bends: draft.bends.map((bend) => {
      const sourceKind = bend.sourceMetadata?.label === bend.source ? bend.sourceMetadata.kind : "user_provided";
      const source = { ...(bend.sourceMetadata ?? {}), kind: sourceKind, label: bend.source.trim() || "Felhasználói paraméter" };
      const allowance = bend.mode === "unknown" ? { mode: "unknown" as const }
        : bend.mode === "explicit_ba" ? { mode: "explicit_ba" as const, baMm: numeric(bend.value), source }
          : { mode: "k_factor" as const, kFactor: numeric(bend.value), source };
      return { id: bend.id, signedTurnDeg: numeric(bend.angle), insideRadiusMm: numeric(bend.radius), allowance };
    }) };
}

export function fromDomainInput(input: SheetMetalProfileInput): ProfileDraft {
  const template = input.profileType;
  const numericText = (value: number) => String(value);
  const ids = [...input.straights, ...input.bends].map((item) => Number(item.id.replace(/^[^0-9]*/, ""))).filter(Number.isFinite);
  return { profileId: input.profileId, profileType: template, template, label: input.label, thickness: numericText(input.thicknessMm),
    material: input.material, materialSpec: input.material?.materialSpec ?? "", catalogVariantId: input.material?.catalogVariantId ?? "",
    lengthPerPiece: input.formedRunLengthMm === undefined ? "" : numericText(input.formedRunLengthMm), pieceCount: input.pieceCount === undefined ? "" : numericText(input.pieceCount), notes: input.notes,
    straights: input.straights.map((item) => ({ id: item.id, length: numericText(item.tangentLengthMm), dimensionSource: item.dimensionSource })),
    bends: input.bends.map((item) => ({ id: item.id, angle: numericText(item.signedTurnDeg), radius: numericText(item.insideRadiusMm),
      mode: item.allowance.mode, value: item.allowance.mode === "explicit_ba" ? numericText(item.allowance.baMm) : item.allowance.mode === "k_factor" ? numericText(item.allowance.kFactor) : "",
      source: item.allowance.mode === "unknown" ? "" : item.allowance.source.label, sourceMetadata: item.allowance.mode === "unknown" ? undefined : item.allowance.source })),
    nextId: Math.max(1, ...ids) + 1, dirty: false };
}

export function calculateDraft(draft: ProfileDraft): CalculationResult<SheetMetalProfileInput, SheetMetalProfileOutput> {
  return executeCalculator(sheetMetalProfileCalculator, toDomainInput(draft));
}

export function selectionMatches(selection: Selection, kind: NonNullable<Selection>["kind"], id: string): boolean {
  return selection?.kind === kind && selection.id === id;
}

export function reverseAngle(raw: string): string {
  const angle = numeric(raw);
  return Number.isFinite(angle) ? String(-angle) : raw;
}

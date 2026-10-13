import { executeCalculator, type CalculationResult } from "@/domain/calculations/engine";
import { sheetMetalProfileCalculator, type SheetMetalProfileInput, type SheetMetalProfileOutput } from "@/domain/calculations/sheet-metal-profile";

export type Template = "l" | "u" | "custom";
export type EditableStraight = { id: string; length: string; origin: "demo" | "user_provided" };
export type EditableBend = { id: string; angle: string; radius: string; mode: "unknown" | "explicit_ba" | "k_factor"; value: string; source: string };
export type ProfileDraft = { template: Template; label: string; thickness: string; straights: EditableStraight[]; bends: EditableBend[]; nextId: number; dirty: boolean };
export type Selection = { kind: "straight" | "bend"; id: string } | null;

const demoBend = (id: string, angle: string): EditableBend => ({ id, angle, radius: "2", mode: "unknown", value: "", source: "" });

export function createTemplate(template: Template): ProfileDraft {
  const lengths = template === "l" ? ["60", "40"] : template === "u" ? ["40", "60", "40"] : ["60", "40"];
  const angles = template === "u" ? ["90", "90"] : ["90"];
  return { template, label: template === "l" ? "DEMO L-profil" : template === "u" ? "DEMO U-profil" : "DEMO egyedi nyitott profil",
    thickness: "1", straights: lengths.map((length, index) => ({ id: `s${index + 1}`, length, origin: "demo" })),
    bends: angles.map((angle, index) => demoBend(`b${index + 1}`, angle)), nextId: Math.max(lengths.length, angles.length) + 1, dirty: false };
}

export function editStraight(draft: ProfileDraft, id: string, length: string): ProfileDraft {
  return { ...draft, dirty: true, straights: draft.straights.map((item) => item.id === id ? { ...item, length, origin: "user_provided" } : item) };
}

export function editBend(draft: ProfileDraft, id: string, changes: Partial<EditableBend>): ProfileDraft {
  return { ...draft, dirty: true, bends: draft.bends.map((item) => item.id === id ? { ...item, ...changes } : item) };
}

export function addBend(draft: ProfileDraft): ProfileDraft {
  if (draft.bends.length >= 50) return draft;
  const id = draft.nextId;
  return { ...draft, template: "custom", dirty: true, nextId: id + 1,
    bends: [...draft.bends, demoBend(`b${id}`, "90")], straights: [...draft.straights, { id: `s${id}`, length: "40", origin: "demo" }] };
}

export function removeBend(draft: ProfileDraft, index: number): ProfileDraft {
  if (index < 0 || index >= draft.bends.length) return draft;
  return { ...draft, template: "custom", dirty: true,
    bends: draft.bends.filter((_, position) => position !== index),
    straights: draft.straights.filter((_, position) => position !== index + 1) };
}

function numeric(raw: string): number {
  const trimmed = raw.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed.replace(",", "."));
}

export function toDomainInput(draft: ProfileDraft): SheetMetalProfileInput {
  return { schemaVersion: "1.0.0", label: draft.label, coordinateConvention: "x-right-y-up", dimensionConvention: "finished_tangent",
    thicknessMm: numeric(draft.thickness),
    straights: draft.straights.map((straight) => ({ id: straight.id, tangentLengthMm: numeric(straight.length),
      dimensionSource: { kind: straight.origin, label: straight.origin === "demo" ? "DEMO sablonméret" : "Felhasználói méret" } })),
    bends: draft.bends.map((bend) => ({ id: bend.id, signedTurnDeg: numeric(bend.angle), insideRadiusMm: numeric(bend.radius),
      allowance: bend.mode === "unknown" ? { mode: "unknown" } : bend.mode === "explicit_ba"
        ? { mode: "explicit_ba", baMm: numeric(bend.value), source: { kind: "user_provided", label: bend.source } }
        : { mode: "k_factor", kFactor: numeric(bend.value), source: { kind: "user_provided", label: bend.source } } })) };
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

import { z } from "zod";
import type { FieldSurveySemanticType, FieldSurveyUnit, FieldSurveyWorkType } from "./contracts";

export const workElementKindSchema = z.enum(["gutter", "downpipe", "flashing_verge", "flashing_eave", "flashing_wall", "flashing_ridge", "valley", "chimney", "roof_window", "repair", "custom"]);
export type WorkElementKind = z.infer<typeof workElementKindSchema>;
export const roofEdgeRoleSchema = z.enum(["eave_total", "ridge", "verge_total"]);
export type RoofEdgeRole = z.infer<typeof roofEdgeRoleSchema>;
/** Explicitly accepted roof-length suggestion: the roof section lives in the same immutable survey revision, so the source revision is exact. */
export const lengthSourceSchema = z.object({ roofSectionId: z.string().uuid(), role: roofEdgeRoleSchema }).strict();
export type LengthSource = z.infer<typeof lengthSourceSchema>;

type Template = Readonly<{ label: string; unit: FieldSurveyUnit; semanticType: FieldSurveySemanticType }>;
type Def = Readonly<{ label: string; workType: FieldSurveyWorkType; roofRole?: RoofEdgeRole; templates: readonly Template[] }>;
const t = (label: string, unit: FieldSurveyUnit, semanticType: FieldSurveySemanticType = "custom"): Template => ({ label, unit, semanticType });
const run = (label: string, semantic: "gutter_run_length" | "flashing_run_length") => t(label, "m", semantic);

/** Only the primary run length (gutter/flashing, metres) can reach a material list; every other field is recorded, never converted. */
export const workElementDefs: Record<WorkElementKind, Def> = {
  gutter: { label: "Ereszcsatorna", workType: "gutter", roofRole: "eave_total", templates: [run("Ereszcsatorna szakaszhossza", "gutter_run_length"), t("Külső sarok", "count"), t("Belső sarok", "count"), t("Véglezáró", "count")] },
  downpipe: { label: "Lefolyócső", workType: "other", templates: [t("Lefolyócső hossza", "m"), t("Könyök", "count")] },
  flashing_verge: { label: "Oromszegély", workType: "flashing", roofRole: "verge_total", templates: [run("Oromszegély szakaszhossza", "flashing_run_length"), t("Szegély kiterített szélessége", "mm")] },
  flashing_eave: { label: "Ereszszegély", workType: "flashing", roofRole: "eave_total", templates: [run("Ereszszegély szakaszhossza", "flashing_run_length"), t("Szegély kiterített szélessége", "mm")] },
  flashing_wall: { label: "Falszegély", workType: "flashing", templates: [run("Falszegély szakaszhossza", "flashing_run_length"), t("Szegély kiterített szélessége", "mm")] },
  flashing_ridge: { label: "Gerincszegély", workType: "flashing", roofRole: "ridge", templates: [run("Gerincszegély szakaszhossza", "flashing_run_length"), t("Szegély kiterített szélessége", "mm")] },
  valley: { label: "Vápalemez", workType: "flashing", templates: [run("Vápa hossza", "flashing_run_length"), t("Vápalemez szélessége", "mm")] },
  chimney: { label: "Kémény", workType: "other", templates: [t("Kémény szélessége", "mm"), t("Kémény hossza", "mm"), t("Körbefutó szegély hossza", "m")] },
  roof_window: { label: "Tetőablak / áttörés", workType: "other", templates: [t("Nyílás szélessége", "mm"), t("Nyílás magassága", "mm"), t("Darabszám", "count")] },
  repair: { label: "Javítás", workType: "other", templates: [t("Javítandó hossz", "m"), t("Javítandó felület", "m2"), t("Darabszám", "count")] },
  custom: { label: "Egyedi munkaelem", workType: "other", templates: [t("Mérés", "mm")] },
};

export const workElementKinds = workElementKindSchema.options;
export const roofEdgeRoleLabels: Record<RoofEdgeRole, string> = { eave_total: "eresz összesen", ridge: "gerinc", verge_total: "oromszél összesen" };
export const primaryRunSemantic = (kind: WorkElementKind): FieldSurveySemanticType | null => {
  const first = workElementDefs[kind].templates[0].semanticType;
  return first === "custom" ? null : first;
};

type DuplicateCandidate = Readonly<{ id: string; name: string; elementKind?: WorkElementKind; lengthSource?: LengthSource; measurements: readonly Readonly<{ label: string; unit: string; value: number | string | null }>[] }>;
const numeric = (value: number | string | null) => {
  const n = typeof value === "string" ? (value.trim() === "" ? null : Number(value.trim().replace(",", "."))) : value;
  return n === null || !Number.isFinite(n) ? null : Math.round(n * 1e6) / 1e6;
};

/**
 * Likely accidental duplicates: same element type, identical measured dimensions (at least one filled) and no
 * conflicting source edge. Different materials on the same roof edge (e.g. gutter + eave flashing) differ in type and are never flagged.
 * Warn-only: nothing is removed or blocked. Returns, per element id, the names of the likely duplicates.
 */
export function suspectedDuplicates(elements: readonly DuplicateCandidate[]): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, string[]>();
  const sig = (el: DuplicateCandidate) => el.measurements.map((m) => `${m.label}|${m.unit}|${numeric(m.value)}`).join(";");
  const filled = (el: DuplicateCandidate) => el.measurements.some((m) => numeric(m.value) !== null);
  for (let i = 0; i < elements.length; i++) for (let j = i + 1; j < elements.length; j++) {
    const a = elements[i]; const b = elements[j];
    if (!a.elementKind || a.elementKind !== b.elementKind || !filled(a) || !filled(b) || sig(a) !== sig(b)) continue;
    if (a.lengthSource && b.lengthSource && (a.lengthSource.roofSectionId !== b.lengthSource.roofSectionId || a.lengthSource.role !== b.lengthSource.role)) continue;
    out.set(a.id, [...(out.get(a.id) ?? []), b.name]); out.set(b.id, [...(out.get(b.id) ?? []), a.name]);
  }
  return out;
}

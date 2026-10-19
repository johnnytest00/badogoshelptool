import type { FieldSurveySemanticType, FieldSurveyUnit } from "./contracts";

export type QuickGableDraft = Readonly<{ id: string; semanticType: FieldSurveySemanticType; unit: FieldSurveyUnit; value: string }>;
export type QuickGablePlane = Readonly<{ key: "a" | "b"; label: string; slopeMm: number; areaM2: number }>;
export type QuickGableResult =
  | Readonly<{ status: "ok"; planes: readonly QuickGablePlane[]; eaveRunMm: number; totalAreaM2: number; ridgeMm: number; eaveTotalMm: number; vergeTotalMm: number; planesMatch: boolean; fieldMessages: Readonly<Record<string, string>> }>
  | Readonly<{ status: "incomplete" | "invalid"; message: string; fieldMessages: Readonly<Record<string, string>> }>;

const MAX_MM = 200_000;
type Parsed = { mm: number | null; error?: string };

/** Hungarian decimal comma accepted; an empty field is "missing", never zero. */
export function quickLengthMm(draft: QuickGableDraft | undefined): Parsed {
  if (!draft || draft.value.trim() === "") return { mm: null };
  const raw = Number(draft.value.trim().replace(",", "."));
  if (!Number.isFinite(raw)) return { mm: null, error: "Adj meg érvényes számértéket." };
  if (draft.unit !== "mm" && draft.unit !== "m") return { mm: null, error: "Hosszmérethez mm vagy m egység szükséges." };
  const mm = raw * (draft.unit === "m" ? 1000 : 1);
  const rounded = Math.round(mm);
  if (Math.abs(mm - rounded) > 1e-6) return { mm: null, error: "Legfeljebb egész milliméter pontosságú érték adható meg." };
  if (rounded <= 0) return { mm: null, error: "A méret legyen nagyobb nullánál." };
  if (rounded > MAX_MM) return { mm: null, error: "A méret legfeljebb 200 m lehet." };
  return { mm: rounded };
}

/**
 * Area of a gable roof from direct measurements. Each plane is a rectangle of (eave-direction length × sloped
 * length); no pitch, rise or overhang is derived or assumed. `planesMatch` must be an explicit user decision.
 */
export function calculateQuickGable(drafts: readonly QuickGableDraft[], planesMatch: boolean | undefined): QuickGableResult {
  const find = (type: FieldSurveySemanticType) => drafts.find((draft) => draft.semanticType === type);
  const eave = find("roof_eave_run"); const a = find("roof_plane_slope_a"); const b = find("roof_plane_slope_b");
  const pe = quickLengthMm(eave); const pa = quickLengthMm(a); const pb = quickLengthMm(b);
  const messages: Record<string, string> = {};
  for (const [draft, parsed] of [[eave, pe], [a, pa], [b, pb]] as const) if (draft && parsed.error) messages[draft.id] = parsed.error;
  if (Object.keys(messages).length) return { status: "invalid", message: "Javítsd a jelölt méretet; addig nem számítható felület.", fieldMessages: messages };

  if (!drafts.some((draft) => draft.value.trim() !== "" && ["roof_eave_run", "roof_plane_slope_a", "roof_plane_slope_b"].includes(draft.semanticType))) {
    return { status: "incomplete", message: "Kezdd a tető hosszával az eresz irányában, majd mérd meg a sík lejtő menti hosszát.", fieldMessages: {} };
  }
  const missing: string[] = [];
  if (pe.mm === null) { missing.push("tetőhossz az eresz irányában"); if (eave) messages[eave.id] = "Add meg a tetőhosszt."; }
  if (pa.mm === null) { missing.push("A sík lejtő menti hossza"); if (a) messages[a.id] = "Add meg a sík lejtő menti hosszát."; }
  if (planesMatch === undefined) missing.push("hogy a két sík egyforma-e (válaszd ki lent)");
  else if (!planesMatch && pb.mm === null) { missing.push("B sík lejtő menti hossza"); if (b) messages[b.id] = "Eltérő síkoknál add meg a B síkot is."; }
  if (missing.length) return { status: "incomplete", message: `Még hiányzik: ${missing.join(", ")}.`, fieldMessages: messages };

  if (planesMatch && pb.mm !== null && pb.mm !== pa.mm && b) {
    return { status: "invalid", message: "Az egyformának jelölt síkok mért hossza eltér. Jelöld eltérőnek, vagy töröld a B síkot.", fieldMessages: { [b.id]: "Ellentmond az „egyforma síkok” megerősítésnek." } };
  }
  const eaveRunMm = pe.mm!; const slopeA = pa.mm!; const slopeB = planesMatch ? slopeA : pb.mm!;
  const area = (slope: number) => (eaveRunMm * slope) / 1_000_000;
  const planes: QuickGablePlane[] = [{ key: "a", label: "A sík", slopeMm: slopeA, areaM2: area(slopeA) }, { key: "b", label: "B sík", slopeMm: slopeB, areaM2: area(slopeB) }];
  return { status: "ok", planes, eaveRunMm, totalAreaM2: (eaveRunMm * (slopeA + slopeB)) / 1_000_000, ridgeMm: eaveRunMm, eaveTotalMm: 2 * eaveRunMm, vergeTotalMm: 2 * (slopeA + slopeB), planesMatch: Boolean(planesMatch), fieldMessages: {} };
}

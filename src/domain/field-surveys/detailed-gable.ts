import type { FieldSurveySemanticType } from "./contracts";
import { quickLengthMm, type QuickGableDraft } from "./quick-gable";

export type DetailedPlane = Readonly<{ key: "a" | "b"; label: string; eaveMm: number; slopeMm: number; areaM2: number; rectangle: boolean; vergeMm: readonly [number, number] | null }>;
export type DetailedGableResult =
  | Readonly<{ status: "ok"; planes: readonly DetailedPlane[]; ridgeMm: number; eaveTotalMm: number; vergeTotalMm: number | null; totalAreaM2: number; planesMatch: boolean; fieldMessages: Readonly<Record<string, string>> }>
  | Readonly<{ status: "empty" | "incomplete" | "invalid"; message: string; fieldMessages: Readonly<Record<string, string>> }>;

const roles = ["roof_ridge_length", "roof_eave_a", "roof_eave_b", "roof_plane_slope_a", "roof_plane_slope_b", "roof_verge_a_left", "roof_verge_a_right", "roof_verge_b_left", "roof_verge_b_right"] as const;
const m = (mm: number) => `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(mm / 1000)} m`;

/**
 * Gable roof from separately measured planes. Each plane is a trapezoid: eave edge, the shared ridge, and the
 * perpendicular eave-to-ridge distance (area = (eave + ridge) / 2 × distance; a rectangle when eave = ridge). Side edges are
 * only derived for rectangles (= the distance); for other planes they must be measured, otherwise the verge total stays unknown.
 * The mirror plane B is copied from A only after an explicit "planes match" decision. Pitch, if recorded, is never used.
 */
export function calculateDetailedGable(drafts: readonly QuickGableDraft[], planesMatch: boolean | undefined): DetailedGableResult {
  const by = (type: FieldSurveySemanticType) => drafts.find((draft) => draft.semanticType === type);
  const parsed = Object.fromEntries(roles.map((role) => [role, quickLengthMm(by(role))])) as Record<(typeof roles)[number], ReturnType<typeof quickLengthMm>>;
  const messages: Record<string, string> = {};
  for (const role of roles) { const d = by(role); if (d && parsed[role].error) messages[d.id] = parsed[role].error!; }
  if (Object.keys(messages).length) return { status: "invalid", message: "Javítsd a jelölt méretet, utána számolható a felület.", fieldMessages: messages };
  if (!roles.some((role) => parsed[role].mm !== null)) return { status: "empty", message: "Kezdd a gerinc hosszával, majd mérd meg az A sík eresz- és lejtő menti hosszát.", fieldMessages: {} };

  const ask = (role: (typeof roles)[number], text: string, label: string, missing: string[]) => { if (parsed[role].mm === null) { missing.push(label); const d = by(role); if (d) messages[d.id] = text; } };
  const missing: string[] = [];
  ask("roof_ridge_length", "Add meg a gerinc hosszát.", "a gerinc hossza", missing);
  ask("roof_eave_a", "Add meg az A sík eresz hosszát.", "az A sík eresz hossza", missing);
  ask("roof_plane_slope_a", "Add meg az A sík lejtő menti hosszát.", "az A sík lejtő menti hossza", missing);
  if (planesMatch === undefined) missing.push("hogy a két sík egyforma-e");
  else if (!planesMatch) { ask("roof_eave_b", "Eltérő síkoknál add meg a B sík eresz hosszát is.", "a B sík eresz hossza", missing); ask("roof_plane_slope_b", "Eltérő síkoknál add meg a B sík lejtő menti hosszát is.", "a B sík lejtő menti hossza", missing); }
  if (missing.length) return { status: "incomplete", message: `Még hiányzik: ${missing.join(", ")}.`, fieldMessages: messages };

  const R = parsed.roof_ridge_length.mm!; const eA = parsed.roof_eave_a.mm!; const hA = parsed.roof_plane_slope_a.mm!;
  if (planesMatch) {
    for (const [role, base, name] of [["roof_eave_b", eA, "eresze"], ["roof_plane_slope_b", hA, "lejtő menti hossza"]] as const) {
      const d = by(role);
      if (parsed[role].mm !== null && parsed[role].mm !== base && d) return { status: "invalid", message: `A B sík ${name} (${m(parsed[role].mm!)}) nem egyezik az A síkéval (${m(base)}), pedig egyformának jelölted őket. Jelöld őket eltérőnek, vagy töröld a B síkot.`, fieldMessages: { [d.id]: "Ellentmond az „egyforma síkok” jelölésnek." } };
    }
  }
  const eB = planesMatch ? eA : parsed.roof_eave_b.mm!; const hB = planesMatch ? hA : parsed.roof_plane_slope_b.mm!;

  const verges = (key: "a" | "b", e: number, h: number): { ok: true; value: readonly [number, number] | null } | { ok: false; message: string; fieldMessages: Record<string, string> } => {
    const l = parsed[`roof_verge_${key}_left` as const].mm; const r = parsed[`roof_verge_${key}_right` as const].mm;
    const dl = by(`roof_verge_${key}_left` as const); const dr = by(`roof_verge_${key}_right` as const);
    const plane = key === "a" ? "Az A sík" : "A B sík";
    if (e === R) {
      for (const [v, d] of [[l, dl], [r, dr]] as const) if (v !== null && v !== h && d) return { ok: false, message: `${plane} eresze és gerince egyforma hosszú, így a széle ${m(h)} (a lejtő menti hossz). A beírt ${m(v)} ettől eltér — ellenőrizd.`, fieldMessages: { [d.id]: `Itt ${m(h)} várható.` } };
      return { ok: true, value: [h, h] };
    }
    if (l === null || r === null) return { ok: true, value: null };
    const max = h * h + (e - R) * (e - R);
    for (const [v, d] of [[l, dl], [r, dr]] as const) {
      if (v * v < h * h && d) return { ok: false, message: `${plane} széle (${m(v)}) nem lehet rövidebb a lejtő menti hossznál (${m(h)}). Ellenőrizd a két mérést.`, fieldMessages: { [d.id]: `Legalább ${m(h)} kell legyen.` } };
      if (v * v > max && d) return { ok: false, message: `${plane} széle (${m(v)}) hosszabb, mint amennyi a sík méreteiből lehetséges (legfeljebb ${m(Math.sqrt(max))}). Ellenőrizd a méreteket.`, fieldMessages: { [d.id]: "Túl hosszú ehhez a síkhoz." } };
    }
    return { ok: true, value: [l, r] };
  };
  const vA = verges("a", eA, hA); if (!vA.ok) return { status: "invalid", message: vA.message, fieldMessages: vA.fieldMessages };
  const vB = planesMatch ? vA : verges("b", eB, hB); if (!vB.ok) return { status: "invalid", message: vB.message, fieldMessages: vB.fieldMessages };

  const plane = (key: "a" | "b", e: number, h: number, v: readonly [number, number] | null): DetailedPlane => ({ key, label: key === "a" ? "A sík" : "B sík", eaveMm: e, slopeMm: h, areaM2: ((e + R) * h) / 2 / 1_000_000, rectangle: e === R, vergeMm: v });
  const planes = [plane("a", eA, hA, vA.value), plane("b", eB, hB, vB.value)] as const;
  return {
    status: "ok", planes, ridgeMm: R, eaveTotalMm: eA + eB, planesMatch: Boolean(planesMatch), fieldMessages: {},
    vergeTotalMm: vA.value && vB.value ? vA.value[0] + vA.value[1] + vB.value[0] + vB.value[1] : null,
    totalAreaM2: (((eA + R) * hA + (eB + R) * hB) / 2) / 1_000_000,
  };
}

import { quickLengthMm, type QuickGableDraft } from "./quick-gable";

export type QuickShedResult =
  | Readonly<{ status: "ok"; eaveRunMm: number; slopeMm: number; areaM2: number; rakeTotalMm: number; fieldMessages: Readonly<Record<string, string>> }>
  | Readonly<{ status: "incomplete" | "invalid"; message: string; fieldMessages: Readonly<Record<string, string>> }>;

/**
 * Area of a single-slope (félnyeregtető) roof from two direct measurements: the length along the eave × the
 * length along the slope (rectangular plane). No pitch, rise or overhang is derived; empty is "missing", never zero.
 */
export function calculateQuickShed(drafts: readonly QuickGableDraft[]): QuickShedResult {
  const eave = drafts.find((d) => d.semanticType === "roof_eave_run");
  const slope = drafts.find((d) => d.semanticType === "roof_plane_slope_a");
  const pe = quickLengthMm(eave); const ps = quickLengthMm(slope);
  const messages: Record<string, string> = {};
  if (eave && pe.error) messages[eave.id] = pe.error;
  if (slope && ps.error) messages[slope.id] = ps.error;
  if (Object.keys(messages).length) return { status: "invalid", message: "Javítsd a jelölt méretet; addig nem számítható felület.", fieldMessages: messages };
  if (pe.mm === null && ps.mm === null) return { status: "incomplete", message: "Kezdd a tető hosszával az eresz mentén, majd mérd meg a lejtő menti hosszt.", fieldMessages: {} };
  const missing: string[] = [];
  if (pe.mm === null) { missing.push("tetőhossz az eresz mentén"); if (eave) messages[eave.id] = "Add meg a tetőhosszt."; }
  if (ps.mm === null) { missing.push("lejtő menti hossz"); if (slope) messages[slope.id] = "Add meg a lejtő menti hosszt."; }
  if (missing.length) return { status: "incomplete", message: `Még hiányzik: ${missing.join(", ")}.`, fieldMessages: messages };
  return { status: "ok", eaveRunMm: pe.mm!, slopeMm: ps.mm!, areaM2: (pe.mm! * ps.mm!) / 1_000_000, rakeTotalMm: 2 * ps.mm!, fieldMessages: {} };
}

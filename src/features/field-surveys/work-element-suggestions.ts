import { calculateDetailedGable } from "@/domain/field-surveys/detailed-gable";
import { calculateQuickGable } from "@/domain/field-surveys/quick-gable";
import type { RoofEdgeRole } from "@/domain/field-surveys/work-elements";
import { buildGableSurveyPreview } from "./gable-survey-preview";
import type { SurveySectionDraft } from "./survey-draft-recovery";

export type RoofEdgeSuggestion = Readonly<{ roofSectionId: string; roofName: string; role: RoofEdgeRole; valueMm: number; basis: string }>;

/** Calculated edge lengths of complete gable roof sections of this draft; nothing is suggested for incomplete or other roof types. */
export function roofEdgeSuggestions(sections: readonly SurveySectionDraft[]): RoofEdgeSuggestion[] {
  const out: RoofEdgeSuggestion[] = [];
  for (const section of sections) {
    if (section.elementKind || section.workType !== "roof" || section.roofType !== "gable") continue;
    const base = { roofSectionId: section.id, roofName: section.name };
    if (section.roofMeasurementMode === "quick") {
      const r = calculateQuickGable(section.measurements, section.quickPlanesMatch);
      if (r.status === "ok") out.push({ ...base, basis: "Gyors mérés", role: "eave_total", valueMm: r.eaveTotalMm }, { ...base, basis: "Gyors mérés", role: "ridge", valueMm: r.ridgeMm }, { ...base, basis: "Gyors mérés", role: "verge_total", valueMm: r.vergeTotalMm });
    } else if (section.roofMeasurementMode === "detailed") {
      const r = calculateDetailedGable(section.measurements, section.quickPlanesMatch);
      if (r.status === "ok") {
        out.push({ ...base, basis: "Részletes mérés", role: "eave_total", valueMm: r.eaveTotalMm }, { ...base, basis: "Részletes mérés", role: "ridge", valueMm: r.ridgeMm });
        if (r.vergeTotalMm !== null) out.push({ ...base, basis: "Részletes mérés", role: "verge_total", valueMm: r.vergeTotalMm });
      }
    } else {
      const lengths = buildGableSurveyPreview(section.measurements).output?.lengths;
      if (lengths) out.push({ ...base, basis: "Épületméretek", role: "eave_total", valueMm: Math.round(lengths.totalEaveEdgesMm) }, { ...base, basis: "Épületméretek", role: "ridge", valueMm: Math.round(lengths.ridgeLineMm) }, { ...base, basis: "Épületméretek", role: "verge_total", valueMm: Math.round(lengths.totalSlopingGableEdgesMm) });
    }
  }
  return out;
}

export const metres = (mm: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(mm / 1000);
/** Draft input string in Hungarian decimal-comma form. */
export const metresInput = (mm: number) => String(mm / 1000).replace(".", ",");

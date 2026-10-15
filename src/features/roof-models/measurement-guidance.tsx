"use client";

import type { FieldSurveySemanticType } from "@/domain/field-surveys/contracts";
import type { RoofGeometryType } from "@/domain/calculations/roof-geometry";

export type MeasurementGuide = Readonly<{
  key: string;
  title: string;
  unit: string;
  meaning: string;
  convention: string;
  secondaryView?: string;
}>;

const guide = (key: string, title: string, unit: string, meaning: string, convention: string, secondaryView?: string): MeasurementGuide => ({ key, title, unit, meaning, convention, secondaryView });

const gableGuides: Record<string, MeasurementGuide> = {
  buildingLengthMm: guide("buildingLengthMm", "Épület hossza", "mm", "A két oromfal közötti vízszintes távolság a gerinc irányában, falsíktól falsíkig.", "Vízszintes vetületi méret; az oromtúlnyúlás külön mező.", "Felülnézet: belső hosszméret"),
  buildingWidthMm: guide("buildingWidthMm", "Épület szélessége", "mm", "A két szemközti falsík közötti vízszintes távolság az eresz irányában.", "Vízszintes vetületi méret; az eresztúlnyúlás külön mező.", "Keresztmetszet: falsíktól falsíkig"),
  roofRiseMm: guide("roofRiseMm", "Tetőemelkedés", "mm", "A fal megtámasztási síkjától a gerincig mért függőleges magasság.", "Függőleges méret; nem ferde szarufahossz."),
  roofPitchDegrees: guide("roofPitchDegrees", "Tetőhajlásszög", "°", "Egy tetősík és a vízszintes sík közötti szög.", "Szögérték fokban; ebből a motor az emelkedést vezeti le.", "Keresztmetszet: szögív"),
  eaveOverhangMm: guide("eaveOverhangMm", "Eresz túlnyúlás", "mm", "A falsíktól az eresz külső kontúrjáig mért vízszintes távolság.", "Vízszintes vetületi méret; nem a lejtős felületen mért hossz."),
  frontGableOverhangMm: guide("frontGableOverhangMm", "Első oromtúlnyúlás", "mm", "Az első oromfal síkjától a tető külső végéig mért vízszintes hosszanti eltérés.", "A tető teljes hossza ezt külön hozzáadja az épület hosszához.", "Felülnézet: első végoldali eltérés"),
  rearGableOverhangMm: guide("rearGableOverhangMm", "Hátsó oromtúlnyúlás", "mm", "A hátsó oromfal síkjától a tető külső végéig mért vízszintes hosszanti eltérés.", "A tető teljes hossza ezt külön hozzáadja az épület hosszához.", "Felülnézet: hátsó végoldali eltérés"),
};

const multiGuides: Record<string, MeasurementGuide> = {
  lengthMm: guide("lengthMm", "Tető külső hossza", "mm", "A fő tetőrész külső kontúrjának hossza, a gerinc vagy a hosszanti irány mentén.", "Vízszintes vetületi méret; nem ferde felületi hossz."),
  widthMm: guide("widthMm", "Tető külső szélessége", "mm", "A fő tetőrész két szemközti külső eresz- vagy kontúrvonala közötti távolság.", "Vízszintes vetületi méret."),
  sideMm: guide("sideMm", "Tető külső oldalhossza", "mm", "A sátortető négyzetes ereszkontúrjának egyik külső oldala.", "Vízszintes vetületi méret; minden oldal egyenlő a modellben."),
  pitchDegrees: guide("pitchDegrees", "Tetőhajlásszög", "°", "A tetősík és a vízszintes sík közötti szög.", "Szögérték fokban; a síkfelület és a magasság ebből számítódik.", "Keresztmetszeti szögvezetés"),
  hipEaveHeightMm: guide("hipEaveHeightMm", "Félkonty alsó élének magassága", "mm", "A félkonty alsó élének függőleges szintje a fő eresz referencia-szintjéhez képest.", "Függőleges magasság; nem kontyél-hossz.", "Oldal- vagy végoldali szelvényvezetés"),
  wingWidthMm: guide("wingWidthMm", "Csatlakozó szárny szélessége", "mm", "Az L vagy T alakú szárny külső szélessége a főtető csatlakozási irányában.", "Vízszintes vetületi méret; a metszési vonal nem kerül kétszer a felületbe.", "Felülnézet: szárny keresztirányú mérete"),
  wingProjectionMm: guide("wingProjectionMm", "Szárny kinyúlása", "mm", "A főtető külső vonalától a szárny külső kontúrjáig mért vízszintes távolság.", "Vízszintes vetületi méret; nem a szárny lejtős hossza.", "Felülnézet: csatlakozási vonaltól a külső kontúrig"),
};

export function measurementGuideFor(type: RoofGeometryType, key: string): MeasurementGuide | null {
  return type === "gable" ? gableGuides[key] ?? null : multiGuides[key] ?? null;
}

const surveyKeyMap: Partial<Record<FieldSurveySemanticType, string>> = {
  roof_building_length: "buildingLengthMm", roof_building_width: "buildingWidthMm", roof_rise: "roofRiseMm", roof_pitch: "roofPitchDegrees",
  roof_eave_overhang: "eaveOverhangMm", roof_front_gable_overhang: "frontGableOverhangMm", roof_rear_gable_overhang: "rearGableOverhangMm",
  roof_outer_length: "lengthMm", roof_outer_width: "widthMm", roof_outer_side: "sideMm", roof_hip_eave_height: "hipEaveHeightMm", roof_wing_width: "wingWidthMm", roof_wing_projection: "wingProjectionMm",
};

export function measurementGuideForSurvey(type: RoofGeometryType, semanticType: FieldSurveySemanticType): MeasurementGuide | null {
  const key = surveyKeyMap[semanticType];
  return key ? measurementGuideFor(type, key) : null;
}

export function MeasurementGuidance({ guide: activeGuide, compact = false }: Readonly<{ guide: MeasurementGuide | null; compact?: boolean }>) {
  if (!activeGuide) return compact ? null : <p className="measurement-guidance measurement-guidance-empty" role="status">Fókuszálj egy méretmezőre: a rajz megmutatja, hol mérd, és a szöveg jelzi, milyen méretről van szó.</p>;
  if (compact) return <aside className="measurement-guidance is-compact" aria-live="polite" aria-atomic="true" data-active-measurement={activeGuide.key}>
    <div><strong>{activeGuide.title} · {activeGuide.unit}</strong><p title={activeGuide.meaning}>{activeGuide.meaning}</p></div>
    <details className="measurement-guidance-detail"><summary aria-label={`Részletes mérési útmutató: ${activeGuide.title}`}>?</summary><div><p>{activeGuide.meaning}</p><small>{activeGuide.convention}{activeGuide.secondaryView ? ` ${activeGuide.secondaryView}.` : ""}</small></div></details>
  </aside>;
  return <aside className={`measurement-guidance${compact ? " is-compact" : ""}`} aria-live="polite" aria-atomic="true" data-active-measurement={activeGuide.key}>
    <div><p className="section-eyebrow">Aktív mérési útmutató</p><strong>{activeGuide.title} · {activeGuide.unit}</strong></div>
    <p>{activeGuide.meaning}</p>
    <small>{activeGuide.convention}{activeGuide.secondaryView ? ` ${activeGuide.secondaryView}.` : ""}</small>
  </aside>;
}

"use client";

import { useMemo, useState } from "react";
import { calculateGableRoof, gableRoofInputSchema, type GableRoofInput } from "@/domain/calculations/gable-roof";
import { TechnicalDrawing } from "./technical-drawing";
import { GableTrapezoidalCoveringPanel } from "./gable-trapezoidal-covering-panel";

type Draft = Record<string, string> & { inputMode: "height" | "angle" };
const emptyDraft: Draft = {
  inputMode: "height", buildingLengthMm: "", buildingWidthMm: "", roofRiseMm: "", roofPitchDegrees: "",
  eaveOverhangMm: "", frontGableOverhangMm: "", rearGableOverhangMm: "",
};
const parse = (value: string) => value.trim() ? Number(value.trim().replace(",", ".")) : undefined;
const format = (value: number, unit: string) => `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value)} ${unit}`;

function toInput(draft: Draft): GableRoofInput | null {
  const parsed = gableRoofInputSchema.safeParse({
    inputMode: draft.inputMode,
    buildingLengthMm: parse(draft.buildingLengthMm), buildingWidthMm: parse(draft.buildingWidthMm),
    eaveOverhangMm: parse(draft.eaveOverhangMm), frontGableOverhangMm: parse(draft.frontGableOverhangMm), rearGableOverhangMm: parse(draft.rearGableOverhangMm),
    roofRiseMm: draft.inputMode === "height" ? parse(draft.roofRiseMm) : undefined,
    roofPitchDegrees: draft.inputMode === "angle" ? parse(draft.roofPitchDegrees) : undefined,
  });
  return parsed.success ? parsed.data : null;
}

export function StandaloneGablePreview() {
  const [draft, setDraft] = useState(emptyDraft);
  const input = useMemo(() => toInput(draft), [draft]);
  const result = useMemo(() => input ? calculateGableRoof(input) : null, [input]);
  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const fields: { key: keyof Draft; label: string; unit: string }[] = [
    { key: "buildingLengthMm", label: "Épület hossza", unit: "mm" },
    { key: "buildingWidthMm", label: "Épület szélessége", unit: "mm" },
    ...(draft.inputMode === "height" ? [{ key: "roofRiseMm" as const, label: "Tetőemelkedés", unit: "mm" }] : [{ key: "roofPitchDegrees" as const, label: "Tetőhajlás", unit: "°" }]),
    { key: "eaveOverhangMm", label: "Eresztúlnyúlás", unit: "mm" },
    { key: "frontGableOverhangMm", label: "Első oromtúlnyúlás", unit: "mm" },
    { key: "rearGableOverhangMm", label: "Hátsó oromtúlnyúlás", unit: "mm" },
  ];
  return <section className="detail-surface" aria-labelledby="standalone-gable-title">
    <header className="section-heading"><div><p className="section-eyebrow">Tetők és tetőfedés · projekt nélküli előnézet</p><h1 id="standalone-gable-title">Nyeregtető geometria</h1><p>A meglévő `roof.gable` motor számítja az eredményeket. Ez az előnézet nem ment, nem készít anyagkimutatást, és nem végez statikai méretezést.</p></div></header>
    <form className="roof-form" onSubmit={(event) => event.preventDefault()}>
      <label className="roof-field"><span>Bemenet módja</span><select value={draft.inputMode} onChange={(event) => { const inputMode = event.target.value as Draft["inputMode"]; setDraft((current) => ({ ...current, inputMode, roofRiseMm: "", roofPitchDegrees: "" })); }}><option value="height">Tetőemelkedés</option><option value="angle">Tetőhajlás</option></select></label>
      {fields.map((field) => <label className="roof-field" key={field.key}><span>{field.label} <small>{field.unit}</small></span><input inputMode="decimal" value={draft[field.key]} onChange={(event) => set(field.key, event.target.value)} /></label>)}
    </form>
    {result ? <><section className="roof-results" aria-live="polite"><div className="roof-result-grid">
      <div className="roof-result-metric"><small>Teljes tetőfelület</small><strong>{format(result.areas.combinedRoofM2, "m²")}</strong></div>
      <div className="roof-result-metric"><small>Vízszintes vetület</small><strong>{format(result.areas.horizontalProjectedM2, "m²")}</strong></div>
      <div className="roof-result-metric"><small>Egy tetősík felülete</small><strong>{format(result.areas.individualRoofPlaneM2, "m²")}</strong></div>
      <div className="roof-result-metric"><small>Tetőhajlásszög</small><strong>{format(result.angles.pitchDegrees, "°")}</strong></div>
      <div className="roof-result-metric"><small>Ferde hossz a falig</small><strong>{format(result.lengths.slopeLengthToWallMm / 1000, "m")}</strong></div>
      <div className="roof-result-metric"><small>Ferde hossz túlnyúlással</small><strong>{format(result.lengths.slopeLengthIncludingEaveMm / 1000, "m")}</strong></div>
      <div className="roof-result-metric"><small>Gerincvonal</small><strong>{format(result.lengths.ridgeLineMm / 1000, "m")}</strong></div>
      <div className="roof-result-metric"><small>Két ereszél összesen</small><strong>{format(result.lengths.totalEaveEdgesMm / 1000, "m")}</strong></div>
      <div className="roof-result-metric"><small>Ferde oromélek összesen</small><strong>{format(result.lengths.totalSlopingGableEdgesMm / 1000, "m")}</strong></div>
    </div></section><GableTrapezoidalCoveringPanel geometry={result} sourceLabel="Kézi tetőméretek · projekt nélküli előnézet" /><TechnicalDrawing output={result} isSaved={false} /></>
      : <p className="missing-data">Add meg az összes méretet egész milliméterben, vagy válassz érvényes tetőhajlást a geometriai előnézethez.</p>}
    <p className="roof-disclaimer">A ferde hossz geometriai érték; nem igazolt szarufavágási méret. A felület és hosszak nem jelentenek fedőanyag-, léc-, fólia- vagy szerkezeti mennyiséget.</p>
  </section>;
}

"use client";

import { useMemo, useState } from "react";
import type { GableRoofOutput } from "@/domain/calculations/gable-roof";
import { calculateGableTrapezoidalCovering, type GableTrapezoidalCoveringInput } from "@/domain/calculations/gable-trapezoidal-covering";

type Draft = { nominalSheetWidthMm: string; effectiveCoveringWidthMm: string; selectedSheetLengthMm: string; minimumSheetLengthMm: string; maximumSheetLengthMm: string; endAllowanceMm: string; longitudinalOverlapMm: string; lapCompatibilityConfirmed: boolean };
const initial: Draft = { nominalSheetWidthMm: "", effectiveCoveringWidthMm: "", selectedSheetLengthMm: "", minimumSheetLengthMm: "", maximumSheetLengthMm: "", endAllowanceMm: "", longitudinalOverlapMm: "", lapCompatibilityConfirmed: false };
const number = (value: string): number | null => value.trim() === "" ? null : Number(value.trim().replace(",", "."));
const display = (value: number | null, unit: string) => value === null ? "—" : `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value)} ${unit}`;

function LayoutDrawing({ columns, rows, roofLength, slopeLength }: { columns: number; rows: number; roofLength: number; slopeLength: number }) {
  const lines: string[] = [];
  if (rows <= 400) for (const x of [30, 230]) {
    for (let i = 1; i < columns; i++) { const at = x + (180 * i) / columns; lines.push(`M${at} 35V145`); }
    for (let i = 1; i < rows; i++) { const at = 35 + (110 * i) / rows; lines.push(`M${x} ${at}h180`); }
  }
  return <svg className="covering-layout-svg" viewBox="0 0 440 190" role="img" aria-label={`Sematikus lemezkiosztás: síkonként ${columns} oszlop és ${rows} sor`}><title>Sematikus fedési kiosztás</title><desc>A két azonos nyeregtető-sík hasznos szélességű lemezoszlopokra és a számított toldássorokra osztva.</desc><path d="M30 35H210V145H30Z M230 35H410V145H230Z" className="covering-plane"/><path d={lines.join("")} className="covering-grid"/><text x="120" y="165" textAnchor="middle">Bal tetősík</text><text x="320" y="165" textAnchor="middle">Jobb tetősík</text><text x="220" y="20" textAnchor="middle">Tetőhossz {display(roofLength / 1000, "m")} · ferde hossz {display(slopeLength / 1000, "m")}</text>{rows > 400 && <text x="220" y="184" textAnchor="middle">A túl nagy sorháló sematikus rajza rácsvonalak nélkül</text>}</svg>;
}

export function GableTrapezoidalCoveringPanel({ geometry, sourceLabel }: Readonly<{ geometry: GableRoofOutput; sourceLabel: string }>) {
  const [draft, setDraft] = useState(initial);
  const input = useMemo<GableTrapezoidalCoveringInput>(() => ({ nominalSheetWidthMm: number(draft.nominalSheetWidthMm), effectiveCoveringWidthMm: number(draft.effectiveCoveringWidthMm), selectedSheetLengthMm: number(draft.selectedSheetLengthMm), minimumSheetLengthMm: number(draft.minimumSheetLengthMm), maximumSheetLengthMm: number(draft.maximumSheetLengthMm), endAllowanceMm: number(draft.endAllowanceMm), longitudinalOverlapMm: number(draft.longitudinalOverlapMm), lapCompatibilityConfirmed: draft.lapCompatibilityConfirmed, maximumSheetCount: 100_000 }), [draft]);
  const result = useMemo(() => calculateGableTrapezoidalCovering(geometry, input), [geometry, input]);
  const set = (key: keyof Draft, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));
  const fields: { key: Exclude<keyof Draft, "lapCompatibilityConfirmed">; label: string }[] = [
    { key: "nominalSheetWidthMm", label: "Névleges lemezszélesség" },
    { key: "effectiveCoveringWidthMm", label: "Hasznos fedési szélesség" },
    { key: "selectedSheetLengthMm", label: "Kiválasztott lemezhossz" },
    { key: "minimumSheetLengthMm", label: "Megadott termékminimum" },
    { key: "maximumSheetLengthMm", label: "Megadott termékmaximum" },
    { key: "endAllowanceMm", label: "Kézi hosszráhagyás" },
    { key: "longitudinalOverlapMm", label: "Hosszanti átlapolás" },
  ];
  return <section className="roof-surface trapezoidal-covering" aria-labelledby="trapezoidal-covering-title">
    <div className="roof-section-heading"><div><p className="section-eyebrow">Tetők és tetőfedés · {sourceLabel}</p><h2 id="trapezoidal-covering-title">Trapézlemez-fedés mennyiségi előnézet</h2><p>A tetőméretek az ellenőrzött nyeregtető-geometriából származnak. A termékadatokat kézzel kell megadni.</p></div></div>
    <div className="roof-form-grid">{fields.map((field) => <label className="roof-field" key={field.key}><span>{field.label} <small>mm</small></span><input inputMode="decimal" value={draft[field.key]} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} onChange={(event) => set(field.key, event.target.value)} /></label>)}</div>
    <label className="roof-field roof-covering-confirm"><span><input type="checkbox" checked={draft.lapCompatibilityConfirmed} onChange={(event) => set("lapCompatibilityConfirmed", event.target.checked)} /> Megerősítem, hogy a megadott termék és kialakítás alkalmas hosszanti toldásra</span></label>
    <p className="roof-help-note">A lemez a tetősík lejtésirányában fut. A hasznos szélesség önálló adat; ebből a kalkulátor nem von le ismét oldalsó átfedést. A termékhatárok és a hosszráhagyás opcionális, kézi adatok. Forrás: {sourceLabel}. Mentés és gyártói katalóguskapcsolat nem érhető el.</p>
    {result.status === "VALID" && result.columnsPerPlane !== null && result.rowsPerPlane !== null ? <><div className="roof-result-grid" aria-live="polite">
      <div className="roof-result-metric"><small> tetősík</small><strong>{display(result.roofPlaneAreaMm2 / 1_000_000, "m²")}</strong></div>
      <div className="roof-result-metric"><small>Teljes tetőfelület</small><strong>{display(result.totalRoofAreaMm2 / 1_000_000, "m²")}</strong></div>
      <div className="roof-result-metric"><small>Oszlop / sík</small><strong>{result.columnsPerPlane} db</strong></div>
      <div className="roof-result-metric"><small>Sor / sík</small><strong>{result.rowsPerPlane} db</strong></div>
      <div className="roof-result-metric"><small>Előzetes lemezmennyiség</small><strong>{result.totalSheetCount} db</strong></div>
      <div className="roof-result-metric"><small>Megadott hajlásszög</small><strong>{display(result.pitchDegrees, "°")}</strong></div>
      <div className="roof-result-metric"><small>Névleges összterület</small><strong>{display(result.purchasedNominalAreaMm2 === null ? null : result.purchasedNominalAreaMm2 / 1_000_000, "m²")}</strong></div>
      <div className="roof-result-metric"><small>Fedett tetőterület</small><strong>{display(result.installedCoveredAreaMm2 === null ? null : result.installedCoveredAreaMm2 / 1_000_000, "m²")}</strong></div>
    </div><LayoutDrawing columns={result.columnsPerPlane} rows={result.rowsPerPlane} roofLength={result.roofLongitudinalLengthMm} slopeLength={result.slopeLengthMm} /><p className="roof-disclaimer">Sematikus kiosztás, nem gyártási vagy vágási terv. Az előzetes darabszám nem rendelési mennyiség; vágási veszteség, termékalkalmasság és rögzítés nincs számítva.</p></> : <p className="missing-data" role="status">{result.status === "UNSUPPORTED" ? "Ez a tető- vagy lemezkiosztás nem támogatott." : result.status === "INVALID" ? result.reasons.join(" ") : "Add meg a hasznos fedési szélességet és a kiválasztott lemezhosszt a mennyiségi eredményhez."} {result.reasons.length > 0 && result.status !== "INVALID" ? result.reasons.join(" ") : ""}</p>}
  </section>;
}

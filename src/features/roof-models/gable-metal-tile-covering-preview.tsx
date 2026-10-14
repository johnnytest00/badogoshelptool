"use client";

import { useMemo, useState } from "react";
import { calculateGableRoof, gableRoofInputSchema, type GableRoofOutput } from "@/domain/calculations/gable-roof";
import { calculateGableMetalTileCovering, type GableMetalTileCoveringInput, type GableMetalTileCoveringOutput } from "@/domain/calculations/gable-metal-tile-covering";

type Draft = Record<keyof GableMetalTileCoveringInput, string | boolean>;
const initial: Draft = { nominalSheetWidthMm: "", effectiveCoveringWidthMm: "", physicalSheetLengthMm: "", effectiveCoveringLengthMm: "", minimumPhysicalLengthMm: "", maximumPhysicalLengthMm: "", eaveEndAllowanceMm: "", ridgeEndAllowanceMm: "", longitudinalOverlapMm: "", lengthCompatibilityConfirmed: false, lengthDataSource: "", isModular: false, moduleBaseLengthMm: "", modulePitchMm: "", moduleCount: "" };
const numericKeys = ["nominalSheetWidthMm", "effectiveCoveringWidthMm", "physicalSheetLengthMm", "effectiveCoveringLengthMm", "minimumPhysicalLengthMm", "maximumPhysicalLengthMm", "eaveEndAllowanceMm", "ridgeEndAllowanceMm", "longitudinalOverlapMm", "moduleBaseLengthMm", "modulePitchMm", "moduleCount"] as const;
const labels: Record<(typeof numericKeys)[number], string> = { nominalSheetWidthMm: "Névleges lemezszélesség", effectiveCoveringWidthMm: "Hasznos fedési szélesség", physicalSheetLengthMm: "Fizikai lemezhossz", effectiveCoveringLengthMm: "Tényleges fedési hossz", minimumPhysicalLengthMm: "Termékminimum", maximumPhysicalLengthMm: "Termékmaximum", eaveEndAllowanceMm: "Ereszvégi ráhagyás", ridgeEndAllowanceMm: "Gerincvégi ráhagyás", longitudinalOverlapMm: "Hosszanti átlapolás", moduleBaseLengthMm: "Első modul fedési hossza", modulePitchMm: "Modulosztás", moduleCount: "Modulszám" };
const parse = (value: string): number | null => value.trim() === "" ? null : Number(value.trim().replace(",", "."));
const fmt = (value: number | null | undefined, unit: string) => value == null ? "—" : `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value)} ${unit}`;

function productInput(draft: Draft): GableMetalTileCoveringInput {
  const numbers = Object.fromEntries(numericKeys.map((key) => [key, parse(String(draft[key]))])) as Record<(typeof numericKeys)[number], number | null>;
  return { ...numbers, lengthCompatibilityConfirmed: Boolean(draft.lengthCompatibilityConfirmed), lengthDataSource: String(draft.lengthDataSource).trim() || null, isModular: Boolean(draft.isModular) };
}

export function MetalTileDrawing({ output }: { output: GableMetalTileCoveringOutput }) {
  if (output.status !== "VALID" || output.columnsPerPlane === null) return null;
  const columns = output.columnsPerPlane;
  const moduleDivisions = output.moduleDivisionPositionsMm.map((position) => 120 - 100 * position / (output.effectiveCoveringLengthMm ?? 1)).filter((position) => position > 20 && position < 120);
  return <section className="detail-surface drawing-surface" aria-label="Sematikus fedési rajz">
    <h3>Sematikus fedési rajz</h3><p>Nem vágási vagy gyártási terv · két tetősík, {columns} oszlop síkonként, 1 teljes hosszúságú sor.</p>
    <div className="drawing-scroll"><svg viewBox="0 0 500 185" role="img" aria-label={`Két tetősík, összesen ${output.totalSheetCount} cserepeslemez-tábla`} data-columns-per-plane={columns} data-total-sheet-count={output.totalSheetCount} data-module-divisions={moduleDivisions.length} className="gable-metal-tile-svg">
      {[20, 260].map((x, plane) => <g key={x}><rect x={x} y="20" width="220" height="130" fill="#eff6ff" stroke="#334155" strokeWidth="2" />
        {Array.from({ length: Math.max(0, columns - 1) }, (_, index) => <line key={`c${index}`} x1={x + 220 * (index + 1) / columns} y1="20" x2={x + 220 * (index + 1) / columns} y2="150" stroke="#64748b" strokeWidth="1" />)}
        {moduleDivisions.map((y, index) => <line key={`m${index}`} x1={x} y1={y + 20} x2={x + 220} y2={y + 20} stroke="#0f766e" strokeDasharray="4 3" />)}
        <text x={x + 110} y="171" textAnchor="middle" fontSize="12">{plane === 0 ? "Bal tetősík" : "Jobb tetősík"} · {columns} db</text>
      </g>)}
      <text x="250" y="13" textAnchor="middle" fontSize="11">Ferde fedési hossz: {fmt(output.effectiveCoveringLengthMm, "mm")}</text>
    </svg></div>
  </section>;
}

export function GableMetalTileCoveringPreview({ geometry, sourceLabel }: Readonly<{ geometry: GableRoofOutput; sourceLabel: string }>) {
  const [draft, setDraft] = useState<Draft>(initial);
  const output = useMemo(() => calculateGableMetalTileCovering(geometry, productInput(draft)), [geometry, draft]);
  const set = (key: keyof Draft, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));
  const status = { VALID: "Érvényes feltételes mennyiségi előnézet", INCOMPLETE: "További termékadat szükséges", INVALID: "Érvénytelen termékadat", UNSUPPORTED: "Nem támogatott kiosztás" }[output.status];
  return <section className="roof-surface gable-metal-tile-panel" aria-labelledby="metal-tile-title">
    <div className="roof-section-heading"><div><p className="section-eyebrow">Cserepeslemez-fedés · motor és előnézet</p><h2 id="metal-tile-title">Cserepeslemez-fedés</h2></div><span className="unit-note">Minden termékadat kézi</span></div>
    <p className="roof-help-note">Tetőgeometria forrása: {sourceLabel}. A ferde tetőhossz és a tetőfelület a <code>roof.gable</code> motorból származik; az alábbi méretek termékspecifikus, kézzel megadott adatok.</p>
    <div className="roof-form-grid">{numericKeys.filter((key) => !key.startsWith("module") || draft.isModular).map((key) => <label className="roof-field" key={key}><span>{labels[key]} <small>{key === "moduleCount" ? "db" : "mm"}</small></span><input inputMode="decimal" value={String(draft[key])} onChange={(event) => set(key, event.target.value)} /><em>{["minimumPhysicalLengthMm", "maximumPhysicalLengthMm"].includes(key) ? "Opcionális gyártói adat; hagyd üresen, ha nem ismert." : key.endsWith("AllowanceMm") ? "Külön termékadat; nem kerül automatikusan levonásra." : "A motor nem helyettesíti a gyártói adatlapot."}</em></label>)}</div>
    <label className="roof-field"><span><input type="checkbox" checked={Boolean(draft.lengthCompatibilityConfirmed)} onChange={(event) => set("lengthCompatibilityConfirmed", event.target.checked)} /> A megadott hossz kompatibilitását termékadat alapján ellenőriztem</span><em>A kézi jelölés és forrásmegnevezés nem minősül gyártói tanúsításnak.</em></label>
    <label className="roof-field"><span>Hosszadat forrása</span><input value={String(draft.lengthDataSource)} onChange={(event) => set("lengthDataSource", event.target.value)} placeholder="Például megnevezett termékadatlap" /></label>
    <label className="roof-field"><span><input type="checkbox" checked={Boolean(draft.isModular)} onChange={(event) => { const checked = event.target.checked; setDraft((current) => ({ ...current, isModular: checked, ...(checked ? {} : { moduleBaseLengthMm: "", modulePitchMm: "", moduleCount: "" }) })); }} /> Moduláris lemez, explicit termékképlettel</span><em>A fedési hossz szerződése: első modulhossz + modulszám × modulosztás.</em></label>
    <div className={`metal-tile-status is-${output.status.toLowerCase()}`} role="status"><strong>{status}</strong>{output.reasons.length > 0 && <ul>{output.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}</div>
    {output.status === "VALID" && <><div className="roof-result-highlight"><span>Feltételes összes lemezmennyiség</span><strong>{output.totalSheetCount} db</strong><small>{output.columnsPerPlane} db tetősíkonként · 1 sor síkonként</small></div><div className="roof-result-grid"><Metric label="Tetőfelület" value={fmt(output.totalRoofAreaMm2 / 1_000_000, "m²")} /><Metric label="Egy sík felülete" value={fmt(output.roofPlaneAreaMm2 / 1_000_000, "m²")} /><Metric label="Vízszintes tetőhossz" value={fmt(output.roofLongitudinalLengthMm, "mm")} /><Metric label="Szükséges fedési hossz" value={fmt(output.requiredCoveringLengthMm, "mm")} /><Metric label="Hasznos fedési szélesség" value={fmt(output.effectiveCoveringWidthMm, "mm")} /><Metric label="Fizikai lemezhossz" value={fmt(output.physicalSheetLengthMm, "mm")} /><Metric label="Tényleges fedési hossz" value={fmt(output.effectiveCoveringLengthMm, "mm")} /><Metric label="Névleges lemezfelület összesen" value={fmt(output.totalNominalSheetAreaMm2! / 1_000_000, "m²")} /></div><MetalTileDrawing output={output} /></>}
    <p className="roof-disclaimer">Feltételes anyagmennyiség a megadott adatok alapján. Nem igazol szerkezeti megfelelőséget, tetőhajlás-alkalmasságot, rögzítést vagy gyártói telepítési jóváhagyást.</p>
  </section>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="roof-result-metric"><small>{label}</small><strong>{value}</strong></div>; }

type StandaloneDraft = Record<string, string> & { inputMode: "height" | "angle" };
const emptyRoof: StandaloneDraft = { inputMode: "height", buildingLengthMm: "", buildingWidthMm: "", roofRiseMm: "", roofPitchDegrees: "", eaveOverhangMm: "", frontGableOverhangMm: "", rearGableOverhangMm: "" };
export function StandaloneGableMetalTilePreview() {
  const [draft, setDraft] = useState(emptyRoof);
  const geometryInput = useMemo(() => {
    const number = (key: string) => parse(draft[key]) ?? undefined;
    const raw: Record<string, unknown> = { inputMode: draft.inputMode, buildingLengthMm: number("buildingLengthMm"), buildingWidthMm: number("buildingWidthMm"), eaveOverhangMm: number("eaveOverhangMm"), frontGableOverhangMm: number("frontGableOverhangMm"), rearGableOverhangMm: number("rearGableOverhangMm"), ...(draft.inputMode === "height" ? { roofRiseMm: number("roofRiseMm") } : { roofPitchDegrees: number("roofPitchDegrees") }) };
    const parsed = gableRoofInputSchema.safeParse(raw); return parsed.success ? parsed.data : null;
  }, [draft]);
  const geometry = useMemo(() => geometryInput ? calculateGableRoof(geometryInput) : null, [geometryInput]);
  const keys = ["buildingLengthMm", "buildingWidthMm", draft.inputMode === "height" ? "roofRiseMm" : "roofPitchDegrees", "eaveOverhangMm", "frontGableOverhangMm", "rearGableOverhangMm"];
  const names: Record<string, string> = { buildingLengthMm: "Épület hossza", buildingWidthMm: "Épület szélessége", roofRiseMm: "Tetőemelkedés", roofPitchDegrees: "Tetőhajlás", eaveOverhangMm: "Eresz túlnyúlás", frontGableOverhangMm: "Első orom túlnyúlás", rearGableOverhangMm: "Hátsó orom túlnyúlás" };
  return <><section className="roof-surface"><p className="section-eyebrow">Projekt nélküli kézi geometria</p><h1>Cserepeslemez-fedés</h1><p>A méretek a meglévő <code>roof.gable</code> motorba kerülnek; termékadatot nem töltünk ki automatikusan.</p><label className="roof-field"><span>Tetőadat módja</span><select value={draft.inputMode} onChange={(event) => setDraft((current) => ({ ...current, inputMode: event.target.value as "height" | "angle", roofRiseMm: "", roofPitchDegrees: "" }))}><option value="height">Tetőemelkedés</option><option value="angle">Tetőhajlás</option></select></label><div className="roof-form-grid">{keys.map((key) => <label className="roof-field" key={key}><span>{names[key]} <small>{key === "roofPitchDegrees" ? "°" : "mm"}</small></span><input inputMode="decimal" value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>{!geometry && <p className="metal-tile-status is-incomplete" role="status">Add meg az összes érvényes tetőméretet az előnézethez.</p>}</section>{geometry && <GableMetalTileCoveringPreview geometry={geometry} sourceLabel="Kézi nyeregtető-adatok · projekt nélküli előnézet" />}</>;
}

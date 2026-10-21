import type { ReactNode } from "react";
import type { FieldSurveySemanticType } from "@/domain/field-surveys/contracts";
import type { DetailedGableResult } from "@/domain/field-surveys/detailed-gable";
import { quickLengthMm, type QuickGableDraft, type QuickGableResult } from "@/domain/field-surveys/quick-gable";
import type { QuickShedResult } from "@/domain/field-surveys/quick-shed";
import { formatQuantityValue } from "@/lib/quantity-format";

export type RoofMeasurementMode = "quick" | "building" | "detailed";

type ModeInfo = Readonly<{ mode: RoofMeasurementMode; label: string; hint: string }>;
const modes: readonly ModeInfo[] = [
  { mode: "quick", label: "Gyors mérés", hint: "Közvetlen tetőméretek" },
  { mode: "building", label: "Épületméretek", hint: "Méretek és tetőhajlás alapján" },
  { mode: "detailed", label: "Részletes mérés", hint: "Tetősíkonkénti mérés" },
];
/** Félnyeregtetőnél egyetlen síkról van szó: nincs részletes mód. */
const shedModes = modes.filter((item) => item.mode !== "detailed");

const mm = (value: number) => `${formatQuantityValue(value / 1000, "m")} m`;
const m2 = (value: number) => `${formatQuantityValue(value, "m²")} m²`;

export function RoofModeSelector({ mode, onChange, disabled, shape = "gable" }: Readonly<{ mode: RoofMeasurementMode; onChange: (mode: RoofMeasurementMode) => void; disabled: boolean; shape?: "gable" | "shed" }>) {
  return <fieldset className="roof-mode-selector" disabled={disabled}>
    <legend className="sr-only">Mérési mód</legend>
    {(shape === "shed" ? shedModes : modes).map((item) => <button key={item.mode} type="button" className="roof-mode-option" title={item.hint} aria-pressed={mode === item.mode} onClick={() => mode !== item.mode && onChange(item.mode)}><strong>{item.label}</strong><span>{item.hint}</span></button>)}
  </fieldset>;
}

const hi = (focused: FieldSurveySemanticType | null, ...types: FieldSurveySemanticType[]) => (focused && types.includes(focused) ? "is-focused" : "");

/** Unfolded (developed) roof planes drawn to scale from measured values only — no pitch or rise is inferred. */
function QuickGableDrawing({ drafts, planesMatch, focused }: Readonly<{ drafts: readonly QuickGableDraft[]; planesMatch: boolean | undefined; focused: FieldSurveySemanticType | null }>) {
  const get = (type: FieldSurveySemanticType) => quickLengthMm(drafts.find((draft) => draft.semanticType === type)).mm;
  const eave = get("roof_eave_run"); const a = get("roof_plane_slope_a");
  const b = planesMatch === true ? a : planesMatch === false ? get("roof_plane_slope_b") : null;
  if (!eave || !a) return <DrawingPlaceholder />;
  const W = 360; const pad = 76; const innerW = W - 2 * pad;
  const scale = Math.min(innerW / eave, 190 / (a + (b ?? 0) || 1));
  const w = eave * scale; const ha = a * scale; const hb = (b ?? 0) * scale;
  const x0 = (W - w) / 2; const ridgeY = 22 + hb; const H = ridgeY + ha + 40;
  return <svg className="quick-gable-drawing" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tetősíkok méretarányos kiterített rajza">
    <rect className={`qg-plane ${hi(focused, "roof_plane_slope_a")}`} x={x0} y={ridgeY} width={w} height={ha} />
    {b ? <rect className={`qg-plane ${planesMatch === true ? "is-schematic " : ""}${hi(focused, "roof_plane_slope_b")}`} x={x0} y={ridgeY - hb} width={w} height={hb} /> : <text className="qg-note" x={W / 2} y={ridgeY - 8} textAnchor="middle">B sík: még nincs adat</text>}
    <line className={`qg-ridge ${hi(focused, "roof_eave_run")}`} x1={x0} x2={x0 + w} y1={ridgeY} y2={ridgeY} />
    <text className="qg-label" x={W / 2} y={ridgeY + ha / 2} textAnchor="middle">A sík</text>
    {b && <text className="qg-label" x={W / 2} y={ridgeY - hb / 2} textAnchor="middle">{planesMatch === true ? "B sík (= A)" : "B sík"}</text>}
    <line className={`qg-dim ${hi(focused, "roof_eave_run")}`} x1={x0} x2={x0 + w} y1={ridgeY + ha + 16} y2={ridgeY + ha + 16} />
    <text className="qg-dimtext" x={W / 2} y={ridgeY + ha + 32} textAnchor="middle">Eresz-irány · {mm(eave)}</text>
    <line className={`qg-dim ${hi(focused, "roof_plane_slope_a")}`} x1={x0 + w + 14} x2={x0 + w + 14} y1={ridgeY} y2={ridgeY + ha} />
    <text className="qg-dimtext" x={x0 + w + 20} y={ridgeY + ha / 2} dominantBaseline="middle">{mm(a)}</text>
    {b && <><line className={`qg-dim ${hi(focused, "roof_plane_slope_b")}`} x1={x0 - 14} x2={x0 - 14} y1={ridgeY - hb} y2={ridgeY} /><text className="qg-dimtext" x={x0 - 20} y={ridgeY - hb / 2} textAnchor="end" dominantBaseline="middle">{mm(b)}</text></>}
  </svg>;
}

/** Detailed planes as trapezoids (eave, shared ridge, perpendicular distance), centred; the side-edge position is not measured, so a trapezoid is only illustrative. */
function DetailedGableDrawing({ drafts, planesMatch, focused }: Readonly<{ drafts: readonly QuickGableDraft[]; planesMatch: boolean | undefined; focused: FieldSurveySemanticType | null }>) {
  const get = (type: FieldSurveySemanticType) => quickLengthMm(drafts.find((draft) => draft.semanticType === type)).mm;
  const R = get("roof_ridge_length"); const eA = get("roof_eave_a"); const hA = get("roof_plane_slope_a");
  const eB = planesMatch === true ? eA : planesMatch === false ? get("roof_eave_b") : null;
  const hB = planesMatch === true ? hA : planesMatch === false ? get("roof_plane_slope_b") : null;
  if (!R || !eA || !hA) return <DrawingPlaceholder />;
  const hasB = Boolean(eB && hB);
  const W = 360; const pad = 76;
  const maxW = Math.max(R, eA, eB ?? 0);
  const scale = Math.min((W - 2 * pad) / maxW, 190 / (hA + (hB ?? 0)));
  const cx = W / 2; const sh = (v: number) => v * scale;
  const ridgeY = 30 + (hasB ? sh(hB!) : 0); const botY = ridgeY + sh(hA); const H = botY + 42;
  const rx0 = cx - sh(R) / 2; const rx1 = cx + sh(R) / 2;
  const ax0 = cx - sh(eA) / 2; const ax1 = cx + sh(eA) / 2;
  const poly = (pts: [number, number][]) => pts.map((p) => p.join(",")).join(" ");
  const topY = ridgeY - sh(hB ?? 0);
  const trapezoid = eA !== R || (hasB && eB !== R);
  return <>
    <svg className="quick-gable-drawing" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tetősíkok méretarányos kiterített rajza">
      <polygon className={`qg-plane ${eA !== R ? "is-schematic " : ""}${hi(focused, "roof_plane_slope_a", "roof_eave_a", "roof_verge_a_left", "roof_verge_a_right")}`} points={poly([[rx0, ridgeY], [rx1, ridgeY], [ax1, botY], [ax0, botY]])} />
      {hasB ? <polygon className={`qg-plane ${planesMatch === true || eB !== R ? "is-schematic " : ""}${hi(focused, "roof_plane_slope_b", "roof_eave_b", "roof_verge_b_left", "roof_verge_b_right")}`} points={poly([[rx0, ridgeY], [rx1, ridgeY], [cx + sh(eB!) / 2, topY], [cx - sh(eB!) / 2, topY]])} /> : <text className="qg-note" x={cx} y={ridgeY - 8} textAnchor="middle">B sík: még nincs adat</text>}
      <line className={`qg-ridge ${hi(focused, "roof_ridge_length")}`} x1={rx0} x2={rx1} y1={ridgeY} y2={ridgeY} />
      <text className="qg-label" x={cx} y={ridgeY + sh(hA) / 2} textAnchor="middle">A sík</text>
      {hasB && <text className="qg-label" x={cx} y={ridgeY - sh(hB!) / 2} textAnchor="middle">{planesMatch === true ? "B sík (= A)" : "B sík"}</text>}
      <text className="qg-dimtext" x={cx} y={ridgeY - 5} textAnchor="middle">Gerinc · {mm(R)}</text>
      <line className={`qg-dim ${hi(focused, "roof_eave_a")}`} x1={ax0} x2={ax1} y1={botY + 14} y2={botY + 14} />
      <text className="qg-dimtext" x={cx} y={botY + 30} textAnchor="middle">Eresz (A) · {mm(eA)}</text>
      {hasB && <><line className={`qg-dim ${hi(focused, "roof_eave_b")}`} x1={cx - sh(eB!) / 2} x2={cx + sh(eB!) / 2} y1={topY - 10} y2={topY - 10} /><text className="qg-dimtext" x={cx} y={topY - 14} textAnchor="middle">Eresz (B) · {mm(eB!)}</text></>}
      <line className={`qg-dim ${hi(focused, "roof_plane_slope_a")}`} x1={W - 30} x2={W - 30} y1={ridgeY} y2={botY} />
      <text className="qg-dimtext" x={W - 36} y={ridgeY + sh(hA) / 2} textAnchor="end" dominantBaseline="middle">{mm(hA)}</text>
      {hasB && <><line className={`qg-dim ${hi(focused, "roof_plane_slope_b")}`} x1={30} x2={30} y1={topY} y2={ridgeY} /><text className="qg-dimtext" x={36} y={ridgeY - sh(hB!) / 2} dominantBaseline="middle">{mm(hB!)}</text></>}
    </svg>
    {trapezoid && <p className="quick-gable-provenance">A szaggatott alak szemléltető, nem a tető pontos alakja.</p>}
  </>;
}

/** Calm, text-free placeholder: the drawing area is reserved, nothing is explained before there is something to draw. */
const DrawingPlaceholder = () => <div className="qg-placeholder" role="img" aria-label="A rajz a méretek megadása után jelenik meg" />;

/** Shared frame: inputs (+ plane decision) and the result on one side, the drawing on the other. Mobile order: inputs → result → drawing. */
function GableFrame({ inputs, planesMatch, onPlanesMatch, disabled, results, guide, drawing }: Readonly<{
  inputs: ReactNode; planesMatch?: boolean; onPlanesMatch?: (match: boolean) => void; disabled: boolean;
  results: ReactNode; guide: string; drawing: ReactNode;
}>) {
  return <section className="quick-gable" aria-label="Tetőmérés">
    <div className="quick-gable-inputs">
      {inputs}
      {onPlanesMatch && <fieldset className="quick-gable-match" disabled={disabled}>
        <legend>A két tetősík egyforma?</legend>
        <button type="button" className="roof-mode-option" aria-pressed={planesMatch === true} onClick={() => onPlanesMatch(true)}><strong>Igen</strong></button>
        <button type="button" className="roof-mode-option" aria-pressed={planesMatch === false} onClick={() => onPlanesMatch(false)}><strong>Nem</strong></button>
      </fieldset>}
    </div>
    <div className="quick-gable-drawing-panel">
      {guide && <p className="quick-gable-guide" aria-live="polite">{guide}</p>}
      {drawing}
      <ul className="qg-legend" aria-label="Jelmagyarázat"><li><span className="qg-key is-measured" aria-hidden="true" />mért méret</li><li><span className="qg-key is-schematic" aria-hidden="true" />szemléltető, nem mért</li></ul>
    </div>
    <div className="quick-gable-results" aria-live="polite">{results}</div>
  </section>;
}

const Row = ({ label, value, tag, primary }: { label: string; value: string; tag?: "számított" | "mért"; primary?: boolean }) => <div className={primary ? "is-primary" : undefined}><dt>{label}{tag && <span className={`quick-gable-tag${tag === "mért" ? " is-measured" : ""}`}>{tag}</span>}</dt><dd>{value}</dd></div>;
/** Közvetlen mérés: a mért hossz a teljes tetősíkra vonatkozik, így a túlnyúlás benne van — nem adunk hozzá újra. */
const Note = () => <p className="quick-gable-provenance">Tetőfelület, nem anyagmennyiség. A mért hosszak a teljes tetősíkot adják (az ereszkiülés és az oromtúlnyúlás a mérésben van), ezért külön túlnyúlást nem számolunk hozzá. Hajlásszög és épületméret ebből nem következik.</p>;
/** Nothing typed yet: no result panel at all, so the inputs and the drawing are the only things on screen. */
const untouched = (drafts: readonly QuickGableDraft[]) => drafts.every((draft) => draft.value.trim() === "");
const Status = ({ result, drafts }: { result: { status: "incomplete" | "invalid" | "empty"; message: string }; drafts: readonly QuickGableDraft[] }) =>
  result.status === "empty" || (result.status === "incomplete" && untouched(drafts)) ? null : <p className="missing-data" role={result.status === "invalid" ? "alert" : "status"}>{result.message}</p>;

type Shared = Readonly<{ drafts: readonly QuickGableDraft[]; planesMatch: boolean | undefined; onPlanesMatch: (match: boolean) => void; focused: FieldSurveySemanticType | null; guide: string; inputs: ReactNode; disabled: boolean }>;

export function QuickGableWorkspace({ result, ...p }: Shared & Readonly<{ result: QuickGableResult }>) {
  return <GableFrame inputs={p.inputs} planesMatch={p.planesMatch} onPlanesMatch={p.onPlanesMatch} disabled={p.disabled} guide={p.guide}
    results={result.status !== "ok"
      ? <Status result={result} drafts={p.drafts} />
      : <><dl className="quick-gable-result-list">
        <Row primary label="Tetőfelület" tag="számított" value={m2(result.totalAreaM2)} />
        {result.planes.map((plane) => <Row key={plane.key} label={`${plane.label} · ${mm(plane.slopeMm)} × ${mm(result.eaveRunMm)}`} tag="számított" value={m2(plane.areaM2)} />)}
        <Row label="Gerinc" tag="mért" value={mm(result.ridgeMm)} />
        <Row label="Eresz összesen (2 oldal)" tag="számított" value={mm(result.eaveTotalMm)} />
        <Row label="Oromszél összesen (4 él)" tag="számított" value={mm(result.vergeTotalMm)} />
      </dl><Note /></>}
    drawing={<QuickGableDrawing drafts={p.drafts} planesMatch={p.planesMatch} focused={p.focused} />} />;
}

export function DetailedGableWorkspace({ result, ...p }: Shared & Readonly<{ result: DetailedGableResult }>) {
  return <GableFrame inputs={p.inputs} planesMatch={p.planesMatch} onPlanesMatch={p.onPlanesMatch} disabled={p.disabled} guide={p.guide}
    results={result.status === "ok"
      ? <><dl className="quick-gable-result-list">
        <Row primary label="Tetőfelület" tag="számított" value={m2(result.totalAreaM2)} />
        {result.planes.map((plane) => <Row key={plane.key} label={`${plane.label}${plane.rectangle ? "" : " (trapéz)"}`} tag="számított" value={m2(plane.areaM2)} />)}
        <Row label="Gerinc" tag="mért" value={mm(result.ridgeMm)} />
        <Row label="Eresz összesen" tag="számított" value={mm(result.eaveTotalMm)} />
        {result.vergeTotalMm !== null ? <Row label="Oromszél összesen" tag="számított" value={mm(result.vergeTotalMm)} /> : <Row label="Oromszél összesen" value="még nem ismert" />}
      </dl>{result.vergeTotalMm === null && <p className="quick-gable-provenance">Oromszél: a „Nem kötelező mérések” alatt adható meg; nem szabályos síknál nem találgatunk.</p>}<Note /></>
      : <Status result={result} drafts={p.drafts} />}
    drawing={<DetailedGableDrawing drafts={p.drafts} planesMatch={p.planesMatch} focused={p.focused} />} />;
}

/** Egyetlen, kiterített tetősík méretarányosan, csak a mért hosszakból; hajlásszög és emelkedés nincs levezetve. */
export function QuickShedDrawing({ drafts, focused }: Readonly<{ drafts: readonly QuickGableDraft[]; focused: FieldSurveySemanticType | null }>) {
  const get = (type: FieldSurveySemanticType) => quickLengthMm(drafts.find((draft) => draft.semanticType === type)).mm;
  const eave = get("roof_eave_run"); const slope = get("roof_plane_slope_a");
  if (!eave || !slope) return <DrawingPlaceholder />;
  const W = 360; const pad = 76;
  const scale = Math.min((W - 2 * pad) / eave, 190 / slope);
  const w = eave * scale; const h = slope * scale;
  const x0 = (W - w) / 2; const top = 26; const H = top + h + 40;
  return <svg className="quick-gable-drawing" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A félnyeregtető síkjának méretarányos kiterített rajza">
    <rect className={`qg-plane ${hi(focused, "roof_plane_slope_a")}`} x={x0} y={top} width={w} height={h} />
    <text className="qg-label" x={W / 2} y={top + h / 2} textAnchor="middle">Tetősík</text>
    <text className="qg-note" x={W / 2} y={top - 8} textAnchor="middle">felső él (magasabb)</text>
    <line className={`qg-ridge ${hi(focused, "roof_eave_run")}`} x1={x0} x2={x0 + w} y1={top + h} y2={top + h} />
    <line className={`qg-dim ${hi(focused, "roof_eave_run")}`} x1={x0} x2={x0 + w} y1={top + h + 16} y2={top + h + 16} />
    <text className="qg-dimtext" x={W / 2} y={top + h + 32} textAnchor="middle">Eresz (alsó él) · {mm(eave)}</text>
    <line className={`qg-dim ${hi(focused, "roof_plane_slope_a")}`} x1={x0 + w + 14} x2={x0 + w + 14} y1={top} y2={top + h} />
    <text className="qg-dimtext" x={x0 + w + 20} y={top + h / 2} dominantBaseline="middle">{mm(slope)}</text>
  </svg>;
}

export function QuickShedWorkspace({ result, ...p }: Readonly<{ result: QuickShedResult; drafts: readonly QuickGableDraft[]; focused: FieldSurveySemanticType | null; guide: string; inputs: ReactNode; disabled: boolean }>) {
  return <GableFrame inputs={p.inputs} disabled={p.disabled} guide={p.guide}
    results={result.status !== "ok"
      ? <Status result={result} drafts={p.drafts} />
      : <><dl className="quick-gable-result-list">
        <Row primary label="Tetőfelület" tag="számított" value={m2(result.areaM2)} />
        <Row label="Eresz (alsó él)" tag="mért" value={mm(result.eaveRunMm)} />
        <Row label="Felső él" tag="számított" value={mm(result.eaveRunMm)} />
        <Row label="Oldalélek összesen (2 db)" tag="számított" value={mm(result.rakeTotalMm)} />
      </dl><Note /></>}
    drawing={<QuickShedDrawing drafts={p.drafts} focused={p.focused} />} />;
}

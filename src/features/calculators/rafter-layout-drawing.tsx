"use client";

import { useId, useMemo, useState } from "react";
import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import type { RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { arrowheadPath, dimensionScreenGeometry, type AnnotationPoint } from "@/domain/drawings/annotation-layout";
import { createRafterLayoutModel, type LayoutPoint, type LayoutRafter, type RafterEndCut } from "@/domain/drawings/rafter-layout";
import { LENGTH_UNITS, type LengthUnit } from "@/domain/measurements/length-input";
import { useCanvasSize, useFontSize } from "./drawing-canvas-hooks";
import type { PlaneBirdsmouth } from "@/domain/calculations/construction/plane-birdsmouth";
import { Tag } from "./rafter-joint-drawing";
import { formatDrawingLength, formatJointValue } from "./rafter-joints-panel";

const EDGE_NAME: Record<RafterEndCut["edgeKind"], string> = { ridge: "gerinc", upper: "felső él", eave: "eresz", hip: "kontyél", valley: "vápa", rake: "oromél", break: "törésvonal", unknown: "nem azonosított él" };

/** What to do with one rafter end; only a plumb cut at a ridge or upper edge has a geometric angle. */
function endText(end: RafterEndCut, birdsmouth: PlaneBirdsmouth | undefined) {
  if (end.edgeKind === "eave" && birdsmouth?.status === "computed") return "Karmi (bevágás) a talpszelemenen; méretei és kijelölése a „Szarufák és támaszok” rajznál";
  if (end.plumbAngleDegrees !== null) return `függővágás ${formatJointValue(end.plumbAngleDegrees)}° a szarufa éléhez (beépítve függőleges)`;
  if (end.edgeKind === "eave") return "Karmi (bevágás) a talpszelemenen; méreteihez kapcsold be a „Szarufacsatlakozások számítása” jelölőt a Részletes számításnál, vagy használd a „Szarufa kiszabása” kalkulátort";
  if (end.edgeKind === "hip" || end.edgeKind === "valley") return "ferde (kettős) vágás, a rendszer nem számolja";
  return "a vágás a megadott adatokból nem határozható meg";
}

function endGroups(rafters: readonly LayoutRafter[], side: "lowerEnd" | "upperEnd") {
  const groups = new Map<string, { end: RafterEndCut; count: number }>();
  for (const rafter of rafters) {
    const end = rafter[side], key = `${end.edgeKind}:${end.plumbAngleDegrees ?? ""}`;
    groups.set(key, { end, count: (groups.get(key)?.count ?? 0) + 1 });
  }
  return [...groups.values()];
}

/** CRR-09: one edge name only when every rafter ends on the same kind of edge. */
export function upperEdgeLabel(rafters: readonly LayoutRafter[]) {
  const kinds = new Set(rafters.map((rafter) => rafter.upperEnd.edgeKind));
  return kinds.size === 1 ? EDGE_NAME[[...kinds][0]!] : "vegyes felső végek – lásd a listát";
}

/**
 * True-size layout of the geometric rafter lines on one roof plane, numbered, with spacing, lengths and what to cut at each
 * end. CRR-02: these are lines derived from the roof plane, not a physical framing plan (see physicalLayout).
 */
export function RafterLayoutDrawing({ geometry, timberLayout, birdsmouths = null }: Readonly<{ geometry: RoofGeometry; timberLayout: RoofTimberLayout; birdsmouths?: readonly PlaneBirdsmouth[] | null }>) {
  const [planeId, setPlaneId] = useState<string | undefined>(undefined);
  const [unit, setUnit] = useState<LengthUnit>("cm");
  const model = useMemo(() => createRafterLayoutModel(geometry, timberLayout, planeId), [geometry, timberLayout, planeId]);
  const [canvasRef, size] = useCanvasSize();
  const fontSize = useFontSize() * (size.width >= 600 ? 1.15 : 1);
  const headingId = useId();
  if (!model) return null;
  const { plane } = model;
  const birdsmouth = birdsmouths?.find((item) => item.planeId === plane.planeId);
  const hipOrValley = geometry.edges.some((edge) => edge.kind === "hip" || edge.kind === "valley");
  const show = (mm: number) => `${formatDrawingLength(mm, unit)} ${unit}`;
  const value = (mm: number) => formatDrawingLength(mm, unit);

  // Fit the plane to the measured width; height follows the plane's proportions, with room below for numbers and dimensions.
  const padX = fontSize * 3, padTop = fontSize * 2.2, padBottom = fontSize * 7;
  const spanX = Math.max(plane.bounds.maxX - plane.bounds.minX, 1), spanY = Math.max(plane.bounds.maxY - plane.bounds.minY, 1);
  const scale = Math.min((size.width - 2 * padX) / spanX, 380 / spanY);
  const height = Math.round(spanY * scale + padTop + padBottom);
  const offsetX = (size.width - spanX * scale) / 2;
  const toScreen = (point: LayoutPoint): AnnotationPoint => ({ x: offsetX + (point.x - plane.bounds.minX) * scale, y: padTop + (plane.bounds.maxY - point.y) * scale });
  const rafters = plane.rafters;
  const pxSpacing = rafters.length > 1 ? plane.spacingMm * scale : Infinity;
  // Every number when they fit; otherwise the first, every fifth and the last, so the row never overlaps.
  const numbered = (rafter: LayoutRafter) => pxSpacing >= fontSize * 1.9 || rafter.number === 1 || rafter.number === rafters.length || rafter.number % 5 === 0;
  const eaveY = Math.max(...rafters.map((rafter) => toScreen(rafter.from).y));
  const first = rafters[0]!, second = rafters[1], last = rafters.at(-1)!;
  const baseline = (point: LayoutPoint) => ({ x: toScreen(point).x, y: eaveY });
  const dims = [
    ...(second ? [{ id: "spacing", text: value(second.offsetMm - first.offsetMm), geometry: dimensionScreenGeometry("horizontal", baseline(first.from), baseline(second.from), 1, { distance: fontSize * 2.6 }) }] : []),
    ...(rafters.length > 2 ? [{ id: "width", text: `1–${last.number}: ${value(last.offsetMm)}`, geometry: dimensionScreenGeometry("horizontal", baseline(first.from), baseline(last.from), 1, { distance: fontSize * 4.9 }) }] : []),
  ];
  const longest = rafters.reduce((best, rafter) => rafter.lengthMm > best.lengthMm ? rafter : best);
  const lengthDim = dimensionScreenGeometry("aligned", toScreen(longest.from), toScreen(longest.to), longest === first ? -1 : 1, { distance: fontSize * 1.4 });

  return <section className="technical-drawing is-compact rafter-layout" aria-labelledby={headingId}>
    <div className="technical-drawing-header">
      <div className="technical-drawing-title"><h2 id={headingId}>Geometriai szarufavonalak · tetősíkonként</h2></div>
      <div className="rafter-layout-controls">
        {model.planes.length > 1 && <label><span className="sr-only">Tetősík</span>
          <select value={plane.planeId} onChange={(event) => setPlaneId(event.target.value)} aria-label="Tetősík">{model.planes.map((item) => <option key={item.planeId} value={item.planeId}>{item.label} · {item.count} vonal</option>)}</select>
        </label>}
        <label className="rafter-detail-unit"><span className="sr-only">Méretek kijelzési egysége</span>
          <select value={unit} onChange={(event) => setUnit(event.target.value as LengthUnit)} aria-label="Méretek kijelzési egysége">{LENGTH_UNITS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </label>
      </div>
    </div>
    <div className="drawing-canvas rafter-layout-canvas" ref={canvasRef} style={{ height }}>
      <svg className="rafter-joint-svg" style={{ "--rj-font": `${fontSize}px` } as React.CSSProperties} viewBox={`0 0 ${size.width} ${height}`} width={size.width} height={height} role="img"
        aria-label={`A tetősík valós méretben, ${rafters.length} számozott geometriai szarufavonallal, tényleges osztás ${show(plane.spacingMm)}. Felső él: ${upperEdgeLabel(rafters)}.`}>
        {plane.outlines.map((outline, index) => <polygon key={index} className="rafter-layout-plane" points={outline.map(toScreen).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} />)}
        {rafters.map((rafter) => { const a = toScreen(rafter.from), b = toScreen(rafter.to); return <g key={rafter.id}>
          <line className="rafter-layout-rafter" x1={a.x} y1={a.y} x2={b.x} y2={b.y}><title>{`${rafter.number}. szarufavonal · ${show(rafter.offsetMm)} az 1.-től · ${show(rafter.lengthMm)} hosszú`}</title></line>
          {numbered(rafter) && <text className="rafter-layout-number" x={a.x} y={eaveY + fontSize * 1.1} textAnchor="middle" dominantBaseline="central">{rafter.number}</text>}
        </g>; })}
        <text className="rafter-layout-edge" x={size.width / 2} y={padTop - fontSize * .9} textAnchor="middle">{upperEdgeLabel(rafters)}</text>
        {[...dims, { id: "length", text: value(longest.lengthMm), geometry: lengthDim }].map(({ id, text, geometry }) => <g key={id} className="technical-dimension rafter-joint-dimension">
          <line x1={geometry.extensionStart.x} y1={geometry.extensionStart.y} x2={geometry.start.x} y2={geometry.start.y} className="technical-extension" />
          <line x1={geometry.extensionEnd.x} y1={geometry.extensionEnd.y} x2={geometry.end.x} y2={geometry.end.y} className="technical-extension" />
          <line x1={geometry.start.x} y1={geometry.start.y} x2={geometry.end.x} y2={geometry.end.y} />
          <path className="technical-dimension-arrow" d={arrowheadPath(geometry.start, geometry.end)} /><path className="technical-dimension-arrow" d={arrowheadPath(geometry.end, geometry.start)} />
          <Tag x={id === "length" ? (geometry.start.x + geometry.end.x) / 2 : (geometry.start.x + geometry.end.x) / 2} y={(geometry.start.y + geometry.end.y) / 2 + (id === "length" ? 0 : fontSize * .9)} text={text} anchor="middle" fontSize={fontSize} />
        </g>)}
        <text className="rafter-layout-unit" x={size.width - 6} y={fontSize} textAnchor="end">méretek: {unit}</text>
      </svg>
    </div>
    <div className="rafter-joint-cutlist">
      <p className="construction-suite-limit"><strong>Tetősíkból számított geometriai szarufavonalak, nem teljes tetőszerkezeti (framing) terv.</strong> {timberLayout.physicalLayout.status === "unsupported" ? timberLayout.physicalLayout.reason : ""}{hipOrValley ? " Kontyél- és vápaszarufa nincs a modellben." : ""}</p>
      <p className="construction-suite-limit">Az 1. vonal a tetősík szélén áll (peremsáv 0). A többi helyét az eresz mentén, az 1. vonal tengelyétől mérd.</p>
      <dl className="rafter-joint-rows">
        <div><dt>Geometriai szarufavonalak ezen a tetősíkon</dt><dd>{rafters.length} db</dd></div>
        <div><dt>Tengelytávolság (tényleges osztás)</dt><dd>{show(plane.spacingMm)}</dd></div>
        <div><dt>Tetőhajlás</dt><dd>{formatJointValue(plane.pitchDegrees)}°</dd></div>
        {plane.lengthGroups.map((group) => <div key={group.lengthMm}><dt>Hossz</dt><dd>{group.count} db × {show(group.lengthMm)}</dd></div>)}
      </dl>
      <h3>Végek vágása</h3>
      <ul className="rafter-layout-ends">
        {endGroups(rafters, "upperEnd").map(({ end, count }) => <li key={`u${end.edgeKind}${end.plumbAngleDegrees}`}><strong>Felső vég · {EDGE_NAME[end.edgeKind]}</strong> ({count} db): {endText(end, birdsmouth)}</li>)}
        {endGroups(rafters, "lowerEnd").map(({ end, count }) => <li key={`l${end.edgeKind}${end.plumbAngleDegrees}`}><strong>Alsó vég · {EDGE_NAME[end.edgeKind]}</strong> ({count} db): {endText(end, birdsmouth)}</li>)}
      </ul>
      {birdsmouth?.status === "incomplete" && <p className="material-takeoff-incomplete" role="status"><strong>Talpszelemen-Karmi: hiányzó adat</strong> · {birdsmouth.missing.join(", ")}</p>}
      {(birdsmouth?.status === "invalid" || birdsmouth?.status === "not-applicable") && birdsmouth.reason && <p className={`material-takeoff-incomplete${birdsmouth.status === "invalid" ? " is-invalid" : ""}`} role={birdsmouth.status === "invalid" ? "alert" : "status"}><strong>Talpszelemen-Karmi:</strong> {birdsmouth.reason}</p>}
      <details className="rafter-joint-all"><summary>Szarufavonalak helye az 1. vonaltól</summary>
        <dl className="rafter-joint-rows">{rafters.map((rafter) => <div key={rafter.id}><dt>{rafter.number}. vonal</dt><dd>{show(rafter.offsetMm)} <small>· {show(rafter.lengthMm)} hosszú</small></dd></div>)}</dl>
      </details>
    </div>
  </section>;
}

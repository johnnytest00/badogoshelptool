"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Minus, Move, Plus, RotateCcw } from "lucide-react";
import { GlassToolbar } from "@/components/ui/glass-toolbar";
import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import type { RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { createRafterDetailModel, RAFTER_DETAIL_PROFESSIONAL, RAFTER_DETAIL_VIEWBOX, type ScreenPoint } from "@/domain/drawings/rafter-detail";
import { LENGTH_UNITS, type LengthUnit } from "@/domain/measurements/length-input";
import { formatDrawingLength } from "./rafter-joints-panel";
import { clampDrawingZoom, clientPointToViewBox, drawingInitialViewport, panViewport, pinchViewport, rebasePanGesture, type ViewportPoint } from "@/features/roof-models/drawing-viewport";

const { width: W, height: H } = RAFTER_DETAIL_VIEWBOX;
const show = (mm: number, unit: LengthUnit) => `${formatDrawingLength(mm, unit)} ${unit}`;
const pts = (points: readonly ScreenPoint[]) => points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
const KEY_PAN = 40;

type Gesture = { kind: "pan" | "pinch"; startPoint?: ViewportPoint; startPan: ViewportPoint; startZoom: number; distance?: number; midpoint?: ViewportPoint };

/** Close-up axonometric view of 2–3 rafters from the computed timber layout; joints are shown as data states, never as notches. */
export function RafterDetailDrawing({ geometry, timberLayout, section }: Readonly<{ geometry: RoofGeometry; timberLayout: RoofTimberLayout; section: Readonly<{ widthMm: number; heightMm: number }> | null }>) {
  const model = useMemo(() => createRafterDetailModel(geometry, timberLayout, section), [geometry, timberLayout, section]);
  const [unit, setUnit] = useState<LengthUnit>("cm");
  const [viewport, setViewportState] = useState(drawingInitialViewport as { zoom: number; pan: ViewportPoint });
  const current = useRef(viewport);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, ViewportPoint>());
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef<number | null>(null);
  const id = useId().replace(/:/g, "");
  const setViewport = useCallback((next: { zoom: number; pan: ViewportPoint }) => {
    const value = { zoom: clampDrawingZoom(next.zoom), pan: { x: Number.isFinite(next.pan.x) ? next.pan.x : 0, y: Number.isFinite(next.pan.y) ? next.pan.y : 0 } };
    current.current = value;
    setViewportState(value);
  }, []);
  // A new layout (other rafters or lengths) returns to the close-up; an identical recomputation keeps the user's zoom and pan.
  const viewKey = model ? model.rafters.map((rafter) => `${rafter.id}:${rafter.lengthMm.toFixed(3)}:${rafter.screenStart.x.toFixed(1)}`).join("|") : "";
  useEffect(() => { setViewport(drawingInitialViewport); }, [viewKey, setViewport]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => { event.preventDefault(); setViewport({ zoom: current.current.zoom + (event.deltaY < 0 ? .1 : -.1), pan: current.current.pan }); };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [setViewport, model]);
  useEffect(() => () => { if (frame.current !== null) window.cancelAnimationFrame(frame.current); }, []);

  if (!model) return null;
  const toViewBox = (event: React.PointerEvent) => { const rect = svgRef.current?.getBoundingClientRect(); return rect ? clientPointToViewBox({ x: event.clientX, y: event.clientY }, rect) : null; };
  const pair = () => { const [a, b] = [...pointers.current.values()]; return { distance: Math.hypot(b.x - a.x, b.y - a.y), midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; };
  const apply = () => {
    const active = gesture.current;
    if (!active) return;
    if (active.kind === "pinch" && pointers.current.size >= 2 && active.distance && active.midpoint) setViewport(pinchViewport({ zoom: active.startZoom, pan: active.startPan, distance: active.distance, midpoint: active.midpoint }, pair(), { x: W / 2, y: H / 2 }));
    else if (active.kind === "pan" && active.startPoint && pointers.current.size === 1) setViewport({ zoom: current.current.zoom, pan: panViewport({ pan: active.startPan, point: active.startPoint }, [...pointers.current.values()][0], active.startZoom) });
  };
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = toViewBox(event);
    if (!point) return;
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* A pointer that is no longer active cannot be captured; the gesture still works inside the drawing. */ }
    pointers.current.set(event.pointerId, point);
    gesture.current = pointers.current.size === 1 ? { kind: "pan", startPoint: point, startPan: current.current.pan, startZoom: current.current.zoom } : { kind: "pinch", startPan: current.current.pan, startZoom: current.current.zoom, ...pair() };
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const point = toViewBox(event);
    if (!point) return;
    event.preventDefault();
    pointers.current.set(event.pointerId, point);
    if (frame.current === null) frame.current = window.requestAnimationFrame(() => { frame.current = null; apply(); });
  };
  const stop = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    if (frame.current !== null) { window.cancelAnimationFrame(frame.current); frame.current = null; }
    apply();
    pointers.current.delete(event.pointerId);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released by the browser. */ }
    const rebased = rebasePanGesture([...pointers.current.values()], current.current);
    gesture.current = rebased ? { kind: "pan", ...rebased } : null;
  };
  const onKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    const { zoom, pan } = current.current;
    const moves: Record<string, ViewportPoint> = { ArrowLeft: { x: KEY_PAN, y: 0 }, ArrowRight: { x: -KEY_PAN, y: 0 }, ArrowUp: { x: 0, y: KEY_PAN }, ArrowDown: { x: 0, y: -KEY_PAN } };
    if (moves[event.key]) setViewport({ zoom, pan: { x: pan.x + moves[event.key].x, y: pan.y + moves[event.key].y } });
    else if (event.key === "+" || event.key === "=") setViewport({ zoom: zoom + .1, pan });
    else if (event.key === "-") setViewport({ zoom: zoom - .1, pan });
    else if (event.key === "0") setViewport(drawingInitialViewport);
    else return;
    event.preventDefault();
  };

  const highlighted = model.rafters.find((rafter) => rafter.highlighted)!;
  const length = model.dimensions.find((item) => item.kind === "length")!;
  const spacing = model.dimensions.find((item) => item.kind === "spacing");
  const sectionText = model.section ? `${show(model.section.widthMm, unit)} × ${show(model.section.heightMm, unit)}` : null;
  // Labels sit beyond the rafter ends, along the rafter direction, so they never cover the neighbouring axes.
  const beyond = (from: ScreenPoint, toward: ScreenPoint, distance: number) => {
    const dx = toward.x - from.x, dy = toward.y - from.y, n = Math.hypot(dx, dy) || 1;
    return { x: toward.x + dx / n * distance, y: toward.y + dy / n * distance };
  };
  const lengthLabel = beyond(length.start, length.end, 56);
  const spacingLabel = spacing && beyond(length.end, { x: (spacing.start.x + spacing.end.x) / 2, y: (spacing.start.y + spacing.end.y) / 2 }, 52);
  const titleId = `rafter-detail-title-${id}`, descId = `rafter-detail-desc-${id}`;

  return <section className="technical-drawing is-compact rafter-detail" aria-labelledby={`rafter-detail-heading-${id}`}>
    <div className="technical-drawing-header">
      <div className="technical-drawing-title"><h2 id={`rafter-detail-heading-${id}`}>Szarufa-részlet · közeli nézet</h2></div>
      <label className="rafter-detail-unit"><span className="sr-only">Méretek kijelzési egysége</span>
        <select value={unit} onChange={(event) => setUnit(event.target.value as LengthUnit)} aria-label="Méretek kijelzési egysége">{LENGTH_UNITS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </label>
    </div>
    <div className="drawing-stage">
      <GlassToolbar ariaLabel="Szarufa-részlet vezérlők" className="drawing-toolbar">
        <div className="drawing-toolbar-group" aria-label="Nagyítás">
          <button type="button" title="Kicsinyítés" aria-label="Kicsinyítés" onClick={() => setViewport({ zoom: current.current.zoom - .1, pan: current.current.pan })}><Minus aria-hidden="true" className="size-4" /></button>
          <output className="drawing-zoom-value" aria-live="polite" aria-label={`Nagyítás: ${Math.round(viewport.zoom * 100)}%`}>{Math.round(viewport.zoom * 100)}%</output>
          <button type="button" title="Nagyítás" aria-label="Nagyítás" onClick={() => setViewport({ zoom: current.current.zoom + .1, pan: current.current.pan })}><Plus aria-hidden="true" className="size-4" /></button>
        </div>
        <div className="drawing-toolbar-group" aria-label="Nézet"><button type="button" title="Vissza a közeli alapnézetre" aria-label="Nézet visszaállítása" onClick={() => setViewport(drawingInitialViewport)}><RotateCcw aria-hidden="true" className="size-4" /></button></div>
        <span className="drawing-toolbar-hint"><Move aria-hidden="true" className="size-4" /> Húzd vagy csippentsd; nyilak, +/−, 0.</span>
      </GlassToolbar>
      <div className="drawing-canvas" ref={canvasRef}>
        <svg ref={svgRef} className="technical-drawing-svg rafter-detail-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" tabIndex={0} aria-labelledby={`${titleId} ${descId}`} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
          <title id={titleId}>Szarufa-részlet axonometrikus nézetben</title>
          <desc id={descId}>{model.rafters.length} szomszédos szarufa-tengely a számított kiosztásból (a tetősíkon összesen {model.planeRafterCount}). Kijelölt szarufa hossza {show(highlighted.lengthMm, unit)}{spacing ? `, tényleges osztás ${show(model.actualSpacingMm, unit)}` : ""}. A vetített rövidülés nem méret; a feliratok a számított értékek. Csomópont-bevágás nincs rajzolva: további adat szükséges.</desc>
          <g transform={`translate(${W / 2 + viewport.pan.x} ${H / 2 + viewport.pan.y}) scale(${viewport.zoom}) translate(${-W / 2} ${-H / 2})`}>
            {model.planeOutlines.map((outline, index) => <polygon key={index} className="technical-plane is-unoutlined rafter-detail-plane" points={pts(outline)} />)}
            {model.rafters.map((rafter) => <line key={rafter.id} className={`rafter-detail-axis${rafter.highlighted ? " is-highlighted" : ""}`} x1={rafter.screenStart.x} y1={rafter.screenStart.y} x2={rafter.screenEnd.x} y2={rafter.screenEnd.y}><title>{`Szarufa-tengely · ${show(rafter.lengthMm, unit)}${rafter.highlighted ? " · kijelölt" : ""}`}</title></line>)}
            <g className="technical-dimension">
              <text x={lengthLabel.x} y={lengthLabel.y} textAnchor="middle" dominantBaseline="middle">L = {show(length.valueMm, unit)}</text>
              {spacing && <><line x1={spacing.start.x} y1={spacing.start.y} x2={spacing.end.x} y2={spacing.end.y} />{spacingLabel && <text x={spacingLabel.x} y={spacingLabel.y} textAnchor="middle" dominantBaseline="middle">osztás {show(spacing.valueMm, unit)}</text>}</>}
            </g>
            {model.joints.map((joint, index) => <g key={joint.position} className={`rafter-detail-joint is-${joint.status}`}>
              <circle cx={joint.screen.x} cy={joint.screen.y} r={24} />
              <text x={joint.screen.x} y={joint.screen.y} textAnchor="middle" dominantBaseline="central">{index + 1}</text>
              <title>{`${joint.title}: ${joint.status === "missing-data" ? "további adat szükséges" : "a 2D csomópontmodell nem alkalmazható"}`}</title>
            </g>)}
          </g>
        </svg>
      </div>
    </div>
    <dl className="rafter-detail-summary">
      <div><dt>Kijelölt szarufa hossza <small>A · kiosztásból</small></dt><dd>{show(highlighted.lengthMm, unit)}</dd></div>
      {spacing && <div><dt>Tényleges osztás <small>A · kiosztásból</small></dt><dd>{show(model.actualSpacingMm, unit)}</dd></div>}
      <div><dt>Tetősík hajlása <small>A · geometriából</small></dt><dd>{new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(model.pitchDegrees)}°</dd></div>
      <div><dt>Látható / tetősíkon <small>A</small></dt><dd>{model.rafters.length} / {model.planeRafterCount} db</dd></div>
      <div><dt>Keresztmetszet <small>{sectionText ? "megadott anyagadat" : "C · nincs megadva"}</small></dt><dd>{sectionText ?? "—"}</dd></div>
    </dl>
    <ol className="rafter-detail-joints">
      {model.joints.map((joint) => <li key={joint.position} data-status={joint.status}>
        <strong>{joint.title}</strong> <small>{joint.status === "missing-data" ? "C · További adat szükséges" : "C · Nem igazolt csomópont"}</small>
        {joint.reason && <p>{joint.reason}</p>}
        {joint.missing.length > 0 && <p>Hiányzó paraméter: {joint.missing.join("; ")}.</p>}
      </li>)}
    </ol>
    <p className="drawing-accessible-summary">Geometriai szarufa-tengelyek, nem fizikai faelem vagy gyártási szabásterv; a gerendatest a tetősíkhoz képesti elhelyezés igazolása nélkül nincs rajzolva. Közbenső támasz (derékszelemen) nincs megadva, ezért nem szerepel. D · {RAFTER_DETAIL_PROFESSIONAL}</p>
  </section>;
}

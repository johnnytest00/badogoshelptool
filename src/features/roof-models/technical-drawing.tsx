"use client";

import { useMemo, useRef, useState } from "react";
import { Minus, Move, Plus, RotateCcw, Scan } from "lucide-react";
import type { GableRoofOutput } from "@/domain/calculations/gable-roof";
import { createGableDrawingModel, drawingLayers, drawingViews, filterDrawingModel, type DrawingLayerId, type DrawingPoint, type DrawingView, type GableDrawingModel } from "@/domain/drawings/gable-drawing";
import { clampDrawingZoom, pinchViewport, type ViewportPoint } from "./drawing-viewport";

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 560;
type VisibleLayers = Record<DrawingLayerId, boolean>;
const initialLayers = Object.fromEntries(drawingLayers.map((layer) => [layer.id, layer.defaultVisible])) as VisibleLayers;

function mapPoint(point: DrawingPoint, model: GableDrawingModel): DrawingPoint {
  const rangeX = model.bounds.maxX - model.bounds.minX || 1;
  const rangeY = model.bounds.maxY - model.bounds.minY || 1;
  const padding = 80;
  const scale = Math.min((SVG_WIDTH - padding * 2) / rangeX, (SVG_HEIGHT - padding * 2) / rangeY);
  return { x: padding + (point.x - model.bounds.minX) * scale + ((SVG_WIDTH - padding * 2) - rangeX * scale) / 2, y: padding + (model.bounds.maxY - point.y) * scale + ((SVG_HEIGHT - padding * 2) - rangeY * scale) / 2 };
}

function pointsString(points: readonly DrawingPoint[], model: GableDrawingModel) { return points.map((item) => { const mapped = mapPoint(item, model); return `${mapped.x},${mapped.y}`; }).join(" "); }

function DimensionLine({ model, item }: Readonly<{ model: GableDrawingModel; item: GableDrawingModel["dimensions"][number] }>) {
  const start = mapPoint(item.start, model);
  const end = mapPoint(item.end, model);
  const horizontal = item.kind === "horizontal";
  const x1 = horizontal ? start.x : start.x + item.offset;
  const y1 = horizontal ? start.y + item.offset : start.y;
  const x2 = horizontal ? end.x : end.x + item.offset;
  const y2 = horizontal ? end.y + item.offset : end.y;
  const labelX = (x1 + x2) / 2;
  const labelY = (y1 + y2) / 2 - 8;
  return <g className="technical-dimension"><line x1={x1} y1={y1} x2={x2} y2={y2} /><line x1={start.x} y1={start.y} x2={x1} y2={y1} className="technical-extension" /><line x1={end.x} y1={end.y} x2={x2} y2={y2} className="technical-extension" /><text x={labelX} y={labelY} textAnchor="middle">{item.label}</text></g>;
}

function TechnicalSvg({ model, layers, title, zoom, pan, svgRef, onPointerDown, onPointerMove, onPointerUp }: Readonly<{ model: GableDrawingModel; layers: VisibleLayers; title: string; zoom: number; pan: { x: number; y: number }; svgRef: React.RefObject<SVGSVGElement | null>; onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void; onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void; onPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void }>) {
  const filtered = filterDrawingModel(model, layers);
  return <svg ref={svgRef} className="technical-drawing-svg" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role="img" aria-labelledby="technical-drawing-title technical-drawing-description" preserveAspectRatio="xMidYMid meet" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
    <title id="technical-drawing-title">{title}</title><desc id="technical-drawing-description">Méretezett, {title.toLowerCase()} a F5 nyeregtető számított geometriájából.</desc><defs><marker id="technical-arrow" markerWidth="7" markerHeight="7" refX="4" refY="3.5" orient="auto"><path d="M 0 0 L 7 3.5 L 0 7 z" fill="var(--brand)" /></marker></defs>
    <g transform={`translate(${SVG_WIDTH / 2 + pan.x} ${SVG_HEIGHT / 2 + pan.y}) scale(${zoom}) translate(${-SVG_WIDTH / 2} ${-SVG_HEIGHT / 2})`}>
    {filtered.polygons.map((polygon) => <polygon key={polygon.label} className={`technical-plane technical-plane-${polygon.side ?? "single"}`} points={pointsString(polygon.points, model)} aria-label={polygon.label} />)}
    {filtered.guides.map((segment, index) => <line key={`guide-${index}`} className="technical-guide" x1={mapPoint(segment.start, model).x} y1={mapPoint(segment.start, model).y} x2={mapPoint(segment.end, model).x} y2={mapPoint(segment.end, model).y} />)}
    {filtered.segments.map((segment, index) => <line key={`${segment.label}-${index}`} className={`technical-segment ${segment.hidden ? "is-hidden-edge" : ""}`} x1={mapPoint(segment.start, model).x} y1={mapPoint(segment.start, model).y} x2={mapPoint(segment.end, model).x} y2={mapPoint(segment.end, model).y} />)}
    {filtered.dimensions.map((item, index) => <DimensionLine key={`${item.label}-${index}`} model={model} item={item} />)}
    {filtered.angles.map((angle) => { const vertex = mapPoint(angle.vertex, model); const start = mapPoint(angle.start, model); const end = mapPoint(angle.end, model); return <g key={angle.label} className="technical-angle"><path d={`M ${start.x} ${start.y} Q ${vertex.x} ${vertex.y} ${end.x} ${end.y}`} /><text x={vertex.x} y={vertex.y + 26}>{angle.label}</text></g>; })}
    </g>
  </svg>;
}

export function TechnicalDrawing({ output, isSaved }: Readonly<{ output: GableRoofOutput; isSaved: boolean }>) {
  const [view, setView] = useState<DrawingView>("top");
  const [layers, setLayers] = useState<VisibleLayers>(initialLayers);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointers = useRef(new Map<number, ViewportPoint>());
  const gesture = useRef<{ kind: "pan" | "pinch"; startPoint?: ViewportPoint; startPan: { x: number; y: number }; startZoom: number; distance?: number; midpoint?: ViewportPoint } | null>(null);
  const model = useMemo(() => createGableDrawingModel(output, view), [output, view]);
  const setZoomBounded = (next: number) => setZoom(clampDrawingZoom(next));
  const resetViewport = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const clientToViewBox = (clientX: number, clientY: number): ViewportPoint => { const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return { x: clientX, y: clientY }; return { x: ((clientX - rect.left) / rect.width) * SVG_WIDTH, y: ((clientY - rect.top) / rect.height) * SVG_HEIGHT }; };
  const midpoint = (first: ViewportPoint, second: ViewportPoint): ViewportPoint => ({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
  const distance = (first: ViewportPoint, second: ViewportPoint) => Math.hypot(second.x - first.x, second.y - first.y);
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = clientToViewBox(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, current);
    if (pointers.current.size === 1) gesture.current = { kind: "pan", startPoint: current, startPan: pan, startZoom: zoom };
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      gesture.current = { kind: "pinch", startPan: pan, startZoom: zoom, distance: distance(first, second), midpoint: midpoint(first, second) };
    }
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, clientToViewBox(event.clientX, event.clientY));
    const activeGesture = gesture.current;
    if (!activeGesture) return;
    const activePoints = [...pointers.current.values()];
    if (activeGesture.kind === "pinch" && activePoints.length >= 2 && activeGesture.distance && activeGesture.midpoint) {
      const next = pinchViewport({ zoom: activeGesture.startZoom, pan: activeGesture.startPan, distance: activeGesture.distance, midpoint: activeGesture.midpoint }, { distance: distance(activePoints[0], activePoints[1]), midpoint: midpoint(activePoints[0], activePoints[1]) }, { x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2 });
      setZoom(next.zoom); setPan(next.pan);
    } else if (activeGesture.kind === "pan" && activeGesture.startPoint && activePoints.length === 1) {
      setPan({ x: activeGesture.startPan.x + activePoints[0].x - activeGesture.startPoint.x, y: activeGesture.startPan.y + activePoints[0].y - activeGesture.startPoint.y });
    }
  };
  const stopPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Pointer capture may already be released by the browser. */ }
    const remaining = [...pointers.current.values()];
    if (remaining.length === 1) gesture.current = { kind: "pan", startPoint: remaining[0], startPan: pan, startZoom: zoom };
    if (remaining.length === 0) gesture.current = null;
  };
  const updateLayer = (id: DrawingLayerId) => setLayers((current) => ({ ...current, [id]: !current[id] }));
  return <section className="technical-drawing" aria-labelledby="technical-drawing-heading">
    <div className="technical-drawing-header"><div><p className="section-eyebrow">Rajzok</p><h2 id="technical-drawing-heading">Interaktív műszaki rajz</h2></div><span className={`drawing-state ${isSaved ? "is-saved" : "is-preview"}`}>{isSaved ? "Mentett revízió" : "Nem mentett előnézet"}</span></div>
    <div className="drawing-view-tabs" role="tablist" aria-label="Rajznézet választása">{drawingViews.map((item) => <button key={item.id} type="button" role="tab" aria-selected={view === item.id} className={view === item.id ? "is-active" : ""} onClick={() => { setView(item.id); resetViewport(); }}>{item.label}</button>)}</div>
    <div className="drawing-canvas" onWheel={(event) => { event.preventDefault(); setZoomBounded(zoom + (event.deltaY < 0 ? .1 : -.1)); }}><TechnicalSvg model={model} layers={layers} title={model.title} zoom={zoom} pan={pan} svgRef={svgRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopPointer} /></div>
    <div className="drawing-toolbar" aria-label="Rajz nagyítás vezérlők"><button type="button" aria-label="Nagyítás" onClick={() => setZoomBounded(zoom + .1)}><Plus className="size-4" /></button><span aria-live="polite">{Math.round(zoom * 100)}%</span><button type="button" aria-label="Kicsinyítés" onClick={() => setZoomBounded(zoom - .1)}><Minus className="size-4" /></button><button type="button" aria-label="Nézet visszaállítása" onClick={resetViewport}><RotateCcw className="size-4" /></button><span className="drawing-toolbar-hint"><Move className="size-4" /> Húzd a rajzot</span><button type="button" aria-label="Rajz illesztése" onClick={resetViewport}><Scan className="size-4" /></button></div>
    <fieldset className="drawing-layers"><legend>Rétegek</legend>{drawingLayers.map((layer) => <label key={layer.id}><input type="checkbox" checked={layers[layer.id]} onChange={() => updateLayer(layer.id)} /> <span>{layer.label}</span></label>)}</fieldset>
    <p className="drawing-accessible-summary">A rajz forrása: {model.title}. Fő méretek: {model.dimensions.slice(0, 3).map((item) => `${item.label}`).join(", ") || "a nézethez tartozó geometria"}. A numerikus eredmények az Eredmények szakaszban szövegesen is elérhetők.</p>
  </section>;
}

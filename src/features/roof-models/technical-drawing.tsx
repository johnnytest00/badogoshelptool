"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Move, Plus, RotateCcw } from "lucide-react";
import type { GableRoofOutput } from "@/domain/calculations/gable-roof";
import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import { gableSegments } from "@/domain/calculations/gable-segments";
import type { MetalSheetLayoutOutput } from "@/domain/calculations/metal-sheet-layout";
import { createGableDrawingModel, drawingLayers, drawingViews, filterDrawingModel, type DrawingLayerId, type DrawingPoint, type DrawingView, type GableDrawingModel } from "@/domain/drawings/gable-drawing";
import { createRoofDrawingModel } from "@/domain/drawings/roof-drawing";
import { clampDrawingZoom, clientPointToViewBox, drawingInitialViewport, fitDrawingViewport, panViewport, pinchViewport, rebasePanGesture, type ViewportBounds, type ViewportPoint } from "./drawing-viewport";
import { angleScreenGeometry, dimensionScreenGeometry, resolveAnnotationLabelPositions, technicalAnnotationRules } from "@/domain/drawings/annotation-layout";
import { GlassToolbar } from "@/components/ui/glass-toolbar";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";

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

function annotationLabelPositions(model: GableDrawingModel) {
  const candidates = [
    ...model.dimensions.map((item, index) => {
      const start = mapPoint(item.start, model);
      const end = mapPoint(item.end, model);
      const layout = dimensionScreenGeometry(item.kind, start, end, item.offset);
      return { id: `dimension:${index}`, text: item.label, point: layout.label, anchor: layout.labelAnchor, move: layout.normal };
    }),
    ...model.angles.map((item, index) => {
      const vertex = mapPoint(item.vertex, model);
      const layout = angleScreenGeometry(vertex, mapPoint(item.start, model), mapPoint(item.end, model));
      return { id: `angle:${index}`, text: item.label, point: layout.label, anchor: "middle" as const, move: { x: layout.label.x - vertex.x, y: layout.label.y - vertex.y } };
    }),
  ];
  return resolveAnnotationLabelPositions(candidates);
}

function getDrawingBounds(model: GableDrawingModel): ViewportBounds {
  const points: DrawingPoint[] = [];
  const add = (point: DrawingPoint) => points.push(mapPoint(point, model));
  const addPair = (start: DrawingPoint, end: DrawingPoint) => { add(start); add(end); };
  const addLabel = (point: DrawingPoint, label: string, anchor: "middle" | "start" | "end" = "middle") => {
    const center = mapPoint(point, model);
    const width = Math.max(30, label.length * 20);
    const left = anchor === "middle" ? center.x - width / 2 : anchor === "start" ? center.x : center.x - width;
    points.push({ x: left, y: center.y - 24 }, { x: left + width, y: center.y + 24 });
  };
  model.polygons.forEach((item) => item.points.forEach(add));
  model.segments.filter((item) => !item.hidden).forEach((item) => addPair(item.start, item.end));
  model.guides.filter((item) => !item.hidden).forEach((item) => addPair(item.start, item.end));
  const labelPositions = annotationLabelPositions(model);
  model.dimensions.forEach((item, index) => { const layout = dimensionScreenGeometry(item.kind, mapPoint(item.start, model), mapPoint(item.end, model), item.offset); points.push(layout.start, layout.end, layout.extensionStart, layout.extensionEnd); addLabel(labelPositions.get(`dimension:${index}`) ?? layout.label, item.label, layout.labelAnchor); });
  model.angles.forEach((item, index) => { const layout = angleScreenGeometry(mapPoint(item.vertex, model), mapPoint(item.start, model), mapPoint(item.end, model)); points.push(layout.start, layout.end); addLabel(labelPositions.get(`angle:${index}`) ?? layout.label, item.label); });
  model.sheetStrips.forEach((item) => item.points.forEach(add));
  if (!points.length || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    return { minX: 0, minY: 0, maxX: SVG_WIDTH, maxY: SVG_HEIGHT };
  }
  const xs = points.map((item) => item.x);
  const ys = points.map((item) => item.y);
  return { minX: Math.min(...xs) - technicalAnnotationRules.boundsPadding, minY: Math.min(...ys) - technicalAnnotationRules.boundsPadding, maxX: Math.max(...xs) + technicalAnnotationRules.boundsPadding, maxY: Math.max(...ys) + technicalAnnotationRules.boundsPadding };
}

function dimensionArrowPath(tip: DrawingPoint, toward: DrawingPoint) {
  const dx = toward.x - tip.x;
  const dy = toward.y - tip.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 0.01) return "";
  const ux = dx / length;
  const uy = dy / length;
  const base = { x: tip.x + ux * 14, y: tip.y + uy * 14 };
  const halfWidth = 4.5;
  const perpendicular = { x: -uy * halfWidth, y: ux * halfWidth };
  const first = { x: base.x + perpendicular.x, y: base.y + perpendicular.y };
  const second = { x: base.x - perpendicular.x, y: base.y - perpendicular.y };
  return ["M", tip.x, tip.y, "L", first.x, first.y, "L", second.x, second.y, "Z"].join(" ");
}

function DimensionLine({ model, item, labelPosition, activeDimension, onDimensionSelect }: Readonly<{ model: GableDrawingModel; item: GableDrawingModel["dimensions"][number]; labelPosition?: DrawingPoint; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  const start = mapPoint(item.start, model);
  const end = mapPoint(item.end, model);
  const layout = dimensionScreenGeometry(item.kind, start, end, item.offset);
  const active = Boolean(item.sourceKey && item.sourceKey === activeDimension);
  const selectable = Boolean(item.sourceKey && onDimensionSelect);
  const select = () => { if (item.sourceKey) onDimensionSelect?.(item.sourceKey); };
  return <g className={`technical-dimension ${active ? "is-active" : ""} ${selectable ? "is-selectable" : ""}`} data-dimension-key={item.sourceKey} aria-label={item.description ?? item.label} role={selectable ? "button" : undefined} tabIndex={selectable ? 0 : undefined} aria-pressed={selectable ? active : undefined} onPointerDown={selectable ? (event) => { event.preventDefault(); event.stopPropagation(); select(); } : undefined} onPointerUp={selectable ? (event) => event.stopPropagation() : undefined} onClick={selectable ? select : undefined} onKeyDown={selectable ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } } : undefined}><line x1={layout.start.x} y1={layout.start.y} x2={layout.end.x} y2={layout.end.y} /><path className="technical-dimension-arrow" d={dimensionArrowPath(layout.start, layout.end)} /><path className="technical-dimension-arrow" d={dimensionArrowPath(layout.end, layout.start)} /><line x1={layout.extensionStart.x} y1={layout.extensionStart.y} x2={layout.start.x} y2={layout.start.y} className="technical-extension" /><line x1={layout.extensionEnd.x} y1={layout.extensionEnd.y} x2={layout.end.x} y2={layout.end.y} className="technical-extension" /><text x={labelPosition?.x ?? layout.label.x} y={labelPosition?.y ?? layout.label.y} textAnchor={layout.labelAnchor} dominantBaseline="middle">{item.label}</text></g>;
}

function TechnicalSvg({ model, layers, title, zoom, pan, svgRef, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, selectedSegmentIds, onSegmentToggle, activeDimension, onDimensionSelect }: Readonly<{ model: GableDrawingModel; layers: VisibleLayers; title: string; zoom: number; pan: { x: number; y: number }; svgRef: React.RefObject<SVGSVGElement | null>; onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void; onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void; onPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void; onPointerCancel: (event: React.PointerEvent<SVGSVGElement>) => void; onLostPointerCapture: (event: React.PointerEvent<SVGSVGElement>) => void; selectedSegmentIds?: readonly string[]; onSegmentToggle?: (id: string) => void; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  const drawingId = useId().replace(/:/g, "");
  const titleId = `technical-drawing-title-${drawingId}`;
  const descriptionId = `technical-drawing-description-${drawingId}`;
  const filtered = filterDrawingModel(model, layers);
  const labelPositions = annotationLabelPositions(filtered);
  const showStripLabels = filtered.sheetStrips.length > 0 && filtered.sheetStrips.length <= 64;
  return <svg ref={svgRef} className="technical-drawing-svg" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role={onSegmentToggle || onDimensionSelect ? "group" : "img"} aria-labelledby={`${titleId} ${descriptionId}`} preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onLostPointerCapture={onLostPointerCapture}>
    <title id={titleId}>{title}</title><desc id={descriptionId}>Méretezett, {title.toLowerCase()} az ellenőrzött tetőgeometriából.</desc>
    <g transform={`translate(${SVG_WIDTH / 2 + pan.x} ${SVG_HEIGHT / 2 + pan.y}) scale(${zoom}) translate(${-SVG_WIDTH / 2} ${-SVG_HEIGHT / 2})`}>
    {filtered.polygons.map((polygon) => <polygon key={polygon.label} className={`technical-plane technical-plane-${polygon.side ?? "single"}`} points={pointsString(polygon.points, model)} aria-label={polygon.label} />)}
    {filtered.sheetStrips.map((strip) => <g key={strip.id} className={`technical-sheet-strip ${strip.indexFromStart % 2 === 0 ? "is-even" : "is-odd"} ${strip.isPartial ? "is-partial" : ""}`}><polygon points={pointsString(strip.points, model)} aria-label={`${strip.id}${strip.isPartial ? ", részleges szélső sáv" : ""}`} />{showStripLabels && (() => { const mapped = strip.points.map((point) => mapPoint(point, model)); const center = { x: mapped.reduce((sum, point) => sum + point.x, 0) / mapped.length, y: mapped.reduce((sum, point) => sum + point.y, 0) / mapped.length }; return <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="middle">{strip.indexFromStart}</text>; })()}</g>)}
    {filtered.guides.map((segment, index) => <line key={`guide-${index}`} className="technical-guide" x1={mapPoint(segment.start, model).x} y1={mapPoint(segment.start, model).y} x2={mapPoint(segment.end, model).x} y2={mapPoint(segment.end, model).y} />)}
    {filtered.segments.map((segment, index) => <line key={`${segment.label}-${index}`} className={`technical-segment ${segment.hidden ? "is-hidden-edge" : ""}`} x1={mapPoint(segment.start, model).x} y1={mapPoint(segment.start, model).y} x2={mapPoint(segment.end, model).x} y2={mapPoint(segment.end, model).y} />)}
    {onSegmentToggle && model.view === "top" && <g className="technical-selection">
      {filtered.polygons.filter((polygon) => polygon.id).map((polygon) => <polygon key={polygon.id} points={pointsString(polygon.points, model)} className={selectedSegmentIds?.includes(polygon.id!) ? "is-selected" : ""} role="button" tabIndex={0} aria-label={`${polygon.label} kiválasztása`} aria-pressed={selectedSegmentIds?.includes(polygon.id!)} onPointerDown={(event) => event.stopPropagation()} onClick={() => onSegmentToggle(polygon.id!)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSegmentToggle(polygon.id!); } }} />)}
      {filtered.segments.filter((segment) => segment.id).map((segment) => <line key={segment.id} x1={mapPoint(segment.start, model).x} y1={mapPoint(segment.start, model).y} x2={mapPoint(segment.end, model).x} y2={mapPoint(segment.end, model).y} className={selectedSegmentIds?.includes(segment.id!) ? "is-selected" : ""} role="button" tabIndex={0} aria-label={`${segment.label} kiválasztása`} aria-pressed={selectedSegmentIds?.includes(segment.id!)} onPointerDown={(event) => event.stopPropagation()} onClick={() => onSegmentToggle(segment.id!)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSegmentToggle(segment.id!); } }} />)}
    </g>}
    {filtered.dimensions.map((item, index) => <DimensionLine key={`${item.label}-${index}`} model={model} item={item} labelPosition={labelPositions.get(`dimension:${index}`)} activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />)}
    {filtered.angles.map((angle, index) => { const vertex = mapPoint(angle.vertex, model); const start = mapPoint(angle.start, model); const end = mapPoint(angle.end, model); const layout = angleScreenGeometry(vertex, start, end); const labelPosition = labelPositions.get(`angle:${index}`) ?? layout.label; const active = Boolean(angle.sourceKey && angle.sourceKey === activeDimension); const selectable = Boolean(angle.sourceKey && onDimensionSelect); const select = () => { if (angle.sourceKey) onDimensionSelect?.(angle.sourceKey); }; return <g key={angle.label} className={`technical-angle ${active ? "is-active" : ""} ${selectable ? "is-selectable" : ""}`} data-dimension-key={angle.sourceKey} aria-label={angle.description ?? angle.label} role={selectable ? "button" : undefined} tabIndex={selectable ? 0 : undefined} aria-pressed={selectable ? active : undefined} onPointerDown={selectable ? (event) => { event.preventDefault(); event.stopPropagation(); select(); } : undefined} onPointerUp={selectable ? (event) => event.stopPropagation() : undefined} onClick={selectable ? select : undefined} onKeyDown={selectable ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } } : undefined}><path d={`M ${layout.start.x} ${layout.start.y} A ${technicalAnnotationRules.angleRadius} ${technicalAnnotationRules.angleRadius} 0 0 1 ${layout.end.x} ${layout.end.y}`} /><text x={labelPosition.x} y={labelPosition.y} textAnchor="middle" dominantBaseline="middle">{angle.label}</text></g>; })}
    </g>
  </svg>;
}

export function TechnicalDrawing({ output, geometry, isSaved, sheetLayout, sheetLayoutIsSaved = false, headingId = "technical-drawing-heading", heading = "Interaktív műszaki rajz", selectedSegmentIds, onSegmentToggle, activeDimension, activeDimensionDescription, onDimensionSelect, compact = false }: Readonly<{ output?: GableRoofOutput; geometry?: RoofGeometry; isSaved: boolean; sheetLayout?: MetalSheetLayoutOutput | null; sheetLayoutIsSaved?: boolean; headingId?: string; heading?: string; selectedSegmentIds?: readonly string[]; onSegmentToggle?: (id: string) => void; activeDimension?: string | null; activeDimensionDescription?: string; onDimensionSelect?: (key: string) => void; compact?: boolean }>) {
  const [view, setView] = useState<DrawingView>("top");
  const [layers, setLayers] = useState<VisibleLayers>(initialLayers);
  const [zoom, setZoom] = useState<number>(drawingInitialViewport.zoom);
  const [pan, setPan] = useState<{ x: number; y: number }>(drawingInitialViewport.pan);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, ViewportPoint>());
  const interactionFrame = useRef<number | null>(null);
  const userAdjustedViewport = useRef(false);
  const gesture = useRef<{ kind: "pan" | "pinch"; startPoint?: ViewportPoint; startPan: { x: number; y: number }; startZoom: number; distance?: number; midpoint?: ViewportPoint } | null>(null);
  const viewport = useRef<{ zoom: number; pan: { x: number; y: number } }>({ zoom: drawingInitialViewport.zoom, pan: drawingInitialViewport.pan });
  const model = useMemo(() => geometry ? createRoofDrawingModel(geometry) : createGableDrawingModel(output!, view, sheetLayout), [geometry, output, sheetLayout, view]);
  const previousModel = useRef(model);
  const selectable = geometry ? [
    ...geometry.planes.map((plane, index) => ({ id: plane.id, label: `Tetősík ${index + 1}`, lengthMm: null as number | null, areaMm2: plane.areaMm2, kind: "plane" })),
    ...geometry.edges.map((edge, index) => ({ id: edge.id, label: `${{ eave: "Eresz", upper: "Felső él", ridge: "Gerinc", rake: "Oromél", hip: "Kontyél", valley: "Vápavonal" }[edge.kind]} ${index + 1}`, lengthMm: edge.lengthMm, areaMm2: null as number | null, kind: edge.kind })),
  ] : gableSegments(output!);
  const selectedLength = (kind: string) => selectable.reduce((sum, segment) => sum + (segment.kind === kind && selectedSegmentIds?.includes(segment.id) ? segment.lengthMm ?? 0 : 0), 0);
  const visibleModel = useMemo(() => filterDrawingModel(model, layers), [model, layers]);
  const drawingBounds = useMemo(() => getDrawingBounds(visibleModel), [visibleModel]);
  const setViewport = useCallback((next: Readonly<{ zoom: number; pan: ViewportPoint }>) => {
    const value = {
      zoom: clampDrawingZoom(next.zoom),
      pan: {
        x: Number.isFinite(next.pan.x) ? next.pan.x : 0,
        y: Number.isFinite(next.pan.y) ? next.pan.y : 0,
      },
    };
    const unchanged = viewport.current.zoom === value.zoom
      && viewport.current.pan.x === value.pan.x
      && viewport.current.pan.y === value.pan.y;
    viewport.current = value;
    if (unchanged) return;
    setZoom(value.zoom);
    setPan(value.pan);
  }, []);
  const setZoomBounded = useCallback((next: number) => { userAdjustedViewport.current = true; setViewport({ zoom: next, pan: viewport.current.pan }); }, [setViewport]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoomBounded(viewport.current.zoom + (event.deltaY < 0 ? .1 : -.1));
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [setZoomBounded]);
  const resetViewport = useCallback(() => { userAdjustedViewport.current = true; setViewport(drawingInitialViewport); }, [setViewport]);
  const fitViewport = useCallback(() => {
    userAdjustedViewport.current = false;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    setViewport(fitDrawingViewport(drawingBounds, { width: rect.width, height: rect.height }));
  }, [drawingBounds, setViewport]);
  useEffect(() => {
    if (previousModel.current !== model) {
      previousModel.current = model;
      userAdjustedViewport.current = false;
      if (interactionFrame.current !== null) {
        window.cancelAnimationFrame(interactionFrame.current);
        interactionFrame.current = null;
      }
      const activePointerIds = [...pointers.current.keys()];
      pointers.current.clear();
      gesture.current = null;
      for (const pointerId of activePointerIds) {
        try {
          if (svgRef.current?.hasPointerCapture(pointerId)) svgRef.current.releasePointerCapture(pointerId);
        } catch { /* A model switch may race with browser pointer-capture cleanup. */ }
      }
      setViewport(drawingInitialViewport);
    }
    const fitToCurrentSize = () => {
      if (userAdjustedViewport.current) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      setViewport(fitDrawingViewport(drawingBounds, { width: rect.width, height: rect.height }));
    };
    const frame = window.requestAnimationFrame(fitToCurrentSize);
    const element = svgRef.current;
    const observer = typeof ResizeObserver === "undefined" || !element ? null : new ResizeObserver(fitToCurrentSize);
    observer?.observe(element!);
    if (!observer) window.addEventListener("resize", fitToCurrentSize);
    return () => { window.cancelAnimationFrame(frame); observer?.disconnect(); if (!observer) window.removeEventListener("resize", fitToCurrentSize); };
  }, [drawingBounds, model, setViewport, view]);
  const clientToViewBox = (clientX: number, clientY: number): ViewportPoint | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return clientPointToViewBox({ x: clientX, y: clientY }, rect);
  };
  const midpoint = (first: ViewportPoint, second: ViewportPoint): ViewportPoint => ({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
  const distance = (first: ViewportPoint, second: ViewportPoint) => Math.hypot(second.x - first.x, second.y - first.y);
  const applyPointerGesture = () => {
    const activeGesture = gesture.current;
    if (!activeGesture) return;
    const activePoints = [...pointers.current.values()];
    if (activeGesture.kind === "pinch" && activePoints.length >= 2 && activeGesture.distance && activeGesture.midpoint) {
      userAdjustedViewport.current = true;
      setViewport(pinchViewport({ zoom: activeGesture.startZoom, pan: activeGesture.startPan, distance: activeGesture.distance, midpoint: activeGesture.midpoint }, { distance: distance(activePoints[0], activePoints[1]), midpoint: midpoint(activePoints[0], activePoints[1]) }, { x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2 }));
    } else if (activeGesture.kind === "pan" && activeGesture.startPoint && activePoints.length === 1) {
      userAdjustedViewport.current = true;
      setViewport({ zoom: viewport.current.zoom, pan: panViewport({ pan: activeGesture.startPan, point: activeGesture.startPoint }, activePoints[0], activeGesture.startZoom) });
    }
  };
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const current = clientToViewBox(event.clientX, event.clientY);
    if (!current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, current);
    if (pointers.current.size === 1) gesture.current = { kind: "pan", startPoint: current, startPan: viewport.current.pan, startZoom: viewport.current.zoom };
    if (pointers.current.size >= 2) {
      const [first, second] = [...pointers.current.values()];
      gesture.current = { kind: "pinch", startPan: viewport.current.pan, startZoom: viewport.current.zoom, distance: distance(first, second), midpoint: midpoint(first, second) };
    }
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    if (!pointers.current.has(event.pointerId)) return;
    const current = clientToViewBox(event.clientX, event.clientY);
    if (!current) return;
    pointers.current.set(event.pointerId, current);
    if (interactionFrame.current !== null) return;
    interactionFrame.current = window.requestAnimationFrame(() => { interactionFrame.current = null; applyPointerGesture(); });
  };
  const stopPointer = (event: React.PointerEvent<SVGSVGElement>, applyFinalPosition: boolean) => {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    if (applyFinalPosition) {
      const current = clientToViewBox(event.clientX, event.clientY);
      if (current) pointers.current.set(event.pointerId, current);
    }
    if (interactionFrame.current !== null) { window.cancelAnimationFrame(interactionFrame.current); interactionFrame.current = null; }
    applyPointerGesture();
    pointers.current.delete(event.pointerId);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Pointer capture may already be released by the browser. */ }
    const remaining = [...pointers.current.values()];
    const rebased = rebasePanGesture(remaining, viewport.current);
    gesture.current = rebased ? { kind: "pan", ...rebased } : null;
  };
  useEffect(() => () => {
    if (interactionFrame.current !== null) window.cancelAnimationFrame(interactionFrame.current);
    for (const pointerId of pointers.current.keys()) {
      try {
        if (svgRef.current?.hasPointerCapture(pointerId)) svgRef.current.releasePointerCapture(pointerId);
      } catch { /* Pointer capture may already be released when the drawing unmounts. */ }
    }
    pointers.current.clear();
    gesture.current = null;
  }, []);
  const updateLayer = (id: DrawingLayerId) => setLayers((current) => ({ ...current, [id]: !current[id] }));
  const activeDimensionText = activeDimension ? model.dimensions.find((item) => item.sourceKey === activeDimension)?.description ?? model.angles.find((item) => item.sourceKey === activeDimension)?.description ?? activeDimensionDescription ?? "A fókuszált mérés kiemelve a rajzon." : " ";
  const drawingToolbar = <GlassToolbar ariaLabel="Rajz vezérlők" className="drawing-toolbar"><div className="drawing-toolbar-group" aria-label="Nagyítás"><button type="button" title="Kicsinyítés" aria-label="Kicsinyítés" onClick={() => setZoomBounded(viewport.current.zoom - .1)}><Minus aria-hidden="true" className="size-4" /></button><output className="drawing-zoom-value" aria-live="polite" aria-label={`Nagyítás: ${Math.round(zoom * 100)}%`}>{Math.round(zoom * 100)}%</output><button type="button" title="Nagyítás" aria-label="Nagyítás" onClick={() => setZoomBounded(viewport.current.zoom + .1)}><Plus aria-hidden="true" className="size-4" /></button></div><div className="drawing-toolbar-group" aria-label="Nézet"><button type="button" title="Rajz illesztése a viewporthoz" aria-label="Rajz illesztése" onClick={fitViewport}><Maximize2 aria-hidden="true" className="size-4" /></button><button type="button" title="Nézet visszaállítása 100%-ra" aria-label="Nézet visszaállítása" onClick={resetViewport}><RotateCcw aria-hidden="true" className="size-4" /></button></div><span className="drawing-toolbar-hint"><Move aria-hidden="true" className="size-4" /> Egy ujjal húzd a rajzot, két ujjal nagyítsd.</span></GlassToolbar>;
  return <section className={`technical-drawing${compact ? " is-compact" : ""}`} aria-labelledby={headingId}>
    <div className="technical-drawing-header"><div className="technical-drawing-title"><h2 id={headingId}>{heading}</h2></div><span className={`drawing-state ${sheetLayoutIsSaved || (isSaved && !sheetLayout) ? "is-saved" : "is-preview"}`}>{sheetLayout ? sheetLayoutIsSaved ? "Mentett lemezkiosztás" : "Nem mentett lemezkiosztás" : isSaved ? "Mentett revízió" : "Nem mentett előnézet"}</span></div>
    <div className={`drawing-compact-summary${compact ? " sr-only" : ""}`}><span>{model.title}</span><span aria-live={compact ? "off" : "polite"}>{activeDimensionText}</span></div>
    <div className="drawing-stage">
      {drawingToolbar}
      <div className="drawing-canvas" ref={canvasRef}><TechnicalSvg model={model} layers={layers} title={model.title} zoom={zoom} pan={pan} svgRef={svgRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={(event) => stopPointer(event, true)} onPointerCancel={(event) => stopPointer(event, false)} onLostPointerCapture={(event) => stopPointer(event, false)} selectedSegmentIds={selectedSegmentIds} onSegmentToggle={onSegmentToggle} activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} /></div>
    </div>
    {onSegmentToggle && <div className="roof-segment-picker" aria-label="Tetőrészek kiválasztása"><p>Tetőgeometriából számított · a jelölés önmagában nem rendel munkát az élekhez.</p><div className="roof-segment-list">{selectable.map((segment) => <button key={segment.id} type="button" className={selectedSegmentIds?.includes(segment.id) ? "is-selected" : ""} aria-pressed={selectedSegmentIds?.includes(segment.id)} onClick={() => onSegmentToggle(segment.id)}><span>{segment.label}</span><strong>{new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(segment.lengthMm !== null ? segment.lengthMm / 1000 : (segment.areaMm2 ?? 0) / 1_000_000)} {segment.lengthMm !== null ? "m" : "m²"}</strong></button>)}</div><p>Kijelölt eresz: {new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(selectedLength("eave") / 1000)} m · oromél: {new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(selectedLength("rake") / 1000)} m · gerinc: {new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(selectedLength("ridge") / 1000)} m{geometry && <> · kontyél: {new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(selectedLength("hip") / 1000)} m · vápa: {new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(selectedLength("valley") / 1000)} m</>}</p></div>}
    <GlassDisclosure className="drawing-advanced-controls" contentClassName="drawing-advanced-controls-content" summary="Nézetek és rétegek"><div className="drawing-view-tabs" role="tablist" aria-label="Rajznézet választása">{(geometry ? drawingViews.filter((item) => item.id === "top") : drawingViews).map((item) => <button key={item.id} type="button" role="tab" aria-selected={view === item.id} className={view === item.id ? "is-active" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}</div>{activeDimension && <p className="technical-drawing-active-guide" role="status">{model.dimensions.some((item) => item.sourceKey === activeDimension) || model.angles.some((item) => item.sourceKey === activeDimension) ? "A rajzon kiemelve: " : "Kiegészítő metszeti útmutató: "}{activeDimensionText}</p>}<fieldset className="drawing-layers"><legend>Rétegek</legend>{drawingLayers.map((layer) => <label key={layer.id}><input type="checkbox" checked={layers[layer.id]} onChange={() => updateLayer(layer.id)} /> <span>{layer.label}</span></label>)}</fieldset></GlassDisclosure>
    <p className="drawing-accessible-summary">A rajz forrása: {model.title}. Fő méretek: {model.dimensions.slice(0, 3).map((item) => `${item.label}`).join(", ") || "a nézethez tartozó geometria"}. A numerikus eredmények az Eredmények szakaszban szövegesen is elérhetők.</p>
  </section>;
}

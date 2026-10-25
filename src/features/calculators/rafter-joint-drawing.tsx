"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Move, Plus, RotateCcw } from "lucide-react";
import { GlassToolbar } from "@/components/ui/glass-toolbar";
import type { PlateFit, RafterJoints } from "@/domain/calculations/construction/rafter-joints";
import { arrowheadPath, dimensionScreenGeometry, resolveAnnotationLabelPositions, technicalAnnotationRules, type AnnotationPoint } from "@/domain/drawings/annotation-layout";
import { createRafterJointDrawingModel, fitCamera, nudgeOffSegments, panCamera, projectPoint, zoomCameraAt, type CanvasSize, type DrawingCamera, type JointAngle, type JointDimension, type JointSlot, type JointSlotId, type MmBounds, type MmPoint, type RafterJointDrawingModel } from "@/domain/drawings/rafter-joint-drawing";
import { LENGTH_UNITS, type LengthUnit } from "@/domain/measurements/length-input";
import { useCanvasSize, useFontSize } from "./drawing-canvas-hooks";
import { formatDrawingLength, formatJointValue } from "./rafter-joints-panel";

type Section = NonNullable<RafterJointDrawingModel["section"]>;
const STATUS_TEXT = { computed: "számított", incomplete: "további adat szükséges", invalid: "nem számítható", absent: "nincs megadva" } as const;
const DOUBLE_TAP_MS = 320;
const ANGLE_RADIUS = 28;
/** Short plain words on the drawing; the list under the detail gives the full name and the measuring direction. */
const SHORT_NAME: Record<string, string> = { plumb: "függő", seat: "ülék", depth: "bevágás", remaining: "marad", board: "t/2" };
const DETAIL_NAME: Record<string, string> = {
  plumb: "Függővágás magassága · függőlegesen", seat: "Ülék hossza · vízszintesen", depth: "Bevágás mélysége · a szarufára merőlegesen",
  remaining: "Megmaradó magasság · a szarufára merőlegesen", board: "Gerincdeszka fele (t/2) · vízszintesen",
};
const ANGLE_NAME: Record<string, string> = { "plumb-angle": "Függővágás szöge a szarufa éléhez", "seat-angle": "Ülékvágás szöge a szarufa éléhez" };
const suffix = (id: string) => id.replace(/^S\d-/, "");

const arrow = (tip: AnnotationPoint, toward: AnnotationPoint) => arrowheadPath(tip, toward);
/** A value label on a filled tag, so it stays readable over wood, hatching and dimension lines. */
export function Tag({ x, y, text, anchor, fontSize, className }: Readonly<{ x: number; y: number; text: string; anchor: "start" | "middle" | "end"; fontSize: number; className?: string }>) {
  const width = text.length * fontSize * .6 + 10, left = anchor === "start" ? x - 5 : anchor === "end" ? x - width + 5 : x - width / 2;
  return <g className={`rafter-joint-tag${className ? ` ${className}` : ""}`}>
    <rect x={left} y={y - fontSize * .78} width={width} height={fontSize * 1.56} rx={fontSize * .45} />
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central">{text}</text>
  </g>;
}
const pts = (points: readonly AnnotationPoint[]) => points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
const expand = (box: MmBounds, by: number): MmBounds => ({ minX: box.minX - by, minY: box.minY - by, maxX: box.maxX + by, maxY: box.maxY + by });

/** One dimensioned view of the section; overview shows the cutting chain from O and S badges, detail one joint's notch. */
function SectionView({ section, slots, camera, size, fontSize, unit, mode, selected, onSelect, hideOrigin = false }: Readonly<{ section: Section; slots: readonly JointSlot[]; camera: DrawingCamera; size: CanvasSize; fontSize: number; unit: LengthUnit; mode: "overview" | "detail"; selected: JointSlotId; onSelect?: (slot: JointSlotId) => void; hideOrigin?: boolean }>) {
  const project = (point: MmPoint) => projectPoint(camera, size, point);
  const toScreenVector = (vector: MmPoint) => ({ x: vector.xMm, y: -vector.yMm });
  const active = slots.find((slot) => slot.slot === selected);
  const dims: readonly JointDimension[] = mode === "overview" ? section.overview : active?.dimensions ?? [];
  // An arc needs room on its cut edge; the value is always in the list under the detail.
  const angles: readonly JointAngle[] = mode === "detail" ? (active?.angles ?? []).filter((angle) => angle.armMm * camera.scale >= ANGLE_RADIUS * 2) : [];
  const cuts = mode === "overview" ? slots.flatMap((slot) => slot.cut ? [slot.cut] : []) : active?.cut ? [active.cut] : [];
  const cutSegments = [...cuts.flatMap((cut) => cut.edges), ...section.endCuts].map((edge) => [project(edge.from), project(edge.to)] as const);
  const laid = dims.flatMap((item) => {
    const from = project(item.from), to = project(item.to);
    // Too short on screen for arrows and a label: the value stays in the cutting list under the drawing.
    if (Math.hypot(to.x - from.x, to.y - from.y) < 16) return [];
    const outward = toScreenVector(item.outward);
    const sign = item.kind === "horizontal" ? Math.sign(outward.y) || 1 : item.kind === "vertical" ? Math.sign(outward.x) || 1
      : (-(to.y - from.y) * outward.x + (to.x - from.x) * outward.y) >= 0 ? 1 : -1;
    const placed = dimensionScreenGeometry(item.kind, from, to, sign, { distance: item.inline ? 0 : 20 + item.tier * 30 });
    // A horizontal dimension's label goes on its far side, so it never sits on the seat or support line it measures.
    // An inline dimension starts at the notch corner (or the upper edge), so its label goes past the far end, outside the cut.
    const n = Math.hypot(to.x - from.x, to.y - from.y), ux = (to.x - from.x) / n, uy = (to.y - from.y) / n;
    const geometry = item.kind === "horizontal" ? { ...placed, label: { x: (placed.start.x + placed.end.x) / 2, y: placed.start.y + placed.normal.y * (technicalAnnotationRules.labelGap + .2 * fontSize) } }
      : item.inline ? { ...placed, label: { x: to.x + ux * .6 * fontSize, y: to.y + uy * fontSize }, labelAnchor: ux >= 0 ? "start" as const : "end" as const } : placed;
    const value = formatDrawingLength(item.valueMm, unit);
    const text = item.id === "total" ? `teljes hossz ${value}` : item.id === "depth" ? `magasság ${value}` : mode === "detail" ? `${SHORT_NAME[suffix(item.id)] ?? ""} ${value}`.trim() : value;
    return [{ item, geometry, text, move: item.inline ? { x: -uy, y: ux } : { x: to.x - from.x, y: to.y - from.y } }];
  });
  const angleLabels = angles.map((angle) => {
    const vertex = project(angle.vertex);
    const unitVector = (point: MmPoint) => { const p = project(point), n = Math.hypot(p.x - vertex.x, p.y - vertex.y) || 1; return { x: (p.x - vertex.x) / n, y: (p.y - vertex.y) / n }; };
    const a = unitVector(angle.from), b = unitVector(angle.to), bisector = { x: a.x + b.x, y: a.y + b.y }, bn = Math.hypot(bisector.x, bisector.y) || 1;
    const geometry = { start: { x: vertex.x + a.x * ANGLE_RADIUS, y: vertex.y + a.y * ANGLE_RADIUS }, end: { x: vertex.x + b.x * ANGLE_RADIUS, y: vertex.y + b.y * ANGLE_RADIUS }, label: { x: vertex.x - bisector.x / bn * (ANGLE_RADIUS * .6 + 2.2 * fontSize), y: vertex.y - bisector.y / bn * (ANGLE_RADIUS * .6 + 1.2 * fontSize) },
      // The arc sits inside the cut; its value goes on the far side of the vertex with a short leader, clear of the offcut and its dimensions.
      leader: [{ x: vertex.x - bisector.x / bn * 4, y: vertex.y - bisector.y / bn * 4 }, { x: vertex.x - bisector.x / bn * ANGLE_RADIUS * .6, y: vertex.y - bisector.y / bn * ANGLE_RADIUS * .6 }] as const };
    return { angle, geometry, move: { x: -bisector.x / bn, y: -bisector.y / bn }, sweep: a.x * b.y - a.y * b.x > 0 ? 1 : 0, text: `${formatJointValue(angle.valueDegrees)}°` };
  });
  const textWidth = (text: string) => text.length * fontSize * .62;
  const resolved = resolveAnnotationLabelPositions([
    ...laid.map(({ item, geometry, text, move }) => ({ id: item.id, text, point: geometry.label, anchor: geometry.labelAnchor, move })),
    ...angleLabels.map(({ angle, geometry, text, move }) => ({ id: angle.id, text, point: geometry.label, anchor: "middle" as const, move })),
  ], fontSize);
  // Labels never lie on a cut edge and are kept inside the canvas, so a zoomed or fitted view never cuts a value in half.
  const place = (id: string, fallback: AnnotationPoint, text: string, anchor: "start" | "middle" | "end", move: AnnotationPoint) => {
    const width = textWidth(text);
    const point = nudgeOffSegments({ point: resolved.get(id) ?? fallback, width, height: fontSize * 1.2, anchor }, cutSegments, move, fontSize * .9);
    const left = anchor === "start" ? point.x : anchor === "end" ? point.x - width : point.x - width / 2;
    const shift = left < 4 ? 4 - left : left + width > size.width - 4 ? size.width - 4 - left - width : 0;
    return { x: point.x + shift, y: Math.min(size.height - fontSize, Math.max(fontSize, point.y)) };
  };
  const axisTop = project({ xMm: section.ridgeAxisXMm, yMm: section.bounds.maxY + 40 }), axisBottom = project({ xMm: section.ridgeAxisXMm, yMm: section.bounds.minY - 40 });
  const origin = project(section.origin);
  const [upperStart, upperEnd] = [project(section.outline[0]!), project(section.outline[1]!)];
  const edgeAngle = Math.atan2(upperEnd.y - upperStart.y, upperEnd.x - upperStart.x) * 180 / Math.PI;
  const edgeTag = (from: AnnotationPoint, to: AnnotationPoint, t: number, offset: number) => ({ x: from.x + (to.x - from.x) * t + Math.sin(edgeAngle * Math.PI / 180) * offset, y: from.y + (to.y - from.y) * t - Math.cos(edgeAngle * Math.PI / 180) * offset });
  const lowerStart = project(section.lowerEdge[0]), lowerEnd = project(section.lowerEdge[1]);
  const hatchId = `rafter-joint-offcut-${useId().replace(/:/g, "")}`;

  return <>
    <defs><pattern id={hatchId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={6} className="rafter-joint-hatch" /></pattern></defs>
    <polygon className="rafter-joint-wood" points={pts(section.outline.map(project))}><title>Szarufa kontúrja (felső él, alsó él a bevágásokkal, végvágások)</title></polygon>
    {cuts.map((cut, index) => cut.offcut && <polygon key={index} className="rafter-joint-offcut" fill={`url(#${hatchId})`} points={pts(cut.offcut.map(project))}><title>Kivágandó rész</title></polygon>)}
    <line className="rafter-joint-original" x1={lowerStart.x} y1={lowerStart.y} x2={lowerEnd.x} y2={lowerEnd.y}><title>A szarufa vágatlan alsó éle</title></line>
    <line className="rafter-joint-axis" x1={axisTop.x} y1={axisTop.y} x2={axisBottom.x} y2={axisBottom.y}><title>Gerinctengely</title></line>
    {section.supports.map((support) => <g key={support.slot} className={`rafter-joint-support${support.slot === selected ? " is-selected" : ""}`}>
      <polyline points={pts(support.bearing.map(project))}><title>{`${support.slot} · ${support.label} felső síkja (felfekvés)`}</title></polyline>
      {support.schematic.map((line, index) => <polyline key={index} className="is-schematic" points={pts(line.map(project))}><title>{`${support.label}: mérete nem bemenet, vázlatos`}</title></polyline>)}
    </g>)}
    {cuts.map((cut, index) => cut.markLine && <line key={index} className="rafter-joint-mark" x1={project(cut.markLine[0]).x} y1={project(cut.markLine[0]).y} x2={project(cut.markLine[1]).x} y2={project(cut.markLine[1]).y}><title>Jelölővonal: a függővágás síkja a szarufa oldalán a felső élig</title></line>)}
    {[...cuts.flatMap((cut) => cut.edges), ...section.endCuts].map((edge, index) => { const from = project(edge.from), to = project(edge.to); return <line key={`${edge.id}-${index}`} className="rafter-joint-cut" x1={from.x} y1={from.y} x2={to.x} y2={to.y}><title>{`Vágásél · ${edge.label}`}</title></line>; })}
    {mode === "overview" && <g className="rafter-joint-edge-tag">
      <text transform={`translate(${edgeTag(upperStart, upperEnd, .62, fontSize * .9).x} ${edgeTag(upperStart, upperEnd, .62, fontSize * .9).y}) rotate(${edgeAngle})`} textAnchor="middle" dominantBaseline="middle">felső él</text>
      <text transform={`translate(${edgeTag(lowerStart, lowerEnd, .3, -fontSize * .9).x} ${edgeTag(lowerStart, lowerEnd, .3, -fontSize * .9).y}) rotate(${edgeAngle})`} textAnchor="middle" dominantBaseline="middle">alsó él</text>
    </g>}
    {laid.map(({ item, geometry, text, move }) => {
      // A label is pulled inside the canvas only while its dimension line is in view; otherwise it would float detached.
      const middle = { x: (geometry.start.x + geometry.end.x) / 2, y: (geometry.start.y + geometry.end.y) / 2 };
      const inView = middle.x >= 0 && middle.x <= size.width && middle.y >= 0 && middle.y <= size.height;
      const label = place(item.id, geometry.label, text, geometry.labelAnchor, move);
      return <g key={item.id} className="technical-dimension rafter-joint-dimension">
        {!item.inline && <><line x1={geometry.extensionStart.x} y1={geometry.extensionStart.y} x2={geometry.start.x} y2={geometry.start.y} className="technical-extension" />
          <line x1={geometry.extensionEnd.x} y1={geometry.extensionEnd.y} x2={geometry.end.x} y2={geometry.end.y} className="technical-extension" /></>}
        <line x1={geometry.start.x} y1={geometry.start.y} x2={geometry.end.x} y2={geometry.end.y} />
        <path className="technical-dimension-arrow" d={arrow(geometry.start, geometry.end)} /><path className="technical-dimension-arrow" d={arrow(geometry.end, geometry.start)} />
        {inView && <Tag x={label.x} y={label.y} text={text} anchor={geometry.labelAnchor} fontSize={fontSize} />}
      </g>;
    })}
    {angleLabels.map(({ angle, geometry, sweep, text, move }) => {
      const label = place(angle.id, geometry.label, text, "middle", move);
      return <g key={angle.id} className="technical-angle rafter-joint-angle">
        <path d={`M${geometry.start.x},${geometry.start.y} A${ANGLE_RADIUS},${ANGLE_RADIUS} 0 0 ${sweep} ${geometry.end.x},${geometry.end.y}`} />
        <line className="rafter-joint-leader" x1={geometry.leader[0].x} y1={geometry.leader[0].y} x2={geometry.leader[1].x} y2={geometry.leader[1].y} />
        <Tag x={label.x} y={label.y} text={text} anchor="middle" fontSize={fontSize} className="is-angle" />
      </g>;
    })}
    {mode === "detail" && active?.cut?.offcut && (() => {
      // Marking order, matching the numbered steps under the drawing: 1 mark on the upper edge, 2 plumb line, 3 corner, 4 seat.
      const at = (id: string) => project(active.cut!.points.find((point) => point.id === id)!.at);
      const m = at("M"), b = at("B"), c = at("C");
      const r = fontSize * .8;
      const steps = [{ x: m.x - r * 1.6, y: m.y - r * 1.4 }, { x: (m.x + b.x) / 2 + r * 1.5, y: (m.y + b.y) / 2 }, { x: b.x - r * 1.5, y: b.y - r * 1.5 }, { x: (b.x + c.x) / 2, y: b.y + r * 1.6 }];
      return steps.map((point, index) => <g key={index} className="rafter-joint-step"><circle cx={point.x} cy={point.y} r={r} /><text x={point.x} y={point.y} textAnchor="middle" dominantBaseline="central">{index + 1}</text></g>);
    })()}
    {!hideOrigin && <g className="rafter-joint-origin"><circle cx={origin.x} cy={origin.y} r={4}><title>0-pont: innen mérj a szarufa felső élén (a talpszelemen függővágásának vonala)</title></circle><Tag x={origin.x + 10} y={origin.y - fontSize} text="0" anchor="start" fontSize={fontSize} className="is-origin" /></g>}
    {mode === "overview" && slots.map((slot) => {
      if (!slot.anchor) return null;
      const point = project(slot.anchor), y = Math.min(size.height - 16, point.y + 28);
      return <g key={slot.slot} className={`rafter-joint-badge${slot.slot === selected ? " is-selected" : ""}`} role="button" tabIndex={-1} aria-label={`${slot.slot} részlet: ${slot.name}`}
        onPointerDown={(event) => event.stopPropagation()} onClick={() => onSelect?.(slot.slot)}>
        <line x1={point.x} y1={point.y} x2={point.x} y2={y - 12} />
        <rect x={point.x - 17} y={y - 12} width={34} height={24} rx={12} />
        <text x={point.x} y={y} textAnchor="middle" dominantBaseline="central">{slot.slot}</text>
      </g>;
    })}
  </>;
}

/**
 * Zoomable, pannable canvas shared by the overview and the detail. The default camera fits `focus` with room reserved for
 * labels; manual zoom is kept until `resetKey` changes (other supports, ridge type or selected joint).
 */
function InteractiveCanvas({ section, slots, focus, full, mode, selected, unit, resetKey, resetLabel, title, onSelect, onDoubleTap, className, hideOrigin }: Readonly<{ hideOrigin?: boolean; section: Section; slots: readonly JointSlot[]; focus: MmBounds; full?: MmBounds; mode: "overview" | "detail"; selected: JointSlotId; unit: LengthUnit; resetKey: string; resetLabel: string; title: string; onSelect?: (slot: JointSlotId) => void; onDoubleTap?: (point: AnnotationPoint, camera: DrawingCamera, size: CanvasSize) => DrawingCamera | null; className?: string }>) {
  const [canvasRef, size] = useCanvasSize();
  // Wide (desktop) canvases get larger labels; the phone size stays compact.
  const fontSize = useFontSize() * (size.width >= 600 ? 1.2 : 1);
  // Reserved label room: two dimension tiers plus a line of text in the overview, one tier and a wide label in the detail.
  const padding = Math.round(mode === "overview" ? 2.4 * fontSize + 8 : 4 * fontSize + 10);
  const fitted = useMemo(() => fitCamera(focus, size, padding), [focus, size, padding]);
  const [userCamera, setUserCamera] = useState<DrawingCamera | null>(null);
  const camera = userCamera ?? fitted;
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  // Pointer events can arrive several times before React re-renders; each one must build on the previous result.
  const moveCamera = useCallback((next: DrawingCamera) => { cameraRef.current = next; setUserCamera(next); }, []);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointers = useRef(new Map<number, AnnotationPoint>());
  const lastTap = useRef<{ time: number; point: AnnotationPoint } | null>(null);
  const moved = useRef(false);
  const titleId = useId();
  useEffect(() => { setUserCamera(null); }, [resetKey]);
  const bounds = { min: fitted.scale * .5, max: fitted.scale * (mode === "overview" ? 14 : 6) };
  const zoom = useCallback((factor: number, at?: AnnotationPoint) => moveCamera(zoomCameraAt(cameraRef.current, size, factor, at ?? { x: size.width / 2, y: size.height / 2 }, bounds.min, bounds.max)), [size, bounds.min, bounds.max, moveCamera]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => { event.preventDefault(); const rect = svg.getBoundingClientRect(); zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, { x: event.clientX - rect.left, y: event.clientY - rect.top }); };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoom]);
  const local = (event: React.PointerEvent) => { const rect = svgRef.current!.getBoundingClientRect(); return { x: (event.clientX - rect.left) * size.width / rect.width, y: (event.clientY - rect.top) * size.height / rect.height }; };
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Capture can fail for an already released pointer; the gesture still works inside the drawing. */ }
    pointers.current.set(event.pointerId, local(event));
    if (pointers.current.size === 1) moved.current = false;
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const point = local(event);
    if (pointers.current.size === 1) {
      if (Math.hypot(point.x - previous.x, point.y - previous.y) > 0) { moved.current = moved.current || Math.hypot(point.x - previous.x, point.y - previous.y) > 3; moveCamera(panCamera(cameraRef.current, point.x - previous.x, point.y - previous.y)); }
    } else {
      const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y), after = Math.hypot(point.x - other.x, point.y - other.y);
        const midBefore = { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 }, midAfter = { x: (point.x + other.x) / 2, y: (point.y + other.y) / 2 };
        const zoomed = before > 0 ? zoomCameraAt(cameraRef.current, size, after / before, midBefore, bounds.min, bounds.max) : cameraRef.current;
        moveCamera(panCamera(zoomed, midAfter.x - midBefore.x, midAfter.y - midBefore.y));
        moved.current = true;
      }
    }
    pointers.current.set(event.pointerId, point);
  };
  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const point = local(event);
    pointers.current.delete(event.pointerId);
    if (pointers.current.size > 0 || moved.current || !onDoubleTap) return;
    const previous = lastTap.current, now = event.timeStamp;
    if (previous && now - previous.time < DOUBLE_TAP_MS && Math.hypot(point.x - previous.point.x, point.y - previous.point.y) < 24) {
      lastTap.current = null;
      const next = onDoubleTap(point, cameraRef.current, size);
      if (next) moveCamera({ ...next, scale: Math.min(bounds.max, next.scale) });
    } else lastTap.current = { time: now, point };
  };
  const onKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] };
    if (moves[event.key]) moveCamera(panCamera(cameraRef.current, ...moves[event.key]!));
    else if (event.key === "+" || event.key === "=") zoom(1.25);
    else if (event.key === "-") zoom(1 / 1.25);
    else if (event.key === "0") setUserCamera(null);
    else return;
    event.preventDefault();
  };
  const percent = Math.round(camera.scale / fitted.scale * 100);

  return <div className={`drawing-stage${className ? ` ${className}` : ""}`}>
    <GlassToolbar ariaLabel={`${mode === "overview" ? "Szarufarajz" : "Részletrajz"} vezérlők`} className="drawing-toolbar">
      <div className="drawing-toolbar-group" aria-label="Nagyítás">
        <button type="button" title="Kicsinyítés" aria-label="Kicsinyítés" onClick={() => zoom(1 / 1.25)}><Minus aria-hidden="true" className="size-4" /></button>
        <output className="drawing-zoom-value" aria-live="polite" aria-label={`Nagyítás: ${percent}%`}>{percent}%</output>
        <button type="button" title="Nagyítás" aria-label="Nagyítás" onClick={() => zoom(1.25)}><Plus aria-hidden="true" className="size-4" /></button>
      </div>
      <div className="drawing-toolbar-group" aria-label="Nézet">
        {full && <button type="button" title="Teljes rajz" aria-label="Teljes rajz" onClick={() => setUserCamera(fitCamera(full, size, padding))}><Maximize2 aria-hidden="true" className="size-4" /></button>}
        <button type="button" title={resetLabel} aria-label={resetLabel} onClick={() => setUserCamera(null)}><RotateCcw aria-hidden="true" className="size-4" /></button>
      </div>
      <span className="rafter-joint-unit-tag">Méretek: {unit}</span>
      {mode === "overview" && <span className="drawing-toolbar-hint"><Move aria-hidden="true" className="size-4" /> Húzd, csippentsd; dupla koppintás: részlet.</span>}
    </GlassToolbar>
    <div className={`drawing-canvas rafter-joint-canvas${mode === "detail" ? " is-detail" : ""}`} ref={canvasRef}>
      <svg ref={svgRef} style={{ "--rj-font": `${fontSize}px` } as React.CSSProperties} className="rafter-joint-svg is-interactive" viewBox={`0 0 ${size.width} ${size.height}`} width={size.width} height={size.height} role="group" tabIndex={0} aria-labelledby={titleId}
        onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={(event) => pointers.current.delete(event.pointerId)}>
        <title id={titleId}>{title}</title>
        <SectionView section={section} slots={slots} camera={camera} size={size} fontSize={fontSize} unit={unit} mode={mode} selected={selected} onSelect={onSelect} hideOrigin={hideOrigin} />
      </svg>
    </div>
  </div>;
}

/**
 * "How much to cut" in the order a carpenter marks a birdsmouth on the rafter's side face: position from the 0-point,
 * plumb line at the cut angle, plumb height from the lower edge, seat at right angles to it. Only the joint's own values.
 */
function CutGuide({ slot, show, plateFit = null, fromLowerEndMm }: Readonly<{ slot: JointSlot; show: (mm: number) => string; plateFit?: PlateFit | null; fromLowerEndMm?: number }>) {
  const value = (key: string) => slot.dimensions.find((item) => suffix(item.id) === key)?.valueMm;
  const angle = slot.angles.find((item) => suffix(item.id) === "plumb-angle")?.valueDegrees;
  const [plumb, seat, depth, remaining] = [value("plumb"), value("seat"), value("depth"), value("remaining")];
  if (slot.positionMm === null || slot.status !== "computed") return null;
  // In the roof calculators there is no 0-point on screen: the mark is measured from the rafter's lower (eave) end.
  const place = fromLowerEndMm !== undefined
    ? fromLowerEndMm < .5 ? <>A jelölés helye <strong>a szarufa alsó végén</strong>, a felső élen.</> : <>A szarufa alsó végétől a felső élen mérj <strong>{show(fromLowerEndMm)}</strong>-t, és jelöld meg.</>
    : slot.positionMm === 0 ? <>A jelölés helye maga a <strong>0-pont</strong> a felső élen.</> : <>A felső élen a 0-ponttól mérj <strong>{show(slot.positionMm)}</strong>-t, és jelöld meg.</>;
  const line = angle === undefined ? null : <>Innen húzz vonalat lefelé az alsó élig úgy, hogy az <strong>eresz felőli oldalon {formatJointValue(angle)}°</strong>-ot zárjon be a felső éllel. Beépítve ez a vonal függőleges.</>;
  const notched = plumb !== undefined && seat !== undefined && depth !== undefined && remaining !== undefined;
  if (!notched) {
    const isEnd = slot.cut?.edges.some((edge) => edge.id === "end");
    return <div className="rafter-joint-guide">
      <p className="rafter-joint-guide-lead">{isEnd ? "Itt nincs bevágás: a szarufa végét kell levágni." : "Itt nincs bevágás: a szarufa alsó éle a szelemenen fekszik."}</p>
      <ol>{[place, line, isEnd ? <>Ezen a vonalon vágd le a szarufát.</> : null].filter(Boolean).map((step, index) => <li key={index}>{step}</li>)}</ol>
    </div>;
  }
  return <div className="rafter-joint-guide">
    <p className="rafter-joint-guide-lead">Ennyit kell bevágni</p>
    <dl className="rafter-joint-guide-figures">
      <div><dt>Függővágás</dt><dd>{show(plumb)}</dd><small>az alsó éltől, a függővonalon</small></div>
      <div><dt>Ülék</dt><dd>{show(seat)}</dd><small>a sarokból, merőlegesen</small></div>
      <div><dt>Bevágás mélysége</dt><dd>{show(depth)}</dd><small>{show(remaining)} marad a szarufából</small></div>
    </dl>
    {plateFit && <p className={`rafter-joint-fit${plateFit.fits ? "" : " is-warning"}`} role={plateFit.fits ? "status" : "alert"}>{plateFit.fits
      ? <>Az ülék ({show(plateFit.seatMm)}) ráfér a {show(plateFit.plateWidthMm)} széles talpszelemenre.</>
      : <>Az ülék ({show(plateFit.seatMm)}) nem fér rá a {show(plateFit.plateWidthMm)} széles talpszelemenre: {show(plateFit.overhangMm)}-rel túlnyúlik. Ellenőrizd a madárszáj magasságát vagy a szelemen méretét (geometriai ellenőrzés, nem statikai).</>}</p>}
    <h4>Kijelölés lépésről lépésre</h4>
    <ol>
      <li>{place}</li>
      {line && <li>{line}</li>}
      <li>Ezen a vonalon az <strong>alsó éltől mérj fel {show(plumb)}</strong>-t: ez a bevágás sarka.</li>
      <li>A sarokból húzz a vonalra <strong>merőlegest a gerinc felé</strong>, amíg eléri az alsó élt: ennek hossza <strong>{show(seat)}</strong> (ülék).</li>
      <li>Fűrészeld ki a két vonal közti háromszöget. Ellenőrzés: a saroktól a felső élig merőlegesen <strong>{show(remaining)}</strong> marad.</li>
    </ol>
  </div>;
}

/** CAD-style rafter drawing for the rafter-cut calculator: cutting overview from O and a dimensioned, zoomable close-up per joint. */
export function RafterJointDrawing({ joints, compact }: Readonly<{ joints: RafterJoints; compact?: Readonly<{ title: string; markFromLowerEndMm: number }> }>) {
  const model = useMemo(() => createRafterJointDrawingModel(joints), [joints]);
  const [selected, setSelected] = useState<JointSlotId>("S1");
  const [unit, setUnit] = useState<LengthUnit>("cm");
  const headingId = useId();
  const slot = model.slots.find((item) => item.slot === selected)!;
  const blocked = model.slots.filter((item) => item.status === "incomplete" || item.status === "invalid");
  const section = model.section;
  const show = (mm: number) => `${formatDrawingLength(mm, unit)} ${unit}`;
  const structure = model.slots.map((item) => `${item.slot}:${item.focus ? "drawn" : item.status}`).join("|") + (section?.supports.map((support) => support.slot).join("") ?? "");
  // Double tap: select the nearest joint and show it with its neighbourhood (one rafter depth around), not a bare notch.
  const focusNearest = useCallback((point: AnnotationPoint, camera: DrawingCamera, size: CanvasSize) => {
    if (!section) return null;
    const candidates = model.slots.filter((item) => item.focus && item.anchor);
    const distance = (item: JointSlot) => { const p = projectPoint(camera, size, item.anchor!); return Math.hypot(p.x - point.x, p.y - point.y); };
    const nearest = [...candidates].sort((a, b) => distance(a) - distance(b))[0];
    if (!nearest) return null;
    setSelected(nearest.slot);
    return fitCamera(expand(nearest.focus!, section.depthMm), size, 40);
  }, [model.slots, section]);

  return <section className="technical-drawing is-compact rafter-joint-drawing" aria-labelledby={headingId}>
    <div className="technical-drawing-header">
      <div className="technical-drawing-title"><h2 id={headingId}>{compact?.title ?? "Szarufarajz · kiszabás és bevágások"}</h2></div>
      <label className="rafter-detail-unit"><span className="sr-only">Méretek kijelzési egysége</span>
        <select value={unit} onChange={(event) => setUnit(event.target.value as LengthUnit)} aria-label="Méretek kijelzési egysége">{LENGTH_UNITS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </label>
    </div>
    {/* Compact (roof calculators): only the wall-plate notch, its close-up and the marking steps. */}
    {compact ? null : section ? <InteractiveCanvas section={section} slots={model.slots} focus={section.focus} full={section.bounds} mode="overview" selected={selected} unit={unit} resetKey={structure} resetLabel="Nézet visszaállítása"
      title="Szarufa kiszabási rajza: vágásélek, 0-pont, méretek a felső él mentén és az S1–S3 csatlakozás" onSelect={setSelected} onDoubleTap={focusNearest} />
      : <div className="form-message" role="status"><strong>A méretezett szarufarajz nem készíthető.</strong> Bevágást csak igazolt geometriával rajzolunk.
        <ul>{blocked.map((item) => <li key={item.slot}>{item.slot} · {item.name}: {item.joint?.reason ?? (item.joint?.missing.length ? `hiányzó adat: ${item.joint.missing.join(", ")}` : STATUS_TEXT[item.status])}</li>)}</ul></div>}
    {section && !compact && <div className="rafter-joint-cutlist">
      <h3>Mit hol jelölj a szarufán</h3>
      <p className="construction-suite-limit">Minden hosszt a <strong>0-ponttól</strong> mérj, a szarufa <strong>felső élén</strong>. A 0-pont a talpszelemen függővágásának vonala.</p>
      <dl className="rafter-joint-rows">
        <div><dt>Szarufa teljes hossza</dt><dd>{show(section.overview.at(-1)!.valueMm)}</dd></div>
        <div><dt>Szarufa magassága</dt><dd>{show(section.depthMm)}</dd></div>
        {section.stations.map((station) => <div key={station.id}><dt>{station.positionMm < 0 ? "Ereszvég · a 0-ponttól visszafelé" : station.positionMm === 0 ? `${station.label} · ez a 0-pont` : station.label.charAt(0).toUpperCase() + station.label.slice(1)}</dt><dd>{show(Math.abs(station.positionMm))}</dd></div>)}
      </dl>
    </div>}
    {!compact && <div className="rafter-joint-slots" role="group" aria-label="Csatlakozás részletnézete">
      {model.slots.map((item) => <button key={item.slot} type="button" aria-pressed={item.slot === selected} data-status={item.status} onClick={() => setSelected(item.slot)}>
        <strong>{item.slot}</strong><span>{item.name}</span><small>{STATUS_TEXT[item.status]}</small>
      </button>)}
    </div>}
    <div className="rafter-joint-detail" aria-live="polite">
      <h3>{slot.slot} · {slot.name} <small>részletrajz</small></h3>
      {section && slot.focus ? <InteractiveCanvas section={section} slots={model.slots} focus={slot.focus} mode="detail" selected={slot.slot} unit={unit} resetKey={`${structure}:${slot.slot}`} resetLabel="Részlet visszaállítása" hideOrigin={Boolean(compact)}
        title={`${slot.slot} · ${slot.name} részletrajza: vágásélek, kieső rész, méretek és vágási szögek`} /> : null}
      {slot.joint?.reason && <p className="material-takeoff-incomplete is-invalid" role="alert">{slot.joint.reason}</p>}
      {slot.joint && slot.joint.missing.length > 0 && <p className="material-takeoff-incomplete" role="status"><strong>C · hiányzó adat:</strong> {slot.joint.missing.join(", ")}</p>}
      {slot.note && <p className="construction-suite-limit">{slot.note}</p>}
      <CutGuide slot={slot} show={show} plateFit={slot.slot === "S1" ? joints.plateFit : null} fromLowerEndMm={compact?.markFromLowerEndMm} />
      {(slot.dimensions.length > 0 || slot.angles.length > 0 || slot.positionMm !== null) && <details className="rafter-joint-all"><summary>Összes méret és szög</summary><dl className="rafter-joint-rows">
        {slot.positionMm !== null && <div><dt>Jelölés helye a 0-ponttól</dt><dd>{show(slot.positionMm)}</dd></div>}
        {slot.dimensions.map((item) => <div key={item.id}><dt>{DETAIL_NAME[suffix(item.id)] ?? item.label}</dt><dd>{show(item.valueMm)}</dd></div>)}
        {slot.angles.map((angle) => <div key={angle.id}><dt>{ANGLE_NAME[suffix(angle.id)] ?? angle.label}</dt><dd>{formatJointValue(angle.valueDegrees)}°</dd></div>)}
      </dl></details>}
    </div>
    <ul className="rafter-joint-legend">
      <li><i className="is-cut" aria-hidden="true" />Itt kell vágni</li>
      <li><i className="is-offcut" aria-hidden="true" />Ez a rész esik ki</li>
      <li><i className="is-mark" aria-hidden="true" />Jelölővonal a szarufa tetejéig</li>
      <li><i className="is-dim" aria-hidden="true" />Méret ({unit})</li>
    </ul>
    <p className="drawing-accessible-summary">A szögek a szarufa éléhez mért vágási szögek, nem a tetőhajlás. A szelemenek szélessége nincs megadva, ezért szaggatott, és az ülék felfekvése nem ellenőrzött. Az értékek a „Csomópontok” táblázattal egyeznek. Geometriai rajz, nem statikai vagy gyártási jóváhagyás.</p>
  </section>;
}

"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { Minus, Plus, RotateCcw, Scan } from "lucide-react";
import type { SheetMetalProfileOutput } from "@/domain/calculations/sheet-metal-profile";
import { drawingDimensions, drawingFrame, primitivePath } from "@/features/sheet-metal/profile-drawing-model";
import { selectionMatches, type Selection } from "@/features/sheet-metal/profile-editor-model";

type View = { zoom: number; x: number; y: number };
const initialView: View = { zoom: 1, x: 0, y: 0 };
const clamp = (zoom: number) => Math.min(8, Math.max(.5, zoom));
const mm = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value);

export function ProfileDrawing({ output, selection, onSelect, thicknessMm }: Readonly<{ output: SheetMetalProfileOutput; selection: Selection; onSelect: (selection: Selection) => void; thicknessMm: number }>) {
  const [view, setView] = useState<View>(initialView);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pointerStart = useRef(new Map<number, { x: number; y: number; kind: "straight" | "bend" | null; id: string | null }>());
  const moved = useRef(false);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const pinchDistance = useRef<number | null>(null);
  const frame = drawingFrame(output.geometry.boundsMm);
  const dimensions = drawingDimensions(output);
  const bounds = output.geometry.boundsMm;
  const textSize = Math.max(bounds.maxXmm - bounds.minXmm, bounds.maxYmm - bounds.minYmm) * .055;
  const center = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
  const unitPerPixel = () => { const rect = svgRef.current?.getBoundingClientRect(); return rect ? Math.max(frame.width / rect.width, frame.height / rect.height) : 1; };
  const changeZoom = (factor: number) => setView((current) => ({ ...current, zoom: clamp(current.zoom * factor) }));
  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const element = (event.target as Element).closest("[data-profile-kind]");
    const kind = element?.getAttribute("data-profile-kind");
    if (pointers.current.size === 0) moved.current = false;
    pointerStart.current.set(event.pointerId, { x: event.clientX, y: event.clientY,
      kind: kind === "straight" || kind === "bend" ? kind : null, id: element?.getAttribute("data-profile-id") ?? null });
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    previous.current = { x: event.clientX, y: event.clientY };
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y); moved.current = true; }
  }
  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const start = pointerStart.current.get(event.pointerId);
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) moved.current = true;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance.current && pinchDistance.current > 0) changeZoom(distance / pinchDistance.current);
      pinchDistance.current = distance;
    } else if (previous.current) {
      const dx = event.clientX - previous.current.x, dy = event.clientY - previous.current.y;
      const scale = unitPerPixel();
      setView((current) => ({ ...current, x: current.x + dx * scale, y: current.y + dy * scale }));
    }
    previous.current = { x: event.clientX, y: event.clientY };
  }
  function onPointerEnd(event: ReactPointerEvent<SVGSVGElement>) {
    const start = pointerStart.current.get(event.pointerId);
    if (!moved.current && start?.kind && start.id) select(start.kind, start.id);
    pointerStart.current.delete(event.pointerId);
    pointers.current.delete(event.pointerId);
    previous.current = [...pointers.current.values()][0] ?? null;
    pinchDistance.current = null;
  }
  function onPointerCancel(event: ReactPointerEvent<SVGSVGElement>) { moved.current = true; onPointerEnd(event); }
  function onWheel(event: WheelEvent<SVGSVGElement>) { event.preventDefault(); changeZoom(event.deltaY < 0 ? 1.1 : 1 / 1.1); }
  function select(kind: "straight" | "bend", id: string) { onSelect({ kind, id }); }
  const cap = output.geometry.boundary.find((primitive) => primitive.id === "start-cap");
  const capMid = cap ? { x: bounds.minXmm - textSize, y: -(cap.start.yMm + cap.end.yMm) / 2 } : null;
  return <div className="profile-drawing">
    <div className="profile-drawing-toolbar"><span>Méretarányos keresztmetszet · {Math.round(view.zoom * 100)}%</span><div>
      <button type="button" className="icon-button" aria-label="Kicsinyítés" onClick={() => changeZoom(1 / 1.25)}><Minus size={18} /></button>
      <button type="button" className="icon-button" aria-label="Nagyítás" onClick={() => changeZoom(1.25)}><Plus size={18} /></button>
      <button type="button" className="icon-button" aria-label="Nézet alaphelyzetbe" onClick={() => setView(initialView)}><RotateCcw size={18} /></button>
      <button type="button" className="icon-button" aria-label="Profil illesztése" onClick={() => setView(initialView)}><Scan size={18} /></button>
    </div></div>
    <svg ref={svgRef} className="profile-svg" viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`} role="group" aria-label="Interaktív lemezprofil keresztmetszet" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerCancel} onWheel={onWheel}>
      <g transform={`translate(${view.x} ${view.y}) translate(${center.x} ${center.y}) scale(${view.zoom}) translate(${-center.x} ${-center.y})`}>
        {output.geometry.boundary.map((primitive, index) => <path key={`${primitive.id}-${index}`} d={primitivePath(primitive)} className="profile-outline" />)}
        {output.geometry.centerline.map((primitive, index) => <path key={`${primitive.id}-${index}`} d={primitivePath(primitive)} className="profile-centerline" />)}
        {dimensions.straights.map((dimension, index) => <g key={dimension.id} className="profile-dimension">
          <line x1={dimension.extensionStart.x} y1={dimension.extensionStart.y} x2={dimension.start.x} y2={dimension.start.y} />
          <line x1={dimension.extensionEnd.x} y1={dimension.extensionEnd.y} x2={dimension.end.x} y2={dimension.end.y} />
          <line className="measure" x1={dimension.start.x} y1={dimension.start.y} x2={dimension.end.x} y2={dimension.end.y} />
          <text x={dimension.label.x} y={dimension.label.y} textAnchor="middle" fontSize={textSize}>S{index + 1}: {mm(dimension.valueMm)} mm</text>
        </g>)}
        {output.geometry.segments.map((segment, index) => <g key={segment.id} role="button" tabIndex={0} aria-label={`S${index + 1} egyenes, ${mm(segment.tangentLengthMm)} milliméter`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select("straight", segment.id); } }}>
          <path data-profile-kind="straight" data-profile-id={segment.id} d={`M ${segment.start.xMm} ${-segment.start.yMm} L ${segment.end.xMm} ${-segment.end.yMm}`} className={`profile-pick ${selectionMatches(selection, "straight", segment.id) ? "selected" : ""}`} />
        </g>)}
        {output.geometry.bends.map((bend, index) => {
          const dimension = dimensions.bends[index];
          const arc = output.geometry.centerline.find((primitive) => primitive.kind === "arc" && primitive.id === bend.id);
          return <g key={bend.id}>
            <text className="profile-bend-label" x={dimension.label.x} y={dimension.label.y} textAnchor="start" fontSize={textSize * .85}>H{index + 1}: {mm(dimension.angleDeg)}° {dimension.direction} · R{mm(dimension.radiusMm)} mm</text>
            <g role="button" tabIndex={0} aria-label={`H${index + 1} hajtás, ${mm(dimension.angleDeg)} fok, ${dimension.direction}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select("bend", bend.id); } }}>
              {arc && <path data-profile-kind="bend" data-profile-id={bend.id} d={primitivePath(arc)} className={`profile-pick profile-bend-pick ${selectionMatches(selection, "bend", bend.id) ? "selected" : ""}`} />}
            </g>
          </g>;
        })}
        {capMid && <text className="profile-thickness-label" x={capMid.x} y={capMid.y} textAnchor="end" fontSize={textSize * .85}>t = {mm(thicknessMm)} mm</text>}
      </g>
    </svg>
    <p className="profile-drawing-note">Az ívek és a kontúr a számított geometriából származnak. A méretfeliratok helye szemléltető; ez nem gyártási rajz.</p>
  </div>;
}

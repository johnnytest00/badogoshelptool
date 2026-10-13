import type { ProfileArc, ProfileBounds, ProfilePoint, ProfilePrimitive } from "@/domain/calculations/profile-geometry";
import type { SheetMetalProfileOutput } from "@/domain/calculations/sheet-metal-profile";
import type { Selection } from "@/features/sheet-metal/profile-editor-model";

export const svgPoint = (point: ProfilePoint) => ({ x: point.xMm, y: -point.yMm });
export const svgCoord = (point: ProfilePoint) => `${point.xMm} ${-point.yMm}`;

export function primitivePath(primitive: ProfilePrimitive): string {
  if (primitive.kind === "line") return `M ${svgCoord(primitive.start)} L ${svgCoord(primitive.end)}`;
  const arc = primitive as ProfileArc;
  return `M ${svgCoord(arc.start)} A ${arc.radiusMm} ${arc.radiusMm} 0 ${Math.abs(arc.sweepRad) > Math.PI ? 1 : 0} ${arc.sweepRad < 0 ? 1 : 0} ${svgCoord(arc.end)}`;
}

export type StraightDimension = { id: string; start: { x: number; y: number }; end: { x: number; y: number }; extensionStart: { x: number; y: number }; extensionEnd: { x: number; y: number }; label: { x: number; y: number }; valueMm: number };
export type BendDimension = { id: string; label: { x: number; y: number }; angleDeg: number; radiusMm: number; direction: string };

export function drawingDimensions(output: SheetMetalProfileOutput): { straights: StraightDimension[]; bends: BendDimension[] } {
  const bounds = output.geometry.boundsMm;
  const span = Math.max(bounds.maxXmm - bounds.minXmm, bounds.maxYmm - bounds.minYmm);
  const offset = span * .1;
  return {
    straights: output.geometry.segments.map((segment, index) => {
      const normal = { x: Math.sin(segment.directionRad), y: Math.cos(segment.directionRad) };
      const shift = offset * (index % 2 === 0 ? 1 : -1);
      const start = svgPoint(segment.start), end = svgPoint(segment.end);
      const a = { x: start.x + normal.x * shift, y: start.y + normal.y * shift };
      const b = { x: end.x + normal.x * shift, y: end.y + normal.y * shift };
      return { id: segment.id, start: a, end: b, extensionStart: start, extensionEnd: end,
        label: { x: (a.x + b.x) / 2 + normal.x * offset * .34, y: (a.y + b.y) / 2 + normal.y * offset * .34 }, valueMm: segment.tangentLengthMm };
    }),
    bends: output.geometry.bends.map((bend, index) => {
      const matching = output.bends[index];
      const entry = svgPoint(bend.entry), exit = svgPoint(bend.exit);
      return { id: bend.id, label: { x: bounds.maxXmm + span * .06, y: (entry.y + exit.y) / 2 + (index % 2 === 0 ? span * .035 : -span * .035) },
        angleDeg: matching.turnDeg, radiusMm: matching.innerRadiusMm, direction: matching.turnDeg > 0 ? "balra" : "jobbra" };
    }),
  };
}

export function drawingFrame(bounds: ProfileBounds): { x: number; y: number; width: number; height: number } {
  const spanX = bounds.maxXmm - bounds.minXmm, spanY = bounds.maxYmm - bounds.minYmm;
  const span = Math.max(spanX, spanY);
  const padding = span * .3;
  return { x: bounds.minXmm - padding, y: -bounds.maxYmm - padding,
    width: spanX + padding + span * .7, height: spanY + 2 * padding };
}

export function selectedDrawingId(selection: Selection): string | null { return selection?.id ?? null; }

import type { RoofGeometry, RoofGeometryEdge, RoofPoint } from "@/domain/calculations/roof-geometry";
import type { RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { edgeKindAt } from "@/domain/calculations/roof-geometry-edges";

/**
 * Rafter layout of one roof plane in true size (unfolded): x runs horizontally along the eave, y up the slope.
 * Every rafter is a segment of RoofTimberLayout.rafters unchanged; offsets are horizontal distances from the first rafter.
 * End cuts: only a plumb cut against a ridge or upper edge has a geometric angle (90° − pitch); hip/valley ends need a
 * compound cut the plane model does not give, and the eave notch needs plate data, so both stay without a value.
 */
export type LayoutPoint = Readonly<{ x: number; y: number }>;
export type RafterEndCut = Readonly<{ edgeKind: RoofGeometryEdge["kind"] | "unknown"; plumbAngleDegrees: number | null }>;
export type LayoutRafter = Readonly<{ id: string; number: number; offsetMm: number; from: LayoutPoint; to: LayoutPoint; lengthMm: number; lowerEnd: RafterEndCut; upperEnd: RafterEndCut }>;
export type RafterLayoutPlane = Readonly<{
  planeId: string;
  pitchDegrees: number;
  spacingMm: number;
  outlines: readonly (readonly LayoutPoint[])[];
  rafters: readonly LayoutRafter[];
  lengthGroups: readonly Readonly<{ lengthMm: number; count: number }>[];
  bounds: Readonly<{ minX: number; minY: number; maxX: number; maxY: number }>;
}>;
export type RafterLayoutModel = Readonly<{ planes: readonly Readonly<{ planeId: string; label: string; count: number }>[]; plane: RafterLayoutPlane }>;

export function createRafterLayoutModel(geometry: RoofGeometry, layout: RoofTimberLayout, planeId?: string): RafterLayoutModel | null {
  const family = layout.rafters;
  if (!family || family.segments.length === 0 || family.planeLayouts.length === 0) return null;
  const planes = family.planeLayouts.map((item, index) => ({ planeId: item.planeId, label: `${index + 1}. tetősík`, count: item.count }));
  const chosen = family.planeLayouts.find((item) => item.planeId === planeId) ?? family.planeLayouts.reduce((best, item) => item.count > best.count ? item : best);
  const segments = family.segments.filter((segment) => segment.planeId === chosen.planeId);
  const ends = (segment: (typeof segments)[number]) => segment.start.zMm <= segment.end.zMm ? [segment.start, segment.end] as const : [segment.end, segment.start] as const;
  // Frame from the longest rafter: d is the fall line (up the slope), t the horizontal direction in the plane.
  const reference = segments.reduce((best, item) => item.lengthMm > best.lengthMm ? item : best);
  const [origin, top] = ends(reference);
  const d = { x: (top.xMm - origin.xMm) / reference.lengthMm, y: (top.yMm - origin.yMm) / reference.lengthMm, z: (top.zMm - origin.zMm) / reference.lengthMm };
  const horizontal = Math.hypot(d.x, d.y) || 1;
  const t = { x: d.y / horizontal, y: -d.x / horizontal };
  const toPlane = (point: RoofPoint): LayoutPoint => {
    const dx = point.xMm - origin.xMm, dy = point.yMm - origin.yMm, dz = point.zMm - origin.zMm;
    return { x: dx * t.x + dy * t.y, y: dx * d.x + dy * d.y + dz * d.z };
  };
  const polygons = geometry.planes.filter((item) => item.id.replace(/-\d+$/, "") === chosen.planeId);
  const pitchDegrees = polygons[0]?.pitchDegrees ?? Math.asin(Math.min(1, Math.abs(d.z))) * 180 / Math.PI;
  const endCut = (point: RoofPoint): RafterEndCut => {
    const edgeKind = edgeKindAt(geometry, point);
    return { edgeKind, plumbAngleDegrees: edgeKind === "ridge" || edgeKind === "upper" ? 90 - pitchDegrees : null };
  };
  const placed = segments.map((segment) => { const [lower, upper] = ends(segment); return { segment, lower, upper, from: toPlane(lower), to: toPlane(upper) }; })
    .sort((a, b) => a.from.x - b.from.x || a.from.y - b.from.y);
  const firstX = placed[0]!.from.x;
  const rafters = placed.map((item, index): LayoutRafter => ({
    id: item.segment.id, number: index + 1, offsetMm: item.from.x - firstX, from: item.from, to: item.to, lengthMm: item.segment.lengthMm,
    lowerEnd: endCut(item.lower), upperEnd: endCut(item.upper),
  }));
  const counts = new Map<number, number>();
  for (const rafter of rafters) counts.set(Math.round(rafter.lengthMm), (counts.get(Math.round(rafter.lengthMm)) ?? 0) + 1);
  const outlines = polygons.map((item) => item.vertices.map(toPlane));
  const points = [...outlines.flat(), ...rafters.flatMap((rafter) => [rafter.from, rafter.to])];
  return {
    planes,
    plane: {
      planeId: chosen.planeId, pitchDegrees, spacingMm: chosen.actualSpacingMm, outlines, rafters,
      lengthGroups: [...counts].sort((a, b) => b[0] - a[0]).map(([lengthMm, count]) => ({ lengthMm, count })),
      bounds: { minX: Math.min(...points.map((p) => p.x)), minY: Math.min(...points.map((p) => p.y)), maxX: Math.max(...points.map((p) => p.x)), maxY: Math.max(...points.map((p) => p.y)) },
    },
  };
}

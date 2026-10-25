import type { RoofGeometry, RoofGeometryEdge, RoofPoint } from "./roof-geometry";

const EDGE_PRIORITY: readonly RoofGeometryEdge["kind"][] = ["ridge", "hip", "valley", "break", "upper", "eave", "rake"];

export function onEdge(point: RoofPoint, edge: RoofGeometryEdge): boolean {
  const ex = edge.end.xMm - edge.start.xMm, ey = edge.end.yMm - edge.start.yMm, ez = edge.end.zMm - edge.start.zMm;
  const length2 = ex * ex + ey * ey + ez * ez;
  if (length2 <= 0) return false;
  const ratio = Math.min(1, Math.max(0, ((point.xMm - edge.start.xMm) * ex + (point.yMm - edge.start.yMm) * ey + (point.zMm - edge.start.zMm) * ez) / length2));
  return Math.hypot(edge.start.xMm + ex * ratio - point.xMm, edge.start.yMm + ey * ratio - point.yMm, edge.start.zMm + ez * ratio - point.zMm) < 1;
}

/** Kind of roof edge a point lies on (within 1 mm); where edges meet, the priority above decides. */
export function edgeKindAt(geometry: RoofGeometry, point: RoofPoint): RoofGeometryEdge["kind"] | "unknown" {
  const kinds = new Set(geometry.edges.filter((edge) => onEdge(point, edge)).map((edge) => edge.kind));
  return EDGE_PRIORITY.find((kind) => kinds.has(kind)) ?? "unknown";
}


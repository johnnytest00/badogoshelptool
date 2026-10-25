import type { RoofGeometry, RoofGeometryEdge, RoofPoint } from "@/domain/calculations/roof-geometry";
import type { RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";

/**
 * Close-up of a few rafters from the existing timber layout, in one orthographic axonometric view.
 * Geometry source: RoofTimberLayout.rafters.segments (canonical mm). Every label value is a domain value,
 * never a length measured on the foreshortened projection.
 *
 * Reference map: the layout lines lie in the roof plane (z = 0 at the wall line, eave overhang below it).
 * The rafter-cut joint section (rafter-joints.ts) is measured from the wall plate's outer face and the
 * rafter's upper edge lowered by the seat cut height. These calculators give neither the wall plate,
 * the seat cut height, nor whether the roof plane is the rafter's upper edge, so no section point or
 * notch is projected here: every joint is class C (missing data or not-applicable 2D model).
 */
export type AxonometricFrame = Readonly<{ origin: RoofPoint; t: Readonly<{ x: number; y: number }>; u: Readonly<{ x: number; y: number }> }>;
export type ScreenPoint = Readonly<{ x: number; y: number }>;
export type RafterDetailRafter = Readonly<{ id: string; start: RoofPoint; end: RoofPoint; lengthMm: number; highlighted: boolean; screenStart: ScreenPoint; screenEnd: ScreenPoint }>;
export type RafterDetailJoint = Readonly<{
  position: "lower" | "upper";
  edgeKind: RoofGeometryEdge["kind"] | "unknown";
  /** Both are class C: "missing-data" lists what is needed, "not-applicable" means the 2D section model does not fit. */
  status: "missing-data" | "not-applicable";
  title: string;
  missing: readonly string[];
  reason?: string;
  point: RoofPoint;
  screen: ScreenPoint;
}>;
export type RafterDetailDimension = Readonly<{ kind: "length" | "spacing"; valueMm: number; start: ScreenPoint; end: ScreenPoint }>;
export type RafterDetailModel = Readonly<{
  planeId: string;
  pitchDegrees: number;
  planeRafterCount: number;
  actualSpacingMm: number;
  frame: AxonometricFrame;
  toScreen: (point: RoofPoint) => ScreenPoint;
  rafters: readonly RafterDetailRafter[];
  planeOutlines: readonly (readonly ScreenPoint[])[];
  dimensions: readonly RafterDetailDimension[];
  joints: readonly RafterDetailJoint[];
  section: Readonly<{ widthMm: number; heightMm: number }> | null;
}>;

export const RAFTER_DETAIL_VIEWBOX = { width: 1000, height: 560 } as const;
export const RAFTER_DETAIL_PROFESSIONAL = "A bevágás megengedett mélysége, a keresztmetszet gyengítése, a statikai megfelelőség, a faanyagminőség és a kivitelezésre jóváhagyott csomópont szakemberi döntés; a rajz ezeket nem igazolja.";
export const RAFTER_DEPTH_LABEL = "Szarufa magassága (keresztmetszet)";
const REFERENCE_LABEL = "A tetősík viszonya a szarufa felső éléhez (mérési referencia)";
const YAW = 60 * Math.PI / 180;
const ELEVATION = 25 * Math.PI / 180;
const PADDING = 70;
const EDGE_PRIORITY: readonly RoofGeometryEdge["kind"][] = ["ridge", "hip", "valley", "break", "upper", "eave", "rake"];

/** Rotation about the vertical axis then tilt; the depth coordinate is dropped. Linear, so midpoints are preserved. */
export function projectAxonometric(point: RoofPoint, frame: AxonometricFrame): ScreenPoint {
  const dx = point.xMm - frame.origin.xMm, dy = point.yMm - frame.origin.yMm;
  const a = dx * frame.t.x + dy * frame.t.y, b = dx * frame.u.x + dy * frame.u.y, c = point.zMm - frame.origin.zMm;
  const depth = -a * Math.sin(YAW) + b * Math.cos(YAW);
  return { x: a * Math.cos(YAW) + b * Math.sin(YAW), y: -(c * Math.cos(ELEVATION) + depth * Math.sin(ELEVATION)) };
}

function onEdge(point: RoofPoint, edge: RoofGeometryEdge): boolean {
  const ex = edge.end.xMm - edge.start.xMm, ey = edge.end.yMm - edge.start.yMm, ez = edge.end.zMm - edge.start.zMm;
  const length2 = ex * ex + ey * ey + ez * ez;
  if (length2 <= 0) return false;
  const ratio = Math.min(1, Math.max(0, ((point.xMm - edge.start.xMm) * ex + (point.yMm - edge.start.yMm) * ey + (point.zMm - edge.start.zMm) * ez) / length2));
  return Math.hypot(edge.start.xMm + ex * ratio - point.xMm, edge.start.yMm + ey * ratio - point.yMm, edge.start.zMm + ez * ratio - point.zMm) < 1;
}

function edgeKindAt(geometry: RoofGeometry, point: RoofPoint): RafterDetailJoint["edgeKind"] {
  const kinds = new Set(geometry.edges.filter((edge) => onEdge(point, edge)).map((edge) => edge.kind));
  return EDGE_PRIORITY.find((kind) => kinds.has(kind)) ?? "unknown";
}

function joint(position: RafterDetailJoint["position"], edgeKind: RafterDetailJoint["edgeKind"], hasDepth: boolean, point: RoofPoint, screen: ScreenPoint): RafterDetailJoint {
  const depth = hasDepth ? [] : [RAFTER_DEPTH_LABEL];
  const base = { position, edgeKind, point, screen };
  if (edgeKind === "eave") return { ...base, status: "missing-data", title: "Alsó felfekvés (talpszelemen)", missing: ["Talpszelemen külső síkjának helye a tetősíkhoz képest", "Madárszáj vízszintes vágásának magassága", REFERENCE_LABEL, ...depth] };
  if (edgeKind === "ridge") return { ...base, status: "missing-data", title: "Gerinccsatlakozás", missing: ["Gerinccsatlakozás típusa (szembefutó, gerincdeszka vastagsága vagy gerincszelemen szélessége és felső síkja)", REFERENCE_LABEL, ...depth] };
  if (edgeKind === "upper") return { ...base, status: "missing-data", title: "Felső felfekvés", missing: ["Felső támasz helye és felső síkja", REFERENCE_LABEL, ...depth] };
  const names = { hip: "kontyél", valley: "vápa", break: "törésvonal", rake: "oromél", unknown: "nem azonosított él" } as const;
  return { ...base, status: "not-applicable", title: position === "lower" ? "Alsó csatlakozás" : "Felső csatlakozás", missing: [], reason: `A szarufa ${names[edgeKind]} mentén végződik; az egyetlen síkú, 2D szarufa-metszeti modell itt nem alkalmazható, vágási szög nem adható meg.` };
}

export function createRafterDetailModel(geometry: RoofGeometry, layout: RoofTimberLayout, section: Readonly<{ widthMm: number; heightMm: number }> | null): RafterDetailModel | null {
  const rafters = layout.rafters;
  if (!rafters || rafters.segments.length === 0) return null;
  const plane = rafters.planeLayouts.reduce((best, item) => item.count > best.count ? item : best);
  // One drawn line per placement; a split placement shows its longest piece.
  const byPlacement = new Map<string, (typeof rafters.segments)[number]>();
  for (const segment of rafters.segments.filter((item) => item.planeId === plane.planeId)) {
    const key = segment.id.slice(0, segment.id.lastIndexOf(":"));
    const current = byPlacement.get(key);
    if (!current || segment.lengthMm > current.lengthMm) byPlacement.set(key, segment);
  }
  const placements = [...byPlacement].sort((a, b) => Number(a[0].split(":").at(-1)) - Number(b[0].split(":").at(-1))).map(([, segment]) => segment);
  const first = placements.length <= 3 ? 0 : Math.floor(placements.length / 2) - 1;
  const selected = placements.slice(first, first + 3);
  const highlightIndex = selected.length === 3 ? 1 : 0;
  const lowerUpper = (segment: (typeof selected)[number]) => segment.start.zMm <= segment.end.zMm ? [segment.start, segment.end] as const : [segment.end, segment.start] as const;
  const [origin, top] = lowerUpper(selected[highlightIndex]);
  const run = Math.hypot(top.xMm - origin.xMm, top.yMm - origin.yMm) || 1;
  const u = { x: (top.xMm - origin.xMm) / run, y: (top.yMm - origin.yMm) / run };
  const frame: AxonometricFrame = { origin, u, t: { x: -u.y, y: u.x } };

  const planePolygons = geometry.planes.filter((item) => item.id.replace(/-\d+$/, "") === plane.planeId);
  const raw = selected.flatMap((segment) => [segment.start, segment.end]).map((point) => projectAxonometric(point, frame));
  const xs = raw.map((point) => point.x), ys = raw.map((point) => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((RAFTER_DETAIL_VIEWBOX.width - PADDING * 2) / Math.max(maxX - minX, 1), (RAFTER_DETAIL_VIEWBOX.height - PADDING * 2) / Math.max(maxY - minY, 1));
  const offsetX = (RAFTER_DETAIL_VIEWBOX.width - (maxX - minX) * scale) / 2, offsetY = (RAFTER_DETAIL_VIEWBOX.height - (maxY - minY) * scale) / 2;
  const toScreen = (point: RoofPoint): ScreenPoint => {
    const projected = projectAxonometric(point, frame);
    return { x: offsetX + (projected.x - minX) * scale, y: offsetY + (projected.y - minY) * scale };
  };

  const drawn = selected.map((segment, index): RafterDetailRafter => ({ id: segment.id, start: segment.start, end: segment.end, lengthMm: segment.lengthMm, highlighted: index === highlightIndex, screenStart: toScreen(segment.start), screenEnd: toScreen(segment.end) }));
  const highlighted = selected[highlightIndex];
  const dimensions: RafterDetailDimension[] = [{ kind: "length", valueMm: highlighted.lengthMm, start: toScreen(origin), end: toScreen(top) }];
  if (selected.length >= 2) dimensions.push({ kind: "spacing", valueMm: plane.actualSpacingMm, start: toScreen(lowerUpper(selected[0])[0]), end: toScreen(lowerUpper(selected[1])[0]) });
  const hasDepth = section !== null && section.heightMm > 0;
  return {
    planeId: plane.planeId,
    pitchDegrees: planePolygons[0]?.pitchDegrees ?? Math.atan2(top.zMm - origin.zMm, run) * 180 / Math.PI,
    planeRafterCount: plane.count,
    actualSpacingMm: plane.actualSpacingMm,
    frame,
    toScreen,
    rafters: drawn,
    planeOutlines: planePolygons.map((item) => item.vertices.map(toScreen)),
    dimensions,
    joints: [joint("lower", edgeKindAt(geometry, origin), hasDepth, origin, toScreen(origin)), joint("upper", edgeKindAt(geometry, top), hasDepth, top, toScreen(top))],
    section,
  };
}

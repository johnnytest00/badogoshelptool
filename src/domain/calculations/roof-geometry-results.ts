import type { RoofGeometry, RoofGeometryEdge, RoofGeometryPlane } from "./roof-geometry";

export type RoofGeometryResult = Readonly<{
  status: "available";
  key: string;
  label: string;
  value: number;
  unit: "m²" | "m" | "°" | "%";
  detail?: Readonly<{ label: string; value: number; unit: "%" }>;
}> | Readonly<{
  status: "unavailable";
  key: string;
  label: string;
  reason: string;
}>;

export type RoofGeometryPlaneResult = Readonly<{
  id: string;
  sourcePlaneIds: readonly string[];
  area: RoofGeometryResult;
  projectedArea: RoofGeometryResult;
  perimeter: RoofGeometryResult;
  pitch: RoofGeometryResult;
  slopeRun: RoofGeometryResult;
  slopeLength: RoofGeometryResult;
}>;

export type RoofGeometryEdgeResult = Readonly<{
  id: string;
  kind: RoofGeometryEdge["kind"];
  label: string;
  lengthM: number;
  adjacentPlaneIds: readonly string[];
}>;

export type RoofGeometrySummary = Readonly<{
  primary: readonly RoofGeometryResult[];
  edges: readonly RoofGeometryResult[];
  planes: readonly RoofGeometryPlaneResult[];
  edgeSegments: readonly RoofGeometryEdgeResult[];
}>;

const edgeLabels: Readonly<Record<RoofGeometryEdge["kind"], string>> = {
  eave: "Összes ereszél",
  upper: "Magas oldali él",
  ridge: "Gerinc",
  rake: "Oromél",
  hip: "Kontyél",
  valley: "Vápavonal",
};

export function roofPlaneGroupId(planeId: string): string {
  return planeId.replace(/-\d+$/, "");
}

const areaResult = (key: string, label: string, areaMm2: number): RoofGeometryResult => Number.isFinite(areaMm2) && areaMm2 > 0
  ? { status: "available", key, label, value: areaMm2 / 1_000_000, unit: "m²" }
  : { status: "unavailable", key, label, reason: "A felület nem áll rendelkezésre érvényes geometriából." };

const lengthResult = (key: string, label: string, lengthMm: number): RoofGeometryResult => Number.isFinite(lengthMm) && lengthMm > 0
  ? { status: "available", key, label, value: lengthMm / 1_000, unit: "m" }
  : { status: "unavailable", key, label, reason: "Ehhez a tetőformához nem tartozik ilyen él." };

function planeGradient(plane: RoofGeometryPlane): Readonly<{ x: number; y: number }> | null {
  if (plane.vertices.length < 3) return null;
  const origin = plane.vertices[0];
  for (let first = 1; first < plane.vertices.length - 1; first += 1) {
    for (let second = first + 1; second < plane.vertices.length; second += 1) {
      const a = plane.vertices[first], b = plane.vertices[second];
      const dx1 = a.xMm - origin.xMm, dy1 = a.yMm - origin.yMm;
      const dx2 = b.xMm - origin.xMm, dy2 = b.yMm - origin.yMm;
      const determinant = dx1 * dy2 - dx2 * dy1;
      if (Math.abs(determinant) < 1e-9) continue;
      const dz1 = a.zMm - origin.zMm, dz2 = b.zMm - origin.zMm;
      const x = (dz1 * dy2 - dz2 * dy1) / determinant;
      const y = (dx1 * dz2 - dx2 * dz1) / determinant;
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    }
  }
  return null;
}

type PlaneGroup = Readonly<{ id: string; planes: readonly RoofGeometryPlane[] }>;

function planeResults(group: PlaneGroup, edges: readonly RoofGeometryEdge[]): RoofGeometryPlaneResult {
  const plane = group.planes[0];
  const gradient = planeGradient(plane);
  const gradientMagnitude = gradient ? Math.hypot(gradient.x, gradient.y) : Number.NaN;
  const pitchDegrees = Math.atan(gradientMagnitude) * 180 / Math.PI;
  const unitX = gradient ? gradient.x / gradientMagnitude : Number.NaN;
  const unitY = gradient ? gradient.y / gradientMagnitude : Number.NaN;
  const projections = group.planes.flatMap((item) => item.vertices.map((point) => point.xMm * unitX + point.yMm * unitY));
  const runMm = Math.max(...projections) - Math.min(...projections);
  const slopeLengthMm = Math.hypot(runMm, runMm * gradientMagnitude);
  const sameGradient = group.planes.every((item) => {
    const candidate = planeGradient(item);
    return candidate !== null && gradient !== null && Math.abs(candidate.x - gradient.x) <= 1e-9 && Math.abs(candidate.y - gradient.y) <= 1e-9;
  });
  const slopeAvailable = sameGradient && gradientMagnitude > 0 && Number.isFinite(runMm) && runMm > 0 && Number.isFinite(slopeLengthMm);
  const sourcePlaneIds = group.planes.map((item) => item.id);
  const perimeterMm = edges.filter((edge) => edge.adjacentPlaneIds.some((id) => sourcePlaneIds.includes(id))).reduce((sum, edge) => sum + edge.lengthMm, 0);
  const areaMm2 = group.planes.reduce((sum, item) => sum + item.areaMm2, 0);
  const projectedAreaMm2 = group.planes.reduce((sum, item) => sum + item.projectedAreaMm2, 0);
  const pitch: RoofGeometryResult = slopeAvailable
    ? { status: "available", key: `plane:${group.id}:pitch`, label: "Tetősík hajlása", value: pitchDegrees, unit: "°", detail: { label: "Hajlás százalékban", value: gradientMagnitude * 100, unit: "%" } }
    : { status: "unavailable", key: `plane:${group.id}:pitch`, label: "Tetősík hajlása", reason: "A tetősík hajlása a megadott csúcspontokból nem határozható meg." };

  return {
    id: group.id,
    sourcePlaneIds,
    area: areaResult(`plane:${group.id}:area`, "Tetősík geometriai felülete", areaMm2),
    projectedArea: areaResult(`plane:${group.id}:projected-area`, "Tetősík vízszintes vetülete", projectedAreaMm2),
    perimeter: lengthResult(`plane:${group.id}:perimeter`, "Tetősík térbeli kerülete", perimeterMm),
    pitch,
    slopeRun: slopeAvailable
      ? lengthResult(`plane:${group.id}:slope-run`, "Hajlásirányú vízszintes futás", runMm)
      : { status: "unavailable", key: `plane:${group.id}:slope-run`, label: "Hajlásirányú vízszintes futás", reason: "A tetősík hajlásiránya a megadott csúcspontokból nem határozható meg." },
    slopeLength: slopeAvailable
      ? lengthResult(`plane:${group.id}:slope-length`, "Hajlásirányú ferde geometriai méret", slopeLengthMm)
      : { status: "unavailable", key: `plane:${group.id}:slope-length`, label: "Hajlásirányú ferde geometriai méret", reason: "A tetősík hajlásiránya a megadott csúcspontokból nem határozható meg." },
  };
}

/** Derives display values from the existing shared roof geometry; it does not estimate products or structure. */
export function summarizeRoofGeometry(geometry: RoofGeometry): RoofGeometrySummary {
  const planeGroups = new Map<string, RoofGeometryPlane[]>();
  for (const plane of geometry.planes) {
    const id = roofPlaneGroupId(plane.id);
    planeGroups.set(id, [...(planeGroups.get(id) ?? []), plane]);
  }
  const groups: PlaneGroup[] = [...planeGroups].map(([id, planes]) => ({ id, planes }));
  const sourcePlaneToGroup = new Map(groups.flatMap((group) => group.planes.map((plane) => [plane.id, group.id] as const)));
  const edgeResults = (Object.keys(edgeLabels) as RoofGeometryEdge["kind"][]).map((kind) => {
    const lengthMm = geometry.edges.filter((edge) => edge.kind === kind).reduce((sum, edge) => sum + edge.lengthMm, 0);
    return lengthResult(`${kind}Length`, edgeLabels[kind], lengthMm);
  });
  const planeSummaries = groups.map((group) => planeResults(group, geometry.edges));
  const pitchValues = planeSummaries.flatMap((plane) => plane.pitch.status === "available" ? [plane.pitch.value] : []);
  const samePitch = pitchValues.length === planeSummaries.length && pitchValues.length > 0
    && pitchValues.every((pitch) => Math.abs(pitch - pitchValues[0]) <= 1e-8);
  const pitchResult: RoofGeometryResult = samePitch
    ? {
      status: "available", key: "pitchDegrees", label: "Tetőhajlás", value: pitchValues[0], unit: "°",
      detail: { label: "Hajlás százalékban", value: Math.tan(pitchValues[0] * Math.PI / 180) * 100, unit: "%" },
    }
    : { status: "unavailable", key: "pitchDegrees", label: "Tetőhajlás", reason: "A tetősíkok hajlása eltér; az egyes síkok értékei a részleteknél láthatók." };
  const primaryKeys = [
    "totalArea", "pitchDegrees", "projectedArea", "eaveLength",
    ...(geometry.type === "shed" ? ["upperLength"] : []),
    ...(geometry.type === "gable" ? ["ridgeLength"] : []),
    ...(geometry.type === "hip" || geometry.type === "halfHip" ? ["ridgeLength", "hipLength"] : []),
    ...(geometry.type === "pyramid" ? ["hipLength"] : []),
    ...(geometry.type === "lShape" || geometry.type === "tShape" ? ["ridgeLength", "valleyLength"] : []),
  ];
  const byKey = new Map<string, RoofGeometryResult>([
    ["totalArea", areaResult("totalArea", "Teljes tetősík geometriai felülete", geometry.totalAreaMm2)],
    ["projectedArea", areaResult("projectedArea", "Vízszintes vetületi terület", geometry.projectedAreaMm2)],
    ["pitchDegrees", pitchResult],
    ...edgeResults.map((result) => [result.key, result] as const),
  ]);
  const primary = primaryKeys.map((key) => byKey.get(key)).filter((result): result is RoofGeometryResult => result?.status === "available").slice(0, 6);
  const edgeSegments = geometry.edges.map((edge) => ({
    id: edge.id, kind: edge.kind, label: edgeLabels[edge.kind], lengthM: edge.lengthMm / 1_000,
    adjacentPlaneIds: [...new Set(edge.adjacentPlaneIds.map((id) => sourcePlaneToGroup.get(id)).filter((id): id is string => id !== undefined))],
  }));
  return { primary, edges: edgeResults, planes: planeSummaries, edgeSegments };
}

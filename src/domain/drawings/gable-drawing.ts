import type { GableRoofOutput, RoofVertex } from "@/domain/calculations/gable-roof";
import type { MetalSheetLayoutOutput } from "@/domain/calculations/metal-sheet-layout";
import type { RoofUnderlayLayout } from "@/domain/calculations/roof-underlay";

export type DrawingView = "top" | "gable" | "cross-section" | "longitudinal";
export type DrawingLayerId = "planes" | "outlines" | "ridge-eaves" | "dimensions" | "angles" | "guides" | "sheet-layout" | "underlay-layout" | "timber-layout";
export type DrawingPoint = Readonly<{ x: number; y: number }>;
export type DrawingSegment = Readonly<{ id?: string; start: DrawingPoint; end: DrawingPoint; label?: string; hidden?: boolean }>;
export type DrawingPolygon = Readonly<{ id?: string; points: readonly DrawingPoint[]; label: string; side?: "left" | "right"; outline?: boolean }>;
export type DrawingDimension = Readonly<{ kind: "horizontal" | "vertical" | "aligned"; start: DrawingPoint; end: DrawingPoint; offset: number; label: string; sourceMm: number; sourceKey?: string; description?: string; optional?: boolean }>;
export type DrawingAngle = Readonly<{ vertex: DrawingPoint; start: DrawingPoint; end: DrawingPoint; label: string; sourceKey?: string; description?: string }>;
export type DrawingSheetStrip = Readonly<{ id: string; points: readonly DrawingPoint[]; planeSide: "left" | "right"; indexFromStart: number; isPartial: boolean }>;
export type DrawingUnderlayPolygon = Readonly<{ id: string; points: readonly DrawingPoint[]; kind: "course" | "overlap"; planeId: string; indexFromStart?: number }>;

export type GableDrawingModel = Readonly<{
  view: DrawingView;
  title: string;
  bounds: Readonly<{ minX: number; maxX: number; minY: number; maxY: number }>;
  polygons: readonly DrawingPolygon[];
  segments: readonly DrawingSegment[];
  dimensions: readonly DrawingDimension[];
  angles: readonly DrawingAngle[];
  guides: readonly DrawingSegment[];
  sheetStrips: readonly DrawingSheetStrip[];
  underlayPolygons: readonly DrawingUnderlayPolygon[];
  timberSegments: readonly (DrawingSegment & { family: "rafter" | "batten" })[];
}>;

export const drawingViews: readonly { id: DrawingView; label: string }[] = [
  { id: "top", label: "Felülnézet" },
  { id: "gable", label: "Oromoldal" },
  { id: "cross-section", label: "Keresztmetszet" },
  { id: "longitudinal", label: "Oldalnézet" },
];

export const drawingLayers: readonly { id: DrawingLayerId; label: string; defaultVisible: boolean }[] = [
  { id: "planes", label: "Tetősíkok", defaultVisible: true },
  { id: "outlines", label: "Tetőkontúrok", defaultVisible: true },
  { id: "ridge-eaves", label: "Gerinc és ereszek", defaultVisible: true },
  { id: "dimensions", label: "Méretvonalak", defaultVisible: true },
  { id: "angles", label: "Hajlásszögek", defaultVisible: true },
  { id: "guides", label: "Segédvonalak", defaultVisible: true },
  { id: "sheet-layout", label: "Lemezkiosztás", defaultVisible: false },
  { id: "underlay-layout", label: "Alátétfólia-csíkok és átfedések", defaultVisible: true },
  { id: "timber-layout", label: "Szarufa- és lécekiosztás", defaultVisible: true },
];

const titles: Record<DrawingView, string> = {
  top: "Felülnézeti műszaki rajz",
  gable: "Oromoldali műszaki rajz",
  "cross-section": "Keresztmetszeti műszaki rajz",
  longitudinal: "Hosszanti oldalnézeti műszaki rajz",
};

export function formatDrawingMeasurement(mm: number, decimals = 3): string {
  const value = Math.abs(mm) >= 1000 ? `${new Intl.NumberFormat("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: decimals }).format(mm / 1000)} m` : `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(mm)} mm`;
  return value;
}

function point(x: number, y: number): DrawingPoint { return { x, y }; }
function invertY(value: number): number { return -value; }
function xz(vertex: RoofVertex): DrawingPoint { return point(vertex.xMm, invertY(vertex.zMm)); }
function yz(vertex: RoofVertex): DrawingPoint { return point(vertex.yMm, invertY(vertex.zMm)); }
function xy(vertex: RoofVertex): DrawingPoint { return point(vertex.xMm, invertY(vertex.yMm)); }
function closeSegments(points: readonly DrawingPoint[], label: string): DrawingSegment[] {
  return points.map((start, index) => ({ start, end: points[(index + 1) % points.length], label }));
}
function bounds(points: readonly DrawingPoint[]): GableDrawingModel["bounds"] {
  const xs = points.map((item) => item.x);
  const ys = points.map((item) => item.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}
function dimension(kind: DrawingDimension["kind"], start: DrawingPoint, end: DrawingPoint, offset: number, sourceMm: number, sourceKey?: string, description?: string, optional = false): DrawingDimension {
  return { kind, start, end, offset, sourceMm, sourceKey, description, label: formatDrawingMeasurement(sourceMm), optional };
}

export function createGableDrawingModel(output: GableRoofOutput, view: DrawingView, sheetLayout?: MetalSheetLayoutOutput | null, underlayLayout?: RoofUnderlayLayout | null): GableDrawingModel {
  const left = output.planes.find((plane) => plane.side === "left");
  const right = output.planes.find((plane) => plane.side === "right");
  if (!left || !right || left.vertices.length !== 4 || right.vertices.length !== 4) throw new Error("A rajzhoz hiányos tetősík-geometria érkezett.");
  const all = [...left.vertices, ...right.vertices];
  const startX = all.reduce((min, item) => Math.min(min, item.xMm), Infinity);
  const endX = all.reduce((max, item) => Math.max(max, item.xMm), -Infinity);
  const leftEave = left.vertices[0];
  const rightEave = right.vertices[2];
  const ridgeStart = left.vertices[3];
  const ridgeEnd = left.vertices[2];
  let polygons: DrawingPolygon[];
  let segments: DrawingSegment[];
  let dimensions: DrawingDimension[];
  let angles: DrawingAngle[];
  let guides: DrawingSegment[];
  let allPoints: DrawingPoint[];
  let sheetStrips: DrawingSheetStrip[] = [];
  const underlayPolygons: DrawingUnderlayPolygon[] = view === "top" && underlayLayout?.courses ? [
    ...underlayLayout.courses.map((course) => ({ id: course.id, points: course.polygon.map(xy), kind: "course" as const, planeId: course.planeId, indexFromStart: course.indexFromStart })),
    ...underlayLayout.overlaps.map((overlap) => ({ id: overlap.id, points: overlap.polygon.map(xy), kind: "overlap" as const, planeId: overlap.planeId })),
  ] : [];

  if (view === "top") {
    const leftPoints = left.vertices.map(xy);
    const rightPoints = right.vertices.map(xy);
    polygons = [{ id: "left-plane", points: leftPoints, label: "Bal oldali tetősík", side: "left" }, { id: "right-plane", points: rightPoints, label: "Jobb oldali tetősík", side: "right" }];
    segments = [...closeSegments(leftPoints, "Tetőkontúr"), ...closeSegments(rightPoints, "Tetőkontúr")];
    const ridge = [point(ridgeStart.xMm, 0), point(ridgeEnd.xMm, 0)];
    const eaveL = [point(leftEave.xMm, leftEave.yMm * -1), point(left.vertices[1].xMm, left.vertices[1].yMm * -1)];
    const eaveR = [point(right.vertices[3].xMm, right.vertices[3].yMm * -1), point(rightEave.xMm, rightEave.yMm * -1)];
    segments.push({ id: "ridge", start: ridge[0], end: ridge[1], label: "Gerinc" }, { id: "left-eave", start: eaveL[0], end: eaveL[1], label: "Bal eresz" }, { id: "right-eave", start: eaveR[0], end: eaveR[1], label: "Jobb eresz" });
    segments.push(
      { id: "left-front-gable", start: leftPoints[0], end: leftPoints[3], label: "Bal első ferde oromél" },
      { id: "left-rear-gable", start: leftPoints[1], end: leftPoints[2], label: "Bal hátsó ferde oromél" },
      { id: "right-front-gable", start: rightPoints[0], end: rightPoints[3], label: "Jobb első ferde oromél" },
      { id: "right-rear-gable", start: rightPoints[1], end: rightPoints[2], label: "Jobb hátsó ferde oromél" },
    );
    dimensions = [
      dimension("horizontal", point(startX, 0), point(endX, 0), 900, output.dimensions.overallRoofLengthMm, undefined, "A teljes tető külső hossza túlnyúlásokkal."),
      dimension("horizontal", point(0, 0), point(output.dimensions.buildingLengthMm, 0), 1250, output.dimensions.buildingLengthMm, "buildingLengthMm", "Az épület két oromfala közötti vízszintes hossz."),
      dimension("vertical", point(0, -output.dimensions.horizontalSlopeRunMm), point(0, output.dimensions.horizontalSlopeRunMm), 900, output.dimensions.horizontalRoofWidthMm, undefined, "A tető külső vízszintes szélessége eresztúlnyúlással."),
      dimension("vertical", point(0, -output.dimensions.buildingWidthMm / 2), point(0, output.dimensions.buildingWidthMm / 2), 1250, output.dimensions.buildingWidthMm, "buildingWidthMm", "A két falsík közötti vízszintes szélesség."),
    ];
    angles = [];
    guides = [];
    allPoints = [...leftPoints, ...rightPoints, ...ridge, ...eaveL, ...eaveR];
    if (sheetLayout) {
      const eaveY = { left: invertY(left.vertices[0].yMm), right: invertY(right.vertices[2].yMm) } as const;
      sheetStrips = sheetLayout.strips.map((strip) => ({
        id: strip.id,
        planeSide: strip.planeSide,
        indexFromStart: strip.indexFromStart,
        isPartial: strip.isPartial,
        points: [point(strip.startXmm, 0), point(strip.endXmm, 0), point(strip.endXmm, eaveY[strip.planeSide]), point(strip.startXmm, eaveY[strip.planeSide])],
      }));
      allPoints.push(...sheetStrips.flatMap((strip) => strip.points));
    }
  } else if (view === "longitudinal") {
    const points = [xz(leftEave), xz(ridgeStart), xz(ridgeEnd), xz(rightEave)];
    polygons = [];
    segments = [{ start: points[0], end: points[1], label: "Bal tetőél" }, { start: points[1], end: points[2], label: "Gerinc" }, { start: points[2], end: points[3], label: "Jobb tetőél" }, { start: point(startX, 0), end: point(endX, 0), label: "Megtémasztási sík", hidden: true }];
    dimensions = [
      dimension("horizontal", point(startX, 0), point(endX, 0), 900, output.dimensions.overallRoofLengthMm, undefined, "A teljes tetőhossz túlnyúlásokkal."),
      dimension("horizontal", point(0, 0), point(output.dimensions.buildingLengthMm, 0), 1250, output.dimensions.buildingLengthMm, "buildingLengthMm", "Az épület hossza falsíktól falsíkig."),
      dimension("vertical", point(0, 0), point(0, invertY(output.heights.roofRiseMm)), -700, output.heights.roofRiseMm, "roofRiseMm", "Függőleges emelkedés a megtámasztási síktól a gerincig."),
    ];
    angles = [];
    guides = [{ start: point(0, 0), end: point(endX, 0), label: "Fal megtámasztási síkja", hidden: true }];
    allPoints = [...points, point(startX, 0), point(endX, 0)];
  } else {
    const points = [yz(leftEave), yz(ridgeStart), yz(rightEave)];
    polygons = [];
    segments = [{ start: points[0], end: points[1], label: "Bal tetősík" }, { start: points[1], end: points[2], label: "Jobb tetősík" }];
    guides = [{ start: point(-output.dimensions.buildingWidthMm / 2, 0), end: point(output.dimensions.buildingWidthMm / 2, 0), label: "Fal megtámasztási síkja", hidden: true }, { start: point(0, 0), end: points[1], label: "Felező segédvonal", hidden: true }];
    dimensions = [
      dimension("horizontal", point(-output.dimensions.horizontalSlopeRunMm, 0), point(output.dimensions.horizontalSlopeRunMm, 0), 900, output.dimensions.horizontalRoofWidthMm, undefined, "A tető külső vízszintes szélessége eresztúlnyúlással."),
      dimension("horizontal", point(-output.dimensions.buildingWidthMm / 2, 0), point(output.dimensions.buildingWidthMm / 2, 0), 1250, output.dimensions.buildingWidthMm, "buildingWidthMm", "A két falsík közötti vízszintes szélesség."),
      dimension("vertical", point(0, 0), points[1], 900, output.heights.roofRiseMm, "roofRiseMm", "Függőleges emelkedés a megtámasztási síktól a gerincig."),
      dimension("aligned", points[0], points[1], -650, output.lengths.slopeLengthIncludingEaveMm, undefined, "Ferde geometriai hossz az eresztúlnyúlással."),
    ];
    // The label is the pitch of one roof plane, so the arc compares one slope ray with the horizontal reference ray.
    angles = [{ vertex: points[1], start: point(points[1].x + output.dimensions.horizontalSlopeRunMm * 0.35, points[1].y + output.heights.roofRiseMm * 0.35), end: point(points[1].x + output.dimensions.horizontalSlopeRunMm * 0.35, points[1].y), label: `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(output.angles.pitchDegrees)}°`, sourceKey: "roofPitchDegrees", description: "A tetősík és a vízszintes sík közötti szög." }];
    allPoints = [...points, ...guides.flatMap((item) => [item.start, item.end])];
  }
  const flatPoints = allPoints.filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y));
  return { view, title: titles[view], bounds: bounds(flatPoints), polygons, segments, dimensions, angles, guides, sheetStrips, underlayPolygons, timberSegments: [] };
}

export function filterDrawingModel(model: GableDrawingModel, visible: Readonly<Record<DrawingLayerId, boolean>>): GableDrawingModel {
  const isRidgeOrEave = (label: string | undefined) => Boolean(label && (label.includes("Gerinc") || label.includes("eresz")));
  return { ...model, polygons: visible.planes ? model.polygons : [], segments: model.segments.filter((segment) => isRidgeOrEave(segment.label) ? visible["ridge-eaves"] : visible.outlines), dimensions: visible.dimensions ? model.dimensions : [], angles: visible.angles ? model.angles : [], guides: visible.guides ? model.guides : [], sheetStrips: visible["sheet-layout"] ? model.sheetStrips : [], underlayPolygons: visible["underlay-layout"] ? model.underlayPolygons : [], timberSegments: visible["timber-layout"] ? model.timberSegments : [] };
}


export type AnnotationPoint = Readonly<{ x: number; y: number }>;
export type AnnotationDimensionKind = "horizontal" | "vertical" | "aligned";

/** Screen-space rules keep annotation legibility independent from roof scale. */
export const technicalAnnotationRules = {
  dimensionOffset: 36,
  geometryGap: 8,
  labelGap: 12,
  angleRadius: 38,
  angleLabelRadius: 58,
  boundsPadding: 30,
} as const;

export type DimensionScreenGeometry = Readonly<{
  start: AnnotationPoint;
  end: AnnotationPoint;
  extensionStart: AnnotationPoint;
  extensionEnd: AnnotationPoint;
  label: AnnotationPoint;
  labelAnchor: "middle" | "start" | "end";
  normal: AnnotationPoint;
}>;

function add(point: AnnotationPoint, vector: AnnotationPoint, scale = 1): AnnotationPoint { return { x: point.x + vector.x * scale, y: point.y + vector.y * scale }; }
function subtract(first: AnnotationPoint, second: AnnotationPoint): AnnotationPoint { return { x: first.x - second.x, y: first.y - second.y }; }
function length(point: AnnotationPoint): number { return Math.hypot(point.x, point.y) || 1; }

export function dimensionScreenGeometry(kind: AnnotationDimensionKind, sourceStart: AnnotationPoint, sourceEnd: AnnotationPoint, offset: number): DimensionScreenGeometry {
  const direction = subtract(sourceEnd, sourceStart);
  const normal = kind === "horizontal" ? { x: 0, y: offset >= 0 ? 1 : -1 } : kind === "vertical" ? { x: offset >= 0 ? 1 : -1, y: 0 } : (() => {
    const perpendicular = { x: -direction.y / length(direction), y: direction.x / length(direction) };
    return { x: perpendicular.x * (offset >= 0 ? 1 : -1), y: perpendicular.y * (offset >= 0 ? 1 : -1) };
  })();
  const start = add(sourceStart, normal, technicalAnnotationRules.dimensionOffset);
  const end = add(sourceEnd, normal, technicalAnnotationRules.dimensionOffset);
  const extensionStart = add(sourceStart, normal, technicalAnnotationRules.geometryGap);
  const extensionEnd = add(sourceEnd, normal, technicalAnnotationRules.geometryGap);
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const horizontal = kind === "horizontal";
  const label = horizontal
    ? add(midpoint, { x: 0, y: -technicalAnnotationRules.labelGap })
    : add(midpoint, { x: normal.x * technicalAnnotationRules.labelGap, y: normal.y * technicalAnnotationRules.labelGap });
  return { start, end, extensionStart, extensionEnd, label, labelAnchor: horizontal ? "middle" : normal.x > 0 ? "start" : "end", normal };
}

export function angleScreenGeometry(vertex: AnnotationPoint, startReference: AnnotationPoint, endReference: AnnotationPoint) {
  const startVector = subtract(startReference, vertex);
  const endVector = subtract(endReference, vertex);
  const startUnit = { x: startVector.x / length(startVector), y: startVector.y / length(startVector) };
  const endUnit = { x: endVector.x / length(endVector), y: endVector.y / length(endVector) };
  const start = add(vertex, startUnit, technicalAnnotationRules.angleRadius);
  const end = add(vertex, endUnit, technicalAnnotationRules.angleRadius);
  const bisector = { x: startUnit.x + endUnit.x, y: startUnit.y + endUnit.y };
  const bisectorUnit = bisector.x === 0 && bisector.y === 0 ? { x: 0, y: -1 } : { x: bisector.x / length(bisector), y: bisector.y / length(bisector) };
  return { start, end, label: add(vertex, bisectorUnit, technicalAnnotationRules.angleLabelRadius) };
}

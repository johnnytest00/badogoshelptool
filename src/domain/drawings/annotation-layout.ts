export type AnnotationPoint = Readonly<{ x: number; y: number }>;
export type AnnotationDimensionKind = "horizontal" | "vertical" | "aligned";
export type AnnotationLabelCandidate = Readonly<{ id: string; text: string; point: AnnotationPoint; anchor?: "middle" | "start" | "end"; move: AnnotationPoint }>;

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

export type DimensionPlacement = Readonly<{ distance?: number; baseline?: number }>;

export function dimensionScreenGeometry(kind: AnnotationDimensionKind, sourceStart: AnnotationPoint, sourceEnd: AnnotationPoint, offset: number, placement: DimensionPlacement = {}): DimensionScreenGeometry {
  const direction = subtract(sourceEnd, sourceStart);
  const normal = kind === "horizontal" ? { x: 0, y: offset >= 0 ? 1 : -1 } : kind === "vertical" ? { x: offset >= 0 ? 1 : -1, y: 0 } : (() => {
    const perpendicular = { x: -direction.y / length(direction), y: direction.x / length(direction) };
    return { x: perpendicular.x * (offset >= 0 ? 1 : -1), y: perpendicular.y * (offset >= 0 ? 1 : -1) };
  })();
  const distance = placement.distance ?? technicalAnnotationRules.dimensionOffset;
  // A baseline moves the dimension line outside the drawing (screen x for vertical, screen y for horizontal); the extension lines reach it from the source points.
  const anchor = (source: AnnotationPoint): AnnotationPoint => placement.baseline === undefined || kind === "aligned" ? source
    : kind === "horizontal" ? { x: source.x, y: placement.baseline } : { x: placement.baseline, y: source.y };
  const start = add(anchor(sourceStart), normal, distance);
  const end = add(anchor(sourceEnd), normal, distance);
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

/** Nudge colliding technical labels in their local annotation direction without moving geometry. */
export function resolveAnnotationLabelPositions(labels: readonly AnnotationLabelCandidate[], fontSize = 30): ReadonlyMap<string, AnnotationPoint> {
  const placed: Array<{ label: AnnotationLabelCandidate; point: AnnotationPoint; width: number; height: number }> = [];
  const result = new Map<string, AnnotationPoint>();
  const ordered = [...labels].sort((first, second) => second.text.length - first.text.length || first.id.localeCompare(second.id));
  const overlaps = (first: { label: AnnotationLabelCandidate; point: AnnotationPoint; width: number; height: number }, second: { label: AnnotationLabelCandidate; point: AnnotationPoint; width: number; height: number }) => {
    const firstLeft = first.label.anchor === "start" ? first.point.x : first.label.anchor === "end" ? first.point.x - first.width : first.point.x - first.width / 2;
    const secondLeft = second.label.anchor === "start" ? second.point.x : second.label.anchor === "end" ? second.point.x - second.width : second.point.x - second.width / 2;
    const gap = 6;
    return firstLeft < secondLeft + second.width + gap && firstLeft + first.width + gap > secondLeft && first.point.y - first.height / 2 < second.point.y + second.height / 2 + gap && first.point.y + first.height / 2 + gap > second.point.y - second.height / 2;
  };
  for (const label of ordered) {
    const width = Math.max(fontSize, label.text.length * fontSize * .62);
    const height = fontSize * 1.4;
    const directionLength = Math.hypot(label.move.x, label.move.y) || 1;
    const move = { x: label.move.x / directionLength, y: label.move.y / directionLength };
    const candidates = [0, 1, -1, 2, -2, 3, -3, 4, -4].map((step) => ({
      label,
      point: { x: label.point.x + move.x * step * fontSize * 1.2, y: label.point.y + move.y * step * fontSize * 1.2 },
      width,
      height,
    }));
    const selected = candidates.find((candidate) => placed.every((other) => !overlaps(candidate, other))) ?? candidates.at(-1)!;
    placed.push(selected);
    result.set(label.id, selected.point);
  }
  return result;
}

export type ScreenBox = Readonly<{ minX: number; maxX: number; minY: number; maxY: number }>;
export type DimensionInput = Readonly<{ kind: AnnotationDimensionKind; start: AnnotationPoint; end: AnnotationPoint; offset: number; label: string }>;

/**
 * Places all dimensions of one drawing: lines sit outside the drawing box on the side given by the offset sign, and dimensions
 * sharing a side are stacked in tiers (smaller data offset = closer) so lines and labels never share the same screen position.
 */
export function placeDimensions(items: readonly DimensionInput[], box: ScreenBox, fontSize = 30): DimensionScreenGeometry[] {
  const side = (item: DimensionInput) => `${item.kind}:${item.offset >= 0 ? "+" : "-"}`;
  const groups = new Map<string, number[]>();
  items.forEach((item, index) => groups.set(side(item), [...(groups.get(side(item)) ?? []), index]));
  const distances = new Array<number>(items.length).fill(technicalAnnotationRules.dimensionOffset);
  for (const indexes of groups.values()) {
    const ordered = [...indexes].sort((a, b) => Math.abs(items[a]!.offset) - Math.abs(items[b]!.offset) || a - b);
    const widest = Math.max(...ordered.map((index) => items[index]!.label.length * fontSize * .62));
    const gap = items[ordered[0]!]!.kind === "vertical" ? Math.max(48, widest + 28) : 48;
    let distance = technicalAnnotationRules.dimensionOffset;
    ordered.forEach((index) => { distances[index] = distance; distance += gap; });
  }
  return items.map((item, index) => {
    const positive = item.offset >= 0;
    const baseline = item.kind === "horizontal" ? (positive ? box.maxY : box.minY) : item.kind === "vertical" ? (positive ? box.maxX : box.minX) : undefined;
    return dimensionScreenGeometry(item.kind, item.start, item.end, item.offset, { distance: distances[index], baseline });
  });
}

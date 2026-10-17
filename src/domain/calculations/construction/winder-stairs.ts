import { z } from "zod";
import { assertFiniteResult, constructionCount, constructionLengthMm } from "./numeric";

/**
 * Deliberately limited winder model: equal-angle, concentric annular sectors
 * whose outer/inner circular limits are represented by straight chord edges.
 * The mid-width walking line is stationed by exact circular arc length.
 */
export const winderStairInputSchema = z.object({
  layout: z.enum(["quarter_turn", "half_turn", "three_flight"]),
  totalRiseMm: constructionLengthMm,
  stairWidthMm: constructionLengthMm,
  innerRadiusMm: constructionLengthMm,
  lowerTreadCount: constructionCount.min(1).max(200),
  middleTreadCount: constructionCount.min(1).max(200).optional(),
  upperTreadCount: constructionCount.min(1).max(200),
  windersPerTurn: constructionCount.min(2).max(24),
  turnDirection: z.enum(["right", "left"]),
  openingLengthMm: constructionLengthMm.optional(),
  openingWidthMm: constructionLengthMm.optional(),
}).superRefine((input, context) => {
  if (input.layout === "three_flight" && input.middleTreadCount === undefined) {
    context.addIssue({ code: "custom", path: ["middleTreadCount"], message: "Háromkarú elrendezéshez adja meg a középső kar fokainak számát." });
  }
  if (input.layout !== "three_flight" && input.middleTreadCount !== undefined) {
    context.addIssue({ code: "custom", path: ["middleTreadCount"], message: "Középső kar csak háromkarú elrendezésben adható meg." });
  }
  const turns = input.layout === "three_flight" ? 2 : 1;
  if (input.lowerTreadCount + input.upperTreadCount + (input.middleTreadCount ?? 0) + turns * input.windersPerTurn > 199) {
    context.addIssue({ code: "custom", path: ["windersPerTurn"], message: "Az összes vízszintes fok legfeljebb 199 lehet." });
  }
});
export type WinderStairInput = z.input<typeof winderStairInputSchema>;

export type WinderPoint = Readonly<{ xMm: number; yMm: number }>;
export type WinderTread = Readonly<{
  index: number;
  kind: "straight" | "winder";
  turnIndex: number | null;
  levelMm: number;
  polygon: readonly WinderPoint[];
  walkingGoingMm: number;
  innerChordMm: number | null;
  outerChordMm: number | null;
}>;

const cross = (a: WinderPoint, b: WinderPoint, c: WinderPoint) => (b.xMm - a.xMm) * (c.yMm - a.yMm) - (b.yMm - a.yMm) * (c.xMm - a.xMm);
const area = (polygon: readonly WinderPoint[]) => Math.abs(polygon.reduce((sum, point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  return sum + point.xMm * next.yMm - next.xMm * point.yMm;
}, 0)) / 2;

function polygonsHaveInteriorOverlap(a: readonly WinderPoint[], b: readonly WinderPoint[]): boolean {
  // Separating-axis theorem for convex polygons; touching edges are permitted.
  for (const polygon of [a, b]) {
    for (let index = 0; index < polygon.length; index += 1) {
      const p = polygon[index];
      const q = polygon[(index + 1) % polygon.length];
      const axis = { xMm: -(q.yMm - p.yMm), yMm: q.xMm - p.xMm };
      const project = (points: readonly WinderPoint[]) => points.map((point) => point.xMm * axis.xMm + point.yMm * axis.yMm);
      const pa = project(a); const pb = project(b);
      const overlap = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb));
      const tolerance = Math.max(1, Math.hypot(axis.xMm, axis.yMm)) * 1e-8;
      if (overlap <= tolerance) return false;
    }
  }
  return true;
}

/** Shared pure geometry engine for one 90°, one 180° or two successive 90° winder turns. */
export function calculateWinderStairGeometry(rawInput: WinderStairInput) {
  const input = winderStairInputSchema.parse(rawInput);
  const turns = input.layout === "three_flight" ? 2 : 1;
  const turnDegrees = input.layout === "half_turn" ? 180 : 90;
  const turnRadians = turnDegrees * Math.PI / 180;
  const winderCount = turns * input.windersPerTurn;
  const treadCount = input.lowerTreadCount + (input.middleTreadCount ?? 0) + input.upperTreadCount + winderCount;
  const riserCount = treadCount + 1;
  const riserHeightMm = input.totalRiseMm / riserCount;
  const innerRadiusMm = input.innerRadiusMm;
  const outerRadiusMm = innerRadiusMm + input.stairWidthMm;
  const walkingRadiusMm = (innerRadiusMm + outerRadiusMm) / 2;
  const stepAngleRadians = turnRadians / input.windersPerTurn;
  const stepAngleDegrees = turnDegrees / input.windersPerTurn;
  const walkingGoingMm = walkingRadiusMm * stepAngleRadians;
  const innerChordMm = 2 * innerRadiusMm * Math.sin(stepAngleRadians / 2);
  const outerChordMm = 2 * outerRadiusMm * Math.sin(stepAngleRadians / 2);
  const direction = input.turnDirection === "right" ? 1 : -1;
  let position: WinderPoint = { xMm: 0, yMm: 0 };
  let heading = 0;
  const unnormalizedTreads: (Omit<WinderTread, "polygon" | "index" | "levelMm"> & { polygon: WinderPoint[] })[] = [];

  const addStraight = (count: number) => {
    const right = { xMm: -Math.sin(heading), yMm: Math.cos(heading) };
    const forward = { xMm: Math.cos(heading), yMm: Math.sin(heading) };
    for (let step = 0; step < count; step += 1) {
      const start = position;
      const end = { xMm: start.xMm + forward.xMm * walkingGoingMm, yMm: start.yMm + forward.yMm * walkingGoingMm };
      const half = input.stairWidthMm / 2;
      const polygon = [
        { xMm: start.xMm - right.xMm * half, yMm: start.yMm - right.yMm * half },
        { xMm: end.xMm - right.xMm * half, yMm: end.yMm - right.yMm * half },
        { xMm: end.xMm + right.xMm * half, yMm: end.yMm + right.yMm * half },
        { xMm: start.xMm + right.xMm * half, yMm: start.yMm + right.yMm * half },
      ];
      unnormalizedTreads.push({ kind: "straight", turnIndex: null, polygon, walkingGoingMm, innerChordMm: null, outerChordMm: null });
      position = end;
    }
  };
  const addTurn = (turnIndex: number) => {
    const right = { xMm: -Math.sin(heading), yMm: Math.cos(heading) };
    const center = { xMm: position.xMm + direction * walkingRadiusMm * right.xMm, yMm: position.yMm + direction * walkingRadiusMm * right.yMm };
    const startRadial = { xMm: position.xMm - center.xMm, yMm: position.yMm - center.yMm };
    for (let step = 0; step < input.windersPerTurn; step += 1) {
      const a0 = direction * step * stepAngleRadians;
      const a1 = direction * (step + 1) * stepAngleRadians;
      const rotate = (angle: number, radius: number): WinderPoint => ({
        xMm: center.xMm + radius * (startRadial.xMm * Math.cos(angle) - startRadial.yMm * Math.sin(angle)) / walkingRadiusMm,
        yMm: center.yMm + radius * (startRadial.xMm * Math.sin(angle) + startRadial.yMm * Math.cos(angle)) / walkingRadiusMm,
      });
      unnormalizedTreads.push({ kind: "winder", turnIndex, polygon: [rotate(a0, outerRadiusMm), rotate(a1, outerRadiusMm), rotate(a1, innerRadiusMm), rotate(a0, innerRadiusMm)], walkingGoingMm, innerChordMm, outerChordMm });
    }
    const final = direction * turnRadians;
    position = { xMm: center.xMm + startRadial.xMm * Math.cos(final) - startRadial.yMm * Math.sin(final), yMm: center.yMm + startRadial.xMm * Math.sin(final) + startRadial.yMm * Math.cos(final) };
    heading += final;
  };

  addStraight(input.lowerTreadCount);
  addTurn(1);
  if (input.layout === "three_flight") {
    addStraight(input.middleTreadCount!);
    addTurn(2);
  }
  addStraight(input.upperTreadCount);

  // Reject degenerate polygons and any positive-area tread intersection.
  for (let i = 0; i < unnormalizedTreads.length; i += 1) {
    if (area(unnormalizedTreads[i].polygon) <= 1e-7) throw new RangeError("A lépcsőterv nulla területű fokot tartalmaz.");
    for (let j = i + 1; j < unnormalizedTreads.length; j += 1) {
      if (polygonsHaveInteriorOverlap(unnormalizedTreads[i].polygon, unnormalizedTreads[j].polygon)) throw new RangeError("A megadott kiosztásban a fokok alaprajzi belső területe átfed.");
    }
  }

  const points = unnormalizedTreads.flatMap((tread) => tread.polygon);
  const minX = Math.min(...points.map((point) => point.xMm)); const maxX = Math.max(...points.map((point) => point.xMm));
  const minY = Math.min(...points.map((point) => point.yMm)); const maxY = Math.max(...points.map((point) => point.yMm));
  const shift = (point: WinderPoint): WinderPoint => ({ xMm: point.xMm - minX, yMm: point.yMm - minY });
  const treads: WinderTread[] = unnormalizedTreads.map((tread, index) => ({ ...tread, index: index + 1, levelMm: (index + 1) * riserHeightMm, polygon: tread.polygon.map(shift) }));
  const planWidthMm = maxX - minX; const planDepthMm = maxY - minY;
  if (input.openingLengthMm !== undefined && planWidthMm > input.openingLengthMm) throw new RangeError("A megadott tervhossz kisebb a lépcső számított alaprajzi kiterjedésénél.");
  if (input.openingWidthMm !== undefined && planDepthMm > input.openingWidthMm) throw new RangeError("A megadott tervszélesség kisebb a lépcső számított alaprajzi kiterjedésénél.");
  const developedWalkingRunMm = input.lowerTreadCount * walkingGoingMm + input.upperTreadCount * walkingGoingMm + (input.middleTreadCount ?? 0) * walkingGoingMm + winderCount * walkingGoingMm;
  const stepRuleMm = 2 * riserHeightMm + walkingGoingMm;
  const pitchDegrees = Math.atan2(input.totalRiseMm, developedWalkingRunMm) * 180 / Math.PI;
  const walkingPitchLengthMm = Math.hypot(input.totalRiseMm, developedWalkingRunMm);
  const treadSurfaceAreaM2 = treads.reduce((sum, tread) => sum + area(tread.polygon), 0) / 1_000_000;
  assertFiniteResult([riserHeightMm, walkingGoingMm, innerChordMm, outerChordMm, planWidthMm, planDepthMm, developedWalkingRunMm, stepRuleMm, pitchDegrees, walkingPitchLengthMm, treadSurfaceAreaM2, ...treads.flatMap((tread) => tread.polygon.flatMap((point) => [point.xMm, point.yMm, tread.levelMm]))]);
  return { layout: input.layout, turnDirection: input.turnDirection, turnDegrees, turns, totalRiseMm: input.totalRiseMm, stairWidthMm: input.stairWidthMm, innerRadiusMm, outerRadiusMm, walkingRadiusMm, lowerTreadCount: input.lowerTreadCount, middleTreadCount: input.middleTreadCount ?? 0, upperTreadCount: input.upperTreadCount, windersPerTurn: input.windersPerTurn, treadCount, riserCount, riserHeightMm, stepAngleDegrees, walkingGoingMm, stepRuleMm, pitchDegrees, walkingPitchLengthMm, treadSurfaceAreaM2, innerChordMm, outerChordMm, developedWalkingRunMm, planWidthMm, planDepthMm, treads };
}

export function winderTreadPolygonArea(polygon: readonly WinderPoint[]) { return area(polygon); }
export function winderTreadsOverlap(a: readonly WinderPoint[], b: readonly WinderPoint[]) { return polygonsHaveInteriorOverlap(a, b); }
export function winderPolygonIsConvex(polygon: readonly WinderPoint[]) {
  const signs = polygon.map((point, index) => cross(point, polygon[(index + 1) % polygon.length], polygon[(index + 2) % polygon.length])).filter((value) => Math.abs(value) > 1e-8).map(Math.sign);
  return signs.length > 0 && signs.every((sign) => sign === signs[0]);
}

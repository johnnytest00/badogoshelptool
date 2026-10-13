import { calculationError } from "@/domain/calculations/errors";

export type ProfilePoint = Readonly<{ xMm: number; yMm: number }>;
export type ProfileLine = Readonly<{ kind: "line"; id: string; start: ProfilePoint; end: ProfilePoint }>;
export type ProfileArc = Readonly<{
  kind: "arc"; id: string; start: ProfilePoint; end: ProfilePoint;
  center: ProfilePoint; radiusMm: number; startAngleRad: number; sweepRad: number;
}>;
export type ProfilePrimitive = ProfileLine | ProfileArc;
export type ProfileBounds = Readonly<{ minXmm: number; maxXmm: number; minYmm: number; maxYmm: number }>;
export type ProfileGeometry = Readonly<{
  coordinateConvention: "x-right-y-up";
  segments: readonly Readonly<{ id: string; tangentLengthMm: number; start: ProfilePoint; end: ProfilePoint; directionRad: number }>[];
  bends: readonly Readonly<{ id: string; entry: ProfilePoint; exit: ProfilePoint; center: ProfilePoint; signedTurnRad: number; innerArc: ProfileArc; outerArc: ProfileArc }>[];
  centerline: readonly ProfilePrimitive[];
  leftContour: readonly ProfilePrimitive[];
  rightContour: readonly ProfilePrimitive[];
  boundary: readonly ProfilePrimitive[];
  tangentPointsMm: readonly ProfilePoint[];
  boundsMm: ProfileBounds;
  selfIntersectionStatus: "clear";
}>;

export type GeometryInput = Readonly<{
  thicknessMm: number;
  straights: readonly Readonly<{ id: string; tangentLengthMm: number }>[];
  bends: readonly Readonly<{ id: string; signedTurnDeg: number; insideRadiusMm: number }>[];
}>;

// Numerical intersection tolerance, not a fabrication tolerance. Input dimensions must be >= 1e-6 mm.
export const PROFILE_GEOMETRY_EPS_MM = 1e-9;
export const MAX_PROFILE_EXTENT_MM = 1_000_000;

const point = (xMm: number, yMm: number): ProfilePoint => ({ xMm, yMm });
const add = (a: ProfilePoint, b: ProfilePoint): ProfilePoint => point(a.xMm + b.xMm, a.yMm + b.yMm);
const sub = (a: ProfilePoint, b: ProfilePoint): ProfilePoint => point(a.xMm - b.xMm, a.yMm - b.yMm);
const mul = (a: ProfilePoint, scalar: number): ProfilePoint => point(a.xMm * scalar, a.yMm * scalar);
const dot = (a: ProfilePoint, b: ProfilePoint): number => a.xMm * b.xMm + a.yMm * b.yMm;
const cross = (a: ProfilePoint, b: ProfilePoint): number => a.xMm * b.yMm - a.yMm * b.xMm;
const norm = (a: ProfilePoint): number => Math.hypot(a.xMm, a.yMm);
const leftNormal = (a: ProfilePoint): ProfilePoint => point(-a.yMm, a.xMm);
const direction = (radians: number): ProfilePoint => point(Math.cos(radians), Math.sin(radians));
const line = (id: string, start: ProfilePoint, end: ProfilePoint): ProfileLine => ({ kind: "line", id, start, end });

function checked(value: number, label: string): number {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_PROFILE_EXTENT_MM) {
    throw calculationError("NUMERIC_OVERFLOW", `${label} kívül esik a biztonságos profiltartományon.`);
  }
  return value;
}

function checkedPoint(value: ProfilePoint, label: string): ProfilePoint {
  checked(value.xMm, `${label}.x`);
  checked(value.yMm, `${label}.y`);
  return value;
}

function arc(id: string, center: ProfilePoint, radiusMm: number, startAngleRad: number, sweepRad: number): ProfileArc {
  const radial = direction(startAngleRad);
  const start = checkedPoint(add(center, mul(radial, radiusMm)), `${id}.start`);
  const end = checkedPoint(add(center, mul(direction(startAngleRad + sweepRad), radiusMm)), `${id}.end`);
  if (norm(sub(end, start)) <= PROFILE_GEOMETRY_EPS_MM * 10) {
    throw calculationError("INVALID_GEOMETRY", "A hajtási ív numerikusan összeesik; nagyobb sugár vagy elfordulás szükséges.", ["bends", id]);
  }
  return { kind: "arc", id, center, radiusMm, startAngleRad, sweepRad, start, end };
}

function reverse(primitive: ProfilePrimitive): ProfilePrimitive {
  if (primitive.kind === "line") return line(primitive.id, primitive.end, primitive.start);
  return { ...primitive, start: primitive.end, end: primitive.start, startAngleRad: primitive.startAngleRad + primitive.sweepRad, sweepRad: -primitive.sweepRad };
}

function onArc(arcValue: ProfileArc, p: ProfilePoint): boolean {
  const v = sub(p, arcValue.center);
  if (Math.abs(norm(v) - arcValue.radiusMm) > PROFILE_GEOMETRY_EPS_MM * 8) return false;
  const angle = Math.atan2(v.yMm, v.xMm);
  const full = 2 * Math.PI;
  const sweep = arcValue.sweepRad;
  const delta = sweep > 0
    ? ((angle - arcValue.startAngleRad) % full + full) % full
    : ((arcValue.startAngleRad - angle) % full + full) % full;
  const angularTolerance = PROFILE_GEOMETRY_EPS_MM / arcValue.radiusMm;
  return delta <= Math.abs(sweep) + angularTolerance || delta >= full - angularTolerance;
}

function lineLine(a: ProfileLine, b: ProfileLine): boolean {
  const r = sub(a.end, a.start), s = sub(b.end, b.start), q = sub(b.start, a.start);
  const denom = cross(r, s);
  const scale = norm(r) * norm(s);
  if (Math.abs(denom) <= PROFILE_GEOMETRY_EPS_MM * Math.max(norm(r), norm(s))) {
    if (Math.abs(cross(q, r)) > PROFILE_GEOMETRY_EPS_MM * norm(r)) return false;
    const rr = dot(r, r), u = dot(q, r) / rr, v = u + dot(s, r) / rr;
    return Math.max(0, Math.min(u, v)) <= Math.min(1, Math.max(u, v)) + PROFILE_GEOMETRY_EPS_MM / norm(r);
  }
  if (scale === 0) return false;
  const t = cross(q, s) / denom, u = cross(q, r) / denom;
  const tolerance = PROFILE_GEOMETRY_EPS_MM / Math.min(norm(r), norm(s));
  return t >= -tolerance && t <= 1 + tolerance && u >= -tolerance && u <= 1 + tolerance;
}

function lineArc(segment: ProfileLine, curve: ProfileArc): boolean {
  const d = sub(segment.end, segment.start), f = sub(segment.start, curve.center);
  const aa = dot(d, d), bb = 2 * dot(f, d), cc = dot(f, f) - curve.radiusMm ** 2;
  const discriminant = bb * bb - 4 * aa * cc;
  if (discriminant < -4 * PROFILE_GEOMETRY_EPS_MM * aa * Math.max(curve.radiusMm, norm(f))) return false;
  const root = Math.sqrt(Math.max(0, discriminant));
  return [(-bb - root) / (2 * aa), (-bb + root) / (2 * aa)].some((t) =>
    t >= -PROFILE_GEOMETRY_EPS_MM / norm(d) && t <= 1 + PROFILE_GEOMETRY_EPS_MM / norm(d) && onArc(curve, add(segment.start, mul(d, t))));
}

function arcArc(a: ProfileArc, b: ProfileArc): boolean {
  const delta = sub(b.center, a.center), d = norm(delta);
  if (d <= PROFILE_GEOMETRY_EPS_MM && Math.abs(a.radiusMm - b.radiusMm) <= PROFILE_GEOMETRY_EPS_MM) {
    return [a.start, a.end].some((p) => onArc(b, p)) || [b.start, b.end].some((p) => onArc(a, p));
  }
  if (d <= PROFILE_GEOMETRY_EPS_MM || d > a.radiusMm + b.radiusMm + PROFILE_GEOMETRY_EPS_MM || d < Math.abs(a.radiusMm - b.radiusMm) - PROFILE_GEOMETRY_EPS_MM) return false;
  const along = (a.radiusMm ** 2 - b.radiusMm ** 2 + d ** 2) / (2 * d);
  const heightSquared = a.radiusMm ** 2 - along ** 2;
  if (heightSquared < -PROFILE_GEOMETRY_EPS_MM * Math.max(a.radiusMm, b.radiusMm)) return false;
  const unit = mul(delta, 1 / d), base = add(a.center, mul(unit, along));
  const side = mul(leftNormal(unit), Math.sqrt(Math.max(0, heightSquared)));
  return [add(base, side), sub(base, side)].some((p) => onArc(a, p) && onArc(b, p));
}

function intersects(a: ProfilePrimitive, b: ProfilePrimitive): boolean {
  if (a.kind === "line" && b.kind === "line") return lineLine(a, b);
  if (a.kind === "line" && b.kind === "arc") return lineArc(a, b);
  if (a.kind === "arc" && b.kind === "line") return lineArc(b, a);
  return arcArc(a as ProfileArc, b as ProfileArc);
}

function assertSimpleBoundary(boundary: readonly ProfilePrimitive[]): void {
  for (let i = 0; i < boundary.length; i++) {
    for (let j = i + 1; j < boundary.length; j++) {
      if (j === i + 1 || (i === 0 && j === boundary.length - 1)) continue;
      if (intersects(boundary[i], boundary[j])) {
        throw calculationError("INVALID_GEOMETRY", "A profil anyagkontúrja önmagát metszi vagy érinti.", ["geometry"]);
      }
    }
  }
}

function boundsOf(boundary: readonly ProfilePrimitive[]): ProfileBounds {
  const points: ProfilePoint[] = [];
  for (const primitive of boundary) {
    points.push(primitive.start, primitive.end);
    if (primitive.kind === "arc") {
      for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const candidate = add(primitive.center, mul(direction(angle), primitive.radiusMm));
        if (onArc(primitive, candidate)) points.push(candidate);
      }
    }
  }
  return {
    minXmm: checked(Math.min(...points.map((p) => p.xMm)), "bounds.minX"),
    maxXmm: checked(Math.max(...points.map((p) => p.xMm)), "bounds.maxX"),
    minYmm: checked(Math.min(...points.map((p) => p.yMm)), "bounds.minY"),
    maxYmm: checked(Math.max(...points.map((p) => p.yMm)), "bounds.maxY"),
  };
}

export function buildProfileGeometry(input: GeometryInput): ProfileGeometry {
  const centerline: ProfilePrimitive[] = [], leftContour: ProfilePrimitive[] = [], rightContour: ProfilePrimitive[] = [];
  const segments: ProfileGeometry["segments"][number][] = [], bends: ProfileGeometry["bends"][number][] = [];
  const tangentPointsMm: ProfilePoint[] = [];
  let current = point(0, 0), heading = 0;
  for (let index = 0; index < input.straights.length; index++) {
    const straight = input.straights[index], dir = direction(heading), normal = leftNormal(dir);
    const end = checkedPoint(add(current, mul(dir, straight.tangentLengthMm)), `${straight.id}.end`);
    centerline.push(line(straight.id, current, end));
    leftContour.push(line(straight.id, checkedPoint(add(current, mul(normal, input.thicknessMm / 2)), `${straight.id}.leftStart`), checkedPoint(add(end, mul(normal, input.thicknessMm / 2)), `${straight.id}.leftEnd`)));
    rightContour.push(line(straight.id, checkedPoint(sub(current, mul(normal, input.thicknessMm / 2)), `${straight.id}.rightStart`), checkedPoint(sub(end, mul(normal, input.thicknessMm / 2)), `${straight.id}.rightEnd`)));
    segments.push({ id: straight.id, tangentLengthMm: straight.tangentLengthMm, start: current, end, directionRad: heading });
    tangentPointsMm.push(end);
    if (index === input.bends.length) break;
    const bend = input.bends[index], signedTurnRad = bend.signedTurnDeg * Math.PI / 180;
    const sign = Math.sign(signedTurnRad), midRadius = bend.insideRadiusMm + input.thicknessMm / 2;
    const center = checkedPoint(add(end, mul(normal, sign * midRadius)), `${bend.id}.center`);
    const radial = sub(end, center), startAngleRad = Math.atan2(radial.yMm, radial.xMm);
    const middleArc = arc(bend.id, center, midRadius, startAngleRad, signedTurnRad);
    const leftRadius = midRadius - sign * input.thicknessMm / 2;
    const rightRadius = midRadius + sign * input.thicknessMm / 2;
    const leftArc = arc(bend.id, center, leftRadius, startAngleRad, signedTurnRad);
    const rightArc = arc(bend.id, center, rightRadius, startAngleRad, signedTurnRad);
    centerline.push(middleArc); leftContour.push(leftArc); rightContour.push(rightArc);
    bends.push({ id: bend.id, entry: end, exit: middleArc.end, center, signedTurnRad,
      innerArc: sign > 0 ? leftArc : rightArc, outerArc: sign > 0 ? rightArc : leftArc });
    tangentPointsMm.push(middleArc.end);
    current = middleArc.end; heading += signedTurnRad;
  }
  const leftStart = leftContour[0].start, rightStart = rightContour[0].start;
  const leftEnd = leftContour[leftContour.length - 1].end, rightEnd = rightContour[rightContour.length - 1].end;
  const boundary = [...leftContour, line("end-cap", leftEnd, rightEnd), ...rightContour.slice().reverse().map(reverse), line("start-cap", rightStart, leftStart)];
  assertSimpleBoundary(boundary);
  return { coordinateConvention: "x-right-y-up", segments, bends, centerline, leftContour, rightContour, boundary,
    tangentPointsMm, boundsMm: boundsOf(boundary), selfIntersectionStatus: "clear" };
}

import { z } from "zod";
import type { RoofGeometry, RoofGeometryPlane, RoofPoint } from "./roof-geometry";

const mm = z.number().int().min(0).max(100_000);
const positiveMm = z.number().int().positive().max(100_000);
const persistedMm = z.number().finite().min(0).max(100_000);
export const roofTimberParametersSchema = z.object({
  rafterMaxSpacingMm: persistedMm.optional(), rafterStartInsetMm: persistedMm.optional(), rafterEndInsetMm: persistedMm.optional(), rafterSectionWidthMm: persistedMm.optional(), rafterSectionHeightMm: persistedMm.optional(),
  battenMaxSpacingMm: persistedMm.optional(), battenStartInsetMm: persistedMm.optional(), battenEndInsetMm: persistedMm.optional(), battenSectionWidthMm: persistedMm.optional(), battenSectionHeightMm: persistedMm.optional(),
}).strict().superRefine((value, context) => {
  for (const key of ["rafterMaxSpacingMm", "rafterSectionWidthMm", "rafterSectionHeightMm", "battenMaxSpacingMm", "battenSectionWidthMm", "battenSectionHeightMm"] as const) {
    if (value[key] !== undefined && value[key] <= 0) context.addIssue({ code: "custom", path: [key], message: "A tengelytávolság és a keresztmetszet mérete legyen pozitív." });
  }
  for (const [key, dimension] of Object.entries(value)) if (dimension !== undefined && !Number.isInteger(dimension)) context.addIssue({ code: "custom", path: [key], message: "A kiosztási méreteket egész milliméterben add meg." });
});
export type RoofTimberParameters = z.infer<typeof roofTimberParametersSchema>;
export const roofTimberFamilyInputSchema = z.object({
  maxSpacingMm: positiveMm,
  startInsetMm: mm,
  endInsetMm: mm,
  sectionWidthMm: positiveMm.optional(),
  sectionHeightMm: positiveMm.optional(),
}).strict().superRefine((value, context) => {
  if ((value.sectionWidthMm === undefined) !== (value.sectionHeightMm === undefined)) context.addIssue({ code: "custom", message: "A térfogathoz a keresztmetszet mindkét mérete szükséges." });
});
export const roofTimberInputSchema = z.object({ rafter: roofTimberFamilyInputSchema.optional(), batten: roofTimberFamilyInputSchema.optional() }).strict().refine((value) => Boolean(value.rafter || value.batten), "Legalább egy kiosztást adj meg.");
export type RoofTimberFamilyInput = z.infer<typeof roofTimberFamilyInputSchema>;
export type RoofTimberInput = z.infer<typeof roofTimberInputSchema>;
export type RoofTimberSegment = Readonly<{ id: string; planeId: string; start: RoofPoint; end: RoofPoint; lengthMm: number }>;
export type RoofTimberFamilyResult = Readonly<{ count: number; positionsMm: readonly number[]; actualSpacingMm: number | null; planeLayouts: readonly Readonly<{ planeId: string; count: number; positionsMm: readonly number[]; actualSpacingMm: number }>[]; totalLengthMm: number; totalLengthM: number; sectionAreaMm2: number | null; nominalVolumeM3: number | null; segments: readonly RoofTimberSegment[] }>;
export type RoofTimberLayout = Readonly<{
  status: "available";
  quantityClassification: "verified-geometric-quantity";
  physicalLayout: Readonly<{ status: "unsupported"; reason: string }>;
  assumptions: readonly string[];
  rafters: RoofTimberFamilyResult | null;
  battens: RoofTimberFamilyResult | null;
}>;
export type RoofTimberUnavailable = Readonly<{ status: "unavailable"; reason: string }>;

export function roofTimberInputFromParameters(value: RoofTimberParameters): RoofTimberInput | null {
  const family = (prefix: "rafter" | "batten") => {
    const maxSpacingMm = value[`${prefix}MaxSpacingMm`], startInsetMm = value[`${prefix}StartInsetMm`], endInsetMm = value[`${prefix}EndInsetMm`];
    const sectionWidthMm = value[`${prefix}SectionWidthMm`], sectionHeightMm = value[`${prefix}SectionHeightMm`];
    if (maxSpacingMm === undefined || startInsetMm === undefined || endInsetMm === undefined) return undefined;
    return { maxSpacingMm, startInsetMm, endInsetMm, ...(sectionWidthMm === undefined || sectionHeightMm === undefined ? {} : { sectionWidthMm, sectionHeightMm }) };
  };
  const rafter = family("rafter"), batten = family("batten");
  return rafter || batten ? { ...(rafter ? { rafter } : {}), ...(batten ? { batten } : {}) } : null;
}

type V2 = { x: number; y: number };
type Basis = { t: V2; u: V2; gx: number; gy: number; c: number };
type PlaneGroup = { id: string; planes: RoofGeometryPlane[]; basis: Basis; minT: number; maxT: number; minU: number; maxU: number };
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const sourceId = (id: string) => id.replace(/-\d+$/, "");
function planeBasis(plane: RoofGeometryPlane): Basis | null {
  let selected: [RoofPoint, RoofPoint, RoofPoint] | null = null;
  let determinant = 0;
  for (let i = 0; i < plane.vertices.length && !selected; i++) for (let j = i + 1; j < plane.vertices.length && !selected; j++) for (let k = j + 1; k < plane.vertices.length && !selected; k++) {
    const a = plane.vertices[i], b = plane.vertices[j], c = plane.vertices[k];
    const area2 = (b.xMm - a.xMm) * (c.yMm - a.yMm) - (c.xMm - a.xMm) * (b.yMm - a.yMm);
    if (Math.abs(area2) > 1e-8) { selected = [a, b, c]; determinant = area2; }
  }
  if (!selected) return null;
  const [a, b, c] = selected;
  const dx1 = b.xMm - a.xMm, dy1 = b.yMm - a.yMm, dz1 = b.zMm - a.zMm;
  const dx2 = c.xMm - a.xMm, dy2 = c.yMm - a.yMm, dz2 = c.zMm - a.zMm;
  const gx = (dz1 * dy2 - dz2 * dy1) / determinant;
  const gy = (dx1 * dz2 - dx2 * dz1) / determinant;
  const magnitude = Math.hypot(gx, gy);
  if (!Number.isFinite(magnitude) || magnitude < 1e-8) return null;
  const u = { x: gx / magnitude, y: gy / magnitude };
  let t = { x: -u.y, y: u.x };
  if (t.x < -1e-8 || (Math.abs(t.x) <= 1e-8 && t.y < 0)) t = { x: -t.x, y: -t.y };
  return { t, u, gx, gy, c: a.zMm - gx * a.xMm - gy * a.yMm };
}
const coord = (p: RoofPoint, axis: V2) => p.xMm * axis.x + p.yMm * axis.y;
function makeGroups(geometry: RoofGeometry): PlaneGroup[] | null {
  const grouped = new Map<string, { planes: RoofGeometryPlane[]; basis: Basis }>();
  for (const plane of geometry.planes) {
    const basis = planeBasis(plane);
    if (!basis) return null;
    const id = sourceId(plane.id);
    const group = grouped.get(id);
    if (group) {
      if (!near(group.basis.gx, basis.gx) || !near(group.basis.gy, basis.gy) || !near(group.basis.c, basis.c)) return null;
      group.planes.push(plane);
    } else grouped.set(id, { basis, planes: [plane] });
  }
  return [...grouped].map(([id, { planes, basis }]) => {
    const points = planes.flatMap((plane) => plane.vertices);
    const ts = points.map((p) => coord(p, basis.t)), us = points.map((p) => coord(p, basis.u));
    return { id, planes, basis, minT: Math.min(...ts), maxT: Math.max(...ts), minU: Math.min(...us), maxU: Math.max(...us) };
  });
}
function lineInterval(plane: RoofGeometryPlane, basis: Basis, axis: "t" | "u", at: number): [number, number] | null {
  const fixedAxis = basis[axis];
  const alongAxis = axis === "t" ? basis.u : basis.t;
  const intersections: number[] = [];
  for (let i = 0; i < plane.vertices.length; i++) {
    const a = plane.vertices[i], b = plane.vertices[(i + 1) % plane.vertices.length];
    const ca = coord(a, fixedAxis), cb = coord(b, fixedAxis);
    if (near(ca, at)) intersections.push(coord(a, alongAxis));
    if ((at > Math.min(ca, cb) + 1e-7) && (at < Math.max(ca, cb) - 1e-7)) {
      const ratio = (at - ca) / (cb - ca);
      intersections.push(coord(a, alongAxis) + ratio * (coord(b, alongAxis) - coord(a, alongAxis)));
    }
  }
  const unique = intersections.filter((item, index) => !intersections.slice(0, index).some((other) => near(item, other))).sort((a, b) => a - b);
  return unique.length >= 2 && unique[unique.length - 1] - unique[0] > 1e-6 ? [unique[0], unique[unique.length - 1]] : null;
}
function mergeIntervals(intervals: [number, number][]): [number, number][] {
  const sorted = intervals.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (previous && interval[0] <= previous[1] + 1e-6) previous[1] = Math.max(previous[1], interval[1]);
    else merged.push([...interval]);
  }
  return merged;
}
function positions(min: number, max: number, input: RoofTimberFamilyInput): { values: number[]; actual: number } | null {
  const start = min + input.startInsetMm, end = max - input.endInsetMm, span = end - start;
  if (!(span > 1e-6)) return null;
  const intervals = Math.ceil(span / input.maxSpacingMm);
  if (!Number.isSafeInteger(intervals) || intervals < 1 || intervals > 2_000) return null;
  const actual = span / intervals;
  return { values: Array.from({ length: intervals + 1 }, (_, index) => start + actual * index), actual };
}
function pointAt(group: PlaneGroup, t: number, u: number): RoofPoint {
  const { basis } = group;
  const xMm = basis.t.x * t + basis.u.x * u, yMm = basis.t.y * t + basis.u.y * u;
  return { xMm, yMm, zMm: basis.gx * xMm + basis.gy * yMm + basis.c };
}
function calculateFamily(groups: readonly PlaneGroup[], input: RoofTimberFamilyInput, axis: "t" | "u"): RoofTimberFamilyResult | null {
  const segments: RoofTimberSegment[] = [];
  const positionsUsed: number[] = [];
  const planeLayouts: { planeId: string; count: number; positionsMm: number[]; actualSpacingMm: number }[] = [];
  const seenPlacements = new Set<string>();
  for (const group of groups) {
    const axisScale = axis === "u" ? Math.hypot(1, group.basis.gx, group.basis.gy) : 1;
    const placedInput = axisScale === 1 ? input : { ...input, maxSpacingMm: input.maxSpacingMm / axisScale, startInsetMm: input.startInsetMm / axisScale, endInsetMm: input.endInsetMm / axisScale };
    const from = axis === "t" ? group.minT : group.minU;
    const to = axis === "t" ? group.maxT : group.maxU;
    const layout = positions(from, to, placedInput);
    if (!layout) return null;
    const groupPositions: number[] = [];
    for (const position of layout.values) {
      const intervals = mergeIntervals(group.planes.map((plane) => lineInterval(plane, group.basis, axis, position)).filter((value): value is [number, number] => value !== null));
      const placedSegments: RoofTimberSegment[] = [];
      intervals.forEach(([startAlong, endAlong], index) => {
        const start = axis === "t" ? pointAt(group, position, startAlong) : pointAt(group, startAlong, position);
        const end = axis === "t" ? pointAt(group, position, endAlong) : pointAt(group, endAlong, position);
        const lengthMm = Math.hypot(end.xMm - start.xMm, end.yMm - start.yMm, end.zMm - start.zMm);
        if (lengthMm > 1e-6) placedSegments.push({ id: `${group.id}:${Math.round(position)}:${index}`, planeId: group.id, start, end, lengthMm });
      });
      const pointKey = (point: RoofPoint) => `${point.xMm.toFixed(5)},${point.yMm.toFixed(5)},${point.zMm.toFixed(5)}`;
      const placementKey = placedSegments.map((segment) => [pointKey(segment.start), pointKey(segment.end)].sort().join("|")) .sort().join("||");
      if (placedSegments.length && !seenPlacements.has(placementKey)) {
        seenPlacements.add(placementKey);
        segments.push(...placedSegments);
        const placedPosition = Math.round(position * axisScale * 1e6) / 1e6;
        positionsUsed.push(placedPosition);
        groupPositions.push(placedPosition);
        if (positionsUsed.length > 2_000) return null;
      }
    }
    if (groupPositions.length) planeLayouts.push({ planeId: group.id, count: groupPositions.length, positionsMm: groupPositions, actualSpacingMm: layout.actual * axisScale });
  }
  if (!segments.length) return null;
  const totalLengthMm = segments.reduce((sum, segment) => sum + segment.lengthMm, 0);
  const sectionAreaMm2 = input.sectionWidthMm !== undefined && input.sectionHeightMm !== undefined ? input.sectionWidthMm * input.sectionHeightMm : null;
  const spacings = planeLayouts.map((layout) => layout.actualSpacingMm);
  const uniformSpacing = spacings.every((spacing) => near(spacing, spacings[0]));
  return { count: positionsUsed.length, positionsMm: positionsUsed.sort((a, b) => a - b), actualSpacingMm: uniformSpacing ? spacings[0] : null, planeLayouts, totalLengthMm, totalLengthM: totalLengthMm / 1000, sectionAreaMm2, nominalVolumeM3: sectionAreaMm2 === null ? null : totalLengthMm * sectionAreaMm2 / 1_000_000_000, segments };
}

/** Geometric layout on the validated, closed roof polygons. This does not design framing. */
export function calculateRoofTimberLayout(geometry: RoofGeometry, raw: RoofTimberInput): RoofTimberLayout | RoofTimberUnavailable {
  const parsed = roofTimberInputSchema.safeParse(raw);
  if (!parsed.success) return { status: "unavailable", reason: parsed.error.issues.map((issue) => issue.message).join(" ") };
  const groups = makeGroups(geometry);
  if (!groups) return { status: "unavailable", reason: "A tetősíkok közös, folytonos lejtésiránya nem határozható meg egyértelműen." };
  if (groups.some((group) => group.planes.some((plane) => plane.vertices.length < 3))) return { status: "unavailable", reason: "Hiányos tetősík-polygon." };
  const rafters = parsed.data.rafter ? calculateFamily(groups, parsed.data.rafter, "t") : null;
  if (parsed.data.rafter && !rafters) return { status: "unavailable", reason: "A szarufakiosztás túl sűrű, vagy a peremsáv nem fér el minden tetősíkon." };
  const battens = parsed.data.batten ? calculateFamily(groups, parsed.data.batten, "u") : null;
  if (parsed.data.batten && !battens) return { status: "unavailable", reason: "A léckiosztás túl sűrű, vagy a peremsáv nem fér el minden tetősíkon." };
  return {
    status: "available",
    quantityClassification: "verified-geometric-quantity",
    physicalLayout: {
      status: "unsupported",
      reason: "A bemenet nem határozza meg, hogy az egybeeső vagy megszakított geometriai tengelyek a kivitelezésben egy vagy több fizikai faelemet alkotnak-e.",
    },
    rafters,
    battens,
    assumptions: [
      "Minden hely a tetősík határpoligonjának vetített koordinátáiból, egyenletes kiosztással adódik.",
      "A megadott tengelytávolság felső korlát; a két peremsáv között a tényleges osztás egyenletes.",
      "A geometriai vonalhossz a tetősík polygonjával vágott háromdimenziós szakaszok egyedi összegéből adódik.",
      "Nincs nyílásmodell, vágási veszteség, toldás, túlnyúlás- vagy csomóponti levonás; fizikai darabszám és statikai terv nem állítható elő.",
    ],
  };
}

import { z } from "zod";
import { calculateGableRoof, gableRoofInputSchema, type GableRoofInput } from "./gable-roof";

const dimension = z.number().int().positive().max(100_000);
const nonNegativeDimension = z.number().int().nonnegative().max(100_000);
export const pitch = z.number().finite().positive().lt(80);
const rectangle = { lengthMm: dimension, widthMm: dimension, pitchDegrees: pitch };
export const roofGeometryTypeSchema = z.enum(["gable", "shed", "hip", "pyramid", "halfHip", "lShape", "tShape", "mansard"]);

export const roofGeometryInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("gable"), geometry: gableRoofInputSchema }),
  z.object({ type: z.literal("shed"), ...rectangle, eaveOverhangMm: nonNegativeDimension.optional() }),
  z.object({ type: z.literal("hip"), ...rectangle }).refine((value) => value.lengthMm > value.widthMm, "A kontyolt tető hossza legyen nagyobb a szélességénél."),
  z.object({ type: z.literal("pyramid"), sideMm: dimension, pitchDegrees: pitch }),
  z.object({ type: z.literal("halfHip"), ...rectangle, hipEaveHeightMm: dimension }).refine((value) => value.lengthMm > value.widthMm && value.hipEaveHeightMm < value.widthMm / 2 * Math.tan(value.pitchDegrees * Math.PI / 180), "A félkonty nem fér el a megadott tetőn."),
  z.object({ type: z.literal("lShape"), ...rectangle, wingWidthMm: dimension, wingProjectionMm: dimension }).refine((value) => value.wingWidthMm < Math.min(value.lengthMm, value.widthMm), "A szárny szélessége legyen kisebb a főtető méreteinél."),
  z.object({ type: z.literal("tShape"), ...rectangle, wingWidthMm: dimension, wingProjectionMm: dimension }).refine((value) => value.wingWidthMm < Math.min(value.lengthMm, value.widthMm), "A szárny szélessége legyen kisebb a főtető méreteinél."),
  z.object({ type: z.literal("mansard"), lengthMm: dimension, widthMm: dimension, lowerRunMm: dimension, lowerRiseMm: dimension, upperRiseMm: dimension })
    .refine((value) => value.lowerRunMm * 2 < value.widthMm, "Az alsó szakasz vízszintes futása legyen kisebb a tető fél szélességénél.")
    .refine((value) => value.lowerRiseMm / value.lowerRunMm > value.upperRiseMm / (value.widthMm / 2 - value.lowerRunMm), "A manzárd alsó szakasza legyen meredekebb a felsőnél."),
]);

export type RoofGeometryInput = z.infer<typeof roofGeometryInputSchema>;
export type RoofGeometryType = RoofGeometryInput["type"];
export type RoofPoint = Readonly<{ xMm: number; yMm: number; zMm: number }>;
export type RoofGeometryPlane = Readonly<{ id: string; areaMm2: number; projectedAreaMm2: number; vertices: readonly RoofPoint[]; pitchDegrees: number }>;
export type RoofGeometryEdge = Readonly<{ id: string; kind: "eave" | "upper" | "ridge" | "rake" | "hip" | "valley" | "break"; start: RoofPoint; end: RoofPoint; lengthMm: number; adjacentPlaneIds: readonly string[] }>;
export type RoofGeometry = Readonly<{ type: RoofGeometryType; modelVersion: "1.0.0"; planes: readonly RoofGeometryPlane[]; edges: readonly RoofGeometryEdge[]; totalAreaMm2: number; projectedAreaMm2: number }>;

const pointSchema = z.object({ xMm: z.number().finite(), yMm: z.number().finite(), zMm: z.number().finite() });
export const roofGeometryOutputSchema: z.ZodType<RoofGeometry> = z.object({
  type: z.enum(["gable", "shed", "hip", "pyramid", "halfHip", "lShape", "tShape", "mansard"]),
  modelVersion: z.literal("1.0.0"),
  planes: z.array(z.object({ id: z.string().min(1), areaMm2: z.number().finite().positive(), projectedAreaMm2: z.number().finite().positive(), pitchDegrees: z.number().finite(), vertices: z.array(pointSchema).min(3) })).min(1),
  edges: z.array(z.object({ id: z.string().min(1), kind: z.enum(["eave", "upper", "ridge", "rake", "hip", "valley", "break"]), start: pointSchema, end: pointSchema, lengthMm: z.number().finite().positive(), adjacentPlaneIds: z.array(z.string().min(1)).min(1).max(2) })),
  totalAreaMm2: z.number().finite().positive(), projectedAreaMm2: z.number().finite().positive(),
});

type P = { x: number; y: number };
type Surface = { id: string; ax: number; by: number; c: number; x0: number; x1: number; y0: number; y1: number };
type Patch = { surface: Surface; points: P[] };
const EPS = 1e-7;
const height = (s: Surface, p: P) => s.ax * p.x + s.by * p.y + s.c;
const same = (a: number, b: number) => Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
const signedArea = (poly: readonly P[]) => poly.reduce((sum, p, i) => { const q = poly[(i + 1) % poly.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2;
const contains = (s: Surface, p: P) => p.x >= s.x0 - EPS && p.x <= s.x1 + EPS && p.y >= s.y0 - EPS && p.y <= s.y1 + EPS;
const uniqueSorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

function clip(poly: readonly P[], ax: number, by: number, c: number): P[] {
  const result: P[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const fa = ax * a.x + by * a.y + c, fb = ax * b.x + by * b.y + c;
    const insideA = fa >= -EPS, insideB = fb >= -EPS;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = fa / (fa - fb);
      result.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return result.filter((p, i) => !result.slice(0, i).some((q) => same(p.x, q.x) && same(p.y, q.y)));
}

function partition(surfaces: readonly Surface[], rule: "min" | "max"): Patch[] {
  const xs = uniqueSorted(surfaces.flatMap((s) => [s.x0, s.x1]));
  const ys = uniqueSorted(surfaces.flatMap((s) => [s.y0, s.y1]));
  const patches: Patch[] = [];
  for (let xi = 0; xi < xs.length - 1; xi++) for (let yi = 0; yi < ys.length - 1; yi++) {
    const x0 = xs[xi], x1 = xs[xi + 1], y0 = ys[yi], y1 = ys[yi + 1];
    const active = surfaces.filter((s) => contains(s, { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }));
    const groups = rule === "min" ? [active] : [active.filter((s) => s.id.startsWith("main-")), active.filter((s) => s.id.startsWith("wing-"))].filter((group) => group.length);
    const choices = groups.reduce<Surface[][]>((current, group) => current.flatMap((choice) => group.map((surface) => [...choice, surface])), [[]]);
    for (const selected of choices) {
      let cell: P[] = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
      for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const surface = selected[groupIndex];
        for (const other of groups[groupIndex]) {
          if (other === surface || cell.length < 3) continue;
          cell = clip(cell, other.ax - surface.ax, other.by - surface.by, other.c - surface.c);
        }
      }
      for (const surface of selected) {
        let poly = cell;
        if (rule === "max") for (const other of selected) {
          if (other === surface || poly.length < 3) continue;
          poly = clip(poly, surface.ax - other.ax, surface.by - other.by, surface.c - other.c);
        }
        if (poly.length >= 3 && Math.abs(signedArea(poly)) > EPS) patches.push({ surface, points: poly });
      }
    }
  }
  return patches;
}

function surfacesFor(input: Exclude<RoofGeometryInput, { type: "gable" }>): { surfaces: Surface[]; rule: "min" | "max" } {
  const m = input.type === "mansard" ? 0 : Math.tan(input.pitchDegrees * Math.PI / 180);
  const length = input.type === "pyramid" ? input.sideMm : input.lengthMm;
  const width = input.type === "pyramid" ? input.sideMm : input.widthMm;
  const base = (id: string, ax: number, by: number, c: number, x0 = 0, x1 = length, y0 = 0, y1 = width): Surface => ({ id, ax, by, c, x0, x1, y0, y1 });
  if (input.type === "shed") return { rule: "min", surfaces: [base("shed-plane", 0, m, 0, 0, length, -(input.eaveOverhangMm ?? 0), width)] };
  if (input.type === "mansard") {
    const lower = input.lowerRiseMm / input.lowerRunMm;
    const upper = input.upperRiseMm / (width / 2 - input.lowerRunMm);
    const breakHeight = input.lowerRiseMm;
    // The steep skirt and the shallow top are both full planes; their lower envelope is the mansard.
    return { rule: "min", surfaces: [
      base("lower-south", 0, lower, 0), base("lower-north", 0, -lower, lower * width),
      base("main-south", 0, upper, breakHeight - upper * input.lowerRunMm), base("main-north", 0, -upper, breakHeight + upper * (width - input.lowerRunMm)),
    ] };
  }
  const main = [base("main-south", 0, m, 0), base("main-north", 0, -m, m * width)];
  if (input.type === "hip" || input.type === "pyramid") return { rule: "min", surfaces: [...main, base("west-hip", m, 0, 0), base("east-hip", -m, 0, m * length)] };
  if (input.type === "halfHip") return { rule: "min", surfaces: [...main, base("west-half-hip", m, 0, input.hipEaveHeightMm), base("east-half-hip", -m, 0, m * length + input.hipEaveHeightMm)] };
  const wingX0 = input.type === "lShape" ? 0 : (length - input.wingWidthMm) / 2;
  const wingX1 = wingX0 + input.wingWidthMm;
  const wingY0 = -input.wingProjectionMm;
  const wingY1 = width / 2;
  return { rule: "max", surfaces: [
    ...main,
    base("wing-west", m, 0, -m * wingX0, wingX0, wingX1, wingY0, wingY1),
    base("wing-east", -m, 0, m * wingX1, wingX0, wingX1, wingY0, wingY1),
  ] };
}

type RawEdge = { start: P; end: P; surface: Surface; planeId: string };
function onSegment(p: P, a: P, b: P): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  const dot = (p.x - a.x) * (p.x - b.x) + (p.y - a.y) * (p.y - b.y);
  return Math.abs(cross) <= EPS * Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)) && dot <= EPS;
}
const pointKey = (p: P) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
function edgesFromPatches(patches: readonly Patch[], rule: "min" | "max"): RoofGeometryEdge[] {
  const raw: RawEdge[] = patches.flatMap(({ surface, points }, index) => points.map((start, i) => ({ start, end: points[(i + 1) % points.length], surface, planeId: `${surface.id}-${index}` })));
  const vertices = raw.flatMap((edge) => [edge.start, edge.end]);
  const split = new Map<string, { start: P; end: P; members: Map<string, Surface> }>();
  for (const edge of raw) {
    const points = vertices.filter((p) => onSegment(p, edge.start, edge.end));
    const dx = edge.end.x - edge.start.x, dy = edge.end.y - edge.start.y;
    points.sort((a, b) => ((a.x - edge.start.x) * dx + (a.y - edge.start.y) * dy) - ((b.x - edge.start.x) * dx + (b.y - edge.start.y) * dy));
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      if (same(a.x, b.x) && same(a.y, b.y)) continue;
      const [start, end] = pointKey(a) < pointKey(b) ? [a, b] : [b, a];
      const key = `${pointKey(start)}:${pointKey(end)}`;
      const existing = split.get(key);
      if (existing) existing.members.set(edge.planeId, edge.surface);
      else split.set(key, { start, end, members: new Map([[edge.planeId, edge.surface]]) });
    }
  }
  const edges: RoofGeometryEdge[] = [];
  for (const [key, edge] of split) {
    const members = [...edge.members];
    const surfaces = members.map(([, surface]) => surface);
    if (surfaces.length > 2) throw new Error(`Non-manifold roof edge: ${key}`);
    if (surfaces.length === 2 && surfaces[0].id === surfaces[1].id) continue;
    const start: RoofPoint = { xMm: edge.start.x, yMm: edge.start.y, zMm: height(surfaces[0], edge.start) };
    const end: RoofPoint = { xMm: edge.end.x, yMm: edge.end.y, zMm: height(surfaces[0], edge.end) };
    if (surfaces.length === 2 && (!same(start.zMm, height(surfaces[1], edge.start)) || !same(end.zMm, height(surfaces[1], edge.end)))) throw new Error(`Discontinuous roof edge: ${key}`);
    let kind: RoofGeometryEdge["kind"];
    if (surfaces.length === 1) kind = same(start.zMm, end.zMm) ? surfaces[0].id === "shed-plane" && start.zMm > EPS ? "upper" : "eave" : "rake";
    else if (rule === "max" && surfaces[0].id.split("-")[0] !== surfaces[1].id.split("-")[0]) kind = "valley";
    else if (surfaces.some((surface) => surface.id.startsWith("lower-")) && surfaces.some((surface) => surface.id.startsWith("main-"))) kind = "break";
    else if ((surfaces[0].id === "main-south" && surfaces[1].id === "main-north") || (surfaces[1].id === "main-south" && surfaces[0].id === "main-north") || (surfaces[0].id.startsWith("wing-") && surfaces[1].id.startsWith("wing-"))) kind = "ridge";
    else kind = "hip";
    edges.push({ id: `${kind}:${key}`, kind, start, end, lengthMm: Math.hypot(end.xMm - start.xMm, end.yMm - start.yMm, end.zMm - start.zMm), adjacentPlaneIds: members.map(([id]) => id).sort() });
  }
  return edges.sort((a, b) => a.id.localeCompare(b.id));
}

export function calculateRoofGeometry(raw: RoofGeometryInput): RoofGeometry {
  const input = roofGeometryInputSchema.parse(raw);
  if (input.type === "gable") {
    const result = calculateGableRoof(input.geometry as GableRoofInput);
    const planes = result.planes.map((plane) => ({ id: `${plane.side}-plane`, areaMm2: plane.areaMm2, projectedAreaMm2: plane.areaMm2 * Math.cos(result.angles.pitchRadians), pitchDegrees: result.angles.pitchDegrees, vertices: plane.vertices }));
    const startX = -input.geometry.frontGableOverhangMm;
    const endX = input.geometry.buildingLengthMm + input.geometry.rearGableOverhangMm;
    const run = result.dimensions.horizontalSlopeRunMm;
    const rise = result.heights.roofRiseMm;
    const eave = result.heights.eaveLevelMm;
    const edge = (id: string, kind: RoofGeometryEdge["kind"], a: RoofPoint, b: RoofPoint, adjacentPlaneIds: string[]): RoofGeometryEdge => ({ id, kind, start: a, end: b, lengthMm: Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm, b.zMm - a.zMm), adjacentPlaneIds });
    const pt = (xMm: number, yMm: number, zMm: number) => ({ xMm, yMm, zMm });
    const edges = [
      edge("left-eave", "eave", pt(startX, -run, eave), pt(endX, -run, eave), ["left-plane"]),
      edge("right-eave", "eave", pt(startX, run, eave), pt(endX, run, eave), ["right-plane"]),
      edge("ridge", "ridge", pt(startX, 0, rise), pt(endX, 0, rise), ["left-plane", "right-plane"]),
      edge("left-front-gable", "rake", pt(startX, -run, eave), pt(startX, 0, rise), ["left-plane"]),
      edge("left-rear-gable", "rake", pt(endX, -run, eave), pt(endX, 0, rise), ["left-plane"]),
      edge("right-front-gable", "rake", pt(startX, 0, rise), pt(startX, run, eave), ["right-plane"]),
      edge("right-rear-gable", "rake", pt(endX, 0, rise), pt(endX, run, eave), ["right-plane"]),
    ];
    return { type: "gable", modelVersion: "1.0.0", planes, edges, totalAreaMm2: result.areas.combinedRoofMm2, projectedAreaMm2: result.areas.horizontalProjectedMm2 };
  }
  const { surfaces, rule } = surfacesFor(input);
  const patches = partition(surfaces, rule);
  const planes = patches.map(({ surface, points }, index) => {
    const projectedAreaMm2 = Math.abs(signedArea(points));
    // Each surface carries its own slope, so a roof may mix pitches (mansard).
    const gradient = Math.hypot(surface.ax, surface.by);
    return { id: `${surface.id}-${index}`, areaMm2: projectedAreaMm2 * Math.hypot(1, gradient), projectedAreaMm2, pitchDegrees: Math.atan(gradient) * 180 / Math.PI, vertices: points.map((point) => ({ xMm: point.x, yMm: point.y, zMm: height(surface, point) })) };
  });
  const edges = edgesFromPatches(patches, rule);
  const projectedAreaMm2 = planes.reduce((sum, plane) => sum + plane.projectedAreaMm2, 0);
  const totalAreaMm2 = planes.reduce((sum, plane) => sum + plane.areaMm2, 0);
  if (!planes.length || !Number.isFinite(totalAreaMm2) || totalAreaMm2 > Number.MAX_SAFE_INTEGER) throw new Error("Invalid roof geometry");
  return { type: input.type, modelVersion: "1.0.0", planes, edges, totalAreaMm2, projectedAreaMm2 };
}

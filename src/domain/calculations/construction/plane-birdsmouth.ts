import type { RoofGeometry, RoofPoint } from "@/domain/calculations/roof-geometry";
import { edgeKindAt, onEdge } from "@/domain/calculations/roof-geometry-edges";
import type { RoofMaterialTakeoffInputs } from "@/domain/calculations/roof-material-takeoff";
import type { RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { calculateRafterJoints, HAP_LABEL, jointDisplayName, plateFitOf, type PlateFit, type RafterJointResult, type RafterJoints, type RidgeJoint } from "./rafter-joints";

/**
 * Rafter joints for each roof plane of the roof calculators (M9.3 phase 1 D1–D5, M9.5 S2/S3).
 * D1 reference: the roof plane is the rafter's upper edge and the roof width edge (z = 0, without the eave overhang) is the
 * wall plate's outer face. The notch then depends only on the pitch, the rafter depth and the HAP, so one
 * calculateRafterJoints seat result serves every rafter of a plane that starts at an eave — jack rafters included.
 * M9.5: the purlin and ridge inputs are roof-wide and mean the same as in the rafter-cut calculator, measured in the plane's
 * own vertical section. They are applied only to planes of the main section (same pitch and run as the longest eave plane)
 * whose longest rafter ends on a ridge parallel to its eave; every other plane gets an explicit unsupported state.
 */
export type PlaneBirdsmouthInput = Readonly<{
  rafterDepthMm?: number; seatCutHeightMm?: number; plateWidthMm?: number;
  purlinFaceMm?: number; purlinTopMm?: number;
  ridgeJoint?: RidgeJoint; ridgeBoardThicknessMm?: number; ridgePurlinWidthMm?: number; ridgePurlinTopMm?: number;
}>;
export type PlaneBirdsmouth = Readonly<{
  planeId: string;
  /** Same numbering as the rafter layout's plane picker. */
  label: string;
  pitchDegrees: number;
  /** Status of the wall-plate notch (S1); the purlin and ridge states are in joints. */
  status: "computed" | "incomplete" | "invalid" | "not-applicable";
  seat: RafterJointResult | null;
  /** The full rafter-cut result the joints come from, so the views reuse the same drawing and marking steps. */
  joints: RafterJoints | null;
  missing: readonly string[];
  reason?: string;
  eaveProjectionMm: number;
  plateFit: PlateFit | null;
  /** Horizontal run from the plate's outer face to the upper end of the longest eave rafter. */
  runMm: number;
  /** Horizontal unit vector up the slope: two planes with opposite directions on one ridge share a cross-section. */
  direction: Readonly<{ x: number; y: number }>;
  /** Geometric rafter lines of the plane and their actual spacing (not a physical framing count). */
  lineCount: number;
  spacingMm: number;
}>;

export const BIRDSMOUTH_DEPTH_LABEL = "Szarufa keresztmetszet magassága";
export const BIRDSMOUTH_SEAT_LABEL = HAP_LABEL;
const OTHER_SECTION = "A tetősík keresztmetszete eltér a fő tetőoldalétól (más futás vagy hajlás, pl. L/T szárny, félkonty): a megadott szelemen- és gerincadat rá nem vonatkoztatható.";
const TOP_REASON: Readonly<Record<string, string>> = {
  upper: "A szarufák felső vége a félnyeregtető felső élén van: a felső támasz csatlakozása nincs modellezve. A felső vég függővágása a szarufavonalak listájában látható.",
  hip: "A szarufák felső vége kontyélre fut: ferde (kettős) vágás, a rendszer nem számolja. Kontyélszarufa nincs a modellben.",
  valley: "A szarufák felső vége vápára fut: ferde (kettős) vágás, a rendszer nem számolja. Vápaszarufa nincs a modellben.",
  break: "A szarufák felső vége a manzárd törésvonalán van: ez a csomópont nincs modellezve.",
  ridgeEnd: "A tetősík szarufái a gerinc végpontjába futnak (kontyos vég): ez a gerinccsatlakozás nincs modellezve.",
};
const ORIGIN: RoofPoint = { xMm: 0, yMm: 0, zMm: 0 };
const positive = (value: number | undefined) => value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;
const horizontal = (a: RoofPoint, b: RoofPoint) => Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm);
const unsupported = (id: "purlin" | "ridge", reason: string): RafterJointResult =>
  ({ id, title: id === "purlin" ? "Közbenső felfekvés (derékszelemen)" : "Felső vég", status: "unsupported", values: [], missing: [], professional: [], reason });

/** The rafter lines of one plane that the joint geometry needs (lower end first); the layout or the roof geometry itself supplies them. */
export type PlaneRafterSource = Readonly<{ planeId: string; count: number; spacingMm: number; rafters: readonly (readonly [RoofPoint, RoofPoint])[] }>;

export function calculatePlaneBirdsmouths(geometry: RoofGeometry, layout: RoofTimberLayout, input: PlaneBirdsmouthInput): PlaneBirdsmouth[] {
  const family = layout.rafters;
  if (!family) return [];
  return planeBirdsmouthsFromSources(geometry, family.planeLayouts.map((planeLayout) => ({
    planeId: planeLayout.planeId, count: planeLayout.count, spacingMm: planeLayout.actualSpacingMm,
    rafters: family.segments.filter((segment) => segment.planeId === planeLayout.planeId)
      .map((segment) => segment.start.zMm <= segment.end.zMm ? [segment.start, segment.end] as const : [segment.end, segment.start] as const),
  })), input);
}

/**
 * M9.15.3: the same joints without a rafter layout. Only for roofs where every plane is a rectangle in plan with two sides along
 * the fall line and no two planes share a layout group: then each plane's rafter lines are all equally long, so the side along
 * the fall line is the longest eave rafter whatever the spacing. Anything else returns null (hip, L/T, mansard, ... need the layout).
 * lineCount and spacingMm are unknown here (0).
 */
export function calculatePlaneBirdsmouthsFromGeometry(geometry: RoofGeometry, input: PlaneBirdsmouthInput): PlaneBirdsmouth[] | null {
  const sources = fallLineRaftersOf(geometry);
  return sources && planeBirdsmouthsFromSources(geometry, sources, input).map((plane) => ({ ...plane, lineCount: 0, spacingMm: 0 }));
}

export function fallLineRaftersOf(geometry: RoofGeometry): PlaneRafterSource[] | null {
  const ids = geometry.planes.map((plane) => plane.id.replace(/-\d+$/, ""));
  if (geometry.planes.length === 0 || new Set(ids).size !== ids.length) return null;
  const sources: PlaneRafterSource[] = [];
  for (const [index, plane] of geometry.planes.entries()) {
    const v = plane.vertices;
    if (v.length !== 4) return null;
    const edges = v.map((point, i) => ({ x: v[(i + 1) % 4]!.xMm - point.xMm, y: v[(i + 1) % 4]!.yMm - point.yMm }));
    const scale = Math.max(...edges.map((edge) => Math.hypot(edge.x, edge.y)));
    if (!(scale > 0)) return null;
    const cross = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x * b.y - a.y * b.x);
    const dot = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x * b.x + a.y * b.y);
    const tol = 1e-6 * scale * scale;
    if (cross(edges[0]!, edges[2]!) > tol || cross(edges[1]!, edges[3]!) > tol || dot(edges[0]!, edges[1]!) > tol) return null;
    // Horizontal gradient of the height (the fall line) from the first corner's two perpendicular sides.
    const [a, b] = [edges[0]!, edges[1]!], la = a.x * a.x + a.y * a.y, lb = b.x * b.x + b.y * b.y;
    const dza = v[1]!.zMm - v[0]!.zMm, dzb = v[2]!.zMm - v[1]!.zMm;
    const g = { x: dza * a.x / la + dzb * b.x / lb, y: dza * a.y / la + dzb * b.y / lb };
    const glen = Math.hypot(g.x, g.y);
    if (!(glen > 0)) return null;
    const along = [0, 1, 2, 3].filter((i) => cross(edges[i]!, g) <= 1e-6 * scale * glen);
    if (along.length !== 2) return null;
    const i = along[0]!, p = v[i]!, q = v[(i + 1) % 4]!;
    sources.push({ planeId: ids[index]!, count: 0, spacingMm: 0, rafters: [p.zMm <= q.zMm ? [p, q] as const : [q, p] as const] });
  }
  return sources;
}

function planeBirdsmouthsFromSources(geometry: RoofGeometry, planeSources: readonly PlaneRafterSource[], input: PlaneBirdsmouthInput): PlaneBirdsmouth[] {
  const sections = planeSources.map((source, index) => {
    const planeId = source.planeId;
    const pitchDegrees = geometry.planes.find((plane) => plane.id.replace(/-\d+$/, "") === planeId)?.pitchDegrees ?? 0;
    const rafters = source.rafters;
    const eaveRafters = rafters.filter(([lower]) => edgeKindAt(geometry, lower) === "eave");
    const pool = eaveRafters.length ? eaveRafters : rafters;
    const [lower, upper] = pool.length ? pool.reduce((best, item) => horizontal(...item) > horizontal(...best) ? item : best) : [ORIGIN, ORIGIN] as const;
    const length = horizontal(lower, upper) || 1;
    const direction = { x: (upper.xMm - lower.xMm) / length, y: (upper.yMm - lower.yMm) / length };
    const tan = Math.tan(pitchDegrees * Math.PI / 180);
    // D1: z = 0 is the plate's outer face line, so the part of the rafter below it is the eave overhang.
    const eaveProjectionMm = eaveRafters.length && tan > 0 ? Math.max(0, -lower.zMm) / tan : 0;
    const upperKind = edgeKindAt(geometry, upper);
    // Only a ridge running along the eave carries the rafter-cut ridge joint; at a ridge end the rafter meets it head-on.
    const alongRidge = upperKind === "ridge" && geometry.edges.some((edge) => edge.kind === "ridge" && onEdge(upper, edge)
      && Math.abs((edge.end.xMm - edge.start.xMm) * direction.x + (edge.end.yMm - edge.start.yMm) * direction.y) < .01 * (horizontal(edge.start, edge.end) || 1));
    return { planeLayout: { count: source.count, actualSpacingMm: source.spacingMm }, planeId, label: `${index + 1}. tetősík`, pitchDegrees, eave: eaveRafters.length > 0, tan, eaveProjectionMm, runMm: length - eaveProjectionMm, direction, upperKind, alongRidge };
  });
  const main = sections.filter((item) => item.eave).reduce<(typeof sections)[number] | null>((best, item) => !best || item.runMm > best.runMm ? item : best, null);
  const mainSection = (item: (typeof sections)[number]) => main !== null && Math.abs(item.pitchDegrees - main.pitchDegrees) < 1e-6 && Math.abs(item.runMm - main.runMm) <= .5;
  const purlinRequested = input.purlinFaceMm !== undefined || input.purlinTopMm !== undefined;

  return sections.map((item): PlaneBirdsmouth => {
    const { planeId, label, pitchDegrees, eaveProjectionMm, tan, direction } = item;
    const halfSpan = item.runMm;
    const base = { planeId, label, pitchDegrees, seat: null, joints: null, missing: [], eaveProjectionMm, plateFit: null, runMm: halfSpan, direction, lineCount: item.planeLayout.count, spacingMm: item.planeLayout.actualSpacingMm };
    if (!item.eave) return { ...base, eaveProjectionMm: 0, status: "not-applicable", reason: "A tetősík szarufái nem eresznél kezdődnek: itt nincs talpszelemen, KARMI nem értelmezett." };
    const depth = positive(input.rafterDepthMm), hap = input.seatCutHeightMm;
    const missing = [...(depth === undefined ? [BIRDSMOUTH_DEPTH_LABEL] : []), ...(hap === undefined || !Number.isFinite(hap) ? [BIRDSMOUTH_SEAT_LABEL] : [])];
    if (missing.length || depth === undefined || hap === undefined) return { ...base, status: "incomplete", missing };
    if (!(halfSpan > 0) || !(tan > 0)) return { ...base, status: "not-applicable", reason: "A tetősík szarufái a talpszelemen síkján nem nyúlnak túl; KARMI nem értelmezett." };
    const ridgeIssue = item.upperKind !== "ridge" ? TOP_REASON[item.upperKind] ?? "A szarufák felső vége nem azonosítható tetőélen van: a csatlakozás nincs modellezve."
      : !item.alongRidge ? TOP_REASON.ridgeEnd! : !mainSection(item) ? OTHER_SECTION : null;
    const purlinIssue = purlinRequested && !mainSection(item) ? OTHER_SECTION : null;
    const ridgeJoint = ridgeIssue ? "opposed" : input.ridgeJoint ?? "opposed";
    const computed = calculateRafterJoints({
      horizontalHalfSpanMm: halfSpan, riseMm: hap + halfSpan * tan, eaveProjectionMm, seatCutHeightMm: hap, rafterDepthMm: depth, ridgeJoint, plateWidthMm: input.plateWidthMm,
      ...(ridgeIssue ? {} : { ridgeBoardThicknessMm: input.ridgeBoardThicknessMm, ridgePurlinWidthMm: input.ridgePurlinWidthMm, ridgePurlinTopMm: input.ridgePurlinTopMm }),
      ...(purlinRequested && !purlinIssue ? { purlinFaceMm: input.purlinFaceMm, purlinTopMm: input.purlinTopMm } : {}),
    });
    const [seat, ...rest] = computed.joints as [RafterJointResult, ...RafterJointResult[]];
    const purlin = purlinIssue ? unsupported("purlin", purlinIssue) : rest.find((joint) => joint.id === "purlin");
    const ridge = ridgeIssue ? unsupported("ridge", ridgeIssue) : rest.find((joint) => joint.id === "ridge")!;
    const joints: RafterJoints = { ...computed, joints: [seat, ...(purlin ? [purlin] : []), ridge] };
    const status = seat.status === "computed" ? "computed" : "invalid";
    return { ...base, status, seat, joints, ...(seat.reason ? { reason: seat.reason } : {}), plateFit: status === "computed" ? plateFitOf(seat, input.plateWidthMm) : null };
  });
}

/** One mapping for the preview, the completeness check and the saved lines; null when the joints were not asked for. */
function birdsmouthInputFrom(input: Record<string, unknown>, rafterDepthMm: number | undefined): PlaneBirdsmouthInput {
  const optional = (key: string) => typeof input[key] === "number" && Number.isFinite(input[key]) ? input[key] as number : undefined;
  const ridgeJoint = (["opposed", "board", "purlin"] as const).find((value) => value === input.ridgeJoint);
  return {
    rafterDepthMm, seatCutHeightMm: optional("seatCutHeightMm"), plateWidthMm: optional("plateWidthMm"),
    purlinFaceMm: optional("purlinFaceMm"), purlinTopMm: optional("purlinTopMm"),
    ridgeJoint, ridgeBoardThicknessMm: optional("ridgeBoardThicknessMm"), ridgePurlinWidthMm: optional("ridgePurlinWidthMm"), ridgePurlinTopMm: optional("ridgePurlinTopMm"),
  };
}

export function planeBirdsmouthsFor(input: Record<string, unknown>, context: RoofMaterialTakeoffInputs | undefined, geometry: RoofGeometry, layout: RoofTimberLayout | null): PlaneBirdsmouth[] | null {
  if (input.birdsmouth !== true || !context?.requested?.timber || !layout?.rafters) return null;
  return calculatePlaneBirdsmouths(geometry, layout, birdsmouthInputFrom(input, context.timber?.rafter?.sectionHeightMm));
}

/** M9.15.3 preview: the same input mapping, no material group and no rafter layout; null when the geometry does not prove it. */
export function planeBirdsmouthsFromGeometryFor(input: Record<string, unknown>, geometry: RoofGeometry, rafterDepthMm: number | undefined): PlaneBirdsmouth[] | null {
  return input.birdsmouth === true ? calculatePlaneBirdsmouthsFromGeometry(geometry, birdsmouthInputFrom(input, rafterDepthMm)) : null;
}

const pitchText = (degrees: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(degrees);
const LINE_PREFIX = { seat: "KARMI", purlin: "Derékszelemen", ridge: "Gerinc" } as const;

/**
 * Result lines to save with the revision: one set per joint and distinct pitch, so equal planes are not repeated.
 * The wall-plate notch keeps its M9.3 labels; purlin and ridge save their class B values like the rafter-cut calculator.
 */
export function birdsmouthLines(planes: readonly PlaneBirdsmouth[]): { label: string; value: number; unit: string }[] {
  const seen = new Set<string>();
  return planes.flatMap((plane) => plane.status !== "computed" || !plane.joints ? [] : plane.joints.joints.flatMap((joint) => {
    const prefix = joint.id === "ridge" ? jointDisplayName(joint, plane.joints!.ridgeJoint) : LINE_PREFIX[joint.id];
    const key = `${prefix} · ${pitchText(plane.pitchDegrees)}°`;
    if (joint.status !== "computed" || seen.has(key)) return [];
    seen.add(key);
    return joint.values.filter((item) => joint.id === "seat" || item.classification === "B").map((item) => ({ label: `${key} · ${item.label}`, value: item.value, unit: item.unit }));
  }));
}

export type PlaneJointStatus = Readonly<{ planeId: string; plane: string; joint: RafterJointResult["id"]; name: string; status: RafterJointResult["status"]; reason?: string; missing?: readonly string[] }>;

/** Per plane and joint state for the completeness check and the saved output, so not-applicable and unsupported never vanish. */
export function planeJointStatuses(planes: readonly PlaneBirdsmouth[]): PlaneJointStatus[] {
  return planes.flatMap((plane) => {
    const entries = plane.joints?.joints ?? [{ id: "seat" as const, status: plane.status, reason: plane.reason, missing: plane.missing }];
    return entries.map((joint) => ({
      planeId: plane.planeId, plane: plane.label, joint: joint.id, name: plane.joints ? jointDisplayName(joint as RafterJointResult, plane.joints.ridgeJoint) : "Talpszelemen", status: joint.status,
      ...(joint.reason ? { reason: joint.reason } : {}), ...(joint.missing.length ? { missing: joint.missing } : {}),
    }));
  });
}

/** Overview groups: two opposite planes of the main section on one ridge form a common cross-section; others stand alone. */
export type RoofSectionView = Readonly<{ id: string; label: string; planes: readonly PlaneBirdsmouth[] }>;
export function roofSectionViews(planes: readonly PlaneBirdsmouth[]): RoofSectionView[] {
  const drawable = planes.filter((plane) => plane.joints?.drawing);
  const used = new Set<string>();
  const views: RoofSectionView[] = [];
  const sameSection = (a: PlaneBirdsmouth, b: PlaneBirdsmouth) => Math.abs(a.pitchDegrees - b.pitchDegrees) < 1e-6 && Math.abs(a.runMm - b.runMm) <= .5 && Math.abs(a.eaveProjectionMm - b.eaveProjectionMm) <= .5;
  const onRidge = (plane: PlaneBirdsmouth) => plane.joints!.joints.some((joint) => joint.id === "ridge" && joint.status !== "unsupported" && joint.status !== "not-applicable");
  for (const plane of drawable) {
    if (used.has(plane.planeId)) continue;
    const partner = onRidge(plane) ? drawable.find((other) => !used.has(other.planeId) && other !== plane && onRidge(other) && sameSection(plane, other)
      && plane.direction.x * other.direction.x + plane.direction.y * other.direction.y < -.999) : undefined;
    used.add(plane.planeId);
    if (partner) used.add(partner.planeId);
    views.push({ id: plane.planeId, label: partner ? `${plane.label} és ${partner.label} · közös keresztmetszet` : plane.label, planes: partner ? [plane, partner] : [plane] });
  }
  return views;
}

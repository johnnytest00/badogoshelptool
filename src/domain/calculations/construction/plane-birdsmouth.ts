import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import { edgeKindAt } from "@/domain/calculations/roof-geometry-edges";
import type { RoofMaterialTakeoffInputs } from "@/domain/calculations/roof-material-takeoff";
import type { RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { calculateRafterJoints, plateFitOf, type PlateFit, type RafterJointResult, type RafterJoints } from "./rafter-joints";

/**
 * Birdsmouth for each roof plane of the roof calculators (M9.3 phase 1, decisions D1–D5).
 * D1 reference: the roof plane is the rafter's upper edge and the roof width edge (z = 0, without the eave overhang) is the
 * wall plate's outer face. The notch then depends only on the pitch, the rafter depth and the seat cut height, so one
 * calculateRafterJoints seat result serves every rafter of a plane that starts at an eave — jack rafters included.
 */
export type PlaneBirdsmouthInput = Readonly<{ rafterDepthMm?: number; seatCutHeightMm?: number; plateWidthMm?: number }>;
export type PlaneBirdsmouth = Readonly<{
  planeId: string;
  pitchDegrees: number;
  status: "computed" | "incomplete" | "invalid" | "not-applicable";
  seat: RafterJointResult | null;
  /** The full rafter-cut result the seat comes from, so the views reuse the same drawing and marking steps. */
  joints: RafterJoints | null;
  missing: readonly string[];
  reason?: string;
  eaveProjectionMm: number;
  plateFit: PlateFit | null;
}>;

export const BIRDSMOUTH_DEPTH_LABEL = "Szarufa keresztmetszet magassága";
export const BIRDSMOUTH_SEAT_LABEL = "Madárszáj vízszintes vágásának magassága";
const positive = (value: number | undefined) => value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;

export function calculatePlaneBirdsmouths(geometry: RoofGeometry, layout: RoofTimberLayout, input: PlaneBirdsmouthInput): PlaneBirdsmouth[] {
  const family = layout.rafters;
  if (!family) return [];
  return family.planeLayouts.map((planeLayout): PlaneBirdsmouth => {
    const planeId = planeLayout.planeId;
    const pitchDegrees = geometry.planes.find((plane) => plane.id.replace(/-\d+$/, "") === planeId)?.pitchDegrees ?? 0;
    const eaveRafters = family.segments.filter((segment) => segment.planeId === planeId)
      .map((segment) => segment.start.zMm <= segment.end.zMm ? [segment.start, segment.end] as const : [segment.end, segment.start] as const)
      .filter(([lower]) => edgeKindAt(geometry, lower) === "eave");
    const base = { planeId, pitchDegrees, seat: null, joints: null, missing: [], eaveProjectionMm: 0, plateFit: null };
    if (eaveRafters.length === 0) return { ...base, status: "not-applicable", reason: "A tetősík szarufái nem eresznél kezdődnek: itt nincs talpszelemen, madárszáj nem értelmezett." };
    const tan = Math.tan(pitchDegrees * Math.PI / 180);
    const [lower, upper] = eaveRafters.reduce((best, item) => Math.hypot(item[1].xMm - item[0].xMm, item[1].yMm - item[0].yMm) > Math.hypot(best[1].xMm - best[0].xMm, best[1].yMm - best[0].yMm) ? item : best);
    // D1: z = 0 is the plate's outer face line, so the part of the rafter below it is the eave overhang.
    const eaveProjectionMm = Math.max(0, -lower.zMm) / tan;
    const halfSpan = Math.hypot(upper.xMm - lower.xMm, upper.yMm - lower.yMm) - eaveProjectionMm;
    const depth = positive(input.rafterDepthMm), hap = input.seatCutHeightMm;
    const missing = [...(depth === undefined ? [BIRDSMOUTH_DEPTH_LABEL] : []), ...(hap === undefined || !Number.isFinite(hap) ? [BIRDSMOUTH_SEAT_LABEL] : [])];
    if (missing.length || depth === undefined || hap === undefined) return { ...base, eaveProjectionMm, status: "incomplete", missing };
    if (!(halfSpan > 0) || !(tan > 0)) return { ...base, eaveProjectionMm, status: "not-applicable", reason: "A tetősík szarufái a talpszelemen síkján nem nyúlnak túl; madárszáj nem értelmezett." };
    const joints = calculateRafterJoints({ horizontalHalfSpanMm: halfSpan, riseMm: hap + halfSpan * tan, eaveProjectionMm, seatCutHeightMm: hap, rafterDepthMm: depth, ridgeJoint: "opposed", plateWidthMm: input.plateWidthMm });
    const seat = joints.joints[0]!;
    const status = seat.status === "computed" ? "computed" : "invalid";
    return { ...base, eaveProjectionMm, status, seat, joints, ...(seat.reason ? { reason: seat.reason } : {}), plateFit: status === "computed" ? plateFitOf(seat, input.plateWidthMm) : null };
  });
}

/** One mapping for the preview, the completeness check and the saved lines; null when the notch was not asked for. */
export function planeBirdsmouthsFor(input: Record<string, unknown>, context: RoofMaterialTakeoffInputs | undefined, geometry: RoofGeometry, layout: RoofTimberLayout | null): PlaneBirdsmouth[] | null {
  if (input.birdsmouth !== true || !context?.requested?.timber || !layout?.rafters) return null;
  const optional = (key: string) => typeof input[key] === "number" && Number.isFinite(input[key]) ? input[key] as number : undefined;
  return calculatePlaneBirdsmouths(geometry, layout, { rafterDepthMm: context.timber?.rafter?.sectionHeightMm, seatCutHeightMm: optional("seatCutHeightMm"), plateWidthMm: optional("plateWidthMm") });
}

const pitchText = (degrees: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(degrees);

/** Result lines to save with the revision: one set per distinct pitch, so equal planes are not repeated. */
export function birdsmouthLines(planes: readonly PlaneBirdsmouth[]): { label: string; value: number; unit: string }[] {
  const byPitch = new Map<string, PlaneBirdsmouth>();
  for (const plane of planes) if (plane.status === "computed" && plane.seat) byPitch.set(pitchText(plane.pitchDegrees), byPitch.get(pitchText(plane.pitchDegrees)) ?? plane);
  return [...byPitch].flatMap(([pitch, plane]) => plane.seat!.values.map((item) => ({ label: `Madárszáj · ${pitch}° · ${item.label}`, value: item.value, unit: item.unit })));
}

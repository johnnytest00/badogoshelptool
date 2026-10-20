import { z } from "zod";
import { roofGeometryOutputSchema, type RoofGeometry, type RoofPoint } from "@/domain/calculations/roof-geometry";
import { roofCoveringProductParametersSchema } from "@/domain/calculations/roof-covering-parameters";
import { clippedBand, frameForPlane, fromPlane, isConvex, range, signedArea, toPlane, PLANE_EPSILON_MM } from "@/domain/calculations/roof-plane-geometry";

export const roofUnderlayParametersSchema = z.object({
  rollWidthMm: z.number().int().positive().max(100_000).optional(),
  rollLengthMm: z.number().int().positive().max(1_000_000).optional(),
  sideOverlapMm: z.number().int().nonnegative().max(100_000).optional(),
  endOverlapMm: z.number().int().nonnegative().max(100_000).optional(),
  installationDirection: z.enum(["eave-to-ridge", "ridge-to-eave"]).optional(),
}).strict().superRefine((parameters, context) => {
  if (parameters.rollWidthMm !== undefined && parameters.sideOverlapMm !== undefined && parameters.sideOverlapMm >= parameters.rollWidthMm) {
    context.addIssue({ code: "custom", path: ["sideOverlapMm"], message: "Az oldalátfedésnek kisebbnek kell lennie a tekercsszélességnél." });
  }
  if (parameters.rollLengthMm !== undefined && parameters.endOverlapMm !== undefined && parameters.endOverlapMm >= parameters.rollLengthMm) {
    context.addIssue({ code: "custom", path: ["endOverlapMm"], message: "A végtoldásnak kisebbnek kell lennie a tekercshossznál." });
  }
});

export type RoofUnderlayParameters = z.infer<typeof roofUnderlayParametersSchema>;
export type RoofUnderlayStatus = "INCOMPLETE" | "INVALID" | "UNSUPPORTED" | "PARTIAL" | "VALID";
export type RoofUnderlayCourse = Readonly<{
  id: string;
  planeId: string;
  indexFromStart: number;
  startDistanceMm: number;
  endDistanceMm: number;
  cutLengthMm: number;
  polygon: readonly RoofPoint[];
}>;
export type RoofUnderlayPiece = Readonly<{ courseId: string; index: number; lengthMm: number }>;
export type RoofUnderlayOverlapRegion = Readonly<{
  id: string;
  planeId: string;
  kind: "side-lap" | "end-lap";
  polygon: readonly RoofPoint[];
}>;
export type RoofUnderlayLayout = Readonly<{
  status: RoofUnderlayStatus;
  reasons: readonly string[];
  netRoofAreaMm2: number | null;
  courseCount: number | null;
  calculatedStripLengthMm: number | null;
  grossRequiredUnderlayAreaMm2: number | null;
  rollCount: number | null;
  rollPackingStatus: "not-calculated" | "exact-minimum";
  courses: readonly RoofUnderlayCourse[];
  pieces: readonly RoofUnderlayPiece[];
  overlaps: readonly RoofUnderlayOverlapRegion[];
}>;

const MAX_COURSES_PER_ROOF = 1_200;
const MAX_EXACT_PACKING_PIECES = 24;
const MAX_PACKING_SEARCH_NODES = 100_000;
const EPSILON_MM = PLANE_EPSILON_MM;

function minimumRollCount(lengths: readonly number[], rollLengthMm: number): number | null {
  if (!lengths.length) return 0;
  if (lengths.some((length) => !Number.isFinite(length) || length <= 0 || length > rollLengthMm + EPSILON_MM)
    || lengths.length > MAX_EXACT_PACKING_PIECES) return null;
  const sorted = [...lengths].sort((a, b) => b - a);
  const greedyBins: number[] = [];
  for (const length of sorted) {
    const binIndex = greedyBins.findIndex((remaining) => remaining + EPSILON_MM >= length);
    if (binIndex < 0) greedyBins.push(rollLengthMm - length);
    else greedyBins[binIndex] -= length;
  }
  let bestCount = greedyBins.length;
  const bins: number[] = [];
  let visited = 0;
  function search(index: number) {
    if (++visited > MAX_PACKING_SEARCH_NODES) return;
    if (index === sorted.length) { bestCount = Math.min(bestCount, bins.length); return; }
    if (bins.length >= bestCount) return;
    const length = sorted[index];
    const seenRemaining: number[] = [];
    for (let binIndex = 0; binIndex < bins.length; binIndex++) {
      const remaining = bins[binIndex];
      if (remaining + EPSILON_MM < length || seenRemaining.some((value) => Math.abs(value - remaining) <= EPSILON_MM)) continue;
      seenRemaining.push(remaining);
      bins[binIndex] -= length;
      search(index + 1);
      bins[binIndex] = remaining;
      if (visited > MAX_PACKING_SEARCH_NODES) return;
    }
    if (bins.length + 1 < bestCount) {
      bins.push(rollLengthMm - length);
      search(index + 1);
      bins.pop();
    }
  }
  search(0);
  return visited > MAX_PACKING_SEARCH_NODES ? null : bestCount;
}

function incomplete(netRoofAreaMm2: number, reasons: readonly string[]): RoofUnderlayLayout {
  return { status: "INCOMPLETE", reasons, netRoofAreaMm2, courseCount: null, calculatedStripLengthMm: null, grossRequiredUnderlayAreaMm2: null, rollCount: null, rollPackingStatus: "not-calculated", courses: [], pieces: [], overlaps: [] };
}

/**
 * Calculates parallel-to-eave underlay courses from the validated 3D roof-plane polygons.
 * Roll count uses an exact bounded 1D cut-packing search; area division is never used.
 */
export function calculateRoofUnderlayLayout(geometry: RoofGeometry, rawParameters: RoofUnderlayParameters): RoofUnderlayLayout {
  const checkedGeometry = roofGeometryOutputSchema.safeParse(geometry);
  if (!checkedGeometry.success) return { ...incomplete(0, ["A tetőgeometria érvénytelen vagy hiányos."]), status: "UNSUPPORTED" };
  const roof = checkedGeometry.data;
  const netRoofAreaMm2 = roof.planes.reduce((sum, plane) => sum + plane.areaMm2, 0);
  if (Math.abs(netRoofAreaMm2 - roof.totalAreaMm2) > Math.max(1, roof.totalAreaMm2) * 1e-8) return { ...incomplete(netRoofAreaMm2, ["A síkterületek összege nem egyezik a teljes tetőfelülettel."]), status: "UNSUPPORTED" };
  const parsed = roofUnderlayParametersSchema.safeParse(rawParameters);
  if (!parsed.success) return { ...incomplete(netRoofAreaMm2, parsed.error.issues.map((issue) => issue.message)), status: "INVALID" };
  const parameters = parsed.data;
  const missing: string[] = [];
  if (parameters.rollWidthMm === undefined) missing.push("A tekercsszélesség hiányzik.");
  if (parameters.rollLengthMm === undefined) missing.push("A tekercshossz hiányzik.");
  if (parameters.sideOverlapMm === undefined) missing.push("Az oldalátfedés hiányzik; nullát is adj meg, ha azt írja elő a termékadat.");
  if (parameters.endOverlapMm === undefined) missing.push("A végtoldás hiányzik; nullát is adj meg, ha nincs toldás.");
  if (parameters.installationDirection === undefined) missing.push("A telepítési irány hiányzik.");
  if (missing.length) return incomplete(netRoofAreaMm2, missing);
  if (parameters.sideOverlapMm! >= parameters.rollWidthMm!) return { ...incomplete(netRoofAreaMm2, ["Az oldalátfedésnek kisebbnek kell lennie a tekercsszélességnél."]), status: "INVALID" };
  if (parameters.endOverlapMm! >= parameters.rollLengthMm!) return { ...incomplete(netRoofAreaMm2, ["A végtoldásnak kisebbnek kell lennie a tekercshossznál."]), status: "INVALID" };
  const normalizedProduct = roofCoveringProductParametersSchema.safeParse({
    form: "roll",
    nominalWidthMm: parameters.rollWidthMm,
    effectiveCoveringWidthMm: parameters.rollWidthMm! - parameters.sideOverlapMm!,
    physicalLengthMm: parameters.rollLengthMm,
    usableCoveringLengthMm: parameters.rollLengthMm! - parameters.endOverlapMm!,
    sideOverlapMm: parameters.sideOverlapMm,
    endOverlapMm: parameters.endOverlapMm,
    installationDirection: parameters.installationDirection,
  });
  if (!normalizedProduct.success) return { ...incomplete(netRoofAreaMm2, normalizedProduct.error.issues.map((issue) => issue.message)), status: "INVALID" };
  if (!["gable", "shed", "hip", "mansard"].includes(roof.type)) return { ...incomplete(netRoofAreaMm2, [`A ${roof.type} tető síkkapcsolatainak alátétkiosztása ebben a változatban nem támogatott.`]), status: "UNSUPPORTED" };

  const rollWidth = parameters.rollWidthMm!, rollLength = parameters.rollLengthMm!;
  const sideOverlap = parameters.sideOverlapMm!, endOverlap = parameters.endOverlapMm!;
  const advance = rollWidth - sideOverlap;
  const courses: RoofUnderlayCourse[] = [];
  const pieces: RoofUnderlayPiece[] = [];
  const overlaps: RoofUnderlayOverlapRegion[] = [];
  const failure: string[] = [];

  for (const plane of roof.planes) {
    const frame = frameForPlane(plane.vertices);
    if (!frame) { failure.push(`A(z) ${plane.id} sík lejtésiránya nem rekonstruálható.`); continue; }
    const polygon = plane.vertices.map((point) => toPlane(point, frame));
    if (!isConvex(polygon) || Math.abs(signedArea(polygon)) <= EPSILON_MM) { failure.push(`A(z) ${plane.id} sík polygonja nem konvex vagy degenerált.`); continue; }
    const [minimumDistance, maximumDistance] = range(polygon, "v");
    const span = maximumDistance - minimumDistance;
    if (!Number.isFinite(span) || span <= 0) { failure.push(`A(z) ${plane.id} sík lejtőhossza érvénytelen.`); continue; }
    const count = span <= rollWidth ? 1 : 1 + Math.ceil((span - rollWidth) / advance - 1e-12);
    if (courses.length + count > MAX_COURSES_PER_ROOF) return { ...incomplete(netRoofAreaMm2, [`A számítás több mint ${MAX_COURSES_PER_ROOF} fóliacsíkot igényel; a kiosztás korlátozott.`]), status: "UNSUPPORTED" };

    const priorCourses: RoofUnderlayCourse[] = [];
    for (let order = 0; order < count; order++) {
      const offset = order * advance;
      const start = parameters.installationDirection === "eave-to-ridge" ? minimumDistance + offset : maximumDistance - rollWidth - offset;
      const end = start + rollWidth;
      const band = clippedBand(polygon, "v", start, end);
      if (band.length < 3) continue;
      const [startU, endU] = range(band, "u");
      const cutLengthMm = endU - startU;
      if (!Number.isFinite(cutLengthMm) || cutLengthMm <= 0) { failure.push(`A(z) ${plane.id} ${order + 1}. fóliacsík hossza nem számítható.`); continue; }
      const courseId = `${plane.id}-underlay-${order + 1}`;
      const course: RoofUnderlayCourse = { id: courseId, planeId: plane.id, indexFromStart: order + 1, startDistanceMm: start, endDistanceMm: end, cutLengthMm, polygon: band.map((point) => fromPlane(point, frame)) };
      courses.push(course);
      if (sideOverlap > 0) {
        for (const priorCourse of priorCourses) {
          const overlapStart = Math.max(priorCourse.startDistanceMm, course.startDistanceMm);
          const overlapEnd = Math.min(priorCourse.endDistanceMm, course.endDistanceMm);
          if (overlapEnd - overlapStart <= EPSILON_MM) continue;
          const overlapBand = clippedBand(polygon, "v", overlapStart, overlapEnd);
          if (overlapBand.length >= 3) overlaps.push({ id: `${priorCourse.id}-${courseId}-side-lap`, planeId: plane.id, kind: "side-lap", polygon: overlapBand.map((point) => fromPlane(point, frame)) });
        }
      }
      const segmentCount = cutLengthMm <= rollLength ? 1 : endOverlap > 0 ? 1 + Math.ceil((cutLengthMm - rollLength) / (rollLength - endOverlap) - 1e-12) : 0;
      if (segmentCount === 0) failure.push(`A(z) ${plane.id} ${order + 1}. fóliacsík hosszabb a tekercsnél; explicit végtoldás szükséges.`);
      else {
        for (let index = 0; index < segmentCount; index++) {
          const lengthMm = index < segmentCount - 1 ? rollLength : cutLengthMm - (segmentCount - 1) * (rollLength - endOverlap);
          if (lengthMm <= 0 || lengthMm > rollLength + EPSILON_MM) failure.push(`A(z) ${plane.id} fóliacsíkja nem vágható a megadott tekercshosszból.`);
          else pieces.push({ courseId, index: index + 1, lengthMm });
          if (index > 0 && endOverlap > 0) {
            const end = startU + index * (rollLength - endOverlap);
            const lap = clippedBand(band, "u", end, end + endOverlap);
            if (lap.length >= 3) overlaps.push({ id: `${courseId}-end-lap-${index}`, planeId: plane.id, kind: "end-lap", polygon: lap.map((point) => fromPlane(point, frame)) });
          }
        }
      }
      priorCourses.push(course);
    }
  }
  if (failure.length) return { status: "UNSUPPORTED", reasons: failure, netRoofAreaMm2, courseCount: courses.length || null, calculatedStripLengthMm: courses.reduce((sum, course) => sum + course.cutLengthMm, 0) || null, grossRequiredUnderlayAreaMm2: null, rollCount: null, rollPackingStatus: "not-calculated", courses, pieces, overlaps };

  const calculatedStripLengthMm = courses.reduce((sum, course) => sum + course.cutLengthMm, 0);
  const grossRequiredUnderlayAreaMm2 = pieces.reduce((sum, piece) => sum + piece.lengthMm * rollWidth, 0);
  if ([netRoofAreaMm2, calculatedStripLengthMm, grossRequiredUnderlayAreaMm2].some((value) => !Number.isFinite(value) || value <= 0 || value > Number.MAX_SAFE_INTEGER)) return { ...incomplete(netRoofAreaMm2, ["Az alátétmennyiség meghaladja a biztonságos numerikus tartományt."]), status: "UNSUPPORTED" };
  const rollCount = minimumRollCount(pieces.map((piece) => piece.lengthMm), rollLength);
  const packingSupported = rollCount !== null;
  const reasons = packingSupported ? ["A tekercsdarabszám a kis darabszámú, pontos 1D vágási csomagolás minimuma; szélességi maradékot nem használ újra."] : ["A síkcsík-geometria és a bruttó vágott felület kiszámítható, de a darabok pontos roll packing keresése a méretkorlát miatt nem futott le."];
  return {
    status: packingSupported ? "VALID" : "PARTIAL",
    reasons,
    netRoofAreaMm2,
    courseCount: courses.length,
    calculatedStripLengthMm,
    grossRequiredUnderlayAreaMm2,
    rollCount,
    rollPackingStatus: packingSupported ? "exact-minimum" : "not-calculated",
    courses,
    pieces,
    overlaps,
  };
}

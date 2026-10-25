import { calculateRafterGeometry, type RafterGeometryInput } from "./roofs";

/**
 * Rafter joint geometry in one vertical section (M6, 12/2). Reference (approved: "felső él, mai modell"):
 * x runs horizontally from the seat's plumb cut (outer face of the wall plate) to the ridge axis, y runs
 * vertically from the top of the wall plate. The rafter's upper edge is y = HAP + x·tanα, where HAP is the
 * existing seat cut height, so the pitch is atan2(rise − HAP, halfSpan) exactly as in calculateRafterGeometry.
 * Geometry only: notch depths are the user's values; permissibility and sizing are never decided here.
 */
export type RidgeJoint = "opposed" | "board" | "purlin";
export type RafterJointInput = RafterGeometryInput & Readonly<{
  rafterDepthMm?: number;
  ridgeJoint: RidgeJoint;
  ridgeBoardThicknessMm?: number;
  ridgePurlinWidthMm?: number;
  ridgePurlinTopMm?: number;
  purlinFaceMm?: number;
  purlinTopMm?: number;
}>;
/** A: from existing data, B: from additional user input. C (missing) and D (professional) are text lists. */
export type JointValue = Readonly<{ label: string; value: number; unit: "mm" | "°"; classification: "A" | "B" }>;
export type RafterJointResult = Readonly<{
  id: "seat" | "purlin" | "ridge";
  title: string;
  status: "computed" | "incomplete" | "invalid";
  values: readonly JointValue[];
  missing: readonly string[];
  professional: readonly string[];
  reason?: string;
}>;
type Point = Readonly<{ xMm: number; yMm: number }>;
export type RafterJointDrawing = Readonly<{ outline: readonly Point[]; supports: readonly Readonly<{ id: string; label: string; face: Point; seatEnd: Point }>[] }>;
export type RafterJoints = Readonly<{ pitchDegrees: number; joints: readonly RafterJointResult[]; drawing: RafterJointDrawing | null }>;

const RIDGE_JOINTS: readonly RidgeJoint[] = ["opposed", "board", "purlin"];
const optionalMm = (value: unknown) => value === undefined || value === null || value === "" || !Number.isFinite(Number(value)) ? undefined : Number(value);

export function rafterJointInputFromFields(fields: Record<string, unknown>): RafterJointInput {
  const ridge = String(fields.ridgeJoint ?? "opposed") as RidgeJoint;
  return {
    horizontalHalfSpanMm: Number(fields.horizontalHalfSpanMm), riseMm: Number(fields.riseMm),
    eaveProjectionMm: Number(fields.eaveProjectionMm ?? 0), seatCutHeightMm: optionalMm(fields.seatCutHeightMm) ?? 0,
    rafterDepthMm: optionalMm(fields.rafterDepthMm), ridgeJoint: RIDGE_JOINTS.includes(ridge) ? ridge : "opposed",
    ridgeBoardThicknessMm: optionalMm(fields.ridgeBoardThicknessMm), ridgePurlinWidthMm: optionalMm(fields.ridgePurlinWidthMm), ridgePurlinTopMm: optionalMm(fields.ridgePurlinTopMm),
    purlinFaceMm: optionalMm(fields.purlinFaceMm), purlinTopMm: optionalMm(fields.purlinTopMm),
  };
}

const DEPTH_LABEL = "Szarufa magassága (keresztmetszet)";
const NOTCH_PROFESSIONAL = "A bevágás megengedett mélysége és a keresztmetszet gyengítése statikai kérdés; a rendszer nem ellenőrzi és nem javasolja.";
const SEAT_TOLERANCE_MM = 0.5;

type Section = { tan: number; cos: number; hap: number; plumbDepth: number | null; halfSpan: number };
const upperEdge = (s: Section, x: number) => s.hap + x * s.tan;
const lowerEdge = (s: Section, x: number) => upperEdge(s, x) - s.plumbDepth!;

/** A horizontal seat on a support whose eave-side face is at x and whose top is at y. */
function notch(s: Section, faceX: number, topY: number) {
  const plumbCutHeight = topY - lowerEdge(s, faceX);
  const seatLength = plumbCutHeight / s.tan;
  return { plumbCutHeight, seatLength, perpendicularDepth: plumbCutHeight * s.cos };
}

function notchValues(s: Section, depthMm: number, faceX: number, topY: number, prefix: string): { values: JointValue[]; reason?: string; seatEnd: Point } {
  const cut = notch(s, faceX, topY);
  const seatEnd = { xMm: faceX + Math.max(cut.seatLength, 0), yMm: topY };
  if (topY >= upperEdge(s, faceX)) return { values: [], reason: `${prefix}: a támasz felső síkja eléri a szarufa felső élét.`, seatEnd };
  if (cut.plumbCutHeight < -SEAT_TOLERANCE_MM) return { values: [{ label: "Hézag a szarufa alsó éle alatt · függőleges", value: -cut.plumbCutHeight, unit: "mm", classification: "B" }], reason: `${prefix}: a szarufa alsó éle a támasz fölött van, bevágás nem jön létre; a hézagot alátétezéssel kell megoldani.`, seatEnd };
  if (cut.perpendicularDepth >= depthMm) return { values: [], reason: `${prefix}: a bevágás a teljes szarufa-magasságot elvágná.`, seatEnd };
  if (seatEnd.xMm > s.halfSpan + SEAT_TOLERANCE_MM) return { values: [], reason: `${prefix}: az ülék túlnyúlik a gerinctengelyen; ellenőrizd a támasz helyét és magasságát.`, seatEnd };
  const touching = Math.abs(cut.plumbCutHeight) <= SEAT_TOLERANCE_MM;
  return {
    values: touching ? [{ label: "Bevágás", value: 0, unit: "mm", classification: "B" }] : [
      { label: "Függővágás magassága", value: cut.plumbCutHeight, unit: "mm", classification: "B" },
      { label: "Vízszintes ülékhossz", value: cut.seatLength, unit: "mm", classification: "B" },
      { label: "Bevágás mélysége · a szarufára merőlegesen", value: cut.perpendicularDepth, unit: "mm", classification: "B" },
      { label: "Megmaradó szarufa-magasság a bevágásnál", value: depthMm - cut.perpendicularDepth, unit: "mm", classification: "B" },
    ],
    seatEnd,
  };
}

export function calculateRafterJoints(input: RafterJointInput): RafterJoints {
  const base = calculateRafterGeometry(input);
  const pitch = base.pitchDegrees * Math.PI / 180;
  const depth = input.rafterDepthMm !== undefined && input.rafterDepthMm > 0 ? input.rafterDepthMm : undefined;
  const s: Section = { tan: Math.tan(pitch), cos: Math.cos(pitch), hap: input.seatCutHeightMm ?? 0, plumbDepth: depth === undefined ? null : depth / Math.cos(pitch), halfSpan: input.horizontalHalfSpanMm };
  const plumbAngle = { label: "Függővágás szöge a szarufa tengelyéhez", value: base.plumbCutToBoardAxisDegrees, unit: "°", classification: "A" } as const;
  const supports: { id: string; label: string; face: Point; seatEnd: Point }[] = [];

  const seat: RafterJointResult = (() => {
    const common = { id: "seat", title: "Alsó felfekvés (talpszelemen)", professional: [NOTCH_PROFESSIONAL] } as const;
    const angles: JointValue[] = [plumbAngle, { label: "Ülékvágás szöge a szarufa tengelyéhez", value: base.pitchDegrees, unit: "°", classification: "A" }];
    if (depth === undefined) return { ...common, status: "incomplete", values: angles, missing: [DEPTH_LABEL] };
    if (s.hap <= 0) return { ...common, status: "invalid", values: angles, missing: [], reason: "A madárszáj magassága 0: a szarufa felső éle a talpszelemen felső síkjában állna. Add meg a madárszáj vízszintes vágásának magasságát." };
    const result = notchValues(s, depth, 0, 0, "Alsó felfekvés");
    supports.push({ id: "seat", label: "Talpszelemen", face: { xMm: 0, yMm: 0 }, seatEnd: result.seatEnd });
    return { ...common, status: result.reason ? "invalid" : "computed", values: [...angles, ...result.values], missing: [], ...(result.reason ? { reason: result.reason } : {}) };
  })();

  const purlin: RafterJointResult | null = (() => {
    if (input.purlinFaceMm === undefined && input.purlinTopMm === undefined) return null;
    const common = { id: "purlin", title: "Közbenső felfekvés (derékszelemen)", professional: [NOTCH_PROFESSIONAL, "A szelemen és a szarufa méretezése, a dúcolás és a kakasülő statikai tervezői feladat."] } as const;
    const missing = [
      ...(depth === undefined ? [DEPTH_LABEL] : []),
      ...(input.purlinFaceMm === undefined ? ["Derékszelemen ereszoldali síkjának vízszintes helye"] : []),
      ...(input.purlinTopMm === undefined ? ["Derékszelemen felső síkjának magassága"] : []),
    ];
    if (missing.length || depth === undefined || input.purlinFaceMm === undefined || input.purlinTopMm === undefined) return { ...common, status: "incomplete", values: [], missing };
    if (input.purlinFaceMm <= 0 || input.purlinFaceMm >= s.halfSpan) return { ...common, status: "invalid", values: [], missing: [], reason: "A derékszelemen a talpszelemen és a gerinctengely között legyen." };
    const result = notchValues(s, depth, input.purlinFaceMm, input.purlinTopMm, "Derékszelemen");
    supports.push({ id: "purlin", label: "Derékszelemen", face: { xMm: input.purlinFaceMm, yMm: input.purlinTopMm }, seatEnd: result.seatEnd });
    const distance: JointValue = { label: "Felfekvés távolsága a szarufa felső éle mentén · a talpszelemen függővágásától", value: input.purlinFaceMm / s.cos, unit: "mm", classification: "B" };
    return { ...common, status: result.reason ? "invalid" : "computed", values: [distance, ...result.values], missing: [], ...(result.reason ? { reason: result.reason } : {}) };
  })();

  let ridgeEndX = s.halfSpan;
  const ridge: RafterJointResult = (() => {
    if (input.ridgeJoint === "opposed") return { id: "ridge", title: "Gerinc · szembefutó szarufák", status: "computed", values: [plumbAngle], missing: [], professional: ["A gerinc kapcsolóelemei kivitelezői vagy statikai döntés."] };
    if (input.ridgeJoint === "board") {
      const common = { id: "ridge", title: "Gerinc · gerincdeszkára futó szarufák", professional: ["A gerincdeszka mérete és a kapcsolóelemek kivitelezői vagy statikai döntés."] } as const;
      const thickness = input.ridgeBoardThicknessMm;
      if (thickness === undefined || thickness <= 0) return { ...common, status: "incomplete", values: [plumbAngle], missing: ["Gerincdeszka vastagsága"] };
      if (thickness / 2 >= s.halfSpan) return { ...common, status: "invalid", values: [plumbAngle], missing: [], reason: "A gerincdeszka fele nem érheti el a fél fesztávot." };
      ridgeEndX = s.halfSpan - thickness / 2;
      const reduction = thickness / 2 / s.cos;
      return { ...common, status: "computed", missing: [], values: [plumbAngle,
        { label: "Vízszintes futás csökkenése (t/2)", value: thickness / 2, unit: "mm", classification: "B" },
        { label: "Hosszcsökkenés a szarufa felső éle mentén", value: reduction, unit: "mm", classification: "B" },
        { label: "Szarufa teljes hossza gerincdeszkával", value: base.slopeLengthMm - reduction, unit: "mm", classification: "B" }] };
    }
    const common = { id: "ridge", title: "Gerinc · gerincszelemenre fekvő, szembefutó szarufák", professional: [NOTCH_PROFESSIONAL, "A gerincszelemen méretezése és a kapcsolóelemek statikai tervezői feladat."] } as const;
    const missing = [
      ...(depth === undefined ? [DEPTH_LABEL] : []),
      ...(input.ridgePurlinWidthMm === undefined ? ["Gerincszelemen szélessége"] : []),
      ...(input.ridgePurlinTopMm === undefined ? ["Gerincszelemen felső síkjának magassága"] : []),
    ];
    if (missing.length || depth === undefined || input.ridgePurlinWidthMm === undefined || input.ridgePurlinTopMm === undefined) return { ...common, status: "incomplete", values: [plumbAngle], missing };
    const faceX = s.halfSpan - input.ridgePurlinWidthMm / 2;
    if (input.ridgePurlinWidthMm <= 0 || faceX <= 0) return { ...common, status: "invalid", values: [plumbAngle], missing: [], reason: "A gerincszelemen szélessége legyen pozitív és kisebb a teljes fesztávnál." };
    const result = notchValues(s, depth, faceX, input.ridgePurlinTopMm, "Gerincszelemen");
    supports.push({ id: "ridge", label: "Gerincszelemen", face: { xMm: faceX, yMm: input.ridgePurlinTopMm }, seatEnd: result.seatEnd });
    return { ...common, status: result.reason ? "invalid" : "computed", values: [plumbAngle, ...result.values], missing: [], ...(result.reason ? { reason: result.reason } : {}) };
  })();

  const joints = [seat, ...(purlin ? [purlin] : []), ridge];
  const drawing = s.plumbDepth === null || joints.some((joint) => joint.status === "invalid") ? null : outline(s, -input.eaveProjectionMm, ridgeEndX, supports);
  return { pitchDegrees: base.pitchDegrees, joints, drawing };
}

/** Rafter section outline with the seat notches, shared by the table values and the SVG detail. */
function outline(s: Section, eaveX: number, ridgeX: number, supports: readonly { id: string; label: string; face: Point; seatEnd: Point }[]): RafterJointDrawing {
  const bottom: Point[] = [{ xMm: ridgeX, yMm: lowerEdge(s, ridgeX) }];
  for (const support of [...supports].sort((a, b) => b.face.xMm - a.face.xMm)) {
    const cut = notch(s, support.face.xMm, support.face.yMm);
    if (cut.plumbCutHeight <= SEAT_TOLERANCE_MM) continue;
    bottom.push(support.seatEnd, support.face, { xMm: support.face.xMm, yMm: lowerEdge(s, support.face.xMm) });
  }
  bottom.push({ xMm: eaveX, yMm: lowerEdge(s, eaveX) });
  return { outline: [{ xMm: eaveX, yMm: upperEdge(s, eaveX) }, { xMm: ridgeX, yMm: upperEdge(s, ridgeX) }, ...bottom], supports };
}

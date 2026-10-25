import { RIDGE_JOINT_NAME, type RafterJointResult, type RafterJoints } from "@/domain/calculations/construction/rafter-joints";

/**
 * Dimensioned rafter section with the three support slots (S1 wall plate, S2 intermediate purlin, S3 ridge), built only
 * from calculateRafterJoints: points come from its outline and supports, every labelled value is the joint value itself
 * (or a plain distance between two of its points along the upper edge). Coordinates are mm, x towards the ridge, y up.
 * Support extents that are not inputs (plate and purlin width, heights below the top plane) are flagged as schematic.
 */
export type MmPoint = Readonly<{ xMm: number; yMm: number }>;
export type MmBounds = Readonly<{ minX: number; minY: number; maxX: number; maxY: number }>;
export type JointSlotId = "S1" | "S2" | "S3";
/** inline: drawn on the measured line itself (no offset) from the notch corner, labelled beyond its far end (to). */
export type JointDimension = Readonly<{ id: string; label: string; valueMm: number; from: MmPoint; to: MmPoint; kind: "horizontal" | "vertical" | "aligned"; outward: MmPoint; tier: number; inline?: boolean }>;
/** armMm: length of the cut edge the arc sits on, so a view can leave out an arc that would not fit. */
export type JointAngle = Readonly<{ id: string; label: string; valueDegrees: number; vertex: MmPoint; from: MmPoint; to: MmPoint; armMm: number }>;
/** A cut edge to mark on the rafter (plumb or seat cut of a notch, or an end cut), between two model points. */
export type CutEdge = Readonly<{ id: string; label: string; from: MmPoint; to: MmPoint }>;
/** Marking points: A plumb cut on the lower edge, B plumb/seat intersection, C seat end on the lower edge, M mark on the upper edge. */
export type MarkPoint = Readonly<{ id: "A" | "B" | "C" | "M"; label: string; at: MmPoint }>;
export type JointCut = Readonly<{ offcut: readonly MmPoint[] | null; edges: readonly CutEdge[]; markLine: readonly [MmPoint, MmPoint] | null; points: readonly MarkPoint[] }>;
export type JointSupportShape = Readonly<{ slot: JointSlotId; label: string; bearing: readonly MmPoint[]; schematic: readonly (readonly MmPoint[])[] }>;
export type JointSlot = Readonly<{
  slot: JointSlotId;
  name: string;
  status: RafterJointResult["status"] | "absent";
  joint: RafterJointResult | null;
  note: string | null;
  anchor: MmPoint | null;
  focus: MmBounds | null;
  dimensions: readonly JointDimension[];
  angles: readonly JointAngle[];
  cut: JointCut | null;
  /** Distance of the mark point M from the common origin O, along the upper edge. */
  positionMm: number | null;
}>;
export type RafterJointDrawingModel = Readonly<{
  slots: readonly [JointSlot, JointSlot, JointSlot];
  section: null | Readonly<{
    outline: readonly MmPoint[];
    /** The uncut lower edge, dashed across the notches. */
    lowerEdge: readonly [MmPoint, MmPoint];
    ridgeAxisXMm: number;
    pitchDegrees: number;
    /** Common origin O: the S1 plumb mark on the upper edge; every position along the rafter is measured from here. */
    origin: MmPoint;
    endCuts: readonly CutEdge[];
    /** Positions from O along the upper edge (negative towards the eave), for the cutting list under the drawing. */
    stations: readonly Readonly<{ id: string; label: string; positionMm: number }>[];
    depthMm: number;
    supports: readonly JointSupportShape[];
    overview: readonly JointDimension[];
    bounds: MmBounds;
    focus: MmBounds;
  }>;
}>;

const RIDGE_NAME = RIDGE_JOINT_NAME;
const notModelled = (joint: RafterJointResult | null) => joint?.status === "unsupported" || joint?.status === "not-applicable";
const valueOf = (joint: RafterJointResult | null, label: string) => joint?.values.find((item) => item.label.startsWith(label))?.value;
const boundsOf = (points: readonly MmPoint[], pad = 0): MmBounds => ({
  minX: Math.min(...points.map((p) => p.xMm)) - pad, maxX: Math.max(...points.map((p) => p.xMm)) + pad,
  minY: Math.min(...points.map((p) => p.yMm)) - pad, maxY: Math.max(...points.map((p) => p.yMm)) + pad,
});
const union = (boxes: readonly MmBounds[]): MmBounds => ({ minX: Math.min(...boxes.map((b) => b.minX)), minY: Math.min(...boxes.map((b) => b.minY)), maxX: Math.max(...boxes.map((b) => b.maxX)), maxY: Math.max(...boxes.map((b) => b.maxY)) });

export function createRafterJointDrawingModel(joints: RafterJoints): RafterJointDrawingModel {
  const byId = (id: RafterJointResult["id"]) => joints.joints.find((joint) => joint.id === id) ?? null;
  const seatJoint = byId("seat"), purlinJoint = byId("purlin"), ridgeJoint = byId("ridge");
  const drawing = joints.drawing;
  const ridgeName = notModelled(ridgeJoint) ? "Felső vég" : RIDGE_NAME[joints.ridgeJoint];
  const empty = (slot: JointSlotId, name: string, joint: RafterJointResult | null, note: string | null): JointSlot =>
    ({ slot, name, status: joint?.status ?? "absent", joint, note, anchor: null, focus: null, dimensions: [], angles: [], cut: null, positionMm: null });
  const noPurlinNote = "Derékszelemen nincs megadva, ezért nem rajzolt. Add meg a helyét és a felső síkját a „Részletes számítás” alatt.";
  const ridgeNote = notModelled(ridgeJoint) ? ridgeJoint!.reason ?? null : joints.ridgeJoint === "opposed" ? "Nincs gerincszelemen: a szarufák a gerinctengelyen függővágással futnak össze. A kapcsolóelem kivitelezői döntés." : joints.ridgeJoint === "board" ? "Nincs gerincszelemen: gerincdeszkára fut. A deszka magassága nem bemenet, ezért nem rajzolt." : null;
  if (!drawing) return { section: null, slots: [empty("S1", "Talpszelemen", seatJoint, null), empty("S2", "Derékszelemen", purlinJoint, purlinJoint ? null : noPurlinNote), empty("S3", ridgeName, ridgeJoint, ridgeNote)] };

  const pitch = joints.pitchDegrees * Math.PI / 180;
  const tan = Math.tan(pitch), cos = Math.cos(pitch), sin = Math.sin(pitch);
  const depth = drawing.rafterDepthMm, plumbDepth = depth / cos;
  const [eaveTop, ridgeTop] = drawing.outline as [MmPoint, MmPoint];
  const upper = (x: number) => eaveTop.yMm + (x - eaveTop.xMm) * tan;
  const lower = (x: number) => upper(x) - plumbDepth;
  const onUpper = (x: number): MmPoint => ({ xMm: x, yMm: upper(x) });
  const onLower = (x: number): MmPoint => ({ xMm: x, yMm: lower(x) });
  const along: MmPoint = { xMm: cos, yMm: sin }, normalUp: MmPoint = { xMm: -sin, yMm: cos };
  const plumbAngle = valueOf(seatJoint, "Függővágás szöge"), seatAngle = valueOf(seatJoint, "Ülékvágás szöge");
  const pad = Math.max(depth * .12, 15);
  const supports: JointSupportShape[] = [];

  /** Birdsmouth dimensions on one support; the values are the joint's own numbers, the points the same notch geometry. */
  const notchSlot = (slot: JointSlotId, name: string, joint: RafterJointResult, note: string | null, extra: readonly JointDimension[] = []): JointSlot => {
    const support = drawing.supports.find((item) => item.id === joint.id);
    if (!support) return empty(slot, name, joint, note);
    const corner = support.face, seatEnd = support.seatEnd, plumbFoot = onLower(corner.xMm);
    const height = valueOf(joint, "Függővágás magassága"), seat = valueOf(joint, "Vízszintes ülékhossz");
    const cutDepth = valueOf(joint, "Bevágás mélysége"), remaining = valueOf(joint, "Megmaradó");
    const mirror = drawing.ridgeJoint === "purlin" && joint.id === "ridge" ? 2 * drawing.ridgeAxisXMm - corner.xMm : null;
    const bearingEnd = mirror ?? Math.max(seatEnd.xMm, corner.xMm);
    supports.push({
      slot, label: support.label,
      bearing: [corner, { xMm: bearingEnd, yMm: corner.yMm }],
      // Not inputs: the support's height below its top plane and, except at a ridge purlin, its width.
      schematic: [[corner, { xMm: corner.xMm, yMm: corner.yMm - depth * .7 }], mirror === null
        ? [{ xMm: bearingEnd, yMm: corner.yMm }, { xMm: bearingEnd + depth * .8, yMm: corner.yMm }]
        : [{ xMm: mirror, yMm: corner.yMm }, { xMm: mirror, yMm: corner.yMm - depth * .7 }]],
    });
    const dimensions: JointDimension[] = [...extra];
    const angles: JointAngle[] = [];
    const notched = height !== undefined && seat !== undefined && cutDepth !== undefined && remaining !== undefined;
    if (notched) {
      const deep: MmPoint = { xMm: corner.xMm + cutDepth * sin, yMm: corner.yMm - cutDepth * cos };
      const top: MmPoint = { xMm: corner.xMm - remaining * sin, yMm: corner.yMm + remaining * cos };
      dimensions.push(
        { id: `${slot}-plumb`, label: "függővágás", valueMm: height, from: plumbFoot, to: corner, kind: "vertical", outward: { xMm: -1, yMm: 0 }, tier: 0 },
        { id: `${slot}-seat`, label: "ülék", valueMm: seat, from: corner, to: seatEnd, kind: "horizontal", outward: { xMm: 0, yMm: 1 }, tier: 0 },
        { id: `${slot}-depth`, label: "mélység ⊥", valueMm: cutDepth, from: corner, to: deep, kind: "aligned", outward: along, tier: 0, inline: true },
        { id: `${slot}-remaining`, label: "marad ⊥", valueMm: remaining, from: corner, to: top, kind: "aligned", outward: along, tier: 0, inline: true },
      );
      if (plumbAngle !== undefined) angles.push({ id: `${slot}-plumb-angle`, label: "függővágás ∠", valueDegrees: plumbAngle, vertex: plumbFoot, from: { xMm: plumbFoot.xMm, yMm: plumbFoot.yMm + 1 }, to: { xMm: plumbFoot.xMm + cos, yMm: plumbFoot.yMm + sin }, armMm: height });
      if (seatAngle !== undefined) angles.push({ id: `${slot}-seat-angle`, label: "ülék ∠", valueDegrees: seatAngle, vertex: seatEnd, from: { xMm: seatEnd.xMm - 1, yMm: seatEnd.yMm }, to: { xMm: seatEnd.xMm - cos, yMm: seatEnd.yMm - sin }, armMm: seat });
    }
    const mark = onUpper(corner.xMm);
    const cut: JointCut = notched ? {
      offcut: [plumbFoot, corner, seatEnd],
      edges: [{ id: "plumb", label: "függővágás", from: plumbFoot, to: corner }, { id: "seat", label: "ülékvágás", from: corner, to: seatEnd }],
      markLine: [corner, mark],
      points: [{ id: "A", label: "függővágás az alsó élen", at: plumbFoot }, { id: "B", label: "függő- és ülékvágás metszéspontja", at: corner }, { id: "C", label: "ülék vége az alsó élen", at: seatEnd }, { id: "M", label: "jelölőpont a felső élen", at: mark }],
    } : { offcut: null, edges: [], markLine: [plumbFoot, mark], points: [{ id: "M", label: "jelölőpont a felső élen", at: mark }] };
    const focusPoints = [corner, seatEnd, plumbFoot, mark, ...(mirror === null ? [] : [{ xMm: mirror, yMm: corner.yMm }])];
    const positionMm = slot === "S1" ? 0 : slot === "S2" ? valueOf(joint, "Felfekvés távolsága") ?? corner.xMm / cos : corner.xMm / cos;
    return { slot, name, status: joint.status, joint, note: notched ? note : "A szarufa alsó éle a támaszon fekszik: bevágás nem jön létre (0 mm).", anchor: plumbFoot, focus: boundsOf(focusPoints, pad), dimensions, angles, cut, positionMm };
  };

  const s1 = seatJoint ? notchSlot("S1", "Talpszelemen", seatJoint, null) : empty("S1", "Talpszelemen", null, null);
  const s2 = purlinJoint ? notchSlot("S2", "Derékszelemen", purlinJoint, null) : empty("S2", "Derékszelemen", null, noPurlinNote);
  const ridgeEnd = ridgeTop.xMm;
  const s3: JointSlot = (() => {
    if (!ridgeJoint) return empty("S3", ridgeName, null, ridgeNote);
    // Upper end the roof adapter could not match to a ridge joint: no cut is drawn or dimensioned there.
    if (notModelled(ridgeJoint)) return empty("S3", ridgeName, ridgeJoint, ridgeNote);
    if (drawing.ridgeJoint === "purlin") return notchSlot("S3", ridgeName, ridgeJoint, null);
    // Opposed or ridge board: the rafter ends in a plumb cut; only the angle (A) and the board's t/2 (B) are dimensioned.
    const endTop = onUpper(ridgeEnd), endFoot = onLower(ridgeEnd);
    const halfBoard = valueOf(ridgeJoint, "Vízszintes futás csökkenése");
    const dimensions: JointDimension[] = halfBoard === undefined ? [] : [{ id: "S3-board", label: "t/2", valueMm: halfBoard, from: endTop, to: { xMm: drawing.ridgeAxisXMm, yMm: endTop.yMm }, kind: "horizontal", outward: { xMm: 0, yMm: 1 }, tier: 0 }];
    const angles: JointAngle[] = plumbAngle === undefined ? [] : [{ id: "S3-plumb-angle", label: "függővágás ∠", valueDegrees: plumbAngle, vertex: endTop, from: { xMm: endTop.xMm, yMm: endTop.yMm - 1 }, to: { xMm: endTop.xMm - cos, yMm: endTop.yMm - sin }, armMm: plumbDepth }];
    const cut: JointCut = { offcut: null, edges: [{ id: "end", label: "gerincvég függővágása", from: endFoot, to: endTop }], markLine: null, points: [{ id: "A", label: "függővágás az alsó élen", at: endFoot }, { id: "M", label: "jelölőpont a felső élen", at: endTop }] };
    return { slot: "S3", name: ridgeName, status: ridgeJoint.status, joint: ridgeJoint, note: ridgeNote, anchor: endFoot, focus: boundsOf([endTop, endFoot, { xMm: drawing.ridgeAxisXMm, yMm: endTop.yMm }], pad), dimensions, angles, cut, positionMm: ridgeEnd / cos };
  })();

  // Overview: chain along the upper edge between the plumb faces, then the full length on a second tier.
  const stations = [
    ...(eaveTop.xMm < 0 ? [{ x: eaveTop.xMm, name: "eresz" }] : []),
    { x: 0, name: "S1" },
    ...(s2.focus ? [{ x: drawing.supports.find((item) => item.id === "purlin")!.face.xMm, name: "S2" }] : []),
    ...(drawing.ridgeJoint === "purlin" && s3.focus ? [{ x: drawing.supports.find((item) => item.id === "ridge")!.face.xMm, name: "S3" }] : []),
    { x: ridgeEnd, name: drawing.ridgeJoint === "board" ? "vég" : "gerinc" },
  ].sort((a, b) => a.x - b.x).filter((station, index, all) => index === 0 || station.x - all[index - 1]!.x > 1e-6);
  const overview: JointDimension[] = stations.slice(1).map((station, index) => {
    const previous = stations[index]!;
    const exact = previous.name === "S1" && station.name === "S2" ? valueOf(purlinJoint, "Felfekvés távolsága") : undefined;
    return { id: `chain-${previous.name}-${station.name}`, label: `${STATION_NAME[previous.name] ?? previous.name}–${STATION_NAME[station.name] ?? station.name}`, valueMm: exact ?? (station.x - previous.x) / cos, from: onUpper(previous.x), to: onUpper(station.x), kind: "aligned", outward: normalUp, tier: 0 };
  });
  // Section depth h (the input), perpendicular to the rafter in the middle of the first notch-free span.
  const depthX = (stations[0]!.x + stations[1]!.x) / 2, depthTop = onUpper(depthX);
  overview.push({ id: "depth", label: "h ⊥", valueMm: depth, from: depthTop, to: { xMm: depthTop.xMm + depth * sin, yMm: depthTop.yMm - depth * cos }, kind: "aligned", outward: along, tier: 0, inline: true });
  overview.push({ id: "total", label: "L", valueMm: valueOf(ridgeJoint, "Szarufa teljes hossza") ?? (ridgeEnd - eaveTop.xMm) / cos, from: eaveTop, to: ridgeTop, kind: "aligned", outward: normalUp, tier: 1 });

  const slots = [s1, s2, s3] as const;
  const endCuts: CutEdge[] = [
    { id: "eave-end", label: "ereszvég függővágása", from: onLower(eaveTop.xMm), to: eaveTop },
    ...(drawing.ridgeJoint === "purlin" ? [{ id: "ridge-end", label: "gerincvég függővágása", from: onLower(ridgeEnd), to: ridgeTop }] : []),
  ];
  const stationList = [
    ...(eaveTop.xMm < 0 ? [{ id: "eave-end", label: "ereszvég", positionMm: -overview[0]!.valueMm }] : []),
    ...slots.flatMap((slot) => slot.positionMm === null ? [] : [{ id: slot.slot, label: slot.name, positionMm: slot.positionMm }]),
    ...(drawing.ridgeJoint === "purlin" && !notModelled(ridgeJoint) ? [{ id: "ridge-end", label: "gerincvég", positionMm: ridgeEnd / cos }] : []),
  ];
  const bounds = boundsOf([...drawing.outline, ...supports.flatMap((shape) => [...shape.bearing, ...shape.schematic.flat()])]);
  const focusBoxes = slots.flatMap((slot) => slot.focus ? [slot.focus] : []);
  return {
    slots,
    section: { outline: drawing.outline, lowerEdge: [onLower(eaveTop.xMm), onLower(ridgeEnd)], ridgeAxisXMm: drawing.ridgeAxisXMm, pitchDegrees: joints.pitchDegrees, origin: onUpper(0), endCuts, stations: stationList, depthMm: depth, supports, overview, bounds, focus: focusBoxes.length > 1 ? union(focusBoxes) : bounds },
  };
}

const STATION_NAME: Readonly<Record<string, string>> = { S1: "talpszelemen", S2: "derékszelemen", S3: "gerincszelemen" };

/**
 * The opposite roof side of a common cross-section: the same model mirrored about its own ridge axis (x → 2·axis − x).
 * Values are untouched; only points and outward directions flip, so every dimension still runs between model points.
 */
export function mirrorRafterJointDrawingModel(model: RafterJointDrawingModel): RafterJointDrawingModel {
  const section = model.section;
  if (!section) return model;
  const axis = section.ridgeAxisXMm;
  const p = (point: MmPoint): MmPoint => ({ xMm: 2 * axis - point.xMm, yMm: point.yMm });
  const v = (vector: MmPoint): MmPoint => ({ xMm: -vector.xMm, yMm: vector.yMm });
  const box = (b: MmBounds): MmBounds => ({ minX: 2 * axis - b.maxX, maxX: 2 * axis - b.minX, minY: b.minY, maxY: b.maxY });
  const dim = (d: JointDimension): JointDimension => ({ ...d, from: p(d.from), to: p(d.to), outward: v(d.outward) });
  const edge = (e: CutEdge): CutEdge => ({ ...e, from: p(e.from), to: p(e.to) });
  const slots = model.slots.map((slot): JointSlot => ({
    ...slot, anchor: slot.anchor && p(slot.anchor), focus: slot.focus && box(slot.focus), dimensions: slot.dimensions.map(dim),
    angles: slot.angles.map((a) => ({ ...a, vertex: p(a.vertex), from: p(a.from), to: p(a.to) })),
    cut: slot.cut && { offcut: slot.cut.offcut && slot.cut.offcut.map(p), edges: slot.cut.edges.map(edge), markLine: slot.cut.markLine && [p(slot.cut.markLine[0]), p(slot.cut.markLine[1])], points: slot.cut.points.map((point) => ({ ...point, at: p(point.at) })) },
  })) as unknown as RafterJointDrawingModel["slots"];
  return {
    slots,
    section: {
      ...section, outline: section.outline.map(p), lowerEdge: [p(section.lowerEdge[0]), p(section.lowerEdge[1])], origin: p(section.origin), endCuts: section.endCuts.map(edge),
      supports: section.supports.map((shape) => ({ ...shape, bearing: shape.bearing.map(p), schematic: shape.schematic.map((line) => line.map(p)) })),
      overview: section.overview.map(dim), bounds: box(section.bounds), focus: box(section.focus),
    },
  };
}

/** Screen camera: px per mm and the mm point in the canvas centre; labels stay in px, so they never scale with the zoom. */
export type DrawingCamera = Readonly<{ scale: number; centerX: number; centerY: number }>;
export type CanvasSize = Readonly<{ width: number; height: number }>;

export function fitCamera(bounds: MmBounds, size: CanvasSize, paddingPx: number): DrawingCamera {
  const width = Math.max(bounds.maxX - bounds.minX, 1), height = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(Math.max(size.width - 2 * paddingPx, 1) / width, Math.max(size.height - 2 * paddingPx, 1) / height);
  return { scale, centerX: (bounds.minX + bounds.maxX) / 2, centerY: (bounds.minY + bounds.maxY) / 2 };
}

export const projectPoint = (camera: DrawingCamera, size: CanvasSize, point: MmPoint) =>
  ({ x: size.width / 2 + (point.xMm - camera.centerX) * camera.scale, y: size.height / 2 - (point.yMm - camera.centerY) * camera.scale });

/** Zooms by factor around a canvas point that stays put; the scale is clamped to [minScale, maxScale]. */
export function zoomCameraAt(camera: DrawingCamera, size: CanvasSize, factor: number, at: Readonly<{ x: number; y: number }>, minScale: number, maxScale: number): DrawingCamera {
  const scale = Math.min(maxScale, Math.max(minScale, camera.scale * (Number.isFinite(factor) && factor > 0 ? factor : 1)));
  const mmX = camera.centerX + (at.x - size.width / 2) / camera.scale, mmY = camera.centerY - (at.y - size.height / 2) / camera.scale;
  return { scale, centerX: mmX - (at.x - size.width / 2) / scale, centerY: mmY + (at.y - size.height / 2) / scale };
}

export const panCamera = (camera: DrawingCamera, dxPx: number, dyPx: number): DrawingCamera =>
  ({ ...camera, centerX: camera.centerX - dxPx / camera.scale, centerY: camera.centerY + dyPx / camera.scale });

type ScreenPoint = Readonly<{ x: number; y: number }>;
export type LabelBox = Readonly<{ point: ScreenPoint; width: number; height: number; anchor: "start" | "middle" | "end" }>;
const boxLeft = (box: LabelBox) => box.anchor === "start" ? box.point.x : box.anchor === "end" ? box.point.x - box.width : box.point.x - box.width / 2;

/** True when a screen segment passes through the label's box (sampled every 2 px, enough for px-sized labels). */
export function labelHitsSegment(box: LabelBox, from: ScreenPoint, to: ScreenPoint, gap = 2): boolean {
  const left = boxLeft(box) - gap, right = left + box.width + 2 * gap, top = box.point.y - box.height / 2 - gap, bottom = box.point.y + box.height / 2 + gap;
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 2));
  for (let i = 0; i <= steps; i++) {
    const x = from.x + (to.x - from.x) * i / steps, y = from.y + (to.y - from.y) * i / steps;
    if (x >= left && x <= right && y >= top && y <= bottom) return true;
  }
  return false;
}

/** Moves a label along `move` (both ways, growing steps) until it no longer covers a cut edge; geometry never moves. */
export function nudgeOffSegments(box: LabelBox, segments: readonly (readonly [ScreenPoint, ScreenPoint])[], move: ScreenPoint, step: number): ScreenPoint {
  const n = Math.hypot(move.x, move.y) || 1, ux = move.x / n, uy = move.y / n;
  for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
    const point = { x: box.point.x + ux * k * step, y: box.point.y + uy * k * step };
    if (segments.every(([from, to]) => !labelHitsSegment({ ...box, point }, from, to))) return point;
  }
  return box.point;
}

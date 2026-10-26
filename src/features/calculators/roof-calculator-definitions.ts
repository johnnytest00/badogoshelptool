import { constructionCalculatorCatalog } from "@/domain/calculations/construction/catalog";

import { calculateExistingRoofGeometry, calculateRafterGeometry, calculateTriangularTrussGeometry } from "@/domain/calculations/construction/roofs";

import { calculateRafterJoints, HAP_HELP, HAP_INPUT_LABEL, PURLIN_FACE_HELP, PURLIN_TOP_HELP, rafterJointInputFromFields } from "@/domain/calculations/construction/rafter-joints";

import { calculateRoofMaterialTakeoff, type RoofMaterialTakeoffInputs } from "@/domain/calculations/roof-material-takeoff";

import { birdsmouthLines, planeBirdsmouthsFor } from "@/domain/calculations/construction/plane-birdsmouth";

import type { RoofGeometryInput, RoofGeometryType } from "@/domain/calculations/roof-geometry";

import { roofGeometryInputFromFields } from "@/domain/calculations/roof-calculation-snapshot";

import type { CalculatorDefinition, Field, ResultLine } from "./construction-calculator-types";

const mm = (value: Record<string, unknown>, key: string) => Number(value[key]);

const reference = (id: string) => constructionCalculatorCatalog.find((item) => item.id === id)!;

const ROOF_SHAPE_OPTIONS = [
  { value: "gable", label: "Nyeregtető" }, { value: "shed", label: "Félnyeregtető" }, { value: "hip", label: "Kontytető" }, { value: "pyramid", label: "Sátortető" },
  { value: "halfHip", label: "Félkontytető" }, { value: "lShape", label: "L alaprajzú tető" }, { value: "tShape", label: "T alaprajzú tető" }, { value: "mansard", label: "Manzárdtető" },
] as const;

const RECTANGULAR_SHAPES = ["gable", "shed", "hip", "halfHip", "lShape", "tShape", "mansard"] as const;

const roofShapeFields: readonly Field[] = [
  { key: "roofShape", label: "Tetőforma", unit: "", initial: "gable", kind: "select", options: ROOF_SHAPE_OPTIONS },
  { key: "sideMm", label: "Négyzet oldalhossza", unit: "mm", integer: true, shapes: ["pyramid"] },
  { key: "lengthMm", label: "Tető hossza", unit: "mm", integer: true, shapes: RECTANGULAR_SHAPES },
  { key: "widthMm", label: "Tető szélessége", unit: "mm", integer: true, shapes: RECTANGULAR_SHAPES },
  { key: "pitchDegrees", label: "Tetőhajlás", unit: "°", shapes: ["gable", "shed", "hip", "pyramid", "halfHip", "lShape", "tShape"] },
  { key: "lowerRunMm", label: "Alsó szakasz vízszintes futása · oldalanként", unit: "mm", integer: true, shapes: ["mansard"] },
  { key: "lowerRiseMm", label: "Alsó szakasz emelkedése", unit: "mm", integer: true, shapes: ["mansard"] },
  { key: "upperRiseMm", label: "Felső szakasz emelkedése", unit: "mm", integer: true, shapes: ["mansard"] },
  { key: "eaveOverhangMm", label: "Ereszkiülés a lejtés irányában", unit: "mm", initial: "0", integer: true, shapes: ["gable", "shed"] },
  { key: "frontGableOverhangMm", label: "Homlokzati kiülés · elöl", unit: "mm", integer: true, advanced: true, placeholder: "nincs megadva", shapes: ["gable"] },
  { key: "rearGableOverhangMm", label: "Homlokzati kiülés · hátul", unit: "mm", integer: true, advanced: true, placeholder: "nincs megadva", shapes: ["gable"] },
  { key: "hipEaveHeightMm", label: "Félkonty ereszmagassága", unit: "mm", integer: true, shapes: ["halfHip"] },
  { key: "wingWidthMm", label: "Szárny szélessége", unit: "mm", integer: true, shapes: ["lShape", "tShape"] },
  { key: "wingProjectionMm", label: "Szárny kiülése", unit: "mm", integer: true, shapes: ["lShape", "tShape"] },
];

export const roofShapeOf = (values: Record<string, unknown>): RoofGeometryType => {
  const shape = String(values.roofShape ?? "gable");
  return (ROOF_SHAPE_OPTIONS.some((option) => option.value === shape) ? shape : "gable") as RoofGeometryType;
};

const roofGeometryInputFor = (values: Record<string, unknown>): RoofGeometryInput => roofGeometryInputFromFields(roofShapeOf(values), values);

const RIDGE_JOINT_OPTIONS = [{ value: "opposed", label: "Szembefutó szarufák" }, { value: "board", label: "Gerincdeszkára fut" }, { value: "purlin", label: "Gerincszelemenre fekszik" }] as const;
/** Shapes whose eave rafters can end on a ridge running along the eave; shed, pyramid and mansard eave planes never do. */
const RIDGE_SHAPES = ["gable", "hip", "halfHip", "lShape", "tShape"] as const;
const jointsOn = { key: "birdsmouth", values: ["true"] } as const;

/**
 * Rafter joint fields (M9.3 phase 1, M9.5): only when asked for, and only with a rafter layout (D1 reference, see plane-birdsmouth.ts).
 * Order: wall plate and HAP, optional purlin, ridge type, then only the data that ridge type needs. Same keys and meaning as roof.rafter-cut.
 */
const birdsmouthFields: readonly Field[] = [
  { key: "birdsmouth", label: "Szarufacsatlakozások számítása (KARMI, szelemenek, gerinc)", unit: "", kind: "checkbox", advanced: true },
  { key: "seatCutHeightMm", label: HAP_INPUT_LABEL, help: HAP_HELP, figure: "hap", unit: "mm", advanced: true, visibleWhen: jointsOn },
  { key: "plateWidthMm", label: "Talpszelemen szélessége · ellenőrzéshez", unit: "mm", advanced: true, positive: true, placeholder: "nincs megadva", visibleWhen: jointsOn },
  { key: "purlinFaceMm", label: "Derékszelemen ereszoldali síkja · vízszintesen a talpszelemen külső síkjától", help: PURLIN_FACE_HELP, unit: "mm", advanced: true, placeholder: "nincs derékszelemen", visibleWhen: jointsOn },
  { key: "purlinTopMm", label: "Derékszelemen felső síkja · a talpszelemen felső síkja felett", help: PURLIN_TOP_HELP, figure: "purlin", unit: "mm", advanced: true, placeholder: "nincs derékszelemen", visibleWhen: jointsOn },
  { key: "ridgeJoint", label: "Gerinckapcsolat", unit: "", initial: "opposed", kind: "select", advanced: true, options: RIDGE_JOINT_OPTIONS, shapes: RIDGE_SHAPES, visibleWhen: jointsOn },
  { key: "ridgeBoardThicknessMm", label: "Gerincdeszka vastagsága", unit: "mm", advanced: true, positive: true, shapes: RIDGE_SHAPES, visibleWhen: [jointsOn, { key: "ridgeJoint", values: ["board"] }] },
  { key: "ridgePurlinWidthMm", label: "Gerincszelemen szélessége", unit: "mm", advanced: true, positive: true, shapes: RIDGE_SHAPES, visibleWhen: [jointsOn, { key: "ridgeJoint", values: ["purlin"] }] },
  { key: "ridgePurlinTopMm", label: "Gerincszelemen felső síkja · a talpszelemen felső síkja felett", unit: "mm", advanced: true, shapes: RIDGE_SHAPES, visibleWhen: [jointsOn, { key: "ridgeJoint", values: ["purlin"] }] },
];

const ROOF_ADVANCED_HELP = "A homlokzati kiülés üresen hagyva 0 mm-nek számít, és az eredmény ezt jelzi; a 0 beírása kifejezetten megadott érték. Szarufacsatlakozások: a szelemen- és gerincadatok a fő tetőoldal saját függőleges keresztmetszetében értendők, ugyanúgy, mint a „Szarufa kiszabása” kalkulátorban (vízszintes hely a talpszelemen külső síkjától, magasság a talpszelemen felső síkjától). Eltérő keresztmetszetű tetősíkra (pl. L/T szárny, félkonty) nem alkalmazzuk; ott a csatlakozás „nem támogatott”.";

export function takeoffLines(input: Record<string, unknown>, context: RoofMaterialTakeoffInputs | undefined): ResultLine[] {
  if (!context) return [];
  const geometry = calculateExistingRoofGeometry(roofGeometryInputFor(input));
  const takeoff = calculateRoofMaterialTakeoff(geometry, context);
  const timber = takeoff.timber.status === "available" ? takeoff.timber : null;
  return [
    ...takeoff.parts.filter((part) => part.requested && part.id !== "geometry").flatMap((part) => part.quantities.map((quantity) => ({ label: `${part.label} · ${quantity.label}`, value: quantity.value, unit: quantity.unit }))),
    ...birdsmouthLines(planeBirdsmouthsFor(input, context, geometry, timber) ?? []),
  ];
}

export const definitions: Record<string, CalculatorDefinition> = {
"roof.rafter-cut": {
    reference: reference("roof.rafter-cut"), draw: "rafter", note: "Egyetlen szarufa kiszabása. A hosszak a szarufa felső éle mentén értendők; a HAP a szarufa felső élének magassága a talpszelemen felett, a külső függővágási síkban. A fél fesztáv a talpszelemen külső síkjától (a KARMI függővágásától) a gerinctengelyig, a gerincemelkedés a talpszelemen felső síkjától a felső élig mérendő.",
    advancedHelp: "Csomópontok: a szarufa magasságával a KARMI bevágása, a szelemenek helyével és magasságával a felfekvések számíthatók. A magasságokat a talpszelemen felső síkjától, a vízszintes helyeket a talpszelemen külső síkjától mérd. A bevágás megengedhetőségét a rendszer nem ellenőrzi.",
    fields: [{ key: "horizontalHalfSpanMm", label: "Fél fesztáv", unit: "mm" }, { key: "riseMm", label: "Gerincemelkedés", unit: "mm" }, { key: "eaveProjectionMm", label: "Vízszintes ereszkiülés", unit: "mm", initial: "0" }, { key: "seatCutHeightMm", label: HAP_INPUT_LABEL, help: HAP_HELP, figure: "hap", unit: "mm", initial: "0" },
      { key: "rafterDepthMm", label: "Szarufa magassága (keresztmetszet)", unit: "mm", advanced: true, positive: true, placeholder: "nincs megadva" },
      { key: "ridgeJoint", label: "Gerinckapcsolat", unit: "", initial: "opposed", kind: "select", advanced: true, options: RIDGE_JOINT_OPTIONS },
      { key: "ridgeBoardThicknessMm", label: "Gerincdeszka vastagsága", unit: "mm", advanced: true, positive: true, visibleWhen: { key: "ridgeJoint", values: ["board"] } },
      { key: "ridgePurlinWidthMm", label: "Gerincszelemen szélessége", unit: "mm", advanced: true, positive: true, visibleWhen: { key: "ridgeJoint", values: ["purlin"] } },
      { key: "ridgePurlinTopMm", label: "Gerincszelemen felső síkja · a talpszelemen felső síkja felett", unit: "mm", advanced: true, visibleWhen: { key: "ridgeJoint", values: ["purlin"] } },
      { key: "purlinFaceMm", label: "Derékszelemen ereszoldali síkja · vízszintesen a talpszelemen külső síkjától", help: PURLIN_FACE_HELP, unit: "mm", advanced: true, placeholder: "nincs derékszelemen" },
      { key: "purlinTopMm", label: "Derékszelemen felső síkja · a talpszelemen felső síkja felett", help: PURLIN_TOP_HELP, figure: "purlin", unit: "mm", advanced: true, placeholder: "nincs derékszelemen" },
      { key: "plateWidthMm", label: "Talpszelemen szélessége · ellenőrzéshez", unit: "mm", advanced: true, positive: true, placeholder: "nincs megadva" }],
    calculate: (input) => {
      const result = calculateRafterGeometry({ horizontalHalfSpanMm: mm(input, "horizontalHalfSpanMm"), riseMm: mm(input, "riseMm"), eaveProjectionMm: mm(input, "eaveProjectionMm"), seatCutHeightMm: mm(input, "seatCutHeightMm") });
      // Joint values from extra input (class B) are saved with the revision; the angles are already in the base lines.
      const jointLines = calculateRafterJoints(rafterJointInputFromFields(input)).joints.flatMap((joint) => joint.values.filter((item) => item.classification === "B").map((item) => ({ label: `${joint.title} · ${item.label}`, value: item.value, unit: item.unit })));
      return [{ label: "Gerendahossz az ereszig", value: result.bodyLengthMm, unit: "mm" }, { label: "Eresz hossza a gerendán", value: result.eaveLengthMm, unit: "mm" }, { label: "Szarufa teljes hossza", value: result.slopeLengthMm, unit: "mm" }, { label: "Tetőhajlás", value: result.pitchDegrees, unit: "°" }, { label: "Bevágás szöge", value: result.plumbCutToBoardAxisDegrees, unit: "°" }, ...jointLines];
    },
  },
"roof.material-takeoff": {
    reference: reference("roof.material-takeoff"), draw: "roof", note: "Válaszd ki a tetőformát, add meg a méreteket, majd jelöld, mely anyagokat számolja. Az anyagot kiválaszthatod terméklistából vagy kézzel is megadhatod.",
    advancedHelp: ROOF_ADVANCED_HELP,
    fields: [...roofShapeFields, ...birdsmouthFields],
    calculate: (input, context) => takeoffLines(input, context),
  },
"roof.timber-cutlist": {
    reference: reference("roof.timber-cutlist"), draw: "roof", note: "Szarufa- és léckiosztás elemenkénti vágáslistával. A hosszak névleges geometriai hosszak, vágási ráhagyás nélkül.",
    advancedHelp: ROOF_ADVANCED_HELP,
    fields: [...roofShapeFields, ...birdsmouthFields],
    calculate: (input, context) => takeoffLines(input, context && { ...context, requested: { timber: true, underlay: false, covering: false } }),
  },
"roof.truss-members": {
    reference: reference("roof.truss-members"), draw: "truss", note: "Az egyszerű háromszög burkológeometriája és csomóponti osztása. A belső rácsozatot és a teherbírást nem tervezi.",
    fields: [{ key: "spanMm", label: "Fesztáv", unit: "mm" }, { key: "riseMm", label: "Szerkezeti magasság", unit: "mm" }, { key: "panelCountPerHalf", label: "Fél fesztáv osztásainak száma", unit: "db", integer: true }],
    calculate: (input) => { const result = calculateTriangularTrussGeometry({ spanMm: mm(input, "spanMm"), riseMm: mm(input, "riseMm"), panelCountPerHalf: mm(input, "panelCountPerHalf") }); return [{ label: "Felső öv egyik fele", value: result.halfRafterMm, unit: "mm" }, { label: "Talpszög", value: result.baseAngleDegrees, unit: "°" }, { label: "Fél fesztáv osztása", value: result.panelWidthMm, unit: "mm" }]; },
  }
};

import { constructionCalculatorCatalog } from "@/domain/calculations/construction/catalog";

import { calculateExistingRoofGeometry, calculateRafterGeometry, calculateTriangularTrussGeometry } from "@/domain/calculations/construction/roofs";

import { calculateRoofMaterialTakeoff, type RoofMaterialTakeoffInputs } from "@/domain/calculations/roof-material-takeoff";

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

export function takeoffLines(input: Record<string, unknown>, context: RoofMaterialTakeoffInputs | undefined): ResultLine[] {
  if (!context) return [];
  const takeoff = calculateRoofMaterialTakeoff(calculateExistingRoofGeometry(roofGeometryInputFor(input)), context);
  return takeoff.parts.filter((part) => part.requested && part.id !== "geometry").flatMap((part) => part.quantities.map((quantity) => ({ label: `${part.label} · ${quantity.label}`, value: quantity.value, unit: quantity.unit })));
}

export const definitions: Record<string, CalculatorDefinition> = {
"roof.rafter-cut": {
    reference: reference("roof.rafter-cut"), draw: "rafter", note: "Egyetlen szarufa kiszabása. A hosszak a szarufa felső éle mentén értendők; a madárszáj vízszintes vágása ezt az élt süllyeszti a falnál.",
    fields: [{ key: "horizontalHalfSpanMm", label: "Fél fesztáv", unit: "mm" }, { key: "riseMm", label: "Gerincemelkedés", unit: "mm" }, { key: "eaveProjectionMm", label: "Vízszintes ereszkiülés", unit: "mm", initial: "0" }, { key: "seatCutHeightMm", label: "Madárszáj vízszintes vágásának magassága", unit: "mm", initial: "0" }],
    calculate: (input) => {
      const result = calculateRafterGeometry({ horizontalHalfSpanMm: mm(input, "horizontalHalfSpanMm"), riseMm: mm(input, "riseMm"), eaveProjectionMm: mm(input, "eaveProjectionMm"), seatCutHeightMm: mm(input, "seatCutHeightMm") });
      return [{ label: "Gerendahossz az ereszig", value: result.bodyLengthMm, unit: "mm" }, { label: "Eresz hossza a gerendán", value: result.eaveLengthMm, unit: "mm" }, { label: "Szarufa teljes hossza", value: result.slopeLengthMm, unit: "mm" }, { label: "Tetőhajlás", value: result.pitchDegrees, unit: "°" }, { label: "Bevágás szöge", value: result.plumbCutToBoardAxisDegrees, unit: "°" }];
    },
  },
"roof.material-takeoff": {
    reference: reference("roof.material-takeoff"), draw: "roof", note: "Válaszd ki a tetőformát, add meg a méreteket, majd jelöld, mely anyagokat számolja. Az anyagot kiválaszthatod terméklistából vagy kézzel is megadhatod.",
    advancedHelp: "A homlokzati kiülés üresen hagyva 0 mm-nek számít, és az eredmény ezt jelzi; a 0 beírása kifejezetten megadott érték.",
    fields: roofShapeFields,
    calculate: (input, context) => takeoffLines(input, context),
  },
"roof.timber-cutlist": {
    reference: reference("roof.timber-cutlist"), draw: "roof", note: "Szarufa- és léckiosztás elemenkénti vágáslistával. A hosszak névleges geometriai hosszak, vágási ráhagyás nélkül.",
    advancedHelp: "A homlokzati kiülés üresen hagyva 0 mm-nek számít, és az eredmény ezt jelzi; a 0 beírása kifejezetten megadott érték.",
    fields: roofShapeFields,
    calculate: (input, context) => takeoffLines(input, context && { ...context, requested: { timber: true, underlay: false, covering: false } }),
  },
"roof.truss-members": {
    reference: reference("roof.truss-members"), draw: "truss", note: "Az egyszerű háromszög burkológeometriája és csomóponti osztása. A belső rácsozatot és a teherbírást nem tervezi.",
    fields: [{ key: "spanMm", label: "Fesztáv", unit: "mm" }, { key: "riseMm", label: "Szerkezeti magasság", unit: "mm" }, { key: "panelCountPerHalf", label: "Fél fesztáv osztásainak száma", unit: "db", integer: true }],
    calculate: (input) => { const result = calculateTriangularTrussGeometry({ spanMm: mm(input, "spanMm"), riseMm: mm(input, "riseMm"), panelCountPerHalf: mm(input, "panelCountPerHalf") }); return [{ label: "Felső öv egyik fele", value: result.halfRafterMm, unit: "mm" }, { label: "Talpszög", value: result.baseAngleDegrees, unit: "°" }, { label: "Fél fesztáv osztása", value: result.panelWidthMm, unit: "mm" }]; },
  }
};

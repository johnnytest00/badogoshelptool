"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { z } from "zod";
import { ChevronDown, Search } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { RoofWorkspace } from "@/features/roof-models/roof-workspace";
import { MeasurementGuidance, measurementGuideFor } from "@/features/roof-models/measurement-guidance";
import { constructionCalculatorCatalog, type ConstructionCalculatorCategory, type ConstructionReference } from "@/domain/calculations/construction/catalog";
import { calculateConcreteMix, calculateConcreteRing, calculateCylindricalPiles, calculateFoundationSlab, calculatePavingMaterials, calculateRectangularBlindArea, calculateReinforcementBars, calculateReinforcementMesh, calculateRightAngleDiagonal, calculateStripFoundation } from "@/domain/calculations/construction/concrete";
import { calculateExistingRoofGeometry, calculateRafterGeometry, calculateTriangularTrussGeometry } from "@/domain/calculations/construction/roofs";
import { calculateBeveledRiserGeometry, calculateConcreteStairGeometry, calculateLandingStairGeometry, calculateSpiralStairGeometry, calculateStraightStairGeometry } from "@/domain/calculations/construction/stairs";
import { calculateWinderStairGeometry } from "@/domain/calculations/construction/winder-stairs";
import { mmToM } from "@/domain/calculations/construction/numeric";
import { calculateRoofMaterialTakeoff, roofTakeoffCriticalWarnings, type RoofMaterialTakeoff, type RoofMaterialTakeoffInputs, type RoofMaterialTakeoffStatus } from "@/domain/calculations/roof-material-takeoff";
import type { RoofGeometry, RoofGeometryInput, RoofGeometryType } from "@/domain/calculations/roof-geometry";
import { roofTimberInputFromParameters, type RoofTimberInput } from "@/domain/calculations/roof-timber-layout";
import type { RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import type { RoofUnderlayLayout } from "@/domain/calculations/roof-underlay";
import { DEMO_MATERIAL_PROFILES, type MaterialProfile, coveringParametersFromSpec, createSpecSnapshot, overhangFromField, resolveMaterialSpec, timberParametersFromSpecs, underlayParametersFromSpec } from "@/domain/calculations/roof-material-spec";
import { createCalculationSnapshot, roofGeometryInputFromFields } from "@/domain/calculations/roof-calculation-snapshot";
import { RoofMaterialInputs, initialMaterialState, type RoofMaterialUiState } from "./material-spec-editor";
import { RoofGeometryResults } from "@/features/roof-models/roof-geometry-results";
import { ConstructionCalculatorThumbnail, ConstructionMaterialDrawing, ConstructionStairDrawing } from "./construction-visuals";

type Field = { key: string; label: string; unit: string; initial?: string; integer?: boolean; advanced?: boolean; placeholder?: string; kind?: "text" | "checkbox" | "select"; options?: readonly { value: string; label: string }[]; shapes?: readonly string[] };
type ResultLine = { label: string; value: number | string; unit: string };
type CalculatorDefinition = { reference: ConstructionReference; fields: readonly Field[]; draw: "roof" | "rafter" | "truss" | "stairs" | "spiral" | "bevel" | "rectangle" | "ring" | "mesh" | "diagonal"; note: string; advancedHelp?: string; calculate: (input: Record<string, unknown>, context?: RoofMaterialTakeoffInputs) => ResultLine[] };

const TechnicalDrawing = dynamic(() => import("@/features/roof-models/technical-drawing").then((module) => module.TechnicalDrawing), {
  ssr: false,
  loading: () => <div className="construction-calculator-drawing" role="status">Tetőrajz betöltése…</div>,
});

const mm = (value: Record<string, unknown>, key: string) => Number(value[key]);
const nullableMm = (value: Record<string, unknown>, key: string) => value[key] === undefined || value[key] === null || value[key] === "" ? null : Number(value[key]);
const formatHuNumber = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(value);

const reference = (id: string) => constructionCalculatorCatalog.find((item) => item.id === id)!;

const ROOF_SHAPE_OPTIONS = [
  { value: "gable", label: "Nyeregtető" }, { value: "shed", label: "Félnyeregtető" }, { value: "hip", label: "Kontytető" }, { value: "pyramid", label: "Sátortető" },
  { value: "halfHip", label: "Félkontytető" }, { value: "lShape", label: "L alaprajzú tető" }, { value: "tShape", label: "T alaprajzú tető" }, { value: "mansard", label: "Manzárdtető" },
] as const;
const RECTANGULAR_SHAPES = ["gable", "shed", "hip", "halfHip", "lShape", "tShape", "mansard"] as const;

/** Shape is an input, so the dimension fields follow the selected shape instead of the calculator. */
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

/** Both timber-based calculators read their lines from the one takeoff pipeline; unrequested groups yield nothing. */
export function takeoffLines(input: Record<string, unknown>, context: RoofMaterialTakeoffInputs | undefined): ResultLine[] {
  if (!context) return [];
  const takeoff = calculateRoofMaterialTakeoff(calculateExistingRoofGeometry(roofGeometryInputFor(input)), context);
  return takeoff.parts.filter((part) => part.requested && part.id !== "geometry").flatMap((part) => part.quantities.map((quantity) => ({ label: `${part.label} · ${quantity.label}`, value: quantity.value, unit: quantity.unit })));
}

const definitions: Record<string, CalculatorDefinition> = {
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
  },
  "stair.wood.closed_straight": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "stair.wood.closed_straight")!, draw: "stairs", note: "Fellépőmagasság és belépő a megadott összemelkedésből, vízszintes helyből és fellépőszámból. A kényelmi képlet tájékoztató.",
    advancedHelp: "A kar szélességének megadásával az alaprajzi nézet is méretarányosan megjelenik. Az oldalnézeti eredményekhez nem szükséges.",
    fields: [{ key: "totalRiseMm", label: "Padlószintek közötti teljes emelkedés", unit: "mm" }, { key: "availableRunMm", label: "Vízszintes helyigény", unit: "mm" }, { key: "riserCount", label: "Fellépések száma", unit: "db", integer: true }, { key: "stairWidthMm", label: "Lépcsőkar szélessége · alaprajzi nézethez", unit: "mm", advanced: true }],
    calculate: (input) => { const width = nullableMm(input, "stairWidthMm"); const result = calculateStraightStairGeometry({ totalRiseMm: mm(input, "totalRiseMm"), availableRunMm: mm(input, "availableRunMm"), riserCount: mm(input, "riserCount"), ...(width === null ? {} : { stairWidthMm: width }) }); return [{ label: "Egy fellépő", value: result.riserHeightMm, unit: "mm" }, { label: "Fokok száma", value: result.treadCount, unit: "db" }, { label: "Belépő", value: result.goingMm, unit: "mm" }, { label: "Pofafa/tartó tengelyének geometriai hossza", value: result.stringerLengthMm, unit: "mm" }, { label: "Lépcsőhajlás", value: result.pitchDegrees, unit: "°" }, { label: "2 × fellépő + belépő", value: result.stepRuleMm, unit: "mm" }]; },
  },
  "stair.wood.spiral": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "stair.wood.spiral")!, draw: "spiral", note: "A járóvonal-sugár a belső és külső sugár számtani közepe. A felső padló az utolsó fellépés, ezért a vízszintes fokok száma eggyel kevesebb.",
    fields: [{ key: "totalRiseMm", label: "Padlószintek közötti teljes emelkedés", unit: "mm" }, { key: "outerDiameterMm", label: "Külső átmérő", unit: "mm" }, { key: "innerDiameterMm", label: "Belső átmérő", unit: "mm" }, { key: "turnDegrees", label: "Teljes fordulási szög", unit: "°" }, { key: "riserCount", label: "Fellépések száma", unit: "db", integer: true }],
    calculate: (input) => { const result = calculateSpiralStairGeometry({ totalRiseMm: mm(input, "totalRiseMm"), outerDiameterMm: mm(input, "outerDiameterMm"), innerDiameterMm: mm(input, "innerDiameterMm"), turnDegrees: mm(input, "turnDegrees"), riserCount: mm(input, "riserCount") }); return [{ label: "Egy fellépő", value: result.riserHeightMm, unit: "mm" }, { label: "Fokok száma", value: result.treadCount, unit: "db" }, { label: "Járóvonal-belépő / fok", value: result.walkingGoingMm, unit: "mm" }, { label: "Járóvonal teljes ívhossza", value: result.walkingLineLengthMm, unit: "mm" }, { label: "Járóvonal sugara", value: result.walkingRadiusMm, unit: "mm" }, { label: "Fok szögszélessége", value: result.stepAngleDegrees, unit: "°" }, { label: "Lépcsőhajlás a kiterített járóvonalon", value: result.pitchDegrees, unit: "°" }, { label: "2 × fellépő + járóvonal-belépő", value: result.stepRuleMm, unit: "mm" }, { label: "Alaprajzi fokfelület összege", value: result.planAreaM2, unit: "m²" }]; },
  },
  "stair.beveled_riser": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "stair.beveled_riser")!, draw: "bevel", note: "A belépő és fellépő derékszögű profilgeometriája. A megadott orrkiülés módosítja a vízszintes vetületet; illesztési és rögzítési levonást nem számít.",
    advancedHelp: "Az orrkiülés a megadott belépőn túli vízszintes kinyúlást veszi figyelembe. Üresen hagyva a számítás a megadott belépővel készül, hozzáadott kiülés nélkül.",
    fields: [{ key: "goingMm", label: "Belépő", unit: "mm" }, { key: "riserHeightMm", label: "Fellépő", unit: "mm" }, { key: "nosingProjectionMm", label: "Orrkiülés", unit: "mm", advanced: true }],
    calculate: (input) => { const nosingProjectionMm = nullableMm(input, "nosingProjectionMm"); const result = calculateBeveledRiserGeometry({ goingMm: mm(input, "goingMm"), riserHeightMm: mm(input, "riserHeightMm"), ...(nosingProjectionMm === null ? {} : { nosingProjectionMm }) }); return [{ label: "Belépő és megadott orrkiülés", value: result.horizontalMm, unit: "mm" }, { label: "Geometriai átló", value: result.diagonalMm, unit: "mm" }, { label: "Ferde elem hajlásszöge", value: result.slopeDegrees, unit: "°" }, { label: "Merőleges szögkiegészítés", value: result.bevelAngleDegrees, unit: "°" }]; },
  },
  "concrete.strip": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "concrete.strip")!, draw: "rectangle", note: "A teljes középvonalhossz a felhasználó által előre összesített méret; belső sarkokat nem duplázza automatikusan.",
    fields: [{ key: "totalCenterlineLengthMm", label: "Sávalap összes tengelyhossza", unit: "mm" }, { key: "widthMm", label: "Szélesség", unit: "mm" }, { key: "depthMm", label: "Mélység", unit: "mm" }],
    calculate: (input) => { const result = calculateStripFoundation({ totalCenterlineLengthMm: mm(input, "totalCenterlineLengthMm"), widthMm: mm(input, "widthMm"), depthMm: mm(input, "depthMm") }); return [{ label: "Geometriai betonmennyiség", value: result.volumeM3, unit: "m³" }, { label: "Két oldalfelület zsaluzata", value: result.twoSideFormworkM2, unit: "m²" }, { label: "Szakaszok névleges alapfelülete · tengelyhossz × szélesség", value: result.nominalPlanAreaM2, unit: "m²" }]; },
  },
  "concrete.pile": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "concrete.pile")!, draw: "ring", note: "Csak egyenes, kör keresztmetszetű cölöpszár. Talpbővítés és szerkezeti megfelelőség nincs.",
    fields: [{ key: "count", label: "Cölöpök száma", unit: "db", integer: true }, { key: "diameterMm", label: "Átmérő", unit: "mm" }, { key: "lengthMm", label: "Hossz", unit: "mm" }],
    calculate: (input) => { const result = calculateCylindricalPiles({ count: mm(input, "count"), diameterMm: mm(input, "diameterMm"), lengthMm: mm(input, "lengthMm") }); return [{ label: "Cölöpök száma", value: result.count, unit: "db" }, { label: "Összes betonmennyiség", value: result.totalVolumeM3, unit: "m³" }, { label: "Egy cölöp térfogata", value: result.onePileM3, unit: "m³" }, { label: "Összes palástfelület", value: result.totalLateralAreaM2, unit: "m²" }, { label: "Összes kör alapfelület", value: result.totalPlanAreaM2, unit: "m²" }]; },
  },
  "concrete.slab": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "concrete.slab")!, draw: "rectangle", note: "Téglalap alakú, állandó vastagságú lemez. A peremzsaluzat a négy oldalt veszi figyelembe.",
    fields: [{ key: "lengthMm", label: "Hossz", unit: "mm" }, { key: "widthMm", label: "Szélesség", unit: "mm" }, { key: "thicknessMm", label: "Vastagság", unit: "mm" }],
    calculate: (input) => { const result = calculateFoundationSlab({ lengthMm: mm(input, "lengthMm"), widthMm: mm(input, "widthMm"), thicknessMm: mm(input, "thicknessMm") }); return [{ label: "Geometriai betonmennyiség", value: result.volumeM3, unit: "m³" }, { label: "Alaprajzi terület", value: result.planAreaM2, unit: "m²" }, { label: "Élzsaluzat", value: result.edgeFormworkM2, unit: "m²" }, { label: "Alaprajzi kerület", value: result.perimeterM, unit: "m" }]; },
  },
  "concrete.ring": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "concrete.ring")!, draw: "ring", note: "Körgyűrű keresztmetszetű, üreges test. A méretek a kész geometriai alakot írják le.",
    fields: [{ key: "outerDiameterMm", label: "Külső átmérő", unit: "mm" }, { key: "wallThicknessMm", label: "Falvastagság", unit: "mm" }, { key: "heightMm", label: "Magasság", unit: "mm" }],
    calculate: (input) => { const result = calculateConcreteRing({ outerDiameterMm: mm(input, "outerDiameterMm"), wallThicknessMm: mm(input, "wallThicknessMm"), heightMm: mm(input, "heightMm") }); return [{ label: "Beton térfogata", value: result.concreteVolumeM3, unit: "m³" }, { label: "Belső átmérő", value: result.innerDiameterMm, unit: "mm" }, { label: "Belső hasznos térfogat", value: result.internalVolumeM3, unit: "m³" }, { label: "Külső palástfelület", value: result.outsideLateralAreaM2, unit: "m²" }, { label: "Belső palástfelület", value: result.insideLateralAreaM2, unit: "m²" }, { label: "Két gyűrűvéglap összege", value: result.annularEndAreaM2 * 2, unit: "m²" }, { label: "Teljes geometriai felület", value: result.totalGeometricSurfaceAreaM2, unit: "m²" }]; },
  },
  "concrete.paving": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "concrete.paving")!, draw: "rectangle", note: "A darabszám csak terület/lap-terület arány. Nem számol vágással, fugával, mintával vagy veszteséggel.",
    advancedHelp: "Az alapréteg vastagságával külön geometriai rétegtérfogat számítható. A terület és a lapmennyiség enélkül is elkészül.",
    fields: [{ key: "lengthMm", label: "Burkolandó hossz", unit: "mm" }, { key: "widthMm", label: "Burkolandó szélesség", unit: "mm" }, { key: "tileLengthMm", label: "Egy lap hossza", unit: "mm" }, { key: "tileWidthMm", label: "Egy lap szélessége", unit: "mm" }, { key: "baseLayerThicknessMm", label: "Megadott alapréteg vastagsága", unit: "mm", advanced: true }],
    calculate: (input) => { const baseLayerThicknessMm = nullableMm(input, "baseLayerThicknessMm"); const result = calculatePavingMaterials({ lengthMm: mm(input, "lengthMm"), widthMm: mm(input, "widthMm"), tileLengthMm: mm(input, "tileLengthMm"), tileWidthMm: mm(input, "tileWidthMm"), ...(baseLayerThicknessMm === null ? {} : { baseLayerThicknessMm }) }); return [{ label: "Burkolandó terület", value: result.areaM2, unit: "m²" }, { label: "Területből számított lapmennyiség", value: result.tilesByArea, unit: "db" }, { label: "Egy lap területe", value: result.tileAreaM2, unit: "m²" }, ...(result.baseLayerVolumeM3 === null ? [] : [{ label: "Megadott alapréteg térfogata", value: result.baseLayerVolumeM3, unit: "m³" }]), { label: "Burkolat geometriai kerülete", value: result.perimeterM, unit: "m" }]; },
  },
  "concrete.blind_area": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "concrete.blind_area")!, draw: "rectangle", note: "Téglalap épületalaprajzot és minden oldalon azonos sávszélességet feltételez.",
    advancedHelp: "A beton és a kavics megadott vastagságával külön rétegtérfogat számítható; a sáv alaprajzi területe ezek nélkül is elérhető.",
    fields: [{ key: "buildingLengthMm", label: "Épület hossza", unit: "mm" }, { key: "buildingWidthMm", label: "Épület szélessége", unit: "mm" }, { key: "apronWidthMm", label: "Körüljáró sáv szélessége", unit: "mm" }, { key: "concreteThicknessMm", label: "Betonréteg vastagsága", unit: "mm", advanced: true }, { key: "gravelThicknessMm", label: "Kavicsréteg vastagsága", unit: "mm", advanced: true }],
    calculate: (input) => { const concreteThicknessMm = nullableMm(input, "concreteThicknessMm"); const gravelThicknessMm = nullableMm(input, "gravelThicknessMm"); const result = calculateRectangularBlindArea({ buildingLengthMm: mm(input, "buildingLengthMm"), buildingWidthMm: mm(input, "buildingWidthMm"), apronWidthMm: mm(input, "apronWidthMm"), ...(concreteThicknessMm === null ? {} : { concreteThicknessMm }), ...(gravelThicknessMm === null ? {} : { gravelThicknessMm }) }); return [{ label: "Sáv területe", value: result.apronAreaM2, unit: "m²" }, { label: "Külső befoglaló hossz × szélesség", value: `${formatHuNumber(result.outerLengthMm)} × ${formatHuNumber(result.outerWidthMm)}`, unit: "mm" }, { label: "Külső peremhossz", value: result.outerPerimeterM, unit: "m" }, { label: "Épület melletti belső peremhossz", value: result.buildingPerimeterM, unit: "m" }, ...(result.concreteVolumeM3 === null ? [] : [{ label: "Megadott betonréteg térfogata", value: result.concreteVolumeM3, unit: "m³" }]), ...(result.gravelVolumeM3 === null ? [] : [{ label: "Megadott kavicsréteg térfogata", value: result.gravelVolumeM3, unit: "m³" }])]; },
  },
  "concrete.mix": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "concrete.mix")!, draw: "rectangle", note: "Minden receptarányt és cementigényt a felhasználó ad meg. Ez tömegarány-alapú mennyiségi becslés, nem betonrecept vagy szilárdsági osztály.",
    advancedHelp: "A zsáktömeg megadásával a szükséges cementzsákok egész darabszáma is kiszámítható.",
    fields: [{ key: "concreteVolumeM3", label: "Szükséges betonmennyiség", unit: "m³" }, { key: "cementKgPerM3", label: "Cementigény", unit: "kg/m³" }, { key: "cementRatio", label: "Cement aránya", unit: "rész" }, { key: "sandRatio", label: "Homok aránya", unit: "rész" }, { key: "aggregateRatio", label: "Kavics / adalék aránya", unit: "rész" }, { key: "bagWeightKg", label: "Zsák tömege", unit: "kg", advanced: true }],
    calculate: (input) => { const bagWeightKg = nullableMm(input, "bagWeightKg"); const result = calculateConcreteMix({ concreteVolumeM3: mm(input, "concreteVolumeM3"), cementKgPerM3: mm(input, "cementKgPerM3"), cementRatio: mm(input, "cementRatio"), sandRatio: mm(input, "sandRatio"), aggregateRatio: mm(input, "aggregateRatio"), ...(bagWeightKg === null ? {} : { bagWeightKg }) }); return [{ label: "Cement", value: result.cementKg, unit: "kg" }, { label: "Homok", value: result.sandKg, unit: "kg" }, { label: "Adalékanyag", value: result.aggregateKg, unit: "kg" }, { label: "Megadott száraz összetevők tömege", value: result.totalSpecifiedDryMaterialKg, unit: "kg" }, ...(result.bagCount === null ? [] : [{ label: "Cementzsák", value: result.bagCount, unit: "db" }])]; },
  },
  "concrete.rebar": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "concrete.rebar")!, draw: "mesh", note: "A megadott rudak darabszámát, összhosszát és geometriai acéltérfogatát számítja. Tömeg csak külön megadott acélsűrűséggel jelenik meg.",
    advancedHelp: "Az acélsűrűség szükséges a tömeg és a folyómétertömeg számításához. Sűrűség nélkül a geometriai hossz és térfogat továbbra is kiszámítható.",
    fields: [{ key: "barDiameterMm", label: "Rúdátmérő", unit: "mm" }, { key: "cutLengthMm", label: "Egy rúd vágott hossza", unit: "mm" }, { key: "pieceCount", label: "Rudak száma", unit: "db", integer: true }, { key: "steelDensityKgPerM3", label: "Acélsűrűség", unit: "kg/m³", advanced: true }],
    calculate: (input) => { const steelDensityKgPerM3 = nullableMm(input, "steelDensityKgPerM3"); const result = calculateReinforcementBars({ barDiameterMm: mm(input, "barDiameterMm"), cutLengthMm: mm(input, "cutLengthMm"), pieceCount: mm(input, "pieceCount"), ...(steelDensityKgPerM3 === null ? {} : { steelDensityKgPerM3 }) }); return [{ label: "Rudak száma", value: result.pieceCount, unit: "db" }, { label: "Teljes rúdhossz", value: result.totalLengthM, unit: "m" }, { label: "Geometriai össztérfogat", value: result.totalSteelVolumeM3, unit: "m³" }, ...(result.totalMassKg === null || result.unitMassKgPerM === null ? [] : [{ label: "Geometriai össztömeg", value: result.totalMassKg, unit: "kg" }, { label: "Tömeg folyóméterenként", value: result.unitMassKgPerM, unit: "kg/m" }])]; },
  },
  "concrete.mesh": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "concrete.mesh")!, draw: "mesh", note: "A megadott osztás felső korlát; a program egyenletes tényleges kiosztást igazít a fedett méretre. Átlapolás nincs.",
    advancedHelp: "Az acélsűrűséggel a háló geometriájából becsült tömeg is kiszámítható. Üresen hagyva a rúd- és osztásadatok továbbra is elérhetők.",
    fields: [{ key: "lengthMm", label: "Háló hossza", unit: "mm" }, { key: "widthMm", label: "Háló szélessége", unit: "mm" }, { key: "coverMm", label: "Vasalás szélső fedés", unit: "mm" }, { key: "spacingMm", label: "Rúdosztás legfeljebb", unit: "mm" }, { key: "barDiameterMm", label: "Rúdátmérő", unit: "mm" }, { key: "steelDensityKgPerM3", label: "Acélsűrűség", unit: "kg/m³", advanced: true }],
    calculate: (input) => { const steelDensityKgPerM3 = nullableMm(input, "steelDensityKgPerM3"); const result = calculateReinforcementMesh({ lengthMm: mm(input, "lengthMm"), widthMm: mm(input, "widthMm"), coverMm: mm(input, "coverMm"), spacingMm: mm(input, "spacingMm"), barDiameterMm: mm(input, "barDiameterMm"), ...(steelDensityKgPerM3 === null ? {} : { steelDensityKgPerM3 }) }); return [{ label: "Hosszanti rudak száma", value: result.lengthwiseBarCount, unit: "db" }, { label: "Keresztirányú rudak száma", value: result.widthwiseBarCount, unit: "db" }, { label: "Rudak összhossza", value: result.totalBarLengthM, unit: "m" }, ...(result.totalMassKg === null ? [] : [{ label: "Geometriai össztömeg", value: result.totalMassKg, unit: "kg" }]), { label: "Rúdkeresztezések száma", value: result.intersectionCount, unit: "db" }, { label: "Tényleges osztás a hossz mentén", value: result.actualSpacingAlongLengthMm, unit: "mm" }, { label: "Tényleges osztás a szélesség mentén", value: result.actualSpacingAlongWidthMm, unit: "mm" }]; },
  },
  "aux.diagonal": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "aux.diagonal")!, draw: "diagonal", note: "Kizárólag geometriai segédszámítás: a két megadott befogóból számít átlót.",
    fields: [{ key: "lengthMm", label: "Hossz", unit: "mm" }, { key: "widthMm", label: "Szélesség", unit: "mm" }],
    calculate: (input) => { const result = calculateRightAngleDiagonal({ lengthMm: mm(input, "lengthMm"), widthMm: mm(input, "widthMm") }); return [{ label: "Átlóhossz", value: result.diagonalMm, unit: "mm" }, { label: "Átló és hossz közötti szög", value: result.angleDegrees, unit: "°" }]; },
  },
};

const straightTemplate = definitions["stair.wood.closed_straight"];
definitions["stair.wood.open_straight"] = { ...straightTemplate, reference: constructionCalculatorCatalog.find((item) => item.id === "stair.wood.open_straight")! };
for (const id of ["stair.metal.straight", "stair.metal.zigzag"]) {
  const reference = constructionCalculatorCatalog.find((item) => item.id === id)!;
  definitions[id] = { ...straightTemplate, reference, note: `${reference.scope} A tartóelem gyártási méreteit és statikáját nem számítja.` };
}

const twoFlightFields: readonly Field[] = [
  { key: "totalRiseMm", label: "Padlószintek közötti teljes emelkedés", unit: "mm" },
  { key: "stairWidthMm", label: "Lépcsőkar szélessége", unit: "mm" },
  { key: "goingMm", label: "Egy kar egységes belépője", unit: "mm" },
  { key: "firstFlightRiserCount", label: "1. kar fellépései", unit: "db", integer: true },
  { key: "secondFlightRiserCount", label: "2. kar fellépései", unit: "db", integer: true },
  { key: "landingDepthMm", label: "Pihenő mélysége", unit: "mm" },
  { key: "turnDirection", label: "Fordulás iránya", unit: "", kind: "select", options: [{ value: "right", label: "Jobbra" }, { value: "left", label: "Balra" }] },
  { key: "openingLengthMm", label: "Ellenőrző alaprajzi hossz", unit: "mm", advanced: true },
  { key: "openingWidthMm", label: "Ellenőrző alaprajzi szélesség", unit: "mm", advanced: true },
];
const uFlightFields: readonly Field[] = [...twoFlightFields, { key: "landingGapMm", label: "Karok közötti hézag", unit: "mm" }];
const threeFlightFields: readonly Field[] = [
  ...twoFlightFields.filter((field) => field.key !== "firstFlightRiserCount" && field.key !== "secondFlightRiserCount" && field.key !== "openingLengthMm" && field.key !== "openingWidthMm"),
  { key: "firstFlightRiserCount", label: "1. kar fellépései", unit: "db", integer: true },
  { key: "secondFlightRiserCount", label: "2. kar fellépései", unit: "db", integer: true },
  { key: "thirdFlightRiserCount", label: "3. kar fellépései", unit: "db", integer: true },
  { key: "openingLengthMm", label: "Ellenőrző alaprajzi hossz", unit: "mm", advanced: true },
  { key: "openingWidthMm", label: "Ellenőrző alaprajzi szélesség", unit: "mm", advanced: true },
];

function landingStairDefinition(id: string, layout: "quarter_turn" | "half_turn" | "three_flight"): CalculatorDefinition {
  const reference = constructionCalculatorCatalog.find((item) => item.id === id)!;
  const fields = layout === "three_flight" ? threeFlightFields : layout === "half_turn" ? uFlightFields : twoFlightFields;
  return {
    reference,
    draw: "stairs",
    advancedHelp: "A tervhossz és tervszélesség ellenőrzi, hogy a kiszámított alaprajzi geometria elfér-e a megadott nyílásban.",
    note: "Egyenletes fellépőt és megadott belépőt használ. A pihenő és a karok mérete explicit bemenet; csak alaprajzi/fokgeometriát számít, nem szerkezeti kialakítást.",
    fields,
    calculate: (input) => {
      const openingLengthMm = nullableMm(input, "openingLengthMm");
      const openingWidthMm = nullableMm(input, "openingWidthMm");
      const landingGapMm = nullableMm(input, "landingGapMm");
      const riserKeys = layout === "three_flight" ? ["firstFlightRiserCount", "secondFlightRiserCount", "thirdFlightRiserCount"] : ["firstFlightRiserCount", "secondFlightRiserCount"];
      const result = calculateLandingStairGeometry({
        layout,
        totalRiseMm: mm(input, "totalRiseMm"),
        stairWidthMm: mm(input, "stairWidthMm"),
        goingMm: mm(input, "goingMm"),
        landingDepthMm: mm(input, "landingDepthMm"),
        flightRiserCounts: riserKeys.map((key) => mm(input, key)),
        turnDirection: input.turnDirection as "left" | "right",
        ...(landingGapMm === null ? {} : { landingGapMm }),
        ...(openingLengthMm === null ? {} : { openingLengthMm }),
        ...(openingWidthMm === null ? {} : { openingWidthMm }),
      });
      return [
        { label: "Egy fellépő minden karon", value: result.riserHeightMm, unit: "mm" },
        { label: "Összes fellépés", value: result.riserCount, unit: "db" },
        { label: "Összes fok", value: result.treadCount, unit: "db" },
        { label: "Lépcsőhajlás", value: result.pitchDegrees, unit: "°" },
        { label: "2 × fellépő + belépő", value: result.stepRuleMm, unit: "mm" },
        { label: "Alaprajzi kiterjedés · hossz", value: result.planWidthMm, unit: "mm" },
        { label: "Alaprajzi kiterjedés · szélesség", value: result.planDepthMm, unit: "mm" },
        { label: "Fokok alaprajzi felülete", value: result.flightTreadSurfaceAreaM2, unit: "m²" },
        { label: "Pihenők alaprajzi felülete", value: result.landingSurfaceAreaM2, unit: "m²" },
        { label: "Karfutások geometriai összhossza", value: result.totalGeometricFlightLengthMm, unit: "mm" },
        ...result.flights.map((flight) => ({ label: `${flight.index}. kar · vízszintes futás`, value: flight.runMm, unit: "mm" })),
        ...result.flightGeometricLengthsMm.map((length, index) => ({ label: `${index + 1}. kar · geometriai tengelyhossz`, value: length, unit: "mm" })),
      ];
    },
  };
}

function winderStairDefinition(id: string, layout: "quarter_turn" | "half_turn" | "three_flight"): CalculatorDefinition {
  const reference = constructionCalculatorCatalog.find((item) => item.id === id)!;
  const fields: readonly Field[] = [
    { key: "totalRiseMm", label: "Padlószintek közötti teljes emelkedés", unit: "mm" },
    { key: "stairWidthMm", label: "Lépcsőkar szélessége", unit: "mm" },
    { key: "innerRadiusMm", label: "Húzott fokok belső sugara", unit: "mm" },
    { key: "lowerTreadCount", label: "Alsó kar fokainak száma", unit: "db", integer: true },
    ...(layout === "three_flight" ? [{ key: "middleTreadCount", label: "Középső kar fokainak száma", unit: "db", integer: true } as const] : []),
    { key: "upperTreadCount", label: "Felső kar fokainak száma", unit: "db", integer: true },
    { key: "windersPerTurn", label: "Húzott fokok száma fordulónként", unit: "db", integer: true },
    { key: "turnDirection", label: "Fordulás iránya", unit: "", kind: "select", options: [{ value: "right", label: "Jobbra" }, { value: "left", label: "Balra" }] },
    { key: "openingLengthMm", label: "Ellenőrző alaprajzi hossz", unit: "mm", advanced: true },
    { key: "openingWidthMm", label: "Ellenőrző alaprajzi szélesség", unit: "mm", advanced: true },
  ];
  return {
    reference,
    draw: "stairs",
    advancedHelp: "A tervhossz és tervszélesség ellenőrzi, hogy a húzott fokos alaprajz elfér-e a megadott nyílásban.",
    note: "Geometriai modell: egyenlő szögosztású, koncentrikus húzott fokok; a járóvonal a kar középvonalán azonos ívhosszal halad. A rajz sem gyártási, sem statikai igazolás.",
    fields,
    calculate: (input) => {
      const result = calculateWinderStairGeometry({
        layout,
        totalRiseMm: mm(input, "totalRiseMm"), stairWidthMm: mm(input, "stairWidthMm"), innerRadiusMm: mm(input, "innerRadiusMm"),
        lowerTreadCount: mm(input, "lowerTreadCount"), upperTreadCount: mm(input, "upperTreadCount"), windersPerTurn: mm(input, "windersPerTurn"),
        turnDirection: input.turnDirection as "left" | "right",
        ...(layout === "three_flight" ? { middleTreadCount: mm(input, "middleTreadCount") } : {}),
        ...(nullableMm(input, "openingLengthMm") === null ? {} : { openingLengthMm: nullableMm(input, "openingLengthMm")! }),
        ...(nullableMm(input, "openingWidthMm") === null ? {} : { openingWidthMm: nullableMm(input, "openingWidthMm")! }),
      });
      return [
        { label: "Egy fellépő", value: result.riserHeightMm, unit: "mm" }, { label: "Összes fellépés", value: result.riserCount, unit: "db" },
        { label: "Összes vízszintes fok", value: result.treadCount, unit: "db" }, { label: "Járóvonal-belépő / fok", value: result.walkingGoingMm, unit: "mm" },
        { label: "Kiterített járóvonal-futás", value: result.developedWalkingRunMm, unit: "mm" }, { label: "Fordulás", value: `${result.turnDegrees}° · ${result.turnDirection === "right" ? "jobbra" : "balra"}`, unit: "" },
        { label: "2 × fellépő + járóvonal-belépő", value: result.stepRuleMm, unit: "mm" },
        { label: "Kiterített járóvonalhajlás", value: result.pitchDegrees, unit: "°" },
        { label: "Járóvonal menti ferde hossz", value: result.walkingPitchLengthMm, unit: "mm" },
        { label: "Húzott fok belső / külső húrja", value: `${formatHuNumber(result.innerChordMm)} / ${formatHuNumber(result.outerChordMm)}`, unit: "mm" },
        { label: "Fordulófok szögosztása", value: result.stepAngleDegrees, unit: "°" }, { label: "Kiosztott fokok alaprajzi felülete", value: result.treadSurfaceAreaM2, unit: "m²" },
        { label: "Alaprajzi kiterjedés · hossz", value: result.planWidthMm, unit: "mm" }, { label: "Alaprajzi kiterjedés · szélesség", value: result.planDepthMm, unit: "mm" },
      ];
    },
  };
}

for (const id of ["stair.wood.90_landing", "stair.metal.90_landing", "stair.metal.90_zigzag"]) definitions[id] = landingStairDefinition(id, "quarter_turn");
for (const id of ["stair.wood.180_landing", "stair.metal.180_landing", "stair.metal.180_zigzag"]) definitions[id] = landingStairDefinition(id, "half_turn");
definitions["stair.wood.three_landing"] = landingStairDefinition("stair.wood.three_landing", "three_flight");
definitions["stair.wood.90_winder"] = winderStairDefinition("stair.wood.90_winder", "quarter_turn");
definitions["stair.wood.180_winder"] = winderStairDefinition("stair.wood.180_winder", "half_turn");
definitions["stair.wood.three_winder"] = winderStairDefinition("stair.wood.three_winder", "three_flight");
definitions["stair.concrete_straight"] = {
  reference: constructionCalculatorCatalog.find((item) => item.id === "stair.concrete_straight")!,
  draw: "stairs",
  note: "A fokos felső profillal és vízszintes alsó síkkal határolt tömör betonék geometriai térfogata. Pihenő, karlemez, vasalás, recept vagy szerkezeti méretezés nélkül.",
  fields: [
    { key: "totalRiseMm", label: "Padlószintek közötti teljes emelkedés", unit: "mm" },
    { key: "availableRunMm", label: "Vízszintes futás a fokok alatt", unit: "mm" },
    { key: "stairWidthMm", label: "Lépcsőkar szélessége", unit: "mm" },
    { key: "riserCount", label: "Fellépések száma", unit: "db", integer: true },
  ],
  calculate: (input) => {
    const result = calculateConcreteStairGeometry({ totalRiseMm: mm(input, "totalRiseMm"), availableRunMm: mm(input, "availableRunMm"), stairWidthMm: mm(input, "stairWidthMm"), riserCount: mm(input, "riserCount") });
    return [
      { label: "Tömör betonék geometriai térfogata", value: result.wedgeVolumeM3, unit: "m³" },
      { label: "Egy fellépő", value: result.riserHeightMm, unit: "mm" },
      { label: "Belépő", value: result.goingMm, unit: "mm" },
      { label: "Fokok száma", value: result.treadCount, unit: "db" },
      { label: "Lépcsőhajlás", value: result.pitchDegrees, unit: "°" },
      { label: "Geometriai ferde vetületi hossz", value: result.pitchLengthMm, unit: "mm" },
      { label: "2 × fellépő + belépő", value: result.stepRuleMm, unit: "mm" },
    ];
  },
};

const categoryOrder: readonly { id: ConstructionCalculatorCategory; label: string }[] = [
  { id: "roof", label: "Tetők és faszerkezetek" },
  { id: "stair", label: "Lépcsők" },
  { id: "concrete", label: "Betonozás és alapozás" },
];

function inputRecord(fields: readonly Field[], values: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => {
    const value = values[field.key]?.trim() ?? "";
    if (field.kind === "checkbox") return [field.key, value === "true"];
    if (field.kind === "text" || field.kind === "select") return [field.key, value];
    return [field.key, value === "" ? undefined : Number(value.replace(",", "."))];
  }));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value);
}

const usesRoofShape = (definition: CalculatorDefinition) => definition.fields.some((field) => field.key === "roofShape");

function roofGeometryTypeForDefinition(definition: CalculatorDefinition, values: Record<string, string>): RoofGeometryType | null {
  return usesRoofShape(definition) ? roofShapeOf(values) : null;
}

const isFieldVisible = (field: Field, values: Record<string, string>) => !field.shapes || field.shapes.includes(roofShapeOf(values));

function reusableRoofGeometry(definition: CalculatorDefinition, values: Record<string, string>): RoofGeometry | null {
  if (!usesRoofShape(definition)) return null;
  try {
    return calculateExistingRoofGeometry(roofGeometryInputFor(values));
  } catch {
    return null;
  }
}

/** Equal nominal lengths become one cut-list row, longest first. */
function cutListRows(segments: readonly { lengthMm: number }[]): readonly { lengthMm: number; count: number }[] {
  const grouped = new Map<number, number>();
  for (const segment of segments) {
    const lengthMm = Math.round(segment.lengthMm);
    grouped.set(lengthMm, (grouped.get(lengthMm) ?? 0) + 1);
  }
  return [...grouped].map(([lengthMm, count]) => ({ lengthMm, count })).sort((a, b) => b.lengthMm - a.lengthMm);
}

function takeoffStatusLabel(status: RoofMaterialTakeoffStatus): string {
  if (status === "VALID") return "Megadott adatokkal számítható";
  if (status === "INCOMPLETE") return "További paraméter szükséges";
  if (status === "INVALID") return "Érvénytelen bemenet";
  return "A kiválasztott rész nem támogatott";
}

const SOURCE_LABEL = { product: "termék", override: "felülírva", manual: "kézi" } as const;
const MEANING_LABEL = { GEOMETRIC: "geometriai", LAYOUT: "kiosztási", NOMINAL: "névleges", PROCUREMENT: "beszerzési" } as const;

/** Every distinct limitation once; a message shared by all parts is listed under "Általános". */
export function limitationGroups(parts: readonly RoofMaterialTakeoff["parts"][number][]): { title: string; items: string[] }[] {
  const shared = parts[0].limitations.filter((item) => parts.every((part) => part.limitations.includes(item)));
  const groups = parts.map((part) => ({ title: part.label, items: [...new Set(part.limitations.filter((item) => !shared.includes(item)))] })).filter((group) => group.items.length > 0);
  return [...(shared.length > 0 ? [{ title: "Általános", items: shared }] : []), ...groups];
}

function CriticalWarnings({ parts }: Readonly<{ parts: RoofMaterialTakeoff["parts"] }>) {
  const warnings = roofTakeoffCriticalWarnings(parts);
  return warnings.length === 0 ? null : <ul className="material-takeoff-warnings" role="note" aria-label="Fontos korlátok">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>;
}

function RoofMaterialTakeoffSummary({ takeoff }: Readonly<{ takeoff: RoofMaterialTakeoff }>) {
  const parts = takeoff.parts.filter((part) => part.requested && part.id !== "geometry");
  if (parts.length === 0) return null;
  const remainingReasons = takeoff.reasons.filter((reason) => !parts.some((part) => part.invalidInputs.some((message) => reason.endsWith(message))));
  return <section className="construction-suite-results construction-suite-material-summary" aria-live="polite">
    <h3>Összesített anyagkimutatás</h3>
    <p className="construction-suite-advisory">{takeoffStatusLabel(takeoff.status)}</p>
    <CriticalWarnings parts={takeoff.parts} />
    {parts.map((part) => {
      const spec = part.specification;
      const overridden = spec?.overriddenKeys.length ?? 0;
      return <div className="material-takeoff-part" key={part.id} data-status={part.status}>
        <h4>{part.label}{part.status !== "VALID" && part.status && <small>{takeoffStatusLabel(part.status)}</small>}</h4>
        {part.invalidInputs.map((reason) => <p className="material-takeoff-incomplete is-invalid" key={reason} role="alert">{reason}</p>)}
        {part.incompleteQuantities.map((item) => <p className="material-takeoff-incomplete" key={item.label} role="status"><strong>{item.label}: hiányos</strong> · {item.reason}</p>)}
        {part.quantities.length > 0 && <dl>{part.quantities.map((quantity) => <div key={quantity.label}><dt>{quantity.label} <small>{MEANING_LABEL[quantity.meaning]}</small></dt><dd>{formatNumber(quantity.value)} <span>{quantity.unit}</span></dd></div>)}</dl>}
        {spec && (spec.profile || Object.keys(spec.values).length > 0) && <p className="construction-suite-limit">{spec.profile ? `${spec.profile.label}${spec.profile.verification === "demo" ? " (DEMO)" : ""}${overridden > 0 ? ` · ${overridden} érték felülírva` : ""}` : "Kézi adat – nem gyártói ellenőrzött"}{" · "}{Object.entries(spec.sources).filter(([key]) => key !== "manufacturerConstraintReference").map(([, source]) => SOURCE_LABEL[source]).filter((label, index, all) => all.indexOf(label) === index).join(", ")}</p>}
      </div>;
    })}
    {takeoff.status !== "VALID" && remainingReasons.length > 0 && <ul className="construction-suite-limit">{remainingReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
    <details className="material-takeoff-limits"><summary>Korlátok és feltételezések</summary>
      {limitationGroups(parts).map((group) => <div key={group.title}><h5>{group.title}</h5><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
    </details>
  </section>;
}

function ConstructionDrawing({ definition, values, roofGeometry, timberLayout, underlayLayout, focusedDimension, activeDimensionDescription, onDimensionSelect }: { definition: CalculatorDefinition; values: Record<string, string>; roofGeometry: RoofGeometry | null; timberLayout?: RoofTimberLayout | null; underlayLayout?: RoofUnderlayLayout | null; focusedDimension?: string | null; activeDimensionDescription?: string; onDimensionSelect?: (key: string) => void }) {
  const dims = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value.replace(",", ".")) || 0]));
  const title = `${definition.reference.title} sematikus rajza`;
  if (roofGeometry) return <TechnicalDrawing geometry={roofGeometry} timberLayout={timberLayout} underlayLayout={underlayLayout} isSaved={false} compact heading={title} headingId="construction-roof-drawing-heading" activeDimension={focusedDimension} activeDimensionDescription={activeDimensionDescription} onDimensionSelect={onDimensionSelect} />;
  const lines = (points: string, key = "main") => <polyline key={key} points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />;
  let geometry;
  if (definition.reference.id === "roof.mansard") {
    geometry = <>{lines("55,175 120,113 250,72 380,113 445,175")}<line x1="55" y1="175" x2="445" y2="175" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" /><line x1="120" y1="113" x2="120" y2="175" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" /><line x1="380" y1="113" x2="380" y2="175" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" /></>;
  } else if (definition.reference.id === "roof.shed") {
    geometry = <>{lines("65,155 435,55")}<line x1="65" y1="155" x2="435" y2="155" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" /><line x1="435" y1="55" x2="435" y2="155" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" /></>;
  } else if (definition.reference.id === "roof.hip") {
    geometry = <><path d="M75 72 L330 72 L425 115 L170 115 Z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M75 72 L170 115 L250 48 L330 72 M425 115 L330 72" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><line x1="170" y1="115" x2="330" y2="72" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" /></>;
  } else if (definition.draw === "rafter" || definition.draw === "diagonal") {
    geometry = <><path d="M85 165 L415 165 L415 60 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /><path d="M395 165 L395 145 L415 145" fill="none" stroke="currentColor" strokeWidth="1.5" /><text x="250" y="184" textAnchor="middle" fill="currentColor" fontSize="12">a</text><text x="428" y="114" fill="currentColor" fontSize="12">b</text><text x="242" y="100" fill="currentColor" fontSize="12">{definition.draw === "rafter" ? "L" : "d"}</text></>;
  } else if (definition.draw === "roof" || definition.draw === "truss") {
    geometry = <>{lines("40,175 250,42 460,175")}<line x1="40" y1="175" x2="460" y2="175" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />{definition.draw === "truss" && <><line x1="145" y1="109" x2="355" y2="109" stroke="currentColor" strokeWidth="2" /><line x1="145" y1="109" x2="250" y2="42" stroke="currentColor" strokeWidth="2" /><line x1="355" y1="109" x2="250" y2="42" stroke="currentColor" strokeWidth="2" /></>}</>;
  } else if (definition.draw === "stairs" || definition.draw === "bevel") {
    geometry = lines("40,175 40,150 105,150 105,125 170,125 170,100 235,100 235,75 300,75 300,50 365,50 365,28 445,28");
  } else if (definition.draw === "spiral") {
    geometry = <><circle cx="250" cy="105" r="80" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="250" cy="105" r="24" fill="none" stroke="currentColor" strokeWidth="2" />{Array.from({ length: 9 }, (_, i) => <line key={i} x1="250" y1="105" x2={250 + 80 * Math.cos(i * Math.PI / 4)} y2={105 + 80 * Math.sin(i * Math.PI / 4)} stroke="currentColor" strokeWidth="1.5" />)}</>;
  } else if (definition.draw === "ring") {
    geometry = <><circle cx="250" cy="105" r="80" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="250" cy="105" r="52" fill="none" stroke="currentColor" strokeWidth="3" /></>;
  } else if (definition.draw === "mesh") {
    geometry = <><rect x="70" y="35" width="360" height="140" fill="none" stroke="currentColor" strokeWidth="2" />{Array.from({ length: 7 }, (_, i) => <line key={`v${i}`} x1={70 + i * 60} y1="35" x2={70 + i * 60} y2="175" stroke="currentColor" strokeWidth="1.5" />)}{Array.from({ length: 4 }, (_, i) => <line key={`h${i}`} x1="70" y1={35 + i * 46} x2="430" y2={35 + i * 46} stroke="currentColor" strokeWidth="1.5" />)}</>;
  } else {
    geometry = <><rect x="90" y="60" width="320" height="110" fill="none" stroke="currentColor" strokeWidth="3" /><rect x="130" y="35" width="240" height="135" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" /></>;
  }
  const dimensionText = definition.draw === "rectangle" && dims.lengthMm > 0 ? `${formatNumber(mmToM(dims.lengthMm))} m` : definition.draw === "rafter" ? "Hosszak a szarufa felső éle mentén" : definition.draw === "diagonal" ? "d = √(a² + b²)" : definition.draw === "ring" ? "V = πh(R² − r²)" : definition.draw === "roof" ? "Tetőgeometria · keresztmetszet" : "Geometriai vázlat";
  return <figure className="construction-calculator-drawing"><svg viewBox="0 0 500 210" role="img" aria-label={title} className="construction-drawing-svg"><title>{title}</title>{geometry}<text x="250" y="202" textAnchor="middle" fill="currentColor" fontSize="14">{dimensionText}</text></svg><figcaption>{title}</figcaption></figure>;
}

export function ConstructionCalculatorSuite({ initialCalculatorId = "roof.rafter-cut", catalogProfiles = [], catalogError = false }: Readonly<{ initialCalculatorId?: string; catalogProfiles?: readonly MaterialProfile[]; catalogError?: boolean }>) {
  const profiles = useMemo(() => [...catalogProfiles, ...DEMO_MATERIAL_PROFILES], [catalogProfiles]);
  const initialDefinition = definitions[initialCalculatorId] ?? definitions["roof.rafter-cut"];
  const [category, setCategory] = useState<ConstructionCalculatorCategory>(() => initialDefinition.reference.category === "auxiliary" ? "concrete" : initialDefinition.reference.category);
  const [selectedId, setSelectedId] = useState(() => definitions[initialCalculatorId] ? initialCalculatorId : "roof.rafter-cut");
  const [search, setSearch] = useState("");
  const [mobileSelectionOpen, setMobileSelectionOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries((definitions[initialCalculatorId] ?? definitions["roof.rafter-cut"]).fields.map((field) => [field.key, field.initial ?? ""])));
  const [focusedDimension, setFocusedDimension] = useState<string | null>(null);
  const [materialByCalculator, setMaterialByCalculator] = useState<Record<string, RoofMaterialUiState>>({});
  const definition = definitions[selectedId];
  const roofGeometryType = roofGeometryTypeForDefinition(definition, values);
  const activeGuide = roofGeometryType ? measurementGuideFor(roofGeometryType, focusedDimension ?? "") : null;
  const candidates = constructionCalculatorCatalog.filter((item) => item.category === category || (category === "concrete" && item.category === "auxiliary"));
  const filtered = candidates.filter((item) => item.title.toLocaleLowerCase("hu-HU").includes(search.trim().toLocaleLowerCase("hu-HU")));
  const raw = useMemo(() => inputRecord(definition.fields, values), [definition.fields, values]);
  const requiredFields = definition.fields.filter((field) => !field.advanced && field.initial === undefined && field.kind !== "checkbox" && isFieldVisible(field, values));
  const inputsReady = requiredFields.every((field) => (values[field.key] ?? "").trim() !== "");
  const isTakeoff = definition.reference.id === "roof.material-takeoff";
  const timberOnly = definition.reference.id === "roof.timber-cutlist";
  const usesMaterials = isTakeoff || timberOnly;
  const materialState = materialByCalculator[selectedId] ?? initialMaterialState(profiles, timberOnly);
  const specs = useMemo(() => ({
    covering: resolveMaterialSpec("covering", materialState.specs.covering, profiles), underlay: resolveMaterialSpec("underlay", materialState.specs.underlay, profiles),
    rafter: resolveMaterialSpec("rafter", materialState.specs.rafter, profiles), batten: resolveMaterialSpec("batten", materialState.specs.batten, profiles),
  }), [materialState.specs, profiles]);
  const requestedMaterials = timberOnly ? { timber: true, underlay: false, covering: false } : materialState.requested;
  const timberInput: RoofTimberInput | null = useMemo(() => roofTimberInputFromParameters(timberParametersFromSpecs(materialState.layout, specs.rafter, specs.batten)), [materialState.layout, specs.rafter, specs.batten]);
  const takeoffInputs: RoofMaterialTakeoffInputs | undefined = useMemo(() => usesMaterials ? {
    timber: timberInput ?? undefined, underlay: underlayParametersFromSpec(specs.underlay), covering: coveringParametersFromSpec(specs.covering), requested: requestedMaterials,
    specSnapshot: createSpecSnapshot([...(requestedMaterials.timber ? [specs.rafter, specs.batten] : []), ...(requestedMaterials.underlay ? [specs.underlay] : []), ...(requestedMaterials.covering ? [specs.covering] : [])]),
    calculationSnapshot: createCalculationSnapshot({ calculatorId: selectedId, roofShape: roofShapeOf(values), fields: raw, requested: requestedMaterials, timberLayout: materialState.layout, specs: [specs.rafter, specs.batten, specs.underlay, specs.covering] }),
  } : undefined, [usesMaterials, selectedId, values, raw, materialState.layout, timberInput, specs, requestedMaterials.timber, requestedMaterials.underlay, requestedMaterials.covering]);
  const calculation = useMemo(() => {
    if (!inputsReady) return { rows: [] as ResultLine[], error: null as string | null, geometry: null as RoofGeometry | null };
    try {
      const geometry = roofGeometryType ? reusableRoofGeometry(definition, values) : null;
      return { rows: definition.calculate(raw, takeoffInputs), error: null, geometry };
    }
    catch (error) {
      const message = error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join(" ") : "A megadott méretekkel a számítás nem végezhető el.";
      return { rows: [] as ResultLine[], error: message, geometry: null as RoofGeometry | null };
    }
  }, [definition, inputsReady, raw, roofGeometryType, takeoffInputs, values]);
  const materialTakeoff = usesMaterials && calculation.geometry && takeoffInputs ? calculateRoofMaterialTakeoff(calculation.geometry, takeoffInputs) : null;
  const timberLayout = materialTakeoff?.timber.status === "available" ? materialTakeoff.timber : null;
  const underlayLayout = materialTakeoff && requestedMaterials.underlay ? materialTakeoff.underlay : null;
  const overhangNotice = roofShapeOf(values) === "gable" && usesMaterials && [nullableMm(raw, "frontGableOverhangMm"), nullableMm(raw, "rearGableOverhangMm")].some((value) => overhangFromField(value).state === "not-provided");
  const selectCalculator = (item: ConstructionReference) => {
    const next = definitions[item.id];
    if (!next || item.status !== "verified") return;
    setSelectedId(item.id);
    setValues(Object.fromEntries(next.fields.map((field) => [field.key, field.initial ?? ""])));
    setFocusedDimension(null);
    setMobileSelectionOpen(false);
  };
  const updateValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const basicFields = definition.fields.filter((field) => !field.advanced && isFieldVisible(field, values));
  const advancedFields = definition.fields.filter((field) => field.advanced && isFieldVisible(field, values));
  const renderField = (field: Field) => {
    const isRequired = !field.advanced && field.initial === undefined && field.kind !== "checkbox";
    return <label className={`construction-suite-field${field.kind === "checkbox" ? " is-checkbox" : ""}`} key={field.key}>
      <span>{field.label}{field.unit && <small>{field.unit}</small>}</span>
      {field.kind === "select" ? <select id={field.key} required={isRequired} value={values[field.key] ?? field.initial ?? ""} onFocus={() => setFocusedDimension(field.key)} onBlur={() => setFocusedDimension(null)} onChange={(event) => updateValue(field.key, event.target.value)} aria-label={field.label}>{field.initial === undefined && <option value="">Válasszon…</option>}{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input id={field.key} placeholder={field.placeholder} type={field.kind === "checkbox" ? "checkbox" : field.kind === "text" ? "text" : "number"} inputMode={field.kind === "text" ? "text" : field.kind === "checkbox" ? undefined : "decimal"} min={!field.kind ? "0" : undefined} step={field.integer ? "1" : "any"} required={isRequired} checked={field.kind === "checkbox" ? values[field.key] === "true" : undefined} value={field.kind === "checkbox" ? undefined : values[field.key] ?? ""} onFocus={() => setFocusedDimension(field.key)} onBlur={() => setFocusedDimension(null)} onChange={(event) => updateValue(field.key, field.kind === "checkbox" ? String(event.target.checked) : event.target.value)} aria-label={`${field.label}${field.unit ? `, ${field.unit}` : ""}`} />}
    </label>;
  };
  const headingContent = <header className="construction-suite-title"><div><p className="section-eyebrow">ELLENŐRZÖTT GEOMETRIAI SZÁMÍTÁS</p><h2>{definition.reference.title}</h2></div></header>;
  const noteContent = <><p className="construction-suite-note">{definition.note}</p>{activeGuide && <MeasurementGuidance compact guide={activeGuide} />}</>;
  const fieldsContent = <>
    <div className="construction-suite-form-grid">{basicFields.map(renderField)}</div>
    {usesMaterials && <RoofMaterialInputs timberOnly={timberOnly} profiles={profiles} catalogError={catalogError} state={materialState} onChange={(next) => setMaterialByCalculator((current) => ({ ...current, [selectedId]: next }))} />}
    {advancedFields.length > 0 && <GlassDisclosure className="construction-suite-advanced" summary="Részletes számítás · opcionális">{definition.advancedHelp && <p className="construction-suite-note">{definition.advancedHelp}</p>}{!definition.advancedHelp && <p className="construction-suite-note">Ezek az adatok további mennyiségi eredményt vagy ellenőrzést kapcsolnak be. Az alapgeometriai számításhoz nem szükségesek.</p>}<div className="construction-suite-form-grid">{advancedFields.map(renderField)}</div></GlassDisclosure>}
  </>;
  const primaryRows = calculation.rows.slice(0, 6);
  const detailRows = calculation.rows.slice(6);
  const stepRuleLine = calculation.rows.find((line) => line.label.startsWith("2 × fellépő"));
  const stepRuleValue = typeof stepRuleLine?.value === "number" ? stepRuleLine.value : null;
  const echoedInputs = definition.fields.filter((field) => isFieldVisible(field, values) && (values[field.key] ?? "").trim() !== "" && field.kind !== "checkbox");
  const cutList = timberOnly && timberLayout
    ? { rafters: cutListRows(timberLayout.rafters?.segments ?? []), battens: cutListRows(timberLayout.battens?.segments ?? []) }
    : null;
  const cutListSection = (title: string, rows: readonly { lengthMm: number; count: number }[]) => rows.length === 0 ? null
    : <div key={title}><h4>{title}</h4><ol className="construction-suite-cut-list">{rows.map((row, index) => <li key={row.lengthMm}><span>{index + 1}.</span><strong>{formatNumber(row.lengthMm)} mm</strong><span>{row.count} db</span></li>)}</ol></div>;
  const resultsContent = <>
    {inputsReady && calculation.error && <p className="form-message is-error" role="alert">{calculation.error}</p>}
    {inputsReady && echoedInputs.length > 0 && <section className="construction-suite-echo"><h3>Kiindulási adatok</h3><dl>{echoedInputs.map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{field.kind === "select" ? field.options?.find((option) => option.value === values[field.key])?.label ?? values[field.key] : values[field.key]} {field.unit && <span>{field.unit}</span>}</dd></div>)}</dl></section>}
    {calculation.geometry && <><RoofGeometryResults geometry={calculation.geometry} heading="Geometriai eredmények" provenanceLabel="Kézi bemenetek · számított geometriai eredmények." />{overhangNotice && <p className="construction-suite-limit">Homlokzati kiülés nincs megadva · 0 mm-rel számolva. Add meg a „Részletes számítás” alatt, ha a tető túlnyúlik a homlokzaton.</p>}{isTakeoff && materialTakeoff && <RoofMaterialTakeoffSummary takeoff={materialTakeoff} />}</>}
    {timberOnly && materialTakeoff && <CriticalWarnings parts={materialTakeoff.parts} />}
    {timberOnly && materialTakeoff?.parts.map((part) => part.invalidInputs.map((reason) => <p className="form-message is-error" role="alert" key={`${part.id}${reason}`}>{part.label}: {reason}</p>))}
    {primaryRows.length > 0 && !isTakeoff && <section className="construction-suite-results" aria-live="polite"><h3>Fő eredmények</h3><dl>{primaryRows.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{typeof line.value === "number" ? formatNumber(line.value) : line.value} {line.unit && <span>{line.unit}</span>}</dd></div>)}</dl>{stepRuleValue !== null && <p className="construction-suite-advisory">A számított 2R+G érték {formatHuNumber(stepRuleValue)} mm, {stepRuleValue < 600 || stepRuleValue > 660 ? "a közölt 600–660 mm-es referencia-tartományon kívül esik" : "a közölt 600–660 mm-es referencia-tartományon belül van"}. Ez csak számtani összevetés; nem ergonómiai minősítés és nem szabványi megfelelőség.</p>}<p className="construction-suite-limit">{definition.reference.limitation}</p></section>}
    {cutList && (cutList.rafters.length > 0 || cutList.battens.length > 0) && <section className="construction-suite-results construction-suite-cut-lists"><h3>Vágáslista</h3>{cutListSection("Szarufák", cutList.rafters)}{cutListSection("Lécek", cutList.battens)}<p className="construction-suite-limit">Névleges geometriai hosszak, vágási ráhagyás és toldás nélkül.</p></section>}
    {primaryRows.length === 0 && !isTakeoff && calculation.geometry !== null && <p className="construction-suite-limit">{definition.reference.limitation}</p>}
    {detailRows.length > 0 && <GlassDisclosure className="construction-suite-result-details" summary={`Részletes eredmények · ${detailRows.length}`}><dl>{detailRows.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{typeof line.value === "number" ? formatNumber(line.value) : line.value} {line.unit && <span>{line.unit}</span>}</dd></div>)}</dl></GlassDisclosure>}
  </>;
  const drawingContent = calculation.geometry !== null || calculation.rows.length > 0
    ? definition.reference.category === "stair"
      ? <ConstructionStairDrawing referenceId={definition.reference.id} values={values} focusedDimension={focusedDimension} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />
      : definition.reference.category === "concrete" || definition.reference.category === "auxiliary"
        ? <ConstructionMaterialDrawing referenceId={definition.reference.id} values={values} focusedDimension={focusedDimension} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />
      : <ConstructionDrawing definition={definition} values={values} roofGeometry={calculation.geometry} timberLayout={timberLayout} underlayLayout={underlayLayout} focusedDimension={focusedDimension} activeDimensionDescription={activeGuide?.meaning} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />
    : undefined;
  const independentContent = <p className="construction-suite-independent">Az eredmény helyi előnézet. Nem mentődik ügyfélhez, projekthez, felméréshez, anyaglistához, munkanaplóhoz vagy ajánlathoz.</p>;
  const workspace = roofGeometryType
    ? <RoofWorkspace className="construction-suite-workspace" label="Tetőgeometriai kalkulátor munkaterület" context={<>{headingContent}{noteContent}</>} measurements={fieldsContent} drawing={drawingContent} results={resultsContent} actions={independentContent} />
    : <div className="construction-suite-workspace">{headingContent}{noteContent}{fieldsContent}{definition.reference.category === "stair" && drawingContent}{resultsContent}{definition.reference.category !== "stair" && drawingContent}{independentContent}</div>;

  const renderCalculatorOption = (item: ConstructionReference) => {
    const available = item.status === "verified" && Boolean(definitions[item.id]);
    return <button key={item.id} type="button" disabled={!available} aria-pressed={available ? selectedId === item.id : undefined} aria-label={available ? item.title : `${item.title}. Jelenleg nem érhető el számítás.`} title={available ? item.title : "A számításhoz még nincs függetlenül ellenőrzött geometriai motor."} className={`${selectedId === item.id ? "is-active" : ""}${available ? "" : " is-unavailable"}`} onClick={() => selectCalculator(item)}>
      <ConstructionCalculatorThumbnail id={item.id} />
      <span className="construction-suite-option-copy"><span>{item.title}</span>{!available && <small>Nincs ellenőrzött számítás</small>}</span>
    </button>;
  };
  const searchField = <label className="construction-suite-search"><Search aria-hidden="true" /><span className="sr-only">Kalkulátor keresése</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kalkulátor keresése" type="search" /></label>;
  const optionList = <div className="construction-suite-options">{filtered.map(renderCalculatorOption)}{filtered.length === 0 && <p className="construction-suite-empty">Nincs ilyen kalkulátor.</p>}</div>;

  return <section className="construction-suite" aria-label="Önálló építési kalkulátorok">
    <div className="construction-suite-category-tabs" role="tablist" aria-label="Kalkulátorkategória">
      {categoryOrder.map((item) => <button key={item.id} type="button" role="tab" aria-selected={category === item.id} className={category === item.id ? "is-active" : ""} onClick={() => { setCategory(item.id); setSearch(""); const first = constructionCalculatorCatalog.find((reference) => (reference.category === item.id || (item.id === "concrete" && reference.category === "auxiliary")) && reference.status === "verified" && definitions[reference.id]); if (first) selectCalculator(first); }}>{item.label}</button>)}
    </div>
    <div className="construction-suite-layout">
      <aside className="construction-suite-list" aria-label="Kalkulátor kiválasztása">
        <p className="construction-suite-list-label">Kalkulátorok</p>
        {searchField}
        {optionList}
      </aside>
      <div className="construction-suite-mobile-picker">
        <button type="button" className="construction-suite-mobile-trigger" aria-expanded={mobileSelectionOpen} onClick={() => setMobileSelectionOpen((open) => !open)}>
          <ConstructionCalculatorThumbnail id={selectedId} /><span><strong>Kalkulátor váltása</strong></span><ChevronDown aria-hidden="true" className={mobileSelectionOpen ? "is-open" : ""} />
        </button>
        {mobileSelectionOpen && <div className="construction-suite-mobile-options" aria-label="Kalkulátor kiválasztása">{searchField}{optionList}</div>}
      </div>
      {workspace}
    </div>
  </section>;
}

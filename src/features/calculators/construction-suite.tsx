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
import { calculateExistingRoofGeometry, calculateMansardGeometry, calculateRafterGeometry, calculateTriangularTrussGeometry } from "@/domain/calculations/construction/roofs";
import { calculateBeveledRiserGeometry, calculateConcreteStairGeometry, calculateLandingStairGeometry, calculateSpiralStairGeometry, calculateStraightStairGeometry } from "@/domain/calculations/construction/stairs";
import { calculateWinderStairGeometry } from "@/domain/calculations/construction/winder-stairs";
import { mm2ToM2, mmToM } from "@/domain/calculations/construction/numeric";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateGableMetalTileCovering } from "@/domain/calculations/gable-metal-tile-covering";
import type { RoofGeometry, RoofGeometryType } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout, roofTimberInputFromParameters, type RoofTimberParameters } from "@/domain/calculations/roof-timber-layout";
import type { RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { calculateRoofUnderlayLayout, type RoofUnderlayParameters } from "@/domain/calculations/roof-underlay";
import type { RoofUnderlayLayout } from "@/domain/calculations/roof-underlay";
import { RoofGeometryResults } from "@/features/roof-models/roof-geometry-results";
import { RoofTimberQuantityPanel } from "@/features/roof-models/roof-timber-quantity-panel";
import { RoofUnderlayQuantityPanel } from "@/features/roof-models/roof-underlay-quantity-panel";
import { ConstructionCalculatorThumbnail, ConstructionMaterialDrawing, ConstructionStairDrawing } from "./construction-visuals";

type Field = { key: string; label: string; unit: string; initial?: string; integer?: boolean; advanced?: boolean; kind?: "text" | "checkbox" | "select"; options?: readonly { value: string; label: string }[] };
type ResultLine = { label: string; value: number | string; unit: string };
type CalculatorDefinition = { reference: ConstructionReference; fields: readonly Field[]; draw: "roof" | "rafter" | "truss" | "stairs" | "spiral" | "bevel" | "rectangle" | "ring" | "mesh" | "diagonal"; note: string; advancedHelp?: string; calculate: (input: Record<string, unknown>) => ResultLine[] };

const TechnicalDrawing = dynamic(() => import("@/features/roof-models/technical-drawing").then((module) => module.TechnicalDrawing), {
  ssr: false,
  loading: () => <div className="construction-calculator-drawing" role="status">Tetőrajz betöltése…</div>,
});

const mm = (value: Record<string, unknown>, key: string) => Number(value[key]);
const nullableMm = (value: Record<string, unknown>, key: string) => value[key] === undefined || value[key] === null || value[key] === "" ? null : Number(value[key]);
const formatHuNumber = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(value);

const definitions: Record<string, CalculatorDefinition> = {
  "roof.rafter": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "roof.rafter")!, draw: "rafter", note: "Geometriai hossz és vágásszögek. Nem tartalmaz felfekvési vagy keresztmetszeti levonást.",
    fields: [{ key: "horizontalHalfSpanMm", label: "Fél fesztáv", unit: "mm" }, { key: "riseMm", label: "Gerincemelkedés", unit: "mm" }, { key: "eaveProjectionMm", label: "Vízszintes ereszkiülés", unit: "mm", initial: "0" }],
    calculate: (input) => { const result = calculateRafterGeometry({ horizontalHalfSpanMm: mm(input, "horizontalHalfSpanMm"), riseMm: mm(input, "riseMm"), eaveProjectionMm: mm(input, "eaveProjectionMm") }); return [{ label: "Ferde vetületi hossz", value: result.slopeLengthMm, unit: "mm" }, { label: "Tetőhajlás", value: result.pitchDegrees, unit: "°" }, { label: "Függőleges vágás a deszkatengelyhez", value: result.plumbCutToBoardAxisDegrees, unit: "°" }]; },
  },
  "roof.gable": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "roof.gable")!, draw: "roof", note: "A TetőPro meglévő tetőgeometria-motorját használja. A terület geometriai, anyagdarabszámot nem ad.",
    fields: [
      { key: "buildingLengthMm", label: "Épület hossza", unit: "mm", integer: true }, { key: "buildingWidthMm", label: "Épület szélessége", unit: "mm", integer: true }, { key: "roofRiseMm", label: "Gerincemelkedés", unit: "mm", integer: true }, { key: "eaveOverhangMm", label: "Ereszkiülés", unit: "mm", initial: "0", integer: true },
      { key: "nominalSheetWidthMm", label: "Lemez névleges szélessége", unit: "mm", advanced: true }, { key: "effectiveCoveringWidthMm", label: "Lemez hasznos fedési szélessége", unit: "mm", advanced: true }, { key: "physicalSheetLengthMm", label: "Lemez fizikai hossza", unit: "mm", advanced: true }, { key: "effectiveCoveringLengthMm", label: "Lemez tényleges fedési hossza", unit: "mm", advanced: true }, { key: "eaveEndAllowanceMm", label: "Ereszvégi ráhagyás", unit: "mm", initial: "0", advanced: true }, { key: "ridgeEndAllowanceMm", label: "Gerincvégi ráhagyás", unit: "mm", initial: "0", advanced: true }, { key: "longitudinalOverlapMm", label: "Hosszirányú átlapolás", unit: "mm", initial: "0", advanced: true }, { key: "lengthCompatibilityConfirmed", label: "A hosszadat gyártói termékadattal egyeztetve", unit: "", initial: "false", advanced: true, kind: "checkbox" }, { key: "lengthDataSource", label: "A termékadat forrása", unit: "szöveg", advanced: true, kind: "text" },
    ],
    calculate: (input) => {
      const geometryInput = { inputMode: "height" as const, buildingLengthMm: mm(input, "buildingLengthMm"), buildingWidthMm: mm(input, "buildingWidthMm"), roofRiseMm: mm(input, "roofRiseMm"), eaveOverhangMm: mm(input, "eaveOverhangMm"), frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
      calculateExistingRoofGeometry({ type: "gable", geometry: geometryInput });
      const rows: ResultLine[] = [];
      const productValues = ["nominalSheetWidthMm", "effectiveCoveringWidthMm", "physicalSheetLengthMm", "effectiveCoveringLengthMm"];
      const requestingCovering = productValues.some((key) => nullableMm(input, key) !== null) || input.lengthDataSource !== undefined && input.lengthDataSource !== "" || input.lengthCompatibilityConfirmed === true;
      if (requestingCovering) {
        const gable = calculateGableRoof(geometryInput);
        const covering = calculateGableMetalTileCovering(gable, {
          nominalSheetWidthMm: nullableMm(input, "nominalSheetWidthMm"), effectiveCoveringWidthMm: nullableMm(input, "effectiveCoveringWidthMm"), physicalSheetLengthMm: nullableMm(input, "physicalSheetLengthMm"), effectiveCoveringLengthMm: nullableMm(input, "effectiveCoveringLengthMm"), minimumPhysicalLengthMm: null, maximumPhysicalLengthMm: null,
          eaveEndAllowanceMm: nullableMm(input, "eaveEndAllowanceMm"), ridgeEndAllowanceMm: nullableMm(input, "ridgeEndAllowanceMm"), longitudinalOverlapMm: nullableMm(input, "longitudinalOverlapMm"), lengthCompatibilityConfirmed: input.lengthCompatibilityConfirmed === true, lengthDataSource: typeof input.lengthDataSource === "string" ? input.lengthDataSource : null,
          isModular: false, moduleBaseLengthMm: null, modulePitchMm: null, moduleCount: null,
        });
        if (covering.status === "VALID" && covering.totalSheetCount !== null && covering.totalNominalSheetAreaMm2 !== null) {
          rows.push({ label: "Cserepeslemez geometriai darabszám", value: covering.totalSheetCount, unit: "db" }, { label: "Névleges megvásárolt lemezfelület", value: mm2ToM2(covering.totalNominalSheetAreaMm2), unit: "m²" });
        } else {
          rows.push({ label: "Lemezbecslés státusza", value: covering.status, unit: "" }, ...covering.reasons.map((reason, index) => ({ label: `Lemezbecslés · ${index + 1}`, value: reason, unit: "" })));
        }
      }
      return rows;
    },
  },
  "roof.shed": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "roof.shed")!, draw: "roof", note: "A meglévő TetőPro tetőgeometria-motor számítja a felületet. Anyagkiosztást nem készít.",
    fields: [{ key: "lengthMm", label: "Tető hossza", unit: "mm" }, { key: "widthMm", label: "Vízszintes fesztáv", unit: "mm" }, { key: "pitchDegrees", label: "Tetőhajlás", unit: "°" }],
    calculate: (input) => { calculateExistingRoofGeometry({ type: "shed", lengthMm: mm(input, "lengthMm"), widthMm: mm(input, "widthMm"), pitchDegrees: mm(input, "pitchDegrees") }); return []; },
  },
  "roof.mansard": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "roof.mansard")!, draw: "roof", note: "Szimmetrikus, két szakaszból álló keresztmetszet. A két vízszintes félfutást és emelkedést külön kell megadni.",
    fields: [{ key: "buildingLengthMm", label: "Tető hossza", unit: "mm" }, { key: "lowerRunMm", label: "Alsó szakasz vízszintes futása · oldalanként", unit: "mm" }, { key: "lowerRiseMm", label: "Alsó szakasz emelkedése", unit: "mm" }, { key: "upperRunMm", label: "Felső szakasz vízszintes futása · oldalanként", unit: "mm" }, { key: "upperRiseMm", label: "Felső szakasz emelkedése", unit: "mm" }],
    calculate: (input) => { const result = calculateMansardGeometry({ buildingLengthMm: mm(input, "buildingLengthMm"), lowerRunMm: mm(input, "lowerRunMm"), upperRunMm: mm(input, "upperRunMm"), lowerRiseMm: mm(input, "lowerRiseMm"), upperRiseMm: mm(input, "upperRiseMm") }); return [{ label: "Alsó szakasz hossza", value: result.lowerSlopeMm, unit: "mm" }, { label: "Felső szakasz hossza", value: result.upperSlopeMm, unit: "mm" }, { label: "Vetületi teljes szélesség", value: result.totalRoofWidthMm, unit: "mm" }, { label: "Teljes geometriai tetőfelület", value: result.totalAreaM2, unit: "m²" }]; },
  },
  "roof.hip": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "roof.hip")!, draw: "roof", note: "A meglévő TetőPro szimmetrikus kontytető-motorját használja; a hossz legyen nagyobb a szélességnél.",
    fields: [{ key: "lengthMm", label: "Tető hossza", unit: "mm" }, { key: "widthMm", label: "Tető szélessége", unit: "mm" }, { key: "pitchDegrees", label: "Tetőhajlás", unit: "°" }],
    calculate: (input) => { calculateExistingRoofGeometry({ type: "hip", lengthMm: mm(input, "lengthMm"), widthMm: mm(input, "widthMm"), pitchDegrees: mm(input, "pitchDegrees") }); return []; },
  },
  "roof.truss": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "roof.truss")!, draw: "truss", note: "Csak az egyszerű háromszög burkológeometriáját mutatja. A belső rácsozatot és teherbírást nem tervezi.",
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

function roofGeometryTypeForDefinition(definition: CalculatorDefinition): RoofGeometryType | null {
  if (definition.reference.id === "roof.gable") return "gable";
  if (definition.reference.id === "roof.shed") return "shed";
  if (definition.reference.id === "roof.hip") return "hip";
  return null;
}

function roofDrawingDimensionKey(definition: CalculatorDefinition, fieldKey: string): string {
  if (definition.reference.id === "roof.gable" && fieldKey === "buildingLengthMm") return "lengthMm";
  if (definition.reference.id === "roof.gable" && fieldKey === "buildingWidthMm") return "widthMm";
  return fieldKey;
}

function roofFieldKeyForDrawingDimension(definition: CalculatorDefinition, dimensionKey: string): string {
  if (definition.reference.id === "roof.gable" && dimensionKey === "lengthMm") return "buildingLengthMm";
  if (definition.reference.id === "roof.gable" && dimensionKey === "widthMm") return "buildingWidthMm";
  return dimensionKey;
}

function reusableRoofGeometry(definition: CalculatorDefinition, values: Record<string, string>): RoofGeometry | null {
  const dimension = (key: string) => Number(values[key]?.replace(",", ".")) || 0;
  try {
    if (definition.reference.id === "roof.gable") return calculateExistingRoofGeometry({ type: "gable", geometry: { inputMode: "height", buildingLengthMm: dimension("buildingLengthMm"), buildingWidthMm: dimension("buildingWidthMm"), roofRiseMm: dimension("roofRiseMm"), eaveOverhangMm: dimension("eaveOverhangMm"), frontGableOverhangMm: 0, rearGableOverhangMm: 0 } });
    if (definition.reference.id === "roof.shed") return calculateExistingRoofGeometry({ type: "shed", lengthMm: dimension("lengthMm"), widthMm: dimension("widthMm"), pitchDegrees: dimension("pitchDegrees") });
    if (definition.reference.id === "roof.hip") return calculateExistingRoofGeometry({ type: "hip", lengthMm: dimension("lengthMm"), widthMm: dimension("widthMm"), pitchDegrees: dimension("pitchDegrees") });
  } catch {
    return null;
  }
  return null;
}

function ConstructionDrawing({ definition, values, roofGeometry, timberLayout, underlayLayout, focusedDimension, activeDimensionDescription, onDimensionSelect }: { definition: CalculatorDefinition; values: Record<string, string>; roofGeometry: RoofGeometry | null; timberLayout?: RoofTimberLayout | null; underlayLayout?: RoofUnderlayLayout | null; focusedDimension?: string | null; activeDimensionDescription?: string; onDimensionSelect?: (key: string) => void }) {
  const dims = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value.replace(",", ".")) || 0]));
  const title = `${definition.reference.title} sematikus rajza`;
  if (roofGeometry) return <TechnicalDrawing geometry={roofGeometry} timberLayout={timberLayout} underlayLayout={underlayLayout} isSaved={false} compact heading={title} headingId="construction-roof-drawing-heading" activeDimension={focusedDimension ? roofDrawingDimensionKey(definition, focusedDimension) : null} activeDimensionDescription={activeDimensionDescription} onDimensionSelect={onDimensionSelect ? (key) => onDimensionSelect(roofFieldKeyForDrawingDimension(definition, key)) : undefined} />;
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
  const dimensionText = definition.draw === "rectangle" && dims.lengthMm > 0 ? `${formatNumber(mmToM(dims.lengthMm))} m` : definition.draw === "rafter" ? "L = √(run² + rise²)" : definition.draw === "diagonal" ? "d = √(a² + b²)" : definition.draw === "ring" ? "V = πh(R² − r²)" : definition.draw === "roof" && definition.reference.id === "roof.gable" ? "Szimmetrikus nyeregtető · keresztmetszet" : "Geometriai vázlat";
  return <figure className="construction-calculator-drawing"><svg viewBox="0 0 500 210" role="img" aria-label={title} className="construction-drawing-svg"><title>{title}</title>{geometry}<text x="250" y="202" textAnchor="middle" fill="currentColor" fontSize="14">{dimensionText}</text></svg><figcaption>{title}</figcaption></figure>;
}

export function ConstructionCalculatorSuite({ initialCalculatorId = "roof.rafter" }: Readonly<{ initialCalculatorId?: string }>) {
  const initialDefinition = definitions[initialCalculatorId] ?? definitions["roof.rafter"];
  const [category, setCategory] = useState<ConstructionCalculatorCategory>(() => initialDefinition.reference.category === "auxiliary" ? "concrete" : initialDefinition.reference.category);
  const [selectedId, setSelectedId] = useState(() => definitions[initialCalculatorId] ? initialCalculatorId : "roof.rafter");
  const [search, setSearch] = useState("");
  const [mobileSelectionOpen, setMobileSelectionOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries((definitions[initialCalculatorId] ?? definitions["roof.rafter"]).fields.map((field) => [field.key, field.initial ?? ""])));
  const [focusedDimension, setFocusedDimension] = useState<string | null>(null);
  const [roofTimberByCalculator, setRoofTimberByCalculator] = useState<Record<string, RoofTimberParameters>>({});
  const [roofUnderlayByCalculator, setRoofUnderlayByCalculator] = useState<Record<string, RoofUnderlayParameters>>({});
  const definition = definitions[selectedId];
  const roofGeometryType = roofGeometryTypeForDefinition(definition);
  const activeGuide = roofGeometryType ? measurementGuideFor(roofGeometryType, focusedDimension ?? "") : null;
  const candidates = constructionCalculatorCatalog.filter((item) => item.category === category || (category === "concrete" && item.category === "auxiliary"));
  const filtered = candidates.filter((item) => item.title.toLocaleLowerCase("hu-HU").includes(search.trim().toLocaleLowerCase("hu-HU")));
  const raw = useMemo(() => inputRecord(definition.fields, values), [definition.fields, values]);
  const requiredFields = definition.fields.filter((field) => !field.advanced && field.initial === undefined && field.kind !== "checkbox");
  const inputsReady = requiredFields.every((field) => (values[field.key] ?? "").trim() !== "");
  const calculation = useMemo(() => {
    if (!inputsReady) return { rows: [] as ResultLine[], error: null as string | null, geometry: null as RoofGeometry | null };
    try {
      const geometry = roofGeometryType ? reusableRoofGeometry(definition, values) : null;
      return { rows: definition.calculate(raw), error: null, geometry };
    }
    catch (error) {
      const message = error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join(" ") : "A megadott méretekkel a számítás nem végezhető el.";
      return { rows: [] as ResultLine[], error: message, geometry: null as RoofGeometry | null };
    }
  }, [definition, inputsReady, raw, roofGeometryType, values]);
  const timberParameters = roofTimberByCalculator[selectedId] ?? {};
  const timberInput = roofTimberInputFromParameters(timberParameters);
  const timberLayout = calculation.geometry && timberInput ? calculateRoofTimberLayout(calculation.geometry, timberInput) : null;
  const underlayParameters = roofUnderlayByCalculator[selectedId] ?? {};
  const underlayLayout = calculation.geometry ? calculateRoofUnderlayLayout(calculation.geometry, underlayParameters) : null;
  const selectCalculator = (item: ConstructionReference) => {
    const next = definitions[item.id];
    if (!next || item.status !== "verified") return;
    setSelectedId(item.id);
    setValues(Object.fromEntries(next.fields.map((field) => [field.key, field.initial ?? ""])));
    setFocusedDimension(null);
    setMobileSelectionOpen(false);
  };
  const updateValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const basicFields = definition.fields.filter((field) => !field.advanced);
  const advancedFields = definition.fields.filter((field) => field.advanced);
  const renderField = (field: Field) => {
    const isRequired = !field.advanced && field.initial === undefined && field.kind !== "checkbox";
    return <label className={`construction-suite-field${field.kind === "checkbox" ? " is-checkbox" : ""}`} key={field.key}>
      <span>{field.label}{field.unit && <small>{field.unit}</small>}</span>
      {field.kind === "select" ? <select id={field.key} required={isRequired} value={values[field.key] ?? field.initial ?? ""} onFocus={() => setFocusedDimension(field.key)} onBlur={() => setFocusedDimension(null)} onChange={(event) => updateValue(field.key, event.target.value)} aria-label={field.label}>{field.initial === undefined && <option value="">Válasszon…</option>}{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input id={field.key} type={field.kind === "checkbox" ? "checkbox" : field.kind === "text" ? "text" : "number"} inputMode={field.kind === "text" ? "text" : field.kind === "checkbox" ? undefined : "decimal"} min={!field.kind ? "0" : undefined} step={field.integer ? "1" : "any"} required={isRequired} checked={field.kind === "checkbox" ? values[field.key] === "true" : undefined} value={field.kind === "checkbox" ? undefined : values[field.key] ?? ""} onFocus={() => setFocusedDimension(field.key)} onBlur={() => setFocusedDimension(null)} onChange={(event) => updateValue(field.key, field.kind === "checkbox" ? String(event.target.checked) : event.target.value)} aria-label={`${field.label}${field.unit ? `, ${field.unit}` : ""}`} />}
    </label>;
  };
  const headingContent = <header className="construction-suite-title"><div><p className="section-eyebrow">ELLENŐRZÖTT GEOMETRIAI SZÁMÍTÁS</p><h2>{definition.reference.title}</h2></div></header>;
  const noteContent = <><p className="construction-suite-note">{definition.note}</p>{activeGuide && <MeasurementGuidance compact guide={activeGuide} />}</>;
  const fieldsContent = <>
    <div className="construction-suite-form-grid">{basicFields.map(renderField)}</div>
    {advancedFields.length > 0 && <GlassDisclosure className="construction-suite-advanced" summary="Részletes számítás · opcionális">{definition.advancedHelp && <p className="construction-suite-note">{definition.advancedHelp}</p>}{definition.reference.id === "roof.gable" && <p className="construction-suite-note">A cserepeslemez-darabszámhoz gyártói termékadat, igazolt hasznos szélesség és toldás nélküli fedési hossz szükséges. Hiányos vagy nem támogatott adatoknál darabszám nem jelenik meg.</p>}{!definition.advancedHelp && definition.reference.id !== "roof.gable" && <p className="construction-suite-note">Ezek az adatok további mennyiségi eredményt vagy ellenőrzést kapcsolnak be. Az alapgeometriai számításhoz nem szükségesek.</p>}<div className="construction-suite-form-grid">{advancedFields.map(renderField)}</div></GlassDisclosure>}
  </>;
  const primaryRows = calculation.rows.slice(0, 6);
  const detailRows = calculation.rows.slice(6);
  const stepRuleLine = calculation.rows.find((line) => line.label.startsWith("2 × fellépő"));
  const stepRuleValue = typeof stepRuleLine?.value === "number" ? stepRuleLine.value : null;
  const resultsContent = <>
    {inputsReady && calculation.error && <p className="form-message is-error" role="alert">{calculation.error}</p>}
    {calculation.geometry && <><RoofGeometryResults geometry={calculation.geometry} heading="Geometriai eredmények" provenanceLabel="Kézi bemenetek · számított geometriai eredmények." /><RoofTimberQuantityPanel geometry={calculation.geometry} value={timberParameters} onChange={(next) => setRoofTimberByCalculator((current) => ({ ...current, [selectedId]: next }))} /><RoofUnderlayQuantityPanel geometry={calculation.geometry} value={underlayParameters} onChange={(next) => setRoofUnderlayByCalculator((current) => ({ ...current, [selectedId]: next }))} /></>}
    {primaryRows.length > 0 && <section className="construction-suite-results" aria-live="polite"><h3>Fő eredmények</h3><dl>{primaryRows.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{typeof line.value === "number" ? formatNumber(line.value) : line.value} {line.unit && <span>{line.unit}</span>}</dd></div>)}</dl>{stepRuleValue !== null && <p className="construction-suite-advisory">A számított 2R+G érték {formatHuNumber(stepRuleValue)} mm, {stepRuleValue < 600 || stepRuleValue > 660 ? "a közölt 600–660 mm-es referencia-tartományon kívül esik" : "a közölt 600–660 mm-es referencia-tartományon belül van"}. Ez csak számtani összevetés; nem ergonómiai minősítés és nem szabványi megfelelőség.</p>}<p className="construction-suite-limit">{definition.reference.limitation}</p></section>}
    {detailRows.length > 0 && <GlassDisclosure className="construction-suite-result-details" summary={`Részletes eredmények · ${detailRows.length}`}><dl>{detailRows.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{typeof line.value === "number" ? formatNumber(line.value) : line.value} {line.unit && <span>{line.unit}</span>}</dd></div>)}</dl></GlassDisclosure>}
  </>;
  const drawingContent = calculation.geometry !== null || calculation.rows.length > 0
    ? definition.reference.category === "stair"
      ? <ConstructionStairDrawing referenceId={definition.reference.id} values={values} focusedDimension={focusedDimension} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />
      : definition.reference.category === "concrete" || definition.reference.category === "auxiliary"
        ? <ConstructionMaterialDrawing referenceId={definition.reference.id} values={values} focusedDimension={focusedDimension} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />
      : <ConstructionDrawing definition={definition} values={values} roofGeometry={calculation.geometry} timberLayout={timberLayout?.status === "available" ? timberLayout : null} underlayLayout={underlayLayout} focusedDimension={focusedDimension} activeDimensionDescription={activeGuide?.meaning} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />
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

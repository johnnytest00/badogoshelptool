import { constructionCalculatorCatalog } from "@/domain/calculations/construction/catalog";

import { calculateBeveledRiserGeometry, calculateConcreteStairGeometry, calculateLandingStairGeometry, calculateSpiralStairGeometry, calculateStraightStairGeometry } from "@/domain/calculations/construction/stairs";

import { calculateWinderStairGeometry } from "@/domain/calculations/construction/winder-stairs";

import type { CalculatorDefinition, Field } from "./construction-calculator-types";

const mm = (value: Record<string, unknown>, key: string) => Number(value[key]);

const nullableMm = (value: Record<string, unknown>, key: string) => value[key] === undefined || value[key] === null || value[key] === "" ? null : Number(value[key]);

const formatHuNumber = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(value);

const definitions: Record<string, CalculatorDefinition> = {
"stair.wood.closed_straight": {
    reference: constructionCalculatorCatalog.find((item) => item.id === "stair.wood.closed_straight")!, draw: "stairs", note: "Fellépőmagasság és belépő a megadott összemelkedésből, vízszintes helyből és fellépőszámból. A lépcsőhajlás a fellépő és a belépő aránya; a hajlásvonal az első fokéltől a felső szint éléig tart, és nem a pofafa szabási hossza (ahhoz a pofafa szélessége és csatlakozása kell). A kényelmi képlet tájékoztató.",
    advancedHelp: "A kar szélességének megadásával az alaprajzi nézet is méretarányosan megjelenik. Az oldalnézeti eredményekhez nem szükséges.",
    fields: [{ key: "totalRiseMm", label: "Padlószintek közötti teljes emelkedés", unit: "mm" }, { key: "availableRunMm", label: "Vízszintes helyigény", unit: "mm" }, { key: "riserCount", label: "Fellépések száma", unit: "db", integer: true }, { key: "stairWidthMm", label: "Lépcsőkar szélessége · alaprajzi nézethez", unit: "mm", advanced: true }],
    calculate: (input) => { const width = nullableMm(input, "stairWidthMm"); const result = calculateStraightStairGeometry({ totalRiseMm: mm(input, "totalRiseMm"), availableRunMm: mm(input, "availableRunMm"), riserCount: mm(input, "riserCount"), ...(width === null ? {} : { stairWidthMm: width }) }); return [{ label: "Egy fellépő", value: result.riserHeightMm, unit: "mm" }, { label: "Fokok száma", value: result.treadCount, unit: "db" }, { label: "Belépő", value: result.goingMm, unit: "mm" }, { label: "Hajlásvonal hossza · első fokéltől a felső szint éléig", value: result.pitchLineLengthMm, unit: "mm" }, { label: "Lépcsőhajlás", value: result.pitchDegrees, unit: "°" }, { label: "2 × fellépő + belépő", value: result.stepRuleMm, unit: "mm" }]; },
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
  }
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
        { label: "Karok hajlásvonalának összhossza", value: result.totalGeometricFlightLengthMm, unit: "mm" },
        ...result.flights.map((flight) => ({ label: `${flight.index}. kar · vízszintes futás`, value: flight.runMm, unit: "mm" })),
        ...result.flightGeometricLengthsMm.map((length, index) => ({ label: `${index + 1}. kar · hajlásvonal hossza`, value: length, unit: "mm" })),
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
        { label: "Járóvonal hajlásvonalának hossza", value: result.walkingPitchLengthMm, unit: "mm" },
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
      { label: "Hajlásvonal hossza · első fokéltől a felső szint éléig", value: result.pitchLengthMm, unit: "mm" },
      { label: "2 × fellépő + belépő", value: result.stepRuleMm, unit: "mm" },
    ];
  },
};

export { definitions };

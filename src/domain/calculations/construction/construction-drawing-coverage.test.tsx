import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConstructionCalculatorSuite } from "@/features/calculators/construction-suite";
import { ConstructionCalculatorThumbnail, ConstructionMaterialDrawing, ConstructionStairDrawing } from "@/features/calculators/construction-visuals";

const straight = { totalRiseMm: "2800", availableRunMm: "4200", riserCount: "16", stairWidthMm: "900" };
const landing90 = { totalRiseMm: "3000", stairWidthMm: "900", goingMm: "250", firstFlightRiserCount: "8", secondFlightRiserCount: "8", landingDepthMm: "900", turnDirection: "right" };
const landing180 = { ...landing90, landingGapMm: "200" };
const landingThree = { ...landing90, firstFlightRiserCount: "6", secondFlightRiserCount: "6", thirdFlightRiserCount: "6" };
const winder90 = { totalRiseMm: "2800", stairWidthMm: "800", innerRadiusMm: "300", lowerTreadCount: "4", upperTreadCount: "6", windersPerTurn: "3", turnDirection: "right" };

const stairCases = [
  ...["stair.wood.closed_straight", "stair.wood.open_straight", "stair.metal.straight", "stair.metal.zigzag"].flatMap((id) => [[id, straight, "side"], [id, straight, "plan"]] as const),
  ...["stair.wood.90_landing", "stair.metal.90_landing", "stair.metal.90_zigzag"].map((id) => [id, landing90, "plan"] as const),
  ...["stair.wood.180_landing", "stair.metal.180_landing", "stair.metal.180_zigzag"].map((id) => [id, landing180, "plan"] as const),
  ["stair.wood.three_landing", landingThree, "plan"],
  ["stair.wood.90_winder", winder90, "plan"],
  ["stair.wood.90_winder", winder90, "elevation"],
  ["stair.wood.180_winder", { ...winder90, windersPerTurn: "4" }, "plan"],
  ["stair.wood.180_winder", { ...winder90, windersPerTurn: "4" }, "elevation"],
  ["stair.wood.three_winder", { ...winder90, middleTreadCount: "5" }, "plan"],
  ["stair.wood.three_winder", { ...winder90, middleTreadCount: "5" }, "elevation"],
  ["stair.wood.spiral", { totalRiseMm: "2800", outerDiameterMm: "1800", innerDiameterMm: "300", turnDegrees: "450", riserCount: "16" }, "plan"],
  ["stair.wood.spiral", { totalRiseMm: "2800", outerDiameterMm: "1800", innerDiameterMm: "300", turnDegrees: "450", riserCount: "16" }, "rise"],
  ["stair.beveled_riser", { goingMm: "280", riserHeightMm: "175", nosingProjectionMm: "30" }, "profile"],
  ["stair.concrete_straight", { totalRiseMm: "2800", availableRunMm: "4200", stairWidthMm: "1000", riserCount: "16" }, "profile"],
] as const;

const materialCases = [
  ["concrete.strip", { totalCenterlineLengthMm: "10000", widthMm: "400", depthMm: "800" }, ["plan", "section"]],
  ["concrete.pile", { count: "4", diameterMm: "300", lengthMm: "5000" }, ["plan", "section"]],
  ["concrete.slab", { lengthMm: "10000", widthMm: "8000", thicknessMm: "200" }, ["plan", "section"]],
  ["concrete.ring", { outerDiameterMm: "1200", wallThicknessMm: "100", heightMm: "1000" }, ["plan", "section"]],
  ["concrete.paving", { lengthMm: "10000", widthMm: "2000", tileLengthMm: "200", tileWidthMm: "100", baseLayerThicknessMm: "150" }, ["plan", "tile", "section"]],
  ["concrete.blind_area", { buildingLengthMm: "10000", buildingWidthMm: "8000", apronWidthMm: "1000", concreteThicknessMm: "100", gravelThicknessMm: "150" }, ["plan", "section"]],
  ["concrete.mix", { concreteVolumeM3: "4", cementKgPerM3: "300", cementRatio: "1", sandRatio: "2", aggregateRatio: "3" }, ["mix"]],
  ["concrete.rebar", { barDiameterMm: "12", cutLengthMm: "6000", pieceCount: "10" }, ["bars", "section"]],
  ["concrete.mesh", { lengthMm: "5000", widthMm: "3000", coverMm: "50", spacingMm: "200", barDiameterMm: "10" }, ["plan"]],
  ["aux.diagonal", { lengthMm: "3000", widthMm: "4000" }, ["plan"]],
] as const;

const inputCases: ReadonlyArray<{ id: string; required: readonly string[]; optional?: readonly string[] }> = [
  ...["stair.wood.closed_straight", "stair.wood.open_straight", "stair.metal.straight", "stair.metal.zigzag"].map((id) => ({ id, required: ["totalRiseMm", "availableRunMm", "riserCount"], optional: ["stairWidthMm"] })),
  ...["stair.wood.90_landing", "stair.metal.90_landing", "stair.metal.90_zigzag"].map((id) => ({ id, required: ["totalRiseMm", "stairWidthMm", "goingMm", "landingDepthMm", "firstFlightRiserCount", "secondFlightRiserCount", "turnDirection"], optional: ["openingLengthMm", "openingWidthMm"] })),
  ...["stair.wood.180_landing", "stair.metal.180_landing", "stair.metal.180_zigzag"].map((id) => ({ id, required: ["totalRiseMm", "stairWidthMm", "goingMm", "landingDepthMm", "landingGapMm", "firstFlightRiserCount", "secondFlightRiserCount", "turnDirection"], optional: ["openingLengthMm", "openingWidthMm"] })),
  { id: "stair.wood.three_landing", required: ["totalRiseMm", "stairWidthMm", "goingMm", "landingDepthMm", "firstFlightRiserCount", "secondFlightRiserCount", "thirdFlightRiserCount", "turnDirection"], optional: ["openingLengthMm", "openingWidthMm"] },
  ...["stair.wood.90_winder", "stair.wood.180_winder"].map((id) => ({ id, required: ["totalRiseMm", "stairWidthMm", "innerRadiusMm", "lowerTreadCount", "upperTreadCount", "windersPerTurn", "turnDirection"], optional: ["openingLengthMm", "openingWidthMm"] })),
  { id: "stair.wood.three_winder", required: ["totalRiseMm", "stairWidthMm", "innerRadiusMm", "lowerTreadCount", "middleTreadCount", "upperTreadCount", "windersPerTurn", "turnDirection"], optional: ["openingLengthMm", "openingWidthMm"] },
  { id: "stair.wood.spiral", required: ["totalRiseMm", "outerDiameterMm", "innerDiameterMm", "turnDegrees", "riserCount"] },
  { id: "stair.beveled_riser", required: ["goingMm", "riserHeightMm"], optional: ["nosingProjectionMm"] },
  { id: "stair.concrete_straight", required: ["totalRiseMm", "availableRunMm", "stairWidthMm", "riserCount"] },
  { id: "concrete.strip", required: ["totalCenterlineLengthMm", "widthMm", "depthMm"] },
  { id: "concrete.pile", required: ["count", "diameterMm", "lengthMm"] },
  { id: "concrete.slab", required: ["lengthMm", "widthMm", "thicknessMm"] },
  { id: "concrete.ring", required: ["outerDiameterMm", "wallThicknessMm", "heightMm"] },
  { id: "concrete.paving", required: ["lengthMm", "widthMm", "tileLengthMm", "tileWidthMm"], optional: ["baseLayerThicknessMm"] },
  { id: "concrete.blind_area", required: ["buildingLengthMm", "buildingWidthMm", "apronWidthMm"], optional: ["concreteThicknessMm", "gravelThicknessMm"] },
  { id: "concrete.mix", required: ["concreteVolumeM3", "cementKgPerM3", "cementRatio", "sandRatio", "aggregateRatio"], optional: ["bagWeightKg"] },
  { id: "concrete.rebar", required: ["barDiameterMm", "cutLengthMm", "pieceCount"], optional: ["steelDensityKgPerM3"] },
  { id: "concrete.mesh", required: ["lengthMm", "widthMm", "coverMm", "spacingMm", "barDiameterMm"], optional: ["steelDensityKgPerM3"] },
  { id: "aux.diagonal", required: ["lengthMm", "widthMm"] },
];

describe("F9.38.1 construction drawing and legend coverage", () => {
  it.each(inputCases)("marks only the essential inputs as required for $id", ({ id, required, optional = [] }) => {
    const html = renderToStaticMarkup(<ConstructionCalculatorSuite initialCalculatorId={id} />);
    for (const key of required) {
      expect(html).toMatch(new RegExp(`<(?:(?:input)|(?:select))[^>]*\\bid="${key}"[^>]*\\brequired=""`));
    }
    for (const key of optional) {
      expect(html).toMatch(new RegExp(`<(?:(?:input)|(?:select))[^>]*\\bid="${key}"`));
      expect(html).not.toMatch(new RegExp(`<(?:(?:input)|(?:select))[^>]*\\bid="${key}"[^>]*\\brequired=""`));
    }
  });

  it.each(stairCases)("renders a text-free, accessible drawing and matching legend for %s · %s", (referenceId, values, initialView) => {
    const html = renderToStaticMarkup(<ConstructionStairDrawing referenceId={referenceId} values={values} initialView={initialView} />);
    const svg = html.match(/<svg[^>]*class="construction-stair-svg"[\s\S]*?<\/svg>/)?.[0];
    expect(svg).toBeDefined();
    expect(svg).not.toContain("<text");
    expect(svg).toMatch(/semantic-line is-(height|width|slope|special)/);
    expect(html).toContain('aria-label="Rajzjelmagyarázat"');
    expect(html).toContain("construction-stair-legend-indicator");
    expect(html).toContain('aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + - Home"');
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
  });

  it.each(materialCases.flatMap(([referenceId, values, views]) => views.map((view) => [referenceId, values, view] as const)))("renders a text-free, accessible drawing and matching legend for %s · %s", (referenceId, values, initialView) => {
    const html = renderToStaticMarkup(<ConstructionMaterialDrawing referenceId={referenceId} values={values} initialView={initialView} />);
    const svg = html.match(/<svg[^>]*class="construction-stair-svg"[\s\S]*?<\/svg>/)?.[0];
    expect(svg).toBeDefined();
    expect(svg).not.toContain("<text");
    expect(svg).toMatch(/semantic-line is-(height|width|slope|special)|construction-ratio-bar is-(height|width|slope|special) pattern-/);
    expect(html).toContain('aria-label="Rajzjelmagyarázat"');
    expect(html).toContain("construction-stair-legend-indicator");
    expect(html).toContain('aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + - Home"');
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
  });

  it("keeps 360° and steel density explicit instead of silently defaulting them", () => {
    const spiral = renderToStaticMarkup(<ConstructionCalculatorSuite initialCalculatorId="stair.wood.spiral" />);
    const bars = renderToStaticMarkup(<ConstructionCalculatorSuite initialCalculatorId="concrete.rebar" />);
    expect(spiral).toContain("Teljes fordulási szög");
    expect(spiral).not.toContain('value="360"');
    expect(bars).toContain("Acélsűrűség");
    expect(bars).not.toContain('value="7850"');
  });

  it("shows computed stair dimensions as legend values rather than SVG text", () => {
    const html = renderToStaticMarkup(<ConstructionStairDrawing referenceId="stair.wood.closed_straight" values={straight} />);
    expect(html).toContain("Egy fellépő");
    expect(html).toContain("175 mm");
    expect(html).toContain("Vízszintes futás");
    expect(html).toContain("4200 mm");
  });

  it("shows an optional nosing legend only when its colored segment is drawn", () => {
    const withoutNosing = renderToStaticMarkup(<ConstructionStairDrawing referenceId="stair.beveled_riser" values={{ goingMm: "280", riserHeightMm: "175" }} initialView="profile" />);
    expect(withoutNosing).not.toContain("Orrkiülés");
    expect(withoutNosing).not.toContain('class="semantic-line is-special"');

    const withNosing = renderToStaticMarkup(<ConstructionStairDrawing referenceId="stair.beveled_riser" values={{ goingMm: "280", riserHeightMm: "175", nosingProjectionMm: "30" }} initialView="profile" />);
    expect(withNosing).toContain("Orrkiülés");
    expect(withNosing).toContain("30 mm");
    expect(withNosing).toContain('class="semantic-line is-special"');
  });

  it("matches reinforcement mesh spacing legends with the two drawn line patterns", () => {
    const html = renderToStaticMarkup(<ConstructionMaterialDrawing referenceId="concrete.mesh" values={{ lengthMm: "5000", widthMm: "3000", coverMm: "50", spacingMm: "200", barDiameterMm: "10" }} />);
    expect(html).toContain('class="construction-mesh-line is-widthwise"');
    expect(html).toContain('class="construction-mesh-line is-lengthwise"');
    expect(html).toContain('class="construction-stair-legend-indicator semantic-line is-special pattern-dotted"');
    expect(html).toContain('class="construction-stair-legend-indicator semantic-line is-special pattern-dashed"');
    expect(html).toContain("Tényleges osztás hossz mentén");
    expect(html).toContain("Tényleges osztás szélesség mentén");
  });

  it("shows the computed building contour in the blind-area plan legend", () => {
    const html = renderToStaticMarkup(<ConstructionMaterialDrawing referenceId="concrete.blind_area" values={{ buildingLengthMm: "10000", buildingWidthMm: "8000", apronWidthMm: "1000" }} initialView="plan" />);
    expect(html).toContain("Épületkontúr");
    expect(html).toMatch(/10[\s\u00a0\u202f]000 × 8000 mm/);
    expect(html).toMatch(/12[\s\u00a0\u202f]000 mm/);
  });

  it("does not put labels inside the diagonal calculator thumbnail", () => {
    const html = renderToStaticMarkup(<ConstructionCalculatorThumbnail id="aux.diagonal" />);
    expect(html).not.toContain("<text");
    expect(html).toContain("construction-icon-diagonal");
  });
});

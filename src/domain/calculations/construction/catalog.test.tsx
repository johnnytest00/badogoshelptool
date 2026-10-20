import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConstructionCalculatorSuite } from "@/features/calculators/construction-suite";
import { ConstructionStairDrawing, ConstructionCalculatorThumbnail } from "@/features/calculators/construction-visuals";
import { constructionCalculatorCatalog } from "./catalog";

describe("construction calculator coverage and selection", () => {
  it("accounts for all 31 requested references with explicit verification statuses", () => {
    expect(constructionCalculatorCatalog).toHaveLength(31);
    expect(constructionCalculatorCatalog.filter((item) => item.status === "verified")).toHaveLength(31);
    expect(constructionCalculatorCatalog.filter((item) => item.status === "not_implemented")).toHaveLength(0);
    expect(constructionCalculatorCatalog.every((item) => item.id && item.title && item.scope && item.limitation)).toBe(true);
  });

  it("keeps the landing workspace usable and does not show validation errors before input", () => {
    const html = renderToStaticMarkup(<ConstructionCalculatorSuite />);
    expect(html).toContain("Tetők és faszerkezetek");
    expect(html).toContain("Lépcsők");
    expect(html).toContain("Betonozás és alapozás");
    expect(html).not.toContain("90°-os fa lépcső – húzott fokokkal");
    expect(html).not.toContain("Egyenes betonlépcső");
    expect(html).not.toContain("Invalid input");
  });

  it("provides distinct original thumbnails for all 17 stair and 10 concrete references", () => {
    const staircaseIds = constructionCalculatorCatalog.filter((item) => item.category === "stair").map((item) => item.id);
    const concreteIds = constructionCalculatorCatalog.filter((item) => item.category === "concrete" || item.category === "auxiliary").map((item) => item.id);
    const stairThumbnails = staircaseIds.map((id) => renderToStaticMarkup(<ConstructionCalculatorThumbnail id={id} />));
    const concreteThumbnails = concreteIds.map((id) => renderToStaticMarkup(<ConstructionCalculatorThumbnail id={id} />));
    expect(stairThumbnails).toHaveLength(17);
    expect(new Set(stairThumbnails).size).toBe(17);
    expect(concreteThumbnails).toHaveLength(10);
    expect(new Set(concreteThumbnails).size).toBe(10);
  });

  it("does not generate a result drawing for a winder staircase with missing required geometry", () => {
    const html = renderToStaticMarkup(<ConstructionStairDrawing referenceId="stair.wood.90_winder" values={{ totalRiseMm: "2500", availableRunMm: "3000", riserCount: "15" }} />);
    expect(html).toBe("");
  });

  it("renders plan and unfolded geometry drawings for all three verified winder variants", () => {
    const twoFlight = { totalRiseMm: "2800", stairWidthMm: "800", innerRadiusMm: "300", lowerTreadCount: "4", upperTreadCount: "6", windersPerTurn: "3", turnDirection: "right" };
    const cases = [
      ["stair.wood.90_winder", twoFlight],
      ["stair.wood.180_winder", { ...twoFlight, windersPerTurn: "4", turnDirection: "left" }],
      ["stair.wood.three_winder", { ...twoFlight, middleTreadCount: "5" }],
    ] as const;
    for (const [referenceId, values] of cases) {
      const html = renderToStaticMarkup(<ConstructionStairDrawing referenceId={referenceId} values={values} />);
      expect(html).toContain("<svg");
      expect(html).toContain("Alaprajz");
      expect(html).toContain("Kiterített profil");
      expect(html).toContain("stair-landing-fill");
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("Infinity");
    }
  });

  it("renders finite 90-degree, 180-degree, three-flight landing, and solid-concrete stair drawings", () => {
    const twoFlightValues = { totalRiseMm: "3000", stairWidthMm: "900", goingMm: "250", firstFlightRiserCount: "8", secondFlightRiserCount: "8", landingDepthMm: "900", turnDirection: "left" };
    const uFlightValues = { ...twoFlightValues, landingGapMm: "200" };
    const threeFlightValues = { totalRiseMm: "3000", stairWidthMm: "900", goingMm: "250", firstFlightRiserCount: "6", secondFlightRiserCount: "6", thirdFlightRiserCount: "6", landingDepthMm: "900", turnDirection: "right" };
    const concreteValues = { totalRiseMm: "2800", availableRunMm: "4200", stairWidthMm: "1000", riserCount: "16" };
    for (const [referenceId, values] of [
      ["stair.wood.90_landing", twoFlightValues],
      ["stair.wood.180_landing", uFlightValues],
      ["stair.wood.three_landing", threeFlightValues],
      ["stair.concrete_straight", concreteValues],
    ] as const) {
      const html = renderToStaticMarkup(<ConstructionStairDrawing referenceId={referenceId} values={values} />);
      expect(html).toContain("<svg");
      expect(html).toContain(referenceId === "stair.concrete_straight" ? "stair-concrete-body" : "stair-landing-fill");
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("Infinity");
    }
  });

  it("renders a valid annular projection when a spiral tread spans a full turn or more", () => {
    const html = renderToStaticMarkup(<ConstructionStairDrawing referenceId="stair.wood.spiral" values={{ totalRiseMm: "2400", outerDiameterMm: "1800", innerDiameterMm: "300", turnDegrees: "1440", riserCount: "2" }} />);
    expect(html).toContain("fill-rule=\"evenodd\"");
    expect(html).toContain("A 158 158 0 1 1");
    expect(html).toContain("Több teljes fordulatnál az alaprajzi vetületek egymásra esnek.");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
  });
});

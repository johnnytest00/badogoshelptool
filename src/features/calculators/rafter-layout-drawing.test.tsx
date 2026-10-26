import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateRoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout, type RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { calculatePlaneBirdsmouths } from "@/domain/calculations/construction/plane-birdsmouth";
import { RafterLayoutDrawing } from "./rafter-layout-drawing";

const GABLE: RoofGeometryInput = { type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } };
const HIP: RoofGeometryInput = { type: "hip", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 45 };
const render = (input: RoofGeometryInput) => {
  const geometry = calculateRoofGeometry(input);
  const layout = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 600, startInsetMm: 0, endInsetMm: 0 } }) as RoofTimberLayout;
  return renderToStaticMarkup(<RafterLayoutDrawing geometry={geometry} timberLayout={layout} />).replace(/<!-- -->/g, "");
};
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("rafter layout drawing", () => {
  it("shows the numbered rafters of the plane in cm with spacing, lengths and the ridge plumb cut", () => {
    const html = render(GABLE);
    expect(html.match(/class="rafter-layout-rafter"/g)).toHaveLength(18);
    const content = text(html);
    for (const part of ["Geometriai szarufavonalak · tetősíkonként", "nem teljes tetőszerkezeti (framing) terv", "egy vagy több fizikai faelemet", "18 db", "58,8 cm", "18 db × 500 cm", "Az 1. vonal a tetősík szélén áll", "Felső vég · gerinc", "függővágás 36,9°", "Alsó vég · eresz", "Szarufa kiszabása"]) expect(content).toContain(part);
    // Position list from the first rafter: 2nd at 58,8 cm, last at 1000 cm.
    expect(content).toMatch(/2\. vonal 58,8 cm/);
    expect(content).toMatch(/18\. vonal 1000 cm/);
    expect(content).not.toContain("kiosztási terv");
    expect(content).not.toContain("Kontyél- és vápaszarufa nincs a modellben");
  });

  it("says a hip-ended jack rafter needs a compound cut the calculator does not give", () => {
    const content = text(render(HIP));
    expect(content).toContain("Felső vég · kontyél");
    expect(content).toContain("ferde (kettős) vágás, a rendszer nem számolja");
    // CRR-09: a plane whose rafters end on ridge and hips gets no single edge name, CRR-02: hip rafters are named as missing.
    expect(content).toContain("vegyes felső végek – lásd a listát");
    expect(content).toContain("Kontyél- és vápaszarufa nincs a modellben");
  });

  it("names what is missing when the birdsmouth was asked for without data", () => {
    const geometry = calculateRoofGeometry(GABLE);
    const layout = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 600, startInsetMm: 0, endInsetMm: 0 } }) as RoofTimberLayout;
    const content = text(renderToStaticMarkup(<RafterLayoutDrawing geometry={geometry} timberLayout={layout} birdsmouths={calculatePlaneBirdsmouths(geometry, layout, {})} />).replace(/<!-- -->/g, ""));
    expect(content).toContain("Talpszelemen-Karmi: hiányzó adat · Szarufa keresztmetszet magassága, HAP · szarufa felső élének magassága a talpszelemen felett");
  });
});

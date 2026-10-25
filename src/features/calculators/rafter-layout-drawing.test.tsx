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
    for (const part of ["Szarufa-elrendezés", "18 db", "58,8 cm", "18 db × 500 cm", "Az 1. szarufa a tetősík szélén áll", "Felső vég · gerinc", "függővágás 36,9°", "Alsó vég · eresz", "Szarufa kiszabása"]) expect(content).toContain(part);
    // Position list from the first rafter: 2nd at 58,8 cm, last at 1000 cm.
    expect(content).toMatch(/2\. szarufa 58,8 cm/);
    expect(content).toMatch(/18\. szarufa 1000 cm/);
  });

  it("says a hip-ended jack rafter needs a compound cut the calculator does not give", () => {
    const content = text(render(HIP));
    expect(content).toContain("Felső vég · kontyél");
    expect(content).toContain("ferde (kettős) vágás, a rendszer nem számolja");
  });

  it("shows the plane's birdsmouth with marking steps measured from the rafter's lower end", () => {
    // 53,13° (3-4-5), h 200, HAP 100: H = 333,3; plumb 233,3 → 23,3 cm; seat 175 → 17,5 cm; ⊥ 140 → 14 cm; 6 cm remains.
    const geometry = calculateRoofGeometry(GABLE);
    const layout = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 600, startInsetMm: 0, endInsetMm: 0 } }) as RoofTimberLayout;
    const birdsmouths = calculatePlaneBirdsmouths(geometry, layout, { rafterDepthMm: 200, seatCutHeightMm: 100, plateWidthMm: 150 });
    const content = text(renderToStaticMarkup(<RafterLayoutDrawing geometry={geometry} timberLayout={layout} birdsmouths={birdsmouths} />).replace(/<!-- -->/g, ""));
    for (const part of ["Madárszáj ezen a tetősíkon", "Ennyit kell bevágni", "Függővágás 23,3 cm", "Ülék 17,5 cm", "Bevágás mélysége 14 cm", "6 cm marad", "a szarufa alsó végén", "nem fér rá", "2,5 cm-rel"]) expect(content).toContain(part);
  });

  it("names what is missing when the birdsmouth was asked for without data", () => {
    const geometry = calculateRoofGeometry(GABLE);
    const layout = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 600, startInsetMm: 0, endInsetMm: 0 } }) as RoofTimberLayout;
    const content = text(renderToStaticMarkup(<RafterLayoutDrawing geometry={geometry} timberLayout={layout} birdsmouths={calculatePlaneBirdsmouths(geometry, layout, {})} />).replace(/<!-- -->/g, ""));
    expect(content).toContain("Madárszáj: hiányzó adat · Szarufa keresztmetszet magassága, Madárszáj vízszintes vágásának magassága");
  });
});

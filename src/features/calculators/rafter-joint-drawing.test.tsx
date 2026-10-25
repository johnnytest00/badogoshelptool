import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateRafterJoints, type RafterJointInput } from "@/domain/calculations/construction/rafter-joints";
import { RafterJointDrawing } from "./rafter-joint-drawing";
import { formatDrawingLength } from "./rafter-joints-panel";

const base: RafterJointInput = { horizontalHalfSpanMm: 4000, riseMm: 3100, eaveProjectionMm: 400, seatCutHeightMm: 100, rafterDepthMm: 200, ridgeJoint: "purlin", purlinFaceMm: 2000, purlinTopMm: 1400, ridgePurlinWidthMm: 160, ridgePurlinTopMm: 2850 };

describe("rafter joint drawing", () => {
  it("shows S1/S2/S3, the face chain and the selected joint's notch with the table values", () => {
    const html = renderToStaticMarkup(<RafterJointDrawing joints={calculateRafterJoints(base)} />);
    for (const slot of ["S1", "S2", "S3"]) expect(html).toContain(`>${slot}</strong>`);
    expect(html.match(/class="rafter-joint-badge/g)).toHaveLength(3);
    // Default unit is cm: 5500 mm → 550 cm, chain 2500 mm → 250 cm.
    expect(html).toContain("teljes hossz 550");
    expect(html).toContain(">250</text>");
    expect(html).toMatch(/Méretek: (<!-- -->)?cm/);
    // Default detail is S1: 150 / 200 / 120 / 80 mm and the two cut angles (to the rafter axis, not the roof pitch).
    for (const text of [">függő 15</text>", ">ülék 20</text>", ">bevágás 12</text>", ">marad 8</text>", ">53,1°</text>", ">36,9°</text>", "Bevágás mélysége · a szarufára merőlegesen", "Függővágás szöge a szarufa éléhez"]) expect(html).toContain(text);
    // Cut edges, the hatched offcut, marking points and the common origin O are drawn; S1's mark coincides with O.
    expect(html.match(/class="rafter-joint-cut"/g)!.length).toBeGreaterThanOrEqual(2 * 3 + 2);
    expect(html).toContain('class="rafter-joint-offcut"');
    expect(html).toContain(">0</text>");
    for (const text of ["Részlet visszaállítása", "Mit hol jelölj a szarufán", "0-ponttól", "Itt kell vágni", "Ez a rész esik ki"]) expect(html).toContain(text);
    // The "how much to cut" card and the marking steps use the same joint values (S1 in cm).
    const text = html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    for (const part of ["Ennyit kell bevágni", "Függővágás 15 cm", "Ülék 20 cm", "Bevágás mélysége 12 cm", "8 cm marad a szarufából", "A jelölés helye maga a 0-pont", "eresz felőli oldalon 53,1°", "alsó éltől mérj fel 15 cm", "hossza 20 cm"]) expect(text).toContain(part);
    // Step numbers 1–4 sit on the detail drawing where the matching marking step happens (mark, plumb line, corner, seat).
    expect(html.match(/class="rafter-joint-step"/g)).toHaveLength(4);
    expect(html).toContain("Teljes rajz");
    expect(html).toContain("Nézet visszaállítása");
  });

  it("refuses to draw an unproven notch and names the missing data", () => {
    const html = renderToStaticMarkup(<RafterJointDrawing joints={calculateRafterJoints({ ...base, rafterDepthMm: undefined })} />);
    expect(html).toContain("A méretezett szarufarajz nem készíthető.");
    expect(html).toContain("Szarufa magassága (keresztmetszet)");
    expect(html).not.toContain("<polygon");
    expect(html).not.toContain("rafter-joint-badge");
  });

  it("shows cm to the nearest mm and keeps mm/m conversions", () => {
    expect([formatDrawingLength(2468.75, "mm"), formatDrawingLength(2468.75, "cm"), formatDrawingLength(2468.75, "m")]).toEqual(["2468,8", "246,9", "2,4688"]);
    expect(formatDrawingLength(66.6666667, "mm")).toBe("66,7");
  });

  it("tells whether the seat fits on the given wall plate, without a structural verdict", () => {
    const fits = renderToStaticMarkup(<RafterJointDrawing joints={calculateRafterJoints({ ...base, plateWidthMm: 250 })} />).replace(/<!-- -->/g, "");
    expect(fits).toContain("Az ülék (20 cm) ráfér a 25 cm széles talpszelemenre.");
    const overhangs = renderToStaticMarkup(<RafterJointDrawing joints={calculateRafterJoints({ ...base, plateWidthMm: 160 })} />).replace(/<!-- -->/g, "");
    expect(overhangs).toContain("nem fér rá");
  });
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateRafterJoints, type RafterJointInput } from "@/domain/calculations/construction/rafter-joints";
import { calculateRoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout, type RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { calculatePlaneBirdsmouths } from "@/domain/calculations/construction/plane-birdsmouth";
import { RafterJointDrawing, RoofJointDrawing } from "./rafter-joint-drawing";
import { formatDrawingLength } from "./rafter-joints-panel";

const base: RafterJointInput = { horizontalHalfSpanMm: 4000, riseMm: 3100, eaveProjectionMm: 400, seatCutHeightMm: 100, rafterDepthMm: 200, ridgeJoint: "purlin", purlinFaceMm: 2000, purlinTopMm: 1400, ridgePurlinWidthMm: 160, ridgePurlinTopMm: 2850 };

describe("rafter joint drawing", () => {
  it("shows the real joint names, the face chain and the selected joint's notch with the table values", () => {
    const html = renderToStaticMarkup(<RafterJointDrawing joints={calculateRafterJoints(base)} />);
    for (const name of ["Talpszelemen", "Derékszelemen", "Gerincszelemen"]) expect(html).toContain(`<span>${name}</span>`);
    expect(html.match(/class="rafter-joint-badge/g)).toHaveLength(3);
    // S1–S3 are internal ids only: never a visible label, title or accessible name.
    expect(html.replace(/(id|class|data-[a-z-]+|key)="[^"]*"/g, "")).not.toMatch(/\bS[123]\b/);
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
    for (const text of ["Kiválasztott részlet visszaállítása", "Szarufa- és szelemenkapcsolat · részlet", "Mit hol jelölj a szarufán", "0-ponttól", "Itt kell vágni", "Ez a rész esik ki"]) expect(html).toContain(text);
    // The "how much to cut" card and the marking steps use the same joint values (S1 in cm).
    const text = html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    for (const part of ["Ennyit kell bevágni", "Függővágás 15 cm", "Ülék 20 cm", "Bevágás mélysége 12 cm", "8 cm marad a szarufából", "A jelölés helye maga a 0-pont", "eresz felőli oldalon 53,1°", "alsó éltől mérj fel 15 cm", "hossza 20 cm"]) expect(text).toContain(part);
    // Step numbers 1–4 sit on the detail drawing where the matching marking step happens (mark, plumb line, corner, seat).
    expect(html.match(/class="rafter-joint-step"/g)).toHaveLength(4);
    expect(html).toContain("Teljes szarufa");
    expect(html).toContain("Áttekintő visszaállítása");
    expect(html).toContain("Egy ujjal görgetsz, két ujjal mozgatod és nagyítod");
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

  it("states the plate check in the screen-reader summary exactly as drawn (CRR-08)", () => {
    const summary = (input: RafterJointInput) => renderToStaticMarkup(<RafterJointDrawing joints={calculateRafterJoints(input)} />).replace(/<!-- -->/g, "").match(/class="drawing-accessible-summary">([^<]*)</)![1]!;
    expect(summary({ ...base, plateWidthMm: 250 })).toContain("Az ülék (20 cm) ráfér a 25 cm széles talpszelemenre");
    expect(summary({ ...base, plateWidthMm: 160 })).toContain("nem fér rá a 16 cm széles talpszelemenre, 4 cm-rel túlnyúlik");
    expect(summary(base)).toContain("A talpszelemen szélessége nincs megadva");
    expect(summary(base)).toContain("Talpszelemen számított, Derékszelemen számított, Gerincszelemen számított");
    expect(summary({ ...base, ridgeJoint: "board" })).toContain("Gerincdeszka további adat szükséges");
  });
});

describe("roof joint drawing (M9.5)", () => {
  const roof = (input: RoofGeometryInput, joints: Parameters<typeof calculatePlaneBirdsmouths>[2]) => {
    const geometry = calculateRoofGeometry(input);
    const layout = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 600, startInsetMm: 0, endInsetMm: 0 } }) as RoofTimberLayout;
    const planes = calculatePlaneBirdsmouths(geometry, layout, joints);
    return { planes, html: renderToStaticMarkup(<RoofJointDrawing planes={planes} physicalReason={layout.physicalLayout.reason} hipOrValley={geometry.edges.some((edge) => edge.kind === "hip" || edge.kind === "valley")} />).replace(/<!-- -->/g, "") };
  };
  const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  // 3-4-5 gable: tanα 0.75, h 200, HAP 100 → plumb 15 cm, seat 20 cm, ⊥ 12 cm, 8 cm remains; overhang 400 → mark at 50 cm from the lower end.
  const GABLE: RoofGeometryInput = { type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 8_000, roofRiseMm: 3_000, eaveOverhangMm: 400, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } };

  it("draws both gable sides in one cross-section, each from its own plane, with the wall-plate detail under it", () => {
    const { html } = roof(GABLE, { rafterDepthMm: 200, seatCutHeightMm: 100, plateWidthMm: 250 });
    const content = text(html);
    for (const part of ["Szarufák és támaszok · áttekintő", "Szarufa- és szelemenkapcsolat · részlet", "bal oldal", "jobb oldal", "Bal oldal · 1. tetősík", "Jobb oldal · 2. tetősík", "geometriai szarufavonal",
      "Nem teljes tetőszerkezeti (framing) terv", "Ennyit kell bevágni · Talpszelemen", "Függővágás 15 cm", "Ülék 20 cm", "Bevágás mélysége 12 cm", "8 cm marad", "A szarufa alsó végétől a felső élen mérj 50 cm", "ráfér a 25 cm"]) expect(content).toContain(part);
    // Two mirrored sides with equal values: badges and dimensions once (no stacked duplicates), both outlines drawn; each side's pitch from its own plane.
    expect(html.match(/class="rafter-joint-badge/g)).toHaveLength(2);
    expect((html.match(/teljes hossz 550/g) ?? []).length).toBeLessThanOrEqual(1);
    // Every overview value is also in the list from the rafter's lower end (eave length 400/cos α = 500 mm).
    for (const part of ["Mit hol jelölj a szarufán · bal oldal", "Szarufa teljes hossza 550 cm", "Talpszelemen 50 cm"]) expect(content).toContain(part);
    expect(html.match(/class="rafter-joint-wood"/g)!.length).toBeGreaterThanOrEqual(2);
    expect(content.match(/hajlás 36,9°/g)).toHaveLength(2);
  });

  it("shows the ridge purlin and the purlin on the roof sides and never the internal slot ids", () => {
    const { html } = roof(GABLE, { rafterDepthMm: 200, seatCutHeightMm: 100, purlinFaceMm: 2000, purlinTopMm: 1450, ridgeJoint: "purlin", ridgePurlinWidthMm: 160, ridgePurlinTopMm: 2830 });
    for (const name of ["Talpszelemen", "Derékszelemen", "Gerincszelemen"]) expect(html).toContain(`<span>${name}</span>`);
    expect(text(html)).not.toContain("nem támogatott");
    expect(html.replace(/(id|class|data-[a-z-]+|key)="[^"]*"/g, "")).not.toMatch(/\bS[123]\b/);
  });

  it("does not invent a second side or a ridge on a shed roof, and lists hip-ended planes as unsupported", () => {
    const shed = roof({ type: "shed", lengthMm: 10_000, widthMm: 4_000, pitchDegrees: 15 }, { rafterDepthMm: 200, seatCutHeightMm: 60 });
    expect(text(shed.html)).not.toContain("jobb oldal");
    expect(text(shed.html)).toContain("Felső vég nem támogatott: A szarufák felső vége a félnyeregtető felső élén van");
    expect(shed.html.match(/class="rafter-joint-badge/g)).toHaveLength(1);
    const hip = roof({ type: "hip", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 45 }, { rafterDepthMm: 200, seatCutHeightMm: 100 });
    expect(text(hip.html)).toContain("3. tetősík, 4. tetősík · Felső vég nem támogatott: A tetősík szarufái a gerinc végpontjába futnak");
    expect(text(hip.html)).toContain("Kontyél- és vápaszarufa nincs a modellben");
  });

  it("names the missing data instead of drawing an unproven notch", () => {
    const { html } = roof(GABLE, { seatCutHeightMm: 100 });
    expect(text(html)).toContain("A méretezett szarufarajz nem készíthető.");
    expect(text(html)).toContain("1. tetősík: hiányzó adat: Szarufa keresztmetszet magassága");
    expect(html).not.toContain("rafter-joint-badge");
  });
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateRafterJoints, HAP_HELP, HAP_LABEL } from "@/domain/calculations/construction/rafter-joints";
import { definitions } from "./roof-calculator-definitions";
import { HapMeasuringHelp } from "./hap-figure";
import { RafterCutFlow, RoofDrawingStack } from "./rafter-result-flow";
import { RafterJointsPanel, formatJointValue } from "./rafter-joints-panel";
import { RafterJointDrawing } from "./rafter-joint-drawing";

const order = (html: string, markers: readonly string[]) => markers.map((marker) => html.indexOf(marker));
const joints = calculateRafterJoints({ horizontalHalfSpanMm: 4000, riseMm: 3100, eaveProjectionMm: 400, seatCutHeightMm: 100, rafterDepthMm: 200, ridgeJoint: "purlin", purlinFaceMm: 2000, purlinTopMm: 1400, ridgePurlinWidthMm: 160, ridgePurlinTopMm: 2850 });

describe("M9.6 rafter result presentation", () => {
  it("keeps the HAP definition at the field and the sketch in a closed, labelled disclosure in all three calculators", () => {
    for (const id of ["roof.rafter-cut", "roof.material-takeoff", "roof.timber-cutlist"]) {
      expect(definitions[id]!.fields.find((field) => field.key === "seatCutHeightMm")).toMatchObject({ label: HAP_LABEL, help: HAP_HELP, figure: "hap" });
    }
    const html = renderToStaticMarkup(<HapMeasuringHelp />);
    expect(html).toMatch(/^<details class="glass-disclosure hap-help">/);
    expect(html).toContain("<summary");
    expect(html).toContain("HAP mérési segédlet");
    // Opened, the sketch carries all four references and stays marked as not to scale; no repeat of the field help.
    for (const part of [">HAP<", "szarufa felső éle", "talpszelemen felső síkja", "külső függővágási sík (x = 0)", "Vázlat, nem méretarányos."]) expect(html).toContain(part);
    expect(html).not.toContain(HAP_HELP);
  });

  it("puts the rafter-cut drawing before the main lengths, the joint limits and the closed details", () => {
    const html = renderToStaticMarkup(<RafterCutFlow status={<p>ÁLLAPOT</p>} drawing={<p>RAJZ</p>} main={<p>FŐ</p>} limits={<p>KORLÁT</p>} details={<p>RÉSZLET</p>} />);
    const positions = order(html, ["ÁLLAPOT", "RAJZ", "FŐ", "KORLÁT", "RÉSZLET"]);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(html).toContain('<details class="glass-disclosure construction-suite-result-details">');
  });

  it("lists the roof drawings after the result: cross-section, rafter lines, then closed further views", () => {
    const html = renderToStaticMarkup(<RoofDrawingStack joints={<p>METSZET</p>} layout={<p>VONALAK</p>} moreViews={<p>TÉRBELI</p>} />);
    const positions = order(html, ["METSZET", "VONALAK", "További nézetek", "TÉRBELI"]);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain('<details class="glass-disclosure construction-suite-more-views">');
    expect(renderToStaticMarkup(<RoofDrawingStack moreViews={null} />)).toBe("");
  });

  it("shows joint state and limits openly and keeps every computed joint value in a closed list", () => {
    const html = renderToStaticMarkup(<RafterJointsPanel joints={joints} />).replace(/<!-- -->/g, "");
    expect(html.indexOf("D · szakemberi döntés")).toBeLessThan(html.indexOf('<details class="rafter-joint-all">'));
    expect(html).toContain("Geometriai adatok, nem statikai jóváhagyás");
    expect(html).not.toMatch(/<details[^>]* open/);
    for (const joint of joints.joints) for (const item of joint.values) expect(html).toContain(`${formatJointValue(item.value)} <span>${item.unit}</span>`);
  });

  it("draws the overview with its mark list first, and no step number covers a value label in the detail", () => {
    const html = renderToStaticMarkup(<RafterJointDrawing joints={joints} />);
    expect(html.indexOf('class="rafter-joint-primary"')).toBeLessThan(html.indexOf("Mit hol jelölj a szarufán"));
    expect(html.indexOf("Mit hol jelölj a szarufán")).toBeLessThan(html.indexOf('class="rafter-joint-detail-body"'));
    const detail = html.slice(html.indexOf('class="rafter-joint-detail-body"'));
    const circles = [...detail.matchAll(/class="rafter-joint-step"><circle cx="([\d.-]+)" cy="([\d.-]+)" r="([\d.]+)"/g)].map((m) => m.slice(1, 4).map(Number) as [number, number, number]);
    const tags = [...detail.matchAll(/class="rafter-joint-tag[^"]*"><rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1, 5).map(Number) as [number, number, number, number]);
    expect(circles).toHaveLength(4);
    expect(tags.length).toBeGreaterThan(0);
    for (const [cx, cy, r] of circles) for (const [x, y, w, h] of tags) {
      const nearestX = Math.max(x, Math.min(cx, x + w)), nearestY = Math.max(y, Math.min(cy, y + h));
      expect(Math.hypot(cx - nearestX, cy - nearestY)).toBeGreaterThan(r * .5);
    }
  });
});

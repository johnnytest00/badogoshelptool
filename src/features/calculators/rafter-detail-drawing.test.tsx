import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout, type RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { RafterDetailDrawing } from "./rafter-detail-drawing";

const geometry = calculateRoofGeometry({ type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } });
const layout = calculateRoofTimberLayout(geometry, { rafter: { maxSpacingMm: 600, startInsetMm: 0, endInsetMm: 0 } }) as RoofTimberLayout;

describe("rafter detail drawing", () => {
  it("labels domain values, draws three axes and no notch geometry", () => {
    const html = renderToStaticMarkup(<RafterDetailDrawing geometry={geometry} timberLayout={layout} section={null} />);
    expect(html.match(/class="rafter-detail-axis/g)).toHaveLength(3);
    expect(html).toContain("L = 5000 mm");
    expect(html).toContain("osztás 588,2 mm"); // 10 000 / 17
    expect(html).toContain("C · További adat szükséges");
    expect(html).toContain("Szarufa magassága (keresztmetszet)");
    // Only the roof-plane outlines are polygons; no cut outline is drawn.
    expect(html.match(/<polygon/g)).toHaveLength(geometry.planes.filter((plane) => plane.id.replace(/-\d+$/, "") === layout.rafters!.planeLayouts[0].planeId).length);
  });
});

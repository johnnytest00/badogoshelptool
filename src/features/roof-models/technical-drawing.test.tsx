import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import { calculateRoofUnderlayLayout } from "@/domain/calculations/roof-underlay";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { TechnicalDrawing } from "./technical-drawing";

describe("compact technical drawing controls", () => {
  it("keeps primary controls visible and exposes selectable dimensions accessibly", () => {
    const output = calculateGableRoof({ inputMode: "height", buildingLengthMm: 10000, buildingWidthMm: 6000, roofRiseMm: 3000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 });
    const html = renderToStaticMarkup(<TechnicalDrawing output={output} isSaved={false} compact onDimensionSelect={() => undefined} />);

    const toolbarPosition = html.indexOf('role="group" aria-label="Rajz vezérlők"');
    const advancedPosition = html.indexOf('glass-disclosure drawing-advanced-controls');
    expect(toolbarPosition).toBeGreaterThanOrEqual(0);
    expect(toolbarPosition).toBeLessThan(advancedPosition);
    expect(html).toContain('<svg class="technical-drawing-svg"');
    expect(html).toMatch(/role="group" aria-labelledby="technical-drawing-title-[^"]+ technical-drawing-description-[^"]+"/);
    expect(html).toContain('data-dimension-key="buildingLengthMm"');
    expect(html).toContain('class="technical-dimension-arrow"');
    expect(html).not.toContain("marker-start");
    expect(html).not.toContain("<marker");
    expect(html).toContain('Nézetek és rétegek');
    expect(html).toContain('aria-label="Rajz illesztése"');
    expect(html).toContain('class="drawing-compact-summary sr-only"');
    expect(html).not.toContain('<p class="section-eyebrow">Rajzok</p>');
  });

  it("keeps SVG title ids unique and draws dimension arrows as explicit geometry", () => {
    const output = calculateGableRoof({ inputMode: "height", buildingLengthMm: 10000, buildingWidthMm: 6000, roofRiseMm: 3000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 });
    const html = renderToStaticMarkup(<><TechnicalDrawing output={output} isSaved={false} /><TechnicalDrawing output={output} isSaved={false} /></>);
    const titleIds = [...html.matchAll(/<title id="([^"]+)"/g)].map((match) => match[1]);
    expect(titleIds).toHaveLength(2);
    expect(new Set(titleIds).size).toBe(2);
    expect((html.match(/class="technical-dimension-arrow"/g) ?? []).length).toBeGreaterThan(0);
  });

  it("draws the same calculated rafter and batten segments with spacing labels", () => {
    const geometry = calculateRoofGeometry({ type: "shed", lengthMm: 10000, widthMm: 6000, pitchDegrees: 45 });
    const layout = calculateRoofTimberLayout(geometry, {
      rafter: { maxSpacingMm: 2500, startInsetMm: 0, endInsetMm: 0 },
      batten: { maxSpacingMm: 2000, startInsetMm: 0, endInsetMm: 0 },
    });
    expect(layout.status).toBe("available");
    if (layout.status !== "available") return;
    const html = renderToStaticMarkup(<TechnicalDrawing geometry={geometry} timberLayout={layout} isSaved={false} compact />);
    expect(html).toContain('class="technical-timber-segment is-rafter"');
    expect(html).toContain('class="technical-timber-segment is-batten"');
    expect(html).toContain("Szarufa · 2500 mm");
    expect(html).toContain("Léc · 1697 mm");
    expect(html).toContain("sematikus geometriai mennyiség");
    expect(html).toContain("Szarufa- és lécekiosztás");
  });

  it("draws underlay strips and lap regions from the calculated layout and labels it schematic", () => {
    const geometry = calculateRoofGeometry({ type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } });
    const layout = calculateRoofUnderlayLayout(geometry, { rollWidthMm: 2500, rollLengthMm: 50_000, sideOverlapMm: 100, endOverlapMm: 0, installationDirection: "eave-to-ridge" });
    expect(layout.status).toBe("VALID");
    const html = renderToStaticMarkup(<TechnicalDrawing geometry={geometry} underlayLayout={layout} isSaved={false} compact />);
    expect(html.match(/class="technical-underlay-course"/g)).toHaveLength(layout.courses.length);
    expect(html.match(/class="technical-underlay-overlap"/g)).toHaveLength(layout.overlaps.length);
    expect(html).toContain("nem gyártási szabásterv");
  });
});

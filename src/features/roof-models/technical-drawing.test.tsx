import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";

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
    expect(html).toMatch(/marker-start="url\(#technical-arrow-[^)]+\)"/);
    expect(html).toContain('Nézetek és rétegek');
    expect(html).toContain('aria-label="Rajz illesztése"');
    expect(html).toContain('class="drawing-compact-summary sr-only"');
    expect(html).not.toContain('<p class="section-eyebrow">Rajzok</p>');
  });

  it("keeps SVG title and marker ids unique when several drawings share a page", () => {
    const output = calculateGableRoof({ inputMode: "height", buildingLengthMm: 10000, buildingWidthMm: 6000, roofRiseMm: 3000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 });
    const html = renderToStaticMarkup(<><TechnicalDrawing output={output} isSaved={false} /><TechnicalDrawing output={output} isSaved={false} /></>);
    const markerIds = [...html.matchAll(/<marker id="([^"]+)"/g)].map((match) => match[1]);
    const titleIds = [...html.matchAll(/<title id="([^"]+)"/g)].map((match) => match[1]);
    expect(markerIds).toHaveLength(2);
    expect(new Set(markerIds).size).toBe(2);
    expect(titleIds).toHaveLength(2);
    expect(new Set(titleIds).size).toBe(2);
  });
});

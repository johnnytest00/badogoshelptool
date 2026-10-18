import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { constructionCalculatorCatalog } from "@/domain/calculations/construction/catalog";
import { ConstructionCalculatorThumbnail } from "./construction-visuals";

const categories = [
  ["roof", constructionCalculatorCatalog.filter((item) => item.category === "roof"), 6],
  ["staircase", constructionCalculatorCatalog.filter((item) => item.category === "stair"), 17],
  ["concrete and foundation", constructionCalculatorCatalog.filter((item) => item.category === "concrete" || item.category === "auxiliary"), 10],
] as const;

describe("construction calculator selection thumbnails", () => {
  it.each(categories)("renders category-specific SVG artwork for every %s calculator", (_category, references, expectedCount) => {
    expect(references).toHaveLength(expectedCount);

    for (const reference of references) {
      const markup = renderToStaticMarkup(<ConstructionCalculatorThumbnail id={reference.id} />);
      const visualCategory = reference.id.startsWith("roof.") ? "roof" : reference.id.startsWith("stair.") ? "stair" : "concrete";
      expect(markup).toContain('viewBox="4 3 56 51"');
      expect(markup).toContain('preserveAspectRatio="xMidYMid meet"');
      expect(markup).toContain(`data-calculator-category="${visualCategory}"`);
      expect(markup).toContain(`data-calculator-icon="${reference.id}"`);
      expect(markup).toContain(`construction-icon-art-${visualCategory}`);
      expect((markup.match(/<(?:path|polyline|rect|circle|ellipse|line)\b/g) ?? []).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the defining geometry distinct across roof and stair variants", () => {
    const roofMarkup = constructionCalculatorCatalog
      .filter((item) => item.category === "roof")
      .map((item) => renderToStaticMarkup(<ConstructionCalculatorThumbnail id={item.id} />));
    expect(new Set(roofMarkup).size).toBe(6);

    const stairMarkup = (id: string) => renderToStaticMarkup(<ConstructionCalculatorThumbnail id={id} />);
    for (const [landingId, winderId] of [
      ["stair.wood.90_landing", "stair.wood.90_winder"],
      ["stair.wood.180_landing", "stair.wood.180_winder"],
      ["stair.wood.three_landing", "stair.wood.three_winder"],
    ]) {
      expect(stairMarkup(landingId)).toContain("construction-icon-landing");
      expect(stairMarkup(landingId)).not.toContain("construction-icon-winders");
      expect(stairMarkup(winderId)).toContain("construction-icon-winders");
    }

    const closed = stairMarkup("stair.wood.closed_straight");
    const open = stairMarkup("stair.wood.open_straight");
    const spiral = stairMarkup("stair.wood.spiral");
    expect(closed).toContain("construction-icon-stair-body");
    expect(closed).toContain('data-treads="5"');
    expect(open).toContain("construction-icon-stair-stringer");
    expect(open).not.toContain("construction-icon-stair-body");
    expect(spiral).toContain('data-spiral-treads="8"');
    expect(spiral).toContain('data-projection="axonometric-spiral"');
    expect((spiral.match(/data-spiral-tread="\d"/g) ?? [])).toHaveLength(8);
    expect(spiral).toContain("construction-icon-spiral-post");
  });

  it("shows the roof planes and defining ridge or break geometry", () => {
    const markup = (id: string) => renderToStaticMarkup(<ConstructionCalculatorThumbnail id={id} />);
    const gable = markup("roof.gable");
    const shed = markup("roof.shed");
    const mansard = markup("roof.mansard");
    const hip = markup("roof.hip");

    expect((gable.match(/data-roof-plane=/g) ?? [])).toHaveLength(2);
    expect(gable).toContain("construction-icon-roof-ridge");
    expect(gable).not.toMatch(/construction-icon-(?:gable-face|wall-face)/);
    expect((shed.match(/data-roof-planes="1"/g) ?? [])).toHaveLength(1);
    expect((mansard.match(/class="construction-icon-roof-plane construction-icon-mansard-/g) ?? [])).toHaveLength(4);
    expect(mansard).toContain("construction-icon-mansard-break");
    expect(hip).toContain('data-roof-plane="main-near"');
    expect(hip).toContain('data-roof-plane="main-far"');
    expect(hip).toContain('data-roof-plane="hip-near"');
    expect(hip).toContain('data-roof-plane="hip-far"');
    expect(hip).toContain("construction-icon-roof-ridge");
    expect(markup("roof.truss")).toContain("construction-icon-truss-depth");
  });

  it("keeps three-flight layouts connected and landings distinct from wedge treads", () => {
    const markup = (id: string) => renderToStaticMarkup(<ConstructionCalculatorThumbnail id={id} />);
    const threeLanding = markup("stair.wood.three_landing");
    const threeWinder = markup("stair.wood.three_winder");
    const uLanding = markup("stair.wood.180_landing");
    const uWinder = markup("stair.wood.180_winder");
    const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

    expect(count(threeLanding, /data-flight="\d"/g)).toBe(3);
    expect(count(threeLanding, /data-landing="\d"/g)).toBe(2);
    expect(count(threeWinder, /data-flight="\d"/g)).toBe(3);
    expect(count(threeWinder, /data-winder="quarter-turn"/g)).toBe(2);
    expect(count(threeWinder, /data-step-top="\d"/g)).toBeGreaterThanOrEqual(16);
    expect(count(uLanding, /data-flight="\d"/g)).toBe(2);
    expect(count(uLanding, /data-landing="\d"/g)).toBe(1);
    expect(uLanding).toContain("construction-icon-landing-surface");
    expect(uLanding).not.toContain("construction-icon-winders");
    expect(count(uWinder, /data-winder="half-turn"/g)).toBe(1);
    expect(uWinder).toContain('data-winder-treads="6"');
    expect(count(uWinder, /data-step-top="\d"/g)).toBeGreaterThanOrEqual(14);
  });

  it("uses an axonometric stair vocabulary while preserving the distinct structure cues", () => {
    const markup = (id: string) => renderToStaticMarkup(<ConstructionCalculatorThumbnail id={id} />);
    const closed = markup("stair.wood.closed_straight");
    const open = markup("stair.wood.open_straight");
    const zigzag = markup("stair.metal.zigzag");
    const concrete = markup("stair.concrete_straight");
    expect(closed).toContain('data-projection="axonometric-elevation"');
    expect(closed).toContain("construction-icon-stair-body");
    expect(open).toContain("construction-icon-stair-stringer");
    expect(zigzag).toContain("construction-icon-zigzag-stringer");
    expect(markup("stair.metal.straight")).not.toContain("construction-icon-zigzag-stringer");
    expect(markup("concrete.rebar")).toContain("construction-icon-rebar-highlight");
    expect(markup("aux.diagonal")).toContain("construction-icon-diagonal-face");
    expect(concrete).toContain("construction-icon-stair-body");
    expect(concrete).toContain("construction-icon-step-top");
    expect(markup("stair.beveled_riser")).toContain('data-projection="axonometric-elevation"');
  });
});

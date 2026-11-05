import { describe, expect, it } from "vitest";
import { drawingCoverageLabel, createRoofSection, removeRoofSection, restoreRoofSection, updateRoofSection, type DrawingRoofSection } from "./drawing-roof-sections";

describe("drawing roof sections", () => {
  it("keeps drawing, coverage, and calculator inputs isolated by section", () => {
    const first = createRoofSection("source-a", { fields: { widthMm: "6000" }, material: { rafter: "DEMO A" } }, "section-a");
    const second = createRoofSection("source-a", { fields: {}, material: { rafter: "DEMO B" } }, "section-b", 1);
    const changed = updateRoofSection([first, second], first.id, { name: "Főépület", page: 2, points: [{ x: .1, y: .1 }, { x: .4, y: .5 }], coverage: "covered", coverageConfirmed: true });

    expect(changed[0]).toMatchObject({ name: "Főépület", page: 2, coverageConfirmed: true, data: { fields: { widthMm: "6000" }, material: { rafter: "DEMO A" } } });
    expect(changed[1]).toMatchObject({ name: "Tetőszakasz 2", points: [], coverage: "unclear", data: { fields: {}, material: { rafter: "DEMO B" } } });
  });

  it("removes only the requested section and preserves source ownership", () => {
    const first: DrawingRoofSection<{ fields: Record<string, string> }> = createRoofSection("source-a", { fields: { widthMm: "1" } }, "a");
    const second = createRoofSection("source-b", { fields: { widthMm: "2" } }, "b");
    expect(removeRoofSection([first, second], "a")).toEqual([second]);
    expect(second.sourceDocumentId).toBe("source-b");
  });

  it("restores a removed section unchanged at its former position without touching the others (M12 audit T2)", () => {
    const a = createRoofSection("source-a", { fields: { widthMm: "1" } }, "a");
    const b = updateRoofSection([createRoofSection("source-a", { fields: { widthMm: "6000", pitchDegrees: "35" } }, "b", 1)], "b", { name: "Szárny", page: 2, points: [{ x: .1, y: .2 }, { x: .5, y: .6 }], coverage: "covered", coverageConfirmed: true })[0]!;
    const c = createRoofSection("source-a", { fields: { widthMm: "3" } }, "c", 2);
    const remaining = removeRoofSection([a, b, c], "b");
    const restored = restoreRoofSection(remaining, b, 1);

    expect(restored).toEqual([a, b, c]);
    expect(restored[1]).toBe(b);
    expect(restored[0]).toBe(a);
    expect(restored[2]).toBe(c);
  });

  it("does not duplicate an id that is already present and clamps a stale position", () => {
    const a = createRoofSection("source-a", { fields: {} }, "a");
    const b = createRoofSection("source-a", { fields: {} }, "b", 1);
    expect(restoreRoofSection([a, b], b, 0)).toEqual([a, b]);
    expect(restoreRoofSection([a], b, 9)).toEqual([a, b]);
    expect(restoreRoofSection([a], b, -1)).toEqual([b, a]);
  });
});

describe("drawingCoverageLabel (extracted in T8)", () => {
  const section = createRoofSection("doc", null);

  it("only calls a section covered once the user confirmed it on the drawing", () => {
    expect(drawingCoverageLabel({ ...section, coverage: "covered", coverageConfirmed: true })).toBe("fedett");
    expect(drawingCoverageLabel({ ...section, coverage: "covered", coverageConfirmed: false })).toBe("fedett, nem igazolt");
  });

  it("reports the other two states plainly, confirmation flag or not", () => {
    expect(drawingCoverageLabel({ ...section, coverage: "uncovered", coverageConfirmed: true })).toBe("fedetlen");
    expect(drawingCoverageLabel({ ...section, coverage: "unclear", coverageConfirmed: true })).toBe("tisztázandó");
  });
});

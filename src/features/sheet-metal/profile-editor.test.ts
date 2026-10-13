import { describe, expect, it } from "vitest";
import { addBend, calculateDraft, createTemplate, editBend, editStraight, removeBend, reverseAngle, selectionMatches, toDomainInput } from "@/features/sheet-metal/profile-editor-model";
import { drawingDimensions, drawingFrame, primitivePath, selectedDrawingId, svgPoint } from "@/features/sheet-metal/profile-drawing-model";

describe("F9.6.3.2 profile editor model", () => {
  it("initializes DEMO L, U and custom open templates with unknown allowances", () => {
    const l = createTemplate("l"), u = createTemplate("u"), custom = createTemplate("custom");
    expect([l.straights.length, l.bends.length, u.straights.length, u.bends.length]).toEqual([2, 1, 3, 2]);
    expect(custom.straights.length).toBe(custom.bends.length + 1);
    expect([l, u, custom].every((draft) => draft.label.includes("DEMO") && draft.bends.every((bend) => bend.mode === "unknown"))).toBe(true);
  });

  it("edits straight and bend text without losing invalid input, then derives domain calculation", () => {
    const l = createTemplate("l");
    const edited = editBend(editStraight(l, "s1", "75,5"), "b1", { angle: "-60", radius: "3" });
    expect(edited.dirty).toBe(true);
    expect(toDomainInput(edited).straights[0].tangentLengthMm).toBe(75.5);
    expect(toDomainInput(edited).straights[0].dimensionSource.kind).toBe("user_provided");
    expect(toDomainInput(l).straights[0].dimensionSource.kind).toBe("demo");
    expect(reverseAngle("-60")).toBe("60");
    expect(reverseAngle("-")) .toBe("-");
    const calculated = calculateDraft(edited);
    expect(calculated.ok).toBe(true);
    if (calculated.ok) {
      expect(calculated.output.geometry.segments[0].tangentLengthMm).toBe(75.5);
      expect(calculated.output.bends[0].turnDeg).toBe(-60);
      expect(calculated.output.flatPattern.widthMm).toBeNull();
    }
    const invalid = editStraight(edited, "s1", "-");
    expect(invalid.straights[0].length).toBe("-");
    expect(calculateDraft(invalid).ok).toBe(false);
  });

  it("switches templates by new drafts and keeps open-chain counts after adding/removing bends", () => {
    const l = editStraight(createTemplate("l"), "s1", "123");
    const u = createTemplate("u");
    expect(u.straights[0].length).not.toBe(l.straights[0].length);
    const added = addBend(u);
    expect(added.straights.length).toBe(added.bends.length + 1);
    expect(added.template).toBe("custom");
    const removed = removeBend(added, 1);
    expect(removed.straights.length).toBe(removed.bends.length + 1);
    expect(calculateDraft(removed).ok).toBe(true);
  });

  it("uses explicit sourced BA and never substitutes zero for missing parameters", () => {
    const l = createTemplate("l");
    const missing = calculateDraft(l);
    expect(missing.ok && missing.output.flatPattern.widthMm).toBeNull();
    const filled = editBend(l, "b1", { mode: "explicit_ba", value: "4", source: "DEMO mérés" });
    const result = calculateDraft(filled);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.flatPattern.widthMm).toBe(104);
      expect(result.output.parameterSnapshot[0].source?.label).toBe("DEMO mérés");
    }
  });

  it("rejects bad thickness, angle and intersecting geometry without drawing output", () => {
    expect(calculateDraft({ ...createTemplate("l"), thickness: "-1" }).ok).toBe(false);
    expect(calculateDraft(editBend(createTemplate("l"), "b1", { angle: "180" })).ok).toBe(false);
    const crossing = createTemplate("custom");
    crossing.straights = ["20", "20", "18", "30"].map((length, index) => ({ id: `s${index + 1}`, length, origin: "demo" }));
    crossing.bends = ["90", "90", "90"].map((angle, index) => ({ id: `b${index + 1}`, angle, radius: "2", mode: "unknown", value: "", source: "" }));
    expect(calculateDraft(crossing).ok).toBe(false);
  });

  it("maps domain coordinates and arc sweep into SVG and keeps annotations tied to output values", () => {
    const result = calculateDraft(createTemplate("l"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { output } = result;
    expect(svgPoint({ xMm: 5, yMm: 7 })).toEqual({ x: 5, y: -7 });
    const arc = output.geometry.centerline.find((primitive) => primitive.kind === "arc");
    expect(arc && primitivePath(arc)).toMatch(/ A .* 0 [01] [01] /);
    const dimensions = drawingDimensions(output);
    expect(dimensions.straights.map((dimension) => dimension.valueMm)).toEqual([60, 40]);
    expect(dimensions.bends[0].angleDeg).toBe(output.bends[0].turnDeg);
    expect(dimensions.bends[0].radiusMm).toBe(output.bends[0].innerRadiusMm);
    expect(drawingFrame(output.geometry.boundsMm).width).toBeGreaterThan(output.geometry.boundsMm.maxXmm - output.geometry.boundsMm.minXmm);
  });

  it("shares selection identity between the row and drawing", () => {
    const selected = { kind: "bend" as const, id: "b1" };
    expect(selectedDrawingId(selected)).toBe("b1");
    expect(selectionMatches(selected, "bend", "b1")).toBe(true);
    expect(selectionMatches(selected, "straight", "s1")).toBe(false);
  });
});

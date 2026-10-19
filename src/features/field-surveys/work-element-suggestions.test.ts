import { describe, expect, it } from "vitest";
import { surveySectionSchema } from "@/domain/field-surveys/workspace";
import { primaryRunSemantic, workElementDefs, workElementKinds } from "@/domain/field-surveys/work-elements";
import { roofEdgeSuggestions } from "./work-element-suggestions";
import type { SurveySectionDraft } from "./survey-draft-recovery";

const id = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const m = (n: number, semanticType: SurveySectionDraft["measurements"][number]["semanticType"], value: string) => ({ id: id(n), label: "x", unit: "m" as const, semanticType, value });
const quickRoof = (over: Partial<SurveySectionDraft> = {}): SurveySectionDraft => ({ id: id(1), name: "Tető", workType: "roof", roofType: "gable", roofMeasurementMode: "quick", quickPlanesMatch: true, notes: "", photoIds: [], measurements: [m(2, "roof_eave_run", "10,5"), m(3, "roof_plane_slope_a", "4,2")], ...over });

describe("work element catalogue", () => {
  it("every kind is a schema-valid section with empty (never zero) incomplete values", () => {
    for (const kind of workElementKinds) {
      const def = workElementDefs[kind];
      const section = { id: id(10), name: def.label, workType: def.workType, elementKind: kind, notes: "", photoIds: [], measurements: def.templates.map((t, i) => ({ id: id(20 + i), label: t.label, unit: t.unit, semanticType: t.semanticType, value: null })) };
      expect(surveySectionSchema.safeParse(section).success, kind).toBe(true);
    }
  });
  it("only gutter and flashing kinds expose a material-list run length (metres)", () => {
    const transferable = workElementKinds.filter((kind) => primaryRunSemantic(kind) !== null);
    expect(transferable.sort()).toEqual(["flashing_eave", "flashing_ridge", "flashing_verge", "flashing_wall", "gutter", "valley"].sort());
    for (const kind of transferable) expect(workElementDefs[kind].templates[0].unit).toBe("m");
  });
  it("rejects a source role that is meaningless for the element and mismatching work types", () => {
    const base = { id: id(10), name: "x", notes: "", photoIds: [], measurements: [] };
    expect(surveySectionSchema.safeParse({ ...base, workType: "flashing", elementKind: "flashing_ridge", lengthSource: { roofSectionId: id(1), role: "ridge" } }).success).toBe(true);
    expect(surveySectionSchema.safeParse({ ...base, workType: "flashing", elementKind: "flashing_ridge", lengthSource: { roofSectionId: id(1), role: "eave_total" } }).success).toBe(false);
    expect(surveySectionSchema.safeParse({ ...base, workType: "other", elementKind: "gutter" }).success).toBe(false);
  });
});

describe("roofEdgeSuggestions", () => {
  it("offers calculated edge lengths only for a complete quick gable", () => {
    const edges = roofEdgeSuggestions([quickRoof()]);
    expect(Object.fromEntries(edges.map((e) => [e.role, e.valueMm]))).toEqual({ eave_total: 21000, ridge: 10500, verge_total: 16800 });
    expect(roofEdgeSuggestions([quickRoof({ quickPlanesMatch: undefined })])).toEqual([]);
    expect(roofEdgeSuggestions([quickRoof({ roofType: "hip" })])).toEqual([]);
  });
});

import { suspectedDuplicates } from "@/domain/field-surveys/work-elements";
import { measurementOrigin } from "@/domain/material-takeoffs/survey-material-suggestions";
import type { SurveySection } from "@/domain/field-surveys/workspace";

const el = (n: number, elementKind: "gutter" | "flashing_eave", value: number | null, role?: "eave_total" | "ridge") => ({ id: id(n), name: `E${n}`, elementKind, lengthSource: role ? { roofSectionId: id(1), role } : undefined, measurements: [{ label: "Szakasz", unit: "m", value }] });

describe("suspectedDuplicates", () => {
  it("never flags different materials on the same roof edge", () => {
    expect(suspectedDuplicates([el(2, "gutter", 21, "eave_total"), el(3, "flashing_eave", 21, "eave_total")]).size).toBe(0);
  });
  it("flags identical elements of the same type, with or without a shared source", () => {
    expect([...suspectedDuplicates([el(2, "gutter", 21, "eave_total"), el(3, "gutter", 21, "eave_total")]).keys()].sort()).toEqual([id(2), id(3)]);
    expect(suspectedDuplicates([el(2, "gutter", 12.5), el(3, "gutter", 12.5)]).get(id(2))).toEqual(["E3"]);
  });
  it("does not flag different dimensions, different edges or untouched empty elements", () => {
    expect(suspectedDuplicates([el(2, "gutter", 12.5), el(3, "gutter", 8)]).size).toBe(0);
    expect(suspectedDuplicates([el(2, "gutter", 21, "eave_total"), el(3, "gutter", 21, "ridge")]).size).toBe(0);
    expect(suspectedDuplicates([el(2, "gutter", null), el(3, "gutter", null)]).size).toBe(0);
  });
});

describe("measurementOrigin", () => {
  const section = (value: number | null): SurveySection => ({ id: id(2), name: "x", workType: "gutter", elementKind: "gutter", lengthSource: { roofSectionId: id(1), role: "eave_total" }, notes: "", photoIds: [], measurements: [{ id: id(9), label: "c", value, unit: "m", semanticType: "gutter_run_length" }] });
  const geo = [{ id: id(30), sectionId: id(1), surveyRevisionId: id(40), combinedRoofM2: 88.2, edges: { eave_total: 21000 } }];
  it("keeps calculated only while equal to the verified edge; edits are overridden; unverifiable sources are never promoted", () => {
    expect(measurementOrigin(section(21), 21, geo, id(40)).quantityKind).toBe("calculated");
    expect(measurementOrigin(section(20), 20, geo, id(40)).quantityKind).toBe("overridden");
    expect(measurementOrigin(section(21), 21, [], id(40)).quantityKind).toBe("overridden");
    expect(measurementOrigin({ ...section(21), lengthSource: undefined }, 21, geo, id(40)).quantityKind).toBe("measured");
  });
});

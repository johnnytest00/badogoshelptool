import { describe, expect, it } from "vitest";
import { definitions } from "./roof-calculator-definitions";
import { createRoofWorkSessionJson, parseRoofWorkSessionJson, rebindRoofWorkSessionSource, roofWorkSectionHasInvalidInput, sha256Hex, type RoofWorkSessionInput } from "./drawing-roof-work-session";
import { DEMO_MATERIAL_PROFILES } from "@/domain/calculations/roof-material-spec";
import { computeConstruction } from "./construction-computation";
import type { RoofMaterialUiState } from "./material-spec-editor";

const materials: RoofMaterialUiState = {
  requested: { timber: true, underlay: false, covering: false },
  layout: { rafterMaxSpacingMm: 600, battenMaxSpacingMm: 300 },
  specs: {
    covering: { mode: "manual", profileId: null, entered: {} },
    underlay: { mode: "manual", profileId: null, entered: {} },
    rafter: { mode: "manual", profileId: null, entered: { sectionWidthMm: 60, sectionHeightMm: 160 } },
    batten: { mode: "manual", profileId: null, entered: { sectionWidthMm: 30, sectionHeightMm: 50 } },
  },
};

const session = (): RoofWorkSessionInput => ({
  source: { kind: "pdf", documentId: "demo-doc-1", sha256: "a".repeat(64), pageCount: 2 },
  activeSectionId: "section-a",
  sections: [
    { id: "section-a", sourceDocumentId: "demo-doc-1", name: "Főszárny", page: 1, points: [{ x: .1, y: .2 }, { x: .4, y: .6 }], coverage: "covered", coverageConfirmed: true,
      data: { fields: { roofShape: "gable", lengthMm: "6000", widthMm: "4000", pitchDegrees: "30" }, materials, lengthDrafts: { lengthMm: { text: "600", unit: "cm" } }, approvedEntries: [{ fieldKey: "lengthMm", value: "6000", sourceText: "Személyes PDF-felirat" }] } },
    { id: "section-b", sourceDocumentId: "demo-doc-1", name: "Oldalszárny", page: 2, points: [{ x: .5, y: .2 }, { x: .8, y: .6 }], coverage: "unclear", coverageConfirmed: false,
      data: { fields: { roofShape: "hip", lengthMm: "7000", widthMm: "5000", pitchDegrees: "35" }, materials: { ...materials, layout: { rafterMaxSpacingMm: 900 } }, lengthDrafts: {}, approvedEntries: [] } },
  ],
});

describe("versioned roof work session files", () => {
  it("exports and imports a timber cutlist work session without changing the v3 contract", () => {
    const json = createRoofWorkSessionJson({ ...session(), calculatorId: "roof.timber-cutlist" });
    const parsed = parseRoofWorkSessionJson(json);

    expect(JSON.parse(json).version).toBe(3);
    expect(parsed.calculatorId).toBe("roof.timber-cutlist");
    expect(parsed.sections.map((section) => section.name)).toEqual(["Főszárny", "Oldalszárny"]);
  });

  it("round-trips distinct section drafts while requiring approvals and coverage to be rechecked", () => {
    const parsed = parseRoofWorkSessionJson(createRoofWorkSessionJson(session()));

    expect(parsed.sections).toHaveLength(2);
    expect(parsed.activeSectionId).toBe("section-a");
    expect(parsed.sections.map(({ name, data }) => [name, data.fields.roofShape, data.fields.lengthMm, data.materials.layout.rafterMaxSpacingMm])).toEqual([
      ["Főszárny", "gable", "6000", 600], ["Oldalszárny", "hip", "7000", 900],
    ]);
    expect(parsed.sections[0]?.points).toHaveLength(2);
    expect(parsed.sections[0]?.coverageConfirmed).toBe(false);
    expect(parsed.sections[0]?.data.approvedEntries).toEqual([]);
    expect(parsed.sections[0]?.data.lengthDrafts.lengthMm).toEqual({ text: "600", unit: "cm" });
  });

  it("keeps accepted roof defaults optional: files with, without, and with partial acceptances all round-trip", () => {
    const withAcceptance = session();
    const [first, second] = withAcceptance.sections;
    const json = createRoofWorkSessionJson({ ...withAcceptance, sections: [{ ...first!, data: { ...first!.data, assumptionConfirmations: { roofShape: "gable|gable" } } }, second!] });
    const parsed = parseRoofWorkSessionJson(json);
    expect(parsed.sections[0]?.data.assumptionConfirmations).toEqual({ roofShape: "gable|gable" });
    expect(parsed.sections[1]?.data.assumptionConfirmations).toBeUndefined();
    expect(JSON.parse(createRoofWorkSessionJson(session())).sections[0].data).not.toHaveProperty("assumptionConfirmations");

    const forged = JSON.parse(json);
    forged.sections[0].data.assumptionConfirmations = { lengthMm: "gable|6000" };
    expect(() => parseRoofWorkSessionJson(JSON.stringify(forged))).toThrow(/alapérték-megerősítés/u);
  });

  it("does not export source text, PDF bytes, or calculation results", () => {
    const json = createRoofWorkSessionJson(session());
    expect(json).not.toContain("Személyes PDF-felirat");
    expect(json).not.toContain("pdfBytes");
    expect(json).not.toContain("calculationResult");
  });

  it("freezes selected product values as editable manual parameters and rejects missing profiles", () => {
    const base = session();
    const input = { ...base, sections: base.sections.map((section, index) => index === 0 ? { ...section, data: { ...section.data, materials: { ...section.data.materials, specs: { ...section.data.materials.specs, rafter: { mode: "product" as const, profileId: "demo-rafter-80x200", entered: { sectionHeightMm: 220 } } } } } } : section) };
    const parsed = parseRoofWorkSessionJson(createRoofWorkSessionJson(input, DEMO_MATERIAL_PROFILES));
    expect(parsed.sections[0]?.data.materials.specs.rafter).toEqual({ mode: "manual", profileId: null, entered: { sectionWidthMm: 80, sectionHeightMm: 220 } });
    expect(() => createRoofWorkSessionJson(input)).toThrow(/profil/i);
  });

  it("preserves mutually inconsistent material parameters but reports them as invalid input (M12 audit T5)", async () => {
    const base = session();
    const invalid = { ...base, sections: base.sections.map((section, index) => index === 0 ? { ...section, data: { ...section.data, materials: { ...section.data.materials, specs: { ...section.data.materials.specs, covering: { mode: "manual" as const, profileId: null, entered: { nominalWidthMm: 1000, effectiveCoveringWidthMm: 1200 } } } } } } : section) };
    const parsed = parseRoofWorkSessionJson(createRoofWorkSessionJson(invalid));
    expect(parsed.sections[0]?.data.materials.specs.covering.entered).toEqual({ nominalWidthMm: 1000, effectiveCoveringWidthMm: 1200 });
    expect(roofWorkSectionHasInvalidInput(parsed.sections[0]!.data)).toBe(true);
    expect(roofWorkSectionHasInvalidInput(parsed.sections[1]!.data)).toBe(false);
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("rejects unknown versions and unrecognized payload properties", () => {
    const json = createRoofWorkSessionJson(session());
    expect(() => parseRoofWorkSessionJson(json.replace('"version":3', '"version":99'))).toThrow(/verzió/i);
    expect(() => parseRoofWorkSessionJson(json.replace('"pageCount":2', '"pageCount":2,"pdfText":"private"'))).toThrow();
  });

  it("rejects unknown calculator fields and structurally malformed values", () => {
    const json = createRoofWorkSessionJson(session());
    expect(() => parseRoofWorkSessionJson(json.replace('"widthMm":"4000"', '"unknownRoofField":"4000"'))).toThrow();
    expect(() => parseRoofWorkSessionJson(json.replace('"widthMm":"4000"', '"widthMm":"not-a-size"'))).toThrow();
    expect(() => parseRoofWorkSessionJson(json.replace('"roofShape":"gable"', '"roofShape":"dome"'))).toThrow();
    expect(() => parseRoofWorkSessionJson(json.replace('"sectionWidthMm":60', '"sectionWidthMm":"60"'))).toThrow();
    expect(() => parseRoofWorkSessionJson(json.replace('"sectionWidthMm":60', '"unknownSpec":60'))).toThrow();
  });

  it("exports and restores a half-finished section with out-of-range values instead of blocking the save (M12 audit T5)", () => {
    const base = session();
    const draft = { ...base, sections: base.sections.map((section, index) => index === 0 ? { ...section, data: { ...section.data,
      fields: { roofShape: "gable", lengthMm: "6000", widthMm: "-5", pitchDegrees: "85" },
      materials: { ...section.data.materials, layout: { rafterMaxSpacingMm: 600.5 }, specs: { ...section.data.materials.specs, rafter: { mode: "manual" as const, profileId: null, entered: { sectionWidthMm: -60 } } } } } } : section) };
    const parsed = parseRoofWorkSessionJson(createRoofWorkSessionJson(draft));

    expect(parsed.sections[0]?.data.fields).toEqual({ roofShape: "gable", lengthMm: "6000", widthMm: "-5", pitchDegrees: "85" });
    expect(parsed.sections[0]?.data.materials.layout).toEqual({ rafterMaxSpacingMm: 600.5 });
    expect(parsed.sections[0]?.data.materials.specs.rafter.entered).toEqual({ sectionWidthMm: -60 });
    expect(roofWorkSectionHasInvalidInput(parsed.sections[0]!.data)).toBe(true);
    expect(computeConstruction(definitions["roof.material-takeoff"], parsed.sections[0]!.data.fields, parsed.sections[0]!.data.materials, []).completeness.status).not.toBe("complete");
  });

  it("saves and resumes work started from an image source, re-attaching selections only to the same image", () => {
    const base = session();
    const image: RoofWorkSessionInput = { ...base, source: { kind: "image", documentId: "image-1", sha256: "c".repeat(64), pageCount: 1 },
      sections: base.sections.map((section) => ({ ...section, sourceDocumentId: "image-1", page: 1 })) };
    const parsed = parseRoofWorkSessionJson(createRoofWorkSessionJson(image));
    expect(parsed.source).toEqual(image.source);
    expect(() => createRoofWorkSessionJson({ ...image, source: { ...image.source, pageCount: 2 } })).toThrow();

    const sameImage = rebindRoofWorkSessionSource(parsed, { kind: "image", documentId: "image-2", sha256: "c".repeat(64), pageCount: 1 });
    const sameBytesAsPdf = rebindRoofWorkSessionSource(parsed, { kind: "pdf", documentId: "pdf-1", sha256: "c".repeat(64), pageCount: 1 });
    expect(sameImage.matchesSavedSource).toBe(true);
    expect(sameImage.session.sections[0]?.points).toHaveLength(2);
    expect(sameBytesAsPdf.matchesSavedSource).toBe(false);
    expect(sameBytesAsPdf.session.sections[0]?.points).toEqual([]);
  });

  it("still imports version 1 and 2 PDF work files and requires the source kind from version 2 on", () => {
    const v3 = JSON.parse(createRoofWorkSessionJson(session())) as { version: number; source: Record<string, unknown> };
    const v1Source = Object.fromEntries(Object.entries(v3.source).filter(([key]) => key !== "kind"));
    expect(parseRoofWorkSessionJson(JSON.stringify({ ...v3, version: 1, source: v1Source })).source).toEqual(session().source);
    expect(parseRoofWorkSessionJson(JSON.stringify({ ...v3, version: 2 })).source).toEqual(session().source);
    expect(() => parseRoofWorkSessionJson(JSON.stringify({ ...v3, source: v1Source }))).toThrow();
    expect(() => parseRoofWorkSessionJson(JSON.stringify({ ...v3, version: 1 }))).toThrow();
  });

  it("carries the accepted page calibration through save/restore, bound to its document and page", () => {
    const calibration = {
      documentSha256: "a".repeat(64), pageNumber: 1, mmPerPoint: 2.5, deviationRatio: 0.01,
      primary: { from: { x: .1, y: .1 }, to: { x: .3, y: .1 }, lengthMm: 1000 },
      check: { from: { x: .1, y: .4 }, to: { x: .5, y: .4 }, lengthMm: 2000 },
    };
    const withCalibration = { ...session(), calibration };
    expect(JSON.parse(createRoofWorkSessionJson(session())).calibration).toBeNull();
    expect(parseRoofWorkSessionJson(createRoofWorkSessionJson(withCalibration)).calibration).toEqual(calibration);
    // Version 1/2 files predate calibration: absent reads as none, not as an unconfirmed-but-present state.
    const v3 = JSON.parse(createRoofWorkSessionJson(session())) as { version: number; source: Record<string, unknown> };
    const v1Source = Object.fromEntries(Object.entries(v3.source).filter(([key]) => key !== "kind"));
    expect(parseRoofWorkSessionJson(JSON.stringify({ ...v3, version: 1, source: v1Source })).calibration).toBeNull();
    expect(parseRoofWorkSessionJson(JSON.stringify({ ...v3, version: 2 })).calibration).toBeNull();

    const json = createRoofWorkSessionJson(withCalibration);
    expect(() => parseRoofWorkSessionJson(json.replace('"mmPerPoint":2.5', '"mmPerPoint":-2.5'))).toThrow();
    expect(() => parseRoofWorkSessionJson(json.replace('"deviationRatio":0.01', '"deviationRatio":0.01,"extra":1'))).toThrow();
    expect(() => parseRoofWorkSessionJson(json.replace('"pageNumber":1,"mmPerPoint"', '"pageNumber":9,"mmPerPoint"'))).toThrow(/oldalszáma/u);
  });

  it("requires the matching PDF hash to restore a visual source selection", () => {
    const imported = parseRoofWorkSessionJson(createRoofWorkSessionJson(session()));
    const same = rebindRoofWorkSessionSource(imported, { kind: "pdf", documentId: "fresh-parser-id", sha256: "a".repeat(64), pageCount: 2 });
    const different = rebindRoofWorkSessionSource(imported, { kind: "pdf", documentId: "other-parser-id", sha256: "b".repeat(64), pageCount: 1 });

    expect(same.matchesSavedSource).toBe(true);
    expect(same.session.sections[0]?.sourceDocumentId).toBe("fresh-parser-id");
    expect(same.session.sections[0]?.points).toHaveLength(2);
    expect(different.matchesSavedSource).toBe(false);
    expect(different.session.sections.every(({ points, coverageConfirmed }) => points.length === 0 && !coverageConfirmed)).toBe(true);
    expect(different.session.sections[0]?.data.fields.lengthMm).toBe("6000");
  });

  it("keeps incomplete geometry editable without trusting saved calculation output", () => {
    const full = parseRoofWorkSessionJson(createRoofWorkSessionJson(session())).sections[0]!;
    const recalculated = computeConstruction(definitions["roof.material-takeoff"], { eaveOverhangMm: "0", ...full.data.fields }, full.data.materials, []);
    expect(recalculated.geometry?.totalAreaMm2).toBeGreaterThan(0);
    const base = session();
    const incomplete = { ...base, sections: base.sections.map((section, index) => index === 0 ? { ...section, data: { ...section.data, fields: { roofShape: "gable", lengthMm: "6000" } } } : section) };
    const parsed = parseRoofWorkSessionJson(createRoofWorkSessionJson(incomplete));
    expect(parsed.sections[0]?.data.fields).toEqual({ roofShape: "gable", lengthMm: "6000" });
    expect("result" in parsed.sections[0]!).toBe(false);
    expect(definitions["roof.material-takeoff"].fields.some(({ key }) => key === "widthMm")).toBe(true);
    const incompleteResult = computeConstruction(definitions["roof.material-takeoff"], parsed.sections[0]!.data.fields, parsed.sections[0]!.data.materials, []);
    expect(incompleteResult.geometry).toBeNull();
    expect(incompleteResult.completeness.status).toBe("incomplete");
  });

  it("rejects oversized and duplicate-section imports", () => {
    const json = createRoofWorkSessionJson(session());
    expect(() => parseRoofWorkSessionJson(`${json}${" ".repeat(1_000_001)}`)).toThrow(/korlát/i);
    const duplicate = JSON.parse(json) as { sections: unknown[] };
    duplicate.sections[1] = duplicate.sections[0];
    expect(() => parseRoofWorkSessionJson(JSON.stringify(duplicate))).toThrow();
  });
});

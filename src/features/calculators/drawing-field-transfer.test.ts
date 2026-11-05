import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { processPdfDocument } from "@/infrastructure/drawings/pdf-text-extractor";
import type { DrawingTextSource } from "@/infrastructure/drawings/drawing-text-source";
import { definitions } from "./roof-calculator-definitions";
import { guidedDrawingFieldKey, drawingQuickScopeIssue, approveDrawingFields, canSaveDrawingTakeoff, classifyDrawingPlan, drawingAssumptionToken, drawingOverhangLimitation, drawingTakeoffCalculationName, drawingTakeoffSessionKey, inactiveDrawingTakeoffScope, isPercentSlopeForPitch, missingRequiredDrawingFields, requiresRoofGeometryConfirmation, revokeApprovedDrawingValues, suggestRafterCutField, unconfirmedDrawingAssumptions, supportsRoofSectionScope } from "./drawing-field-transfer";

const definition = definitions["roof.rafter-cut"];

describe("approveDrawingFields", () => {
  it("transfers one valid field while other required inputs are still missing", () => {
    expect(approveDrawingFields(definition, {}, [{ fieldKey: "riseMm", value: "2000" }], new Set())).toEqual({
      ok: true, fields: { riseMm: "2000" },
    });
  });

  it("continues to show unfilled required fields after a partial proposal", () => {
    const missing = missingRequiredDrawingFields(definition, {}, { riseMm: "2000" }).map(({ key }) => key);
    expect(missing).toContain("horizontalHalfSpanMm");
    expect(missing).not.toContain("riseMm");
  });

  it("accepts explicit values for fields in the selected calculator", () => {
    expect(approveDrawingFields(definition, {}, [
      { fieldKey: "horizontalHalfSpanMm", value: "3000" },
      { fieldKey: "riseMm", value: "2000" },
    ], new Set())).toEqual({ ok: true, fields: { horizontalHalfSpanMm: "3000", riseMm: "2000" } });
  });

  it("rejects unknown, duplicate, and invalid field proposals", () => {
    expect(approveDrawingFields(definition, {}, [{ fieldKey: "pitchDegrees", value: "35" }], new Set()).ok).toBe(false);
    expect(approveDrawingFields(definition, {}, [
      { fieldKey: "riseMm", value: "2000" }, { fieldKey: "riseMm", value: "2100" },
    ], new Set()).ok).toBe(false);
    expect(approveDrawingFields(definition, {}, [{ fieldKey: "riseMm", value: "not a number" }], new Set()).ok).toBe(false);
  });

  it("keeps existing values unless the user explicitly approves overwrite", () => {
    const current = { horizontalHalfSpanMm: "4200", riseMm: "2000" };
    expect(approveDrawingFields(definition, current, [{ fieldKey: "horizontalHalfSpanMm", value: "1450" }], new Set()).ok).toBe(false);
    expect(approveDrawingFields(definition, current, [{ fieldKey: "horizontalHalfSpanMm", value: "1450" }], new Set(["horizontalHalfSpanMm"]))).toEqual({
      ok: true, fields: { horizontalHalfSpanMm: "1450" },
    });
  });

  it("canonicalizes only the decimal separator the user entered", () => {
    expect(approveDrawingFields(definition, { horizontalHalfSpanMm: "3000" }, [{ fieldKey: "riseMm", value: "14,50" }], new Set())).toEqual({
      ok: true, fields: { riseMm: "14.50" },
    });
  });

  it("keeps target-field validation mandatory even for partial transfer", () => {
    expect(approveDrawingFields(definition, {}, [{ fieldKey: "riseMm", value: "0" }], new Set()).ok).toBe(false);
  });

  it("retains a valid partial value even while another field makes the calculation invalid", () => {
    expect(approveDrawingFields(definition, { seatCutHeightMm: "2500" }, [
      { fieldKey: "riseMm", value: "2000" },
    ], new Set())).toEqual({ ok: true, fields: { riseMm: "2000" } });
  });

  it.each([
    ["roof.rafter-cut", { horizontalHalfSpanMm: "3000", riseMm: "2000" }],
    ["roof.material-takeoff", { lengthMm: "10000", widthMm: "8000", pitchDegrees: "30" }],
    ["roof.timber-cutlist", { lengthMm: "10000", widthMm: "8000", pitchDegrees: "30" }],
    ["roof.truss-members", { spanMm: "6000", riseMm: "2000", panelCountPerHalf: "6" }],
  ] as const)("accepts checked measurements for %s without changing its calculation contract", (id, values) => {
    const selectedDefinition = definitions[id];
    expect(approveDrawingFields(selectedDefinition, {}, Object.entries(values).map(([fieldKey, value]) => ({ fieldKey, value })), new Set()))
      .toMatchObject({ ok: true, fields: values });
  });

  it("does not require hidden shape-specific fields for the selected roof shape", () => {
    const takeoff = definitions["roof.material-takeoff"];
    expect(missingRequiredDrawingFields(takeoff, { roofShape: "gable" }, {
      lengthMm: "10000", widthMm: "8000", pitchDegrees: "30",
    })).toEqual([]);
  });
});

describe("roof rafter field inference API", () => {
  const span = (originalText: string, overrides: Partial<DrawingTextSource> = {}): DrawingTextSource => ({
    sourceDocumentId: "demo-a", pageNumber: 1, originalText, normalizedText: originalText, tokens: [],
    method: "pdf-text", engine: "pdfjs-dist@6.4.299", confidence: null, uncertainty: "unknown",
    rotationDegrees: 0, position: { x: 0.2, y: 0.3 }, bounds: { x: 0.18, y: 0.28, width: 0.3, height: 0.04 },
    ...overrides,
  });
  const suggest = suggestRafterCutField;

  it.each([
    ["Fél fesztáv: 3000 mm", "horizontalHalfSpanMm", "3000", "M12.4.RAFTER.HALF_SPAN"],
    ["Fél tetőfesztáv: 300 cm", "horizontalHalfSpanMm", "3000", "M12.4.RAFTER.HALF_SPAN"],
    ["Gerincemelkedés: 2,00 m", "riseMm", "2000", "M12.4.RAFTER.RIDGE_RISE"],
    ["Tetőemelkedés a gerincig: 200 cm", "riseMm", "2000", "M12.4.RAFTER.RIDGE_RISE"],
    ["Vízszintes ereszkiülés: 40 cm", "eaveProjectionMm", "400", "M12.4.RAFTER.HORIZONTAL_EAVE_PROJECTION"],
    ["Eresz vízszintes kiülése: 400 mm", "eaveProjectionMm", "400", "M12.4.RAFTER.HORIZONTAL_EAVE_PROJECTION"],
  ] as const)("maps exact labeled PDF text %s to its explicit field rule", (text, fieldKey, value, ruleId) => {
    expect(suggest?.(span(text), "roof.rafter-cut")).toMatchObject({
      fieldKey, value, ruleId, sourceText: text, sourceUnit: expect.any(String), sourceDocumentId: "demo-a", pageNumber: 1,
      position: { x: 0.2, y: 0.3 }, bounds: { x: 0.18, y: 0.28, width: 0.3, height: 0.04 },
    });
  });

  it.each([
    "GERINC 8,20 m", "17,00", "14,50", "4,0%", "43,38 m²", "12×16,25/27", "Külső méret: 10000 mm",
    "HAP: 150 mm", "Fél fesztáv: 3000 mm / 3500 mm", "Gerincemelkedés: 2,00 m · 3,00 m",
  ])("does not infer a field from ambiguous or unrelated text: %s", (text) => {
    expect(suggest?.(span(text), "roof.rafter-cut")).toBeNull();
  });

  it("does not infer from OCR, another calculator, or a source without reliable position", () => {
    expect(suggest?.(span("Fél fesztáv: 3000 mm", { method: "ocr", engine: "tesseract.js@7.0.0" }), "roof.rafter-cut")).toBeNull();
    expect(suggest?.(span("Fél fesztáv: 3000 mm"), "roof.material-takeoff")).toBeNull();
    expect(suggest?.(span("Fél fesztáv: 3000 mm", { position: null }), "roof.rafter-cut")).toBeNull();
    expect(suggest?.(span("Fél fesztáv: 3000 mm", { bounds: null }), "roof.rafter-cut")).toBeNull();
  });

  it("classifies only the three explicit roof dimensions in the synthetic PDF fixture", async () => {
    const bytes = new Uint8Array(await readFile(resolve(process.cwd(), "public/ocr/fixtures/synthetic-rafter-dimensions.pdf")));
    const document = await processPdfDocument(bytes);
    const suggestions = document.pages.flatMap(({ textSpans }) => textSpans.flatMap((source) => {
      const result = suggest(source, "roof.rafter-cut");
      return result ? [result] : [];
    }));

    expect(suggestions).toHaveLength(3);
    expect(suggestions.map(({ fieldKey }) => fieldKey)).toEqual(["horizontalHalfSpanMm", "riseMm", "eaveProjectionMm"]);
    expect(document.pages.flatMap(({ textSpans }) => textSpans)).toHaveLength(14);
  });

  it("keeps a second synthetic drawing distinct and rejects its three unrelated labels", async () => {
    const [firstBytes, secondBytes] = await Promise.all([
      readFile(resolve(process.cwd(), "public/ocr/fixtures/synthetic-rafter-dimensions.pdf")),
      readFile(resolve(process.cwd(), "public/ocr/fixtures/synthetic-rafter-dimensions-b.pdf")),
    ]);
    const first = await processPdfDocument(new Uint8Array(firstBytes));
    const second = await processPdfDocument(new Uint8Array(secondBytes));
    const spans = second.pages.flatMap(({ textSpans }) => textSpans);
    const suggestions = spans.flatMap((source) => {
      const result = suggest(source, "roof.rafter-cut");
      return result ? [result] : [];
    });

    expect(second.sourceDocumentId).not.toBe(first.sourceDocumentId);
    expect(suggestions.map(({ fieldKey, value }) => [fieldKey, value])).toEqual([
      ["horizontalHalfSpanMm", "4200"], ["riseMm", "1800"], ["eaveProjectionMm", "350"],
    ]);
    expect(spans.filter(({ originalText }) => ["GERINC 8,20 m", "17,00", "HAP: 150 mm"].includes(originalText))
      .every((source) => suggest(source, "roof.rafter-cut") === null)).toBe(true);
  });

  it("keeps inference separate from approval and validates a user-corrected target/value", () => {
    const suggestion = suggest(span("Gerincemelkedés: 2,00 m"), "roof.rafter-cut");
    expect(suggestion).toMatchObject({ fieldKey: "riseMm", value: "2000" });
    expect(approveDrawingFields(definition, {}, [{ fieldKey: "eaveProjectionMm", value: "450" }], new Set()))
      .toEqual({ ok: true, fields: { eaveProjectionMm: "450" } });
  });
});

describe("ground-floor plan safeguards", () => {
  it("removes unchanged PDF-approved geometry when coverage is revoked but keeps later manual edits", () => {
    expect(revokeApprovedDrawingValues(
      { lengthMm: "8000", widthMm: "6100", pitchDegrees: "40" },
      [{ fieldKey: "lengthMm", value: "8000" }, { fieldKey: "widthMm", value: "6000" }, { fieldKey: "pitchDegrees", value: "35" }],
    )).toEqual({ fields: { widthMm: "6100", pitchDegrees: "40" }, invalidatedFieldKeys: ["lengthMm"] });
  });

  const pageSource = (originalText: string, overrides: Partial<DrawingTextSource> = {}): DrawingTextSource => ({
    sourceDocumentId: "demo-floor-plan", pageNumber: 1, originalText, normalizedText: originalText, tokens: [],
    method: "pdf-text", engine: "pdfjs-dist@6.4.299", confidence: null, uncertainty: "unknown",
    rotationDegrees: 0, position: { x: 0.2, y: 0.3 }, bounds: { x: 0.18, y: 0.28, width: 0.3, height: 0.04 },
    ...overrides,
  });

  it("suggests a floor plan from an explicit PDF.js title on one page", () => {
    expect(classifyDrawingPlan([pageSource("TERVEZETT FÖLDSZINTI"), pageSource("ALAPRAJZ")])).toBe("floor-plan");
  });

  it("does not infer the document type from OCR or combine title fragments across pages", () => {
    expect(classifyDrawingPlan([pageSource("TERVEZETT FÖLDSZINTI", { method: "ocr", engine: "tesseract.js@7.0.0" }), pageSource("ALAPRAJZ")])).toBeNull();
    expect(classifyDrawingPlan([pageSource("TERVEZETT FÖLDSZINTI"), pageSource("ALAPRAJZ", { pageNumber: 2 })])).toBeNull();
  });

  it("requires roof-footprint confirmation on every page the user has not declared a roof plan (P0-2)", () => {
    const material = definitions["roof.material-takeoff"];
    for (const key of ["lengthMm", "widthMm", "pitchDegrees", "eaveOverhangMm", "wingWidthMm", "wingProjectionMm"]) {
      expect(requiresRoofGeometryConfirmation(material, "floor-plan", key)).toBe(true);
    }
    // Strict by default: an unanswered page, a section and an unknown page are as guarded as a floor plan, so a
    // differently titled plan, a scan or an OCR source can no longer reach the roof fields unguarded.
    for (const plan of ["", "unknown", "section", "floor-plan"] as const) {
      expect(requiresRoofGeometryConfirmation(material, plan, "lengthMm")).toBe(true);
    }
    expect(requiresRoofGeometryConfirmation(material, "roof-plan", "lengthMm")).toBe(false);
    expect(requiresRoofGeometryConfirmation(material, "floor-plan", "rafterMaxSpacingMm")).toBe(false);
    expect(requiresRoofGeometryConfirmation(definitions["roof.rafter-cut"], "floor-plan", "horizontalHalfSpanMm")).toBe(true);
  });

  it("blocks a percent slope from being entered as a degree pitch even after manual editing", () => {
    expect(isPercentSlopeForPitch(pageSource("4,0%"), "pitchDegrees")).toBe(true);
    expect(isPercentSlopeForPitch(pageSource("4,0%"), "lengthMm")).toBe(false);
    expect(isPercentSlopeForPitch(pageSource("4°"), "pitchDegrees")).toBe(false);
  });

  it("allows saving a named, coverage-confirmed section on its own; the whole-roof confirmation only labels it (M12 audit T4)", () => {
    const scope = { ...inactiveDrawingTakeoffScope, active: true, sectionId: "section-a", sectionName: "Szárny A", coverageConfirmed: true };
    expect(canSaveDrawingTakeoff(inactiveDrawingTakeoffScope)).toBe(true);
    expect(canSaveDrawingTakeoff({ ...scope, sectionName: "" })).toBe(false);
    expect(canSaveDrawingTakeoff({ ...scope, sectionName: "  " })).toBe(false);
    expect(canSaveDrawingTakeoff({ ...scope, coverageConfirmed: false })).toBe(false);
    expect(canSaveDrawingTakeoff(scope)).toBe(true);
    expect(canSaveDrawingTakeoff({ ...scope, wholeRoofConfirmed: true })).toBe(true);
    expect(canSaveDrawingTakeoff(scope, [{}])).toBe(false);
    expect(canSaveDrawingTakeoff(inactiveDrawingTakeoffScope, [{}])).toBe(true);
  });

  describe("unconfirmedDrawingAssumptions (silent roof shape and overhang defaults)", () => {
    const takeoff = definitions["roof.material-takeoff"];
    const section = { ...inactiveDrawingTakeoffScope, active: true, sectionId: "a", sectionName: "Főszárny", coverageConfirmed: true };
    const keys = (values: Record<string, string>, scope = section) => unconfirmedDrawingAssumptions(takeoff, values, scope).map(({ key }) => key);
    const gable = { roofShape: "gable", eaveOverhangMm: "0", lengthMm: "10000", widthMm: "8000", pitchDegrees: "35" };

    it("lists every default a drawing section has not confirmed, never on a manual calculator", () => {
      expect(keys(gable)).toEqual(["roofShape", "frontGableOverhangMm", "rearGableOverhangMm"]);
      expect(keys({ ...gable, roofShape: "" })).toContain("roofShape");
      expect(keys(gable, inactiveDrawingTakeoffScope)).toEqual([]);
    });

    it("treats an entered value as explicit and an accepted 0 mm as confirmed, bound to value and shape", () => {
      expect(keys({ ...gable, roofShape: "shed", eaveOverhangMm: "600" })).toEqual([]);
      const accepted = { ...gable, frontGableOverhangMm: "0", rearGableOverhangMm: "0" };
      const confirmations = { roofShape: drawingAssumptionToken(accepted, "roofShape") };
      expect(keys(accepted, { ...section, assumptionConfirmations: confirmations })).toEqual([]);
      // Choosing another shape is itself explicit; the 0 mm accepted for the gable has to be accepted again.
      expect(keys({ ...accepted, roofShape: "shed" }, { ...section, assumptionConfirmations: confirmations })).toEqual([]);
      expect(keys({ ...gable, roofShape: "hip" })).toEqual([]);
    });

    it("names the overhang limit of shapes without an overhang input instead of inventing one", () => {
      expect(drawingOverhangLimitation(gable)).toBeNull();
      expect(drawingOverhangLimitation({ roofShape: "shed" })).toMatch(/alsó eresz/u);
      for (const shape of ["hip", "pyramid", "halfHip", "lShape", "tShape", "mansard"]) expect(drawingOverhangLimitation({ roofShape: shape })).toMatch(/nem kezel külön kiülést/u);
    });
  });

  it("gives every drawing section its own save session and a scope-revealing default name", () => {
    const a = { ...inactiveDrawingTakeoffScope, active: true, sectionId: "section-a", sectionName: "Főszárny", coverageConfirmed: true };
    const b = { ...a, sectionId: "section-b", sectionName: "Oldalszárny" };
    expect(drawingTakeoffSessionKey("roof.material-takeoff", a)).not.toBe(drawingTakeoffSessionKey("roof.material-takeoff", b));
    expect(drawingTakeoffSessionKey("roof.material-takeoff", a)).toBe(drawingTakeoffSessionKey("roof.material-takeoff", { ...a, sectionName: "Átnevezve", coverageConfirmed: false }));
    expect(drawingTakeoffSessionKey("roof.material-takeoff", inactiveDrawingTakeoffScope)).toBe("roof.material-takeoff");
    expect(drawingTakeoffCalculationName("Tetőanyag", a)).toBe("Tetőanyag · Főszárny (tetőszakasz, nem teljes épület)");
    expect(drawingTakeoffCalculationName("Tetőanyag", { ...a, wholeRoofConfirmed: true })).toBe("Tetőanyag · Főszárny");
    expect(drawingTakeoffCalculationName("Tetőanyag", inactiveDrawingTakeoffScope)).toBe("Tetőanyag");
  });

  it("suggests the synthetic floor-plan PDF as a floor plan without turning its labels into roof fields", async () => {
    const bytes = new Uint8Array(await readFile(resolve(process.cwd(), "public/ocr/fixtures/synthetic-ground-floor-plan.pdf")));
    const document = await processPdfDocument(bytes);
    const spans = document.pages.flatMap(({ textSpans }) => textSpans);

    expect(classifyDrawingPlan(spans)).toBe("floor-plan");
    expect(spans.filter(({ originalText }) => /^(17,00|14,50|3,90|4,0%|43,38 m²|12x16,25\/27|TERASZ)$/u.test(originalText)))
      .toHaveLength(8);
    expect(spans.map((source) => suggestRafterCutField(source, "roof.rafter-cut")).filter(Boolean)).toEqual([]);
  });
});

describe("drawingQuickScopeIssue (one-tap gate chain, extracted in T8)", () => {
  const takeoffDefinition = definitions["roof.material-takeoff"];
  const ready = {
    definition: takeoffDefinition, fieldKey: "lengthMm", plan: "floor-plan" as const, pageNumber: 2,
    takeoffScopeActive: true, sectionName: "Főépület", coverageConfirmed: true, planScopeConfirmed: true,
  };

  it("lets a dimension through only once the page, the section and the roof-part scope are all answered", () => {
    expect(drawingQuickScopeIssue(ready)).toBe("");
    expect(drawingQuickScopeIssue({ ...ready, plan: "" })).toMatch(/mit mutat ez a lap \(2\. oldal\)/u);
    expect(drawingQuickScopeIssue({ ...ready, sectionName: "  " })).toMatch(/nevezd meg a tetőszakaszt/u);
    expect(drawingQuickScopeIssue({ ...ready, coverageConfirmed: false })).toMatch(/igazold, hogy tetővel fedett/u);
    expect(drawingQuickScopeIssue({ ...ready, planScopeConfirmed: false })).toMatch(/ténylegesen fedett tetőrészhez/u);
  });

  it("asks in order: the page question comes before the section, which comes before the roof-part scope", () => {
    const nothingAnswered = { ...ready, plan: "" as const, sectionName: "", coverageConfirmed: false, planScopeConfirmed: false };
    expect(drawingQuickScopeIssue(nothingAnswered)).toMatch(/mit mutat ez a lap/u);
    expect(drawingQuickScopeIssue({ ...nothingAnswered, plan: "floor-plan" })).toMatch(/nevezd meg a tetőszakaszt/u);
  });

  it("skips the roof-part scope on a declared roof plan, but never skips the section gate", () => {
    expect(drawingQuickScopeIssue({ ...ready, plan: "roof-plan", planScopeConfirmed: false })).toBe("");
    expect(drawingQuickScopeIssue({ ...ready, plan: "roof-plan", coverageConfirmed: false })).toMatch(/igazold, hogy tetővel fedett/u);
  });

  it("leaves fields that are not roof dimensions alone, however little is answered", () => {
    const nothing = { ...ready, plan: "" as const, sectionName: "", coverageConfirmed: false, planScopeConfirmed: false };
    expect(drawingQuickScopeIssue({ ...nothing, fieldKey: "battenSpacingMm" })).toBe("");
  });

  it("drops the section gate where the calculator does not scope a takeoff to a section", () => {
    expect(drawingQuickScopeIssue({ ...ready, takeoffScopeActive: false, sectionName: "", coverageConfirmed: false })).toBe("");
  });
});

describe("guidedDrawingFieldKey (T7 one-at-a-time order)", () => {
  const f = (key: string) => ({ key });

  it("asks for the roof shape first, because it decides which fields exist at all", () => {
    expect(guidedDrawingFieldKey([f("lengthMm")], [f("eaveOverhangMm"), f("roofShape")])).toBe("roofShape");
  });

  it("then the missing required dimensions, in the order the calculator lists them", () => {
    expect(guidedDrawingFieldKey([f("lengthMm"), f("widthMm")], [f("eaveOverhangMm")])).toBe("lengthMm");
    expect(guidedDrawingFieldKey([f("widthMm")], [])).toBe("widthMm");
  });

  it("then the remaining unconfirmed defaults, once nothing required is missing", () => {
    expect(guidedDrawingFieldKey([], [f("eaveOverhangMm"), f("frontGableOverhangMm")])).toBe("eaveOverhangMm");
  });

  it("asks for nothing when the calculation has everything: no empty guided card", () => {
    expect(guidedDrawingFieldKey([], [])).toBe("");
  });
});

describe("A3 — melyik kalkulátor kap tetőszakasz-hatókört", () => {
  it("a tetőgeometriából mennyiséget számoló, azonos mezősémájú kettő igen", () => {
    expect(supportsRoofSectionScope("roof.material-takeoff")).toBe(true);
    expect(supportsRoofSectionScope("roof.timber-cutlist")).toBe(true);
  });

  it("az egyetlen szarufa és az egyetlen rácsos tartó nem", () => {
    // Nincs tetőformájuk és nincs felületük: a „fedett tetőrész" és a „teljes tetőt lefedi" náluk nem jelent semmit.
    expect(supportsRoofSectionScope("roof.rafter-cut")).toBe(false);
    expect(supportsRoofSectionScope("roof.truss-members")).toBe(false);
  });

  it("a nem tetős kalkulátorok sem", () => {
    expect(supportsRoofSectionScope("stair.straight-closed")).toBe(false);
    expect(supportsRoofSectionScope("")).toBe(false);
  });

  it("a hatókört viselő kalkulátorok mezősémája tényleg azonos", () => {
    const keys = (id: string) => definitions[id as keyof typeof definitions].fields.map((field) => field.key);
    expect(keys("roof.timber-cutlist")).toEqual(keys("roof.material-takeoff"));
  });
});

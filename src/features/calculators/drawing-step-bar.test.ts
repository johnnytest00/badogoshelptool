import { describe, expect, it } from "vitest";
import { drawingSteps, nextDrawingStep, type DrawingStepInput } from "./drawing-step-bar";

const base: DrawingStepInput = {
  planKindLabel: "", pageNumber: 1, multiPage: false,
  sectionActive: true, sectionName: "", sectionReady: false,
  calibrationAccepted: false, missingFieldCount: 3, unconfirmedAssumptionCount: 2,
  material: null, save: null,
};
const done = { planKindLabel: "Tetőterv", sectionName: "A", sectionReady: true, missingFieldCount: 0, unconfirmedAssumptionCount: 0 } satisfies Partial<DrawingStepInput>;
const VALID_MATERIAL = { status: "VALID", requested: true, openLabels: [] } as const;
const stepsOf = (overrides: Partial<DrawingStepInput> = {}) => drawingSteps({ ...base, ...overrides });
const byId = (overrides: Partial<DrawingStepInput> = {}) => Object.fromEntries(stepsOf(overrides).map((step) => [step.id, step]));

describe("drawing step bar", () => {
  it("walks the page answer, the section and the fields in order, skipping calibration as optional", () => {
    expect(nextDrawingStep(stepsOf())!.id).toBe("plan");
    expect(nextDrawingStep(stepsOf({ planKindLabel: "Alaprajz" }))!.id).toBe("section");
    expect(nextDrawingStep(stepsOf({ planKindLabel: "Alaprajz", sectionName: "A szárny", sectionReady: true }))!.id).toBe("fields");
    expect(nextDrawingStep(stepsOf({ planKindLabel: "Tetőterv", sectionName: "A", sectionReady: true, missingFieldCount: 0, unconfirmedAssumptionCount: 0 }))).toBeNull();
  });

  it("never makes calibration the next step or a reason the work looks unfinished", () => {
    const done = { planKindLabel: "Tetőterv", sectionName: "A", sectionReady: true, missingFieldCount: 0, unconfirmedAssumptionCount: 0 };
    expect(nextDrawingStep(stepsOf(done))).toBeNull();
    expect(byId(done).calibration).toMatchObject({ done: false, optional: true, state: "nem kötelező" });
    expect(byId({ ...done, calibrationAccepted: true }).calibration).toMatchObject({ done: true, state: "igazolva" });
  });

  it("reports missing fields and unconfirmed defaults together, and only says kész when both are clear", () => {
    expect(byId({ missingFieldCount: 3, unconfirmedAssumptionCount: 2 }).fields).toMatchObject({ state: "3 hiányzik, 2 megerősítendő", done: false });
    expect(byId({ missingFieldCount: 0, unconfirmedAssumptionCount: 2 }).fields).toMatchObject({ state: "2 megerősítendő", done: false });
    expect(byId({ missingFieldCount: 1, unconfirmedAssumptionCount: 0 }).fields).toMatchObject({ state: "1 hiányzik", done: false });
    expect(byId({ missingFieldCount: 0, unconfirmedAssumptionCount: 0 }).fields).toMatchObject({ state: "kész", done: true });
  });

  it("separates an unnamed section from a named one that is not yet selected and confirmed", () => {
    expect(byId({ sectionName: "" }).section.state).toBe("nincs megadva");
    expect(byId({ sectionName: "A szárny" }).section.state).toBe("kijelölés hiányzik");
    expect(byId({ sectionName: "A szárny", sectionReady: true }).section).toMatchObject({ state: "A szárny · fedett", done: true });
  });

  it("P3.3d: reports the calculator's own material statement and never invents readiness", () => {
    expect(byId({ ...done, material: VALID_MATERIAL }).material).toMatchObject({ label: "Anyag", state: "kész", done: true, optional: false });
    expect(byId({ ...done, material: { status: "INCOMPLETE", requested: true, openLabels: ["Fedőtáblák", "Alátétfólia"] } }).material)
      .toMatchObject({ state: "Fedőtáblák, Alátétfólia hiányos", done: false, optional: false });
    expect(byId({ ...done, material: { status: "INCOMPLETE", requested: true, openLabels: [] } }).material).toMatchObject({ state: "hiányos", done: false });
    expect(byId({ ...done, material: { status: "INVALID", requested: true, openLabels: [] } }).material).toMatchObject({ state: "érvénytelen adat", done: false });
    expect(byId({ ...done, material: { status: "UNSUPPORTED", requested: true, openLabels: [] } }).material).toMatchObject({ state: "nem támogatott", done: false });
    expect(stepsOf(done).some((step) => step.id === "material")).toBe(false);
  });

  it("P3.3d: says nothing about material while the calculator has not judged it yet", () => {
    const pending = { ...done, material: { status: null, requested: true, openLabels: [] } } as const;
    expect(byId(pending).material).toMatchObject({ state: "még nem értékelhető", done: false, optional: false });
    // A geometria a sávban előbb áll, ezért a még nem értékelt anyag nem előzi meg a hiányzó mezőket.
    expect(nextDrawingStep(stepsOf({ ...pending, missingFieldCount: 2 }))!.id).toBe("fields");
  });

  it("P3.3d: a material group nobody asked for is optional, never the next step and never outstanding", () => {
    const unrequested = { ...done, material: { status: "VALID", requested: false, openLabels: [] } } as const;
    expect(byId(unrequested).material).toMatchObject({ state: "nincs kérve", done: false, optional: true });
    expect(nextDrawingStep(stepsOf(unrequested))).toBeNull();
  });

  it("P3.3d: reports the save state without claiming anything the save panel does not", () => {
    expect(byId({ ...done, save: { revisionNumber: 0, dirty: false } }).save).toMatchObject({ label: "Mentés", state: "nincs mentve", done: false, optional: false });
    expect(byId({ ...done, save: { revisionNumber: 2, dirty: true } }).save).toMatchObject({ state: "V2 · mentetlen módosítás", done: false });
    expect(byId({ ...done, save: { revisionNumber: 2, dirty: false } }).save).toMatchObject({ state: "V2 · mentve", done: true });
    expect(stepsOf(done).some((step) => step.id === "save")).toBe(false);
  });

  it("P3.3d: saving is the last required step, and only after the fields and the requested material are done", () => {
    const all = { ...done, material: VALID_MATERIAL, save: { revisionNumber: 0, dirty: false } } as const;
    expect(stepsOf(all).map((step) => step.id)).toEqual(["plan", "section", "calibration", "fields", "material", "save"]);
    expect(nextDrawingStep(stepsOf(all))!.id).toBe("save");
    expect(nextDrawingStep(stepsOf({ ...all, missingFieldCount: 1 }))!.id).toBe("fields");
    expect(nextDrawingStep(stepsOf({ ...all, material: { status: "INCOMPLETE", requested: true, openLabels: ["Fedőtáblák"] } }))!.id).toBe("material");
    expect(nextDrawingStep(stepsOf({ ...all, save: { revisionNumber: 1, dirty: false } }))).toBeNull();
  });

  it("leaves the section step out where the calculator does not scope a takeoff to a section", () => {
    expect(stepsOf({ sectionActive: false }).map((step) => step.id)).toEqual(["plan", "calibration", "fields"]);
    expect(nextDrawingStep(stepsOf({ sectionActive: false, planKindLabel: "Tetőterv" }))!.id).toBe("fields");
  });

  it("names the page only when the drawing actually has several", () => {
    expect(byId().plan.label).toBe("A lap");
    expect(byId({ multiPage: true, pageNumber: 3 }).plan.label).toBe("3. lap");
  });
});

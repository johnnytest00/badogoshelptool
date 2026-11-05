// @vitest-environment jsdom
import { Fragment, useCallback, useMemo, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LengthField, type LengthFieldState } from "@/components/ui/length-field";
import type { DrawingTextSource } from "@/infrastructure/drawings/drawing-text-source";
import { computeConstruction, isFieldVisible } from "./construction-computation";
import { calculatorFieldKey } from "./construction-drafts";
import { discardLengthDraftsForFields } from "./construction-workspace-memory";
import { initialMaterialState } from "./material-spec-editor";
import { guidedDrawingFieldKey, inactiveDrawingTakeoffScope, missingRequiredDrawingFields, unconfirmedDrawingAssumptions, type DrawingTakeoffScope } from "./drawing-field-transfer";
/** T6: the panel asks through the app's own confirmation dialog, so the tests drive its answer, not window.confirm. */
const confirmation = vi.hoisted(() => ({ accepted: true, calls: [] as { title: string; message: string }[] }));
vi.mock("@/components/feedback/app-interaction-provider", () => ({
  useAppInteraction: () => ({
    notify: vi.fn(), registerGuard: vi.fn(), requestNavigation: vi.fn(), hasUnsavedChanges: false, hasPendingChanges: false,
    requestConfirmation: async (options: { title: string; message: string }) => { confirmation.calls.push({ title: options.title, message: options.message }); return confirmation.accepted; },
  }),
  useUnsavedChangeGuard: vi.fn(),
}));

import { PlanFieldTransfer, type SectionData } from "./plan-field-transfer";
import { useDrawingDocument } from "./use-drawing-document";
import { definitions } from "./roof-calculator-definitions";

// DEMO, synthetic labels only. The PDF/OCR engines are replaced; this tests the panel's own state handling.
const span = (originalText: string, x: number, y: number, method: DrawingTextSource["method"] = "pdf-text", sourceDocumentId = "demo-doc"): DrawingTextSource => ({
  sourceDocumentId, pageNumber: 1, originalText, normalizedText: originalText, tokens: [], method,
  engine: method === "ocr" ? "tesseract.js@7.0.0" : "pdfjs-dist@6.4.299", confidence: method === "ocr" ? 91 : null, uncertainty: "unknown",
  rotationDegrees: 0, position: { x, y }, bounds: { x, y, width: .05, height: .02 },
});
const demoSpans = [span("17,00", .1, .1), span("3,85", .12, .105), span("8,20 m", .3, .1), span("4,0%", .5, .1), span("30x50", .7, .1), span("35°", .1, .5), span("6,00", .3, .5), span("90", .8, .3), span("0,50 m ereszkiülés", .82, .5), span("10,00 m", .45, .7), span("12,84 m", .6, .6), { ...span("2", .65, .6), bounds: { x: .65, y: .6, width: .003, height: .01 } }];

/** Page count of the next parsed document; a second page is only needed by the multi-page picker test (T9). */
const parsedPdf = vi.hoisted(() => ({ pageCount: 1 }));
vi.mock("@/infrastructure/drawings/pdf-text-extractor", () => ({
  processPdfDocument: vi.fn(async () => ({
    sourceDocumentId: `demo-doc-${Math.random()}`, pageCount: parsedPdf.pageCount,
    pages: Array.from({ length: parsedPdf.pageCount }, (_, index) => ({
      pageNumber: index + 1, widthPoints: 1190, heightPoints: 842, rotationDegrees: 0,
      textSpans: index === 0 ? demoSpans : [{ ...span("5,00", .2, .2), pageNumber: index + 1 }],
    })),
  })),
}));
vi.mock("@/infrastructure/drawings/pdf-preview", () => ({ renderPdfPage: vi.fn(async () => undefined) }));
vi.mock("@/infrastructure/drawings/ocr", () => ({
  recognizeImage: vi.fn(async () => [span("17,00", .1, .1, "ocr")]),
  recognizePdfPage: vi.fn(async () => []),
}));

const takeoff = definitions["roof.material-takeoff"];
const initialValues = () => Object.fromEntries(takeoff.fields.map((field) => [field.key, field.initial ?? ""]));
const initialMaterials = initialMaterialState([], false);
const noop = () => undefined;
let latest: Record<string, string> = {};
let latestScope: DrawingTakeoffScope | null = null;

/** Plays the calculator suite's part: draft values, LengthField drafts keyed like `renderField`, section activation. */
function Harness({ renderFieldProp }: { renderFieldProp?: ((field: (typeof takeoff.fields)[number]) => ReactNode) | false } = {}) {
  const [values, setValues] = useState(initialValues);
  const [materials, setMaterials] = useState(initialMaterials);
  const [lengthDrafts, setLengthDrafts] = useState<Record<string, LengthFieldState>>({});
  const [epoch, setEpoch] = useState(0);
  const doc = useDrawingDocument<SectionData>();
  const [wholeRoof, setWholeRoof] = useState(false);
  const [scope, setScope] = useState<DrawingTakeoffScope>(inactiveDrawingTakeoffScope);
  // Stable identity, like the suite's own useCallback: the panel's scope effect depends on it, so a fresh arrow
  // on every render would make the effect fire, set state, render again — an endless loop.
  const onScopeChange = useCallback((next: DrawingTakeoffScope) => {
    latestScope = next;
    setScope((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, []);
  const calculation = useMemo(() => computeConstruction(takeoff, values, materials, []), [values, materials]);
  latest = values;
  // The suite decides which field the panel asks for; the harness mirrors that decision with the same functions.
  const unconfirmed = unconfirmedDrawingAssumptions(takeoff, values, scope);
  const guidedMissing = scope.active ? missingRequiredDrawingFields(takeoff, values, {}) : [];
  const cededFieldKey = scope.active ? guidedDrawingFieldKey(guidedMissing, unconfirmed) : "";
  /** The real controls the calculator uses, so validation, units and length drafts are genuinely exercised. */
  const harnessRenderField = (field: (typeof takeoff.fields)[number]) => field.kind === "select"
    ? <select aria-label={field.label} value={values[field.key] ?? field.initial ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
      {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    : !field.kind && field.unit === "mm"
      ? <LengthField id={field.key} label={field.label} value={values[field.key] ?? ""} draftState={lengthDrafts[field.key]}
        onDraftStateChange={(state) => setLengthDrafts((current) => ({ ...current, [field.key]: state }))}
        onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} mmDecimals={field.integer ? 0 : 1} />
      : <input aria-label={field.label} value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />;
  return <>
    <PlanFieldTransfer doc={doc} definition={takeoff} current={values} calculation={calculation} wholeRoofConfirmed={wholeRoof} materials={materials} initialMaterials={initialMaterials} profiles={[]} lengthDrafts={lengthDrafts} renderField={renderFieldProp === false ? undefined : renderFieldProp ?? harnessRenderField}
      onWholeRoofChange={setWholeRoof} onScopeChange={onScopeChange} cededFieldKey={cededFieldKey}
      onSectionActivate={(data) => { setValues(data.fields); setMaterials(data.materials); setLengthDrafts(data.lengthDrafts); setEpoch((value) => value + 1); }}
      onApply={(fields) => {
        setValues((current) => ({ ...current, ...fields }));
        setLengthDrafts((current) => discardLengthDraftsForFields({ takeoff: current }, "takeoff", Object.keys(fields).filter((key) => takeoff.fields.find((field) => field.key === key)?.unit === "mm")).takeoff);
        setEpoch((value) => value + 1);
      }} />
    <Fragment key={calculatorFieldKey(takeoff.reference.id, epoch, "lengthMm")}>
      <LengthField label="Kalkulátor tető hossza" value={values.lengthMm ?? ""} draftState={lengthDrafts.lengthMm} onDraftStateChange={(state) => setLengthDrafts((current) => ({ ...current, lengthMm: state }))} onChange={(value) => setValues((current) => ({ ...current, lengthMm: value }))} />
    </Fragment>
  </>;
}

/** P3.3f: a négy soronkénti gomb helyett egy kártya-jóváhagyás; a hívó adja meg, melyik blokkon belül keressük. */
const acceptAllDefaults = (scope: ReturnType<typeof within>) => fireEvent.click(scope.getByRole("button", { name: /^Mind a kiírt alapérték elfogadása/u }));
const quickBar = () => within(screen.getByRole("region", { name: "Gyors kitöltés a rajzról" }));
const hit = (text: string) => screen.getByRole("button", { name: `Forrásszöveg: ${text}` });
/** Picks the quick-transfer target chip; a label matching no field (e.g. /^Nincs/) deselects the pressed one. */
const setTarget = (label: RegExp) => fireEvent.change(quickBar().getByLabelText("Kitöltendő mező"), { target: { value: takeoff.fields.find((field) => label.test(field.label))?.key ?? "" } });
/** Answers the bar's unit question for the label just tapped. */
const answerUnit = (unit: string) => fireEvent.click(within(quickBar().getByRole("group", { name: "Felirat egysége" })).getByRole("button", { name: unit }));
const tapWithUnit = (text: string, unit: string) => { fireEvent.click(hit(text)); answerUnit(unit); };
const message = () => quickBar().queryAllByRole("alert").concat(quickBar().queryAllByRole("status")).map((node) => node.textContent).join(" | ");
const [pageWidth, pageHeight] = [375, 531];
/** Page-normalized point as a click on the rendered page. */
const at = (x: number, y: number) => ({ clientX: Math.round(x * pageWidth), clientY: Math.round(y * pageHeight) });

async function loadPdf(name = "demo-a.pdf") {
  const input = screen.getByLabelText(/PDF vagy kép kiválasztása/u);
  await act(async () => { fireEvent.change(input, { target: { files: [new File([name], name, { type: "application/pdf" })] } }); });
  await screen.findByRole("button", { name: "Forrásszöveg: 17,00" });
}

/** Answers the page-content question (P0-2); only a declared roof plan skips the covered-roof confirmation. */
const answerPlanKind = (label: string) => fireEvent.click(within(screen.getByRole("group", { name: "A lap típusa" })).getByRole("button", { name: label }));

/** Answers the page question, then names, selects (two corners) and confirms the active section as covered. */
function coverActiveSection() {
  if (screen.queryByRole("group", { name: "A lap típusa" })) answerPlanKind("Alaprajz");
  fireEvent.click(screen.getByRole("button", { name: "Szakasz kijelölése a rajzon" }));
  const page = () => screen.getByRole("group", { name: /tetőszakasz kijelölésének/u });
  fireEvent.click(page(), { clientX: 10, clientY: 10 });
  fireEvent.click(page(), { clientX: 60, clientY: 40 });
  fireEvent.change(screen.getByLabelText("Fedettség"), { target: { value: "covered" } });
  // P3.5.1: a választó már nem igazol magától; a megerősítés a felhasználó kifejezett pipája.
  fireEvent.click(screen.getByRole("checkbox", { name: /tetővel fedett/u }));
  setTarget(/^Tető hossza/u);
  fireEvent.click(quickBar().getByRole("checkbox"));
}

beforeEach(() => {
  confirmation.accepted = true;
  confirmation.calls = [];
  parsedPdf.pageCount = 1;
  // A phone-sized rendered page (375 CSS px wide, A4 ratio): the tap tolerance is derived from these pixels, so the
  // mock has to be the real render size, not a unit square.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: pageWidth, height: pageHeight, right: pageWidth, bottom: pageHeight, x: 0, y: 0, toJSON: () => ({}) });
  globalThis.URL.createObjectURL ??= () => "blob:demo";
  globalThis.URL.revokeObjectURL ??= () => undefined;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("panel disclosure (T2)", () => {
  const panel = () => screen.getByText(/Kitöltés tervrajzból/u).closest("details")!;

  it("starts collapsed with no drawing and opens itself once one is loaded, without reopening after a manual close", async () => {
    render(<Harness />);
    expect(panel().open).toBe(false);
    await loadPdf();
    expect(panel().open).toBe(true);
    await act(async () => { const element = panel(); element.open = false; element.dispatchEvent(new Event("toggle")); });
    expect(panel().open).toBe(false);
  });
});

describe("guided entry for missing required fields (T7)", () => {
  const todo = () => within(screen.getByRole("region", { name: "Teendők és figyelmeztetések" }));
  /** Every control the guided entry currently offers, anywhere in the panel. */
  const guidedControls = () => {
    const panel = within(screen.getByRole("region", { name: "Teendők és figyelmeztetések" }));
    return [...panel.queryAllByRole("textbox"), ...panel.queryAllByRole("combobox"), ...panel.queryAllByRole("spinbutton")];
  };
  const lengthBox = (label: string) => todo().getByLabelText(new RegExp(`^${label},`, "u")) as HTMLInputElement;
  const typeIn = (element: HTMLInputElement, text: string) => fireEvent.change(element, { target: { value: text } });

  async function startSection() {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
  }

  it("asks for the roof shape first, then one missing required field at a time, named with its unit", async () => {
    await startSection();
    // Shape first: it decides which fields exist at all.
    expect(guidedControls().length).toBe(1);
    expect(todo().getByLabelText("Tetőforma")).toBeTruthy();

    acceptAllDefaults(todo());
    expect(guidedControls().length).toBe(1);
    expect(todo().getByText(/Következő adat:/u).textContent).toMatch(/Tető hossza \(mm\)/u);
    expect(lengthBox("Tető hossza")).toBeTruthy();
  });

  it("does not move on while the value is invalid, and keeps what is being typed", async () => {
    await startSection();
    acceptAllDefaults(todo());

    typeIn(lengthBox("Tető hossza"), "12x");
    expect(lengthBox("Tető hossza").value).toBe("12x");
    expect(todo().getByText(/Következő adat:/u).textContent).toMatch(/Tető hossza/u);
    expect(guidedControls().length).toBe(1);
    expect(latest.lengthMm ?? "").toBe("");

    // A half-typed value is not a recorded one either: still the same field.
    typeIn(lengthBox("Tető hossza"), "");
    expect(todo().getByText(/Következő adat:/u).textContent).toMatch(/Tető hossza/u);
  });

  it("moves to the next missing field once the value is validly recorded, in the calculator's own units", async () => {
    await startSection();
    acceptAllDefaults(todo());

    typeIn(lengthBox("Tető hossza"), "1200");
    expect(latest.lengthMm).toBe("12000");
    expect(todo().getByText(/Következő adat:/u).textContent).toMatch(/Tető szélessége/u);

    typeIn(lengthBox("Tető szélessége"), "800");
    expect(latest.widthMm).toBe("8000");
    expect(todo().getByText(/Következő adat:/u).textContent).toMatch(/Tetőhajlás/u);
    expect(guidedControls().length).toBe(1);
  });

  it("follows the calculator's own visibility when the roof shape changes", async () => {
    await startSection();
    // Answering the shape with a different one instead of accepting the default.
    fireEvent.change(todo().getByLabelText("Tetőforma"), { target: { value: "shed" } });
    expect(latest.roofShape).toBe("shed");
    const asked = todo().getByText(/Következő adat:/u).textContent ?? "";
    // Whatever it asks for now, it must be a field this shape actually has, and still exactly one.
    const field = takeoff.fields.find((item) => asked.includes(item.label))!;
    expect(field).toBeTruthy();
    expect(isFieldVisible(field, latest)).toBe(true);
    expect(guidedControls().length).toBe(1);
  });

  it("leaves no guided card once nothing is missing or unconfirmed", async () => {
    await startSection();
    acceptAllDefaults(todo());
    typeIn(lengthBox("Tető hossza"), "1200");
    typeIn(lengthBox("Tető szélessége"), "800");
    fireEvent.change(todo().getByLabelText("Tetőhajlás"), { target: { value: "35" } });

    expect(screen.queryByText(/Következő adat:/u)).toBeNull();
    expect(guidedControls().length).toBe(0);
    expect(todo().queryByText(/Még szükséges:/u)).toBeNull();
  });

  it("keeps sections apart: a new section starts its own guided entry and shows none of the other's values", async () => {
    await startSection();
    acceptAllDefaults(todo());
    typeIn(lengthBox("Tető hossza"), "1200");
    expect(latest.lengthMm).toBe("12000");

    fireEvent.click(screen.getByRole("button", { name: /Új tetőszakasz/u }));
    // The fresh section starts from the calculator's own initial values, so the guided entry begins again.
    expect(latest.lengthMm ?? "").toBe("");
    expect(guidedControls().length).toBe(1);
    expect(todo().getByLabelText("Tetőforma")).toBeTruthy();
  });
});

describe("renderField seam (S1, T7 precondition)", () => {
  const assumptions = () => screen.getByRole("group", { name: "Megerősítendő alapértékek" });

  it("renders nothing extra without the prop — the panel behaves exactly as before", async () => {
    render(<Harness renderFieldProp={false} />);
    await loadPdf();
    expect(within(assumptions()).queryByRole("textbox")).toBeNull();
    expect(within(assumptions()).queryByRole("combobox")).toBeNull();
    expect(within(assumptions()).getByRole("button", { name: /^Mind a kiírt alapérték elfogadása/u })).toBeTruthy();
  });

  it("puts the calculator's own field next to accepting the default, so the real value can be given here", async () => {
    render(<Harness renderFieldProp={(field) => <input aria-label={`${field.label} mező`} data-field={field.key} />} />);
    await loadPdf();
    // The warning already tells the user to "accept it, or give the real value" — now both are possible here.
    // One question at a time: only the first outstanding default gets a field, not all three at once.
    expect(within(assumptions()).getAllByRole("textbox").length).toBe(1);
    expect(within(assumptions()).getByLabelText("Tetőforma mező")).toBeTruthy();
    expect(within(assumptions()).queryByLabelText("Vízszintes ereszkiülés mező")).toBeNull();
    // The optional eave has no confirmation step to accept.
    acceptAllDefaults(within(assumptions()));
    expect(latest.eaveOverhangMm).toBe("");
  });
});

describe("section step order (T5)", () => {
  const sectionStep = () => screen.getByRole("region", { name: "Fedett tetőrész" });

  it("asks for the drawing selection before the name, the way the part is read off the drawing", async () => {
    render(<Harness />);
    await loadPdf();
    answerPlanKind("Alaprajz");
    const step = sectionStep();
    const selectButton = within(step).getByRole("button", { name: /Szakasz kijelölése a rajzon/u });
    const nameInput = within(step).getByLabelText("Szakasz neve");
    expect(selectButton.compareDocumentPosition(nameInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the save gates: no coverage confirmation without a selection, and no finished section without a name", async () => {
    render(<Harness />);
    await loadPdf();
    answerPlanKind("Alaprajz");

    // Coverage may be declared, but confirming it stays disabled until an area is actually marked.
    fireEvent.change(within(sectionStep()).getByLabelText("Fedettség"), { target: { value: "covered" } });
    expect((within(sectionStep()).getByRole("checkbox", { name: /tetővel fedett/u }) as HTMLInputElement).disabled).toBe(true);
    expect(within(sectionStep()).queryByRole("button", { name: "Kész" })).toBeNull();

    fireEvent.click(within(sectionStep()).getByRole("button", { name: /Szakasz kijelölése a rajzon/u }));
    const page = () => screen.getByRole("group", { name: /tetőszakasz kijelölésének/u });
    fireEvent.click(page(), { clientX: 10, clientY: 10 });
    fireEvent.click(page(), { clientX: 60, clientY: 40 });
    fireEvent.change(within(sectionStep()).getByLabelText("Fedettség"), { target: { value: "covered" } });
    /**
     * P3.5.1: a kijelölés és a „Tetővel fedett" címke önmagában NEM igazolás. A megerősítés checkboxa most már
     * engedélyezett, de üres, a szakasz nem „kész", és a lépés nyitva marad — különben a felhasználó sosem látná
     * azt az állítást („a teraszokat külön vizsgáltam"), amely a mentési kaput nyitja.
     */
    const coverageCheck = () => within(sectionStep()).getByRole("checkbox", { name: /tetővel fedett/u }) as HTMLInputElement;
    expect(coverageCheck().disabled).toBe(false);
    expect(coverageCheck().checked).toBe(false);
    expect(latestScope!.coverageConfirmed).toBe(false);
    expect(within(sectionStep()).queryByRole("button", { name: "Kész" })).toBeNull();

    // Csak a kifejezett pipa igazol; ezzel lesz a szakasz kész, és zárul a lépés.
    fireEvent.click(coverageCheck());
    expect(latestScope!.coverageConfirmed).toBe(true);
    expect(screen.queryByRole("region", { name: "Fedett tetőrész" })).toBeNull();

    // A fedettség újraválasztása hatókör-változás: a korábbi igazolás nem él tovább, újra kell állítani.
    fireEvent.click(within(screen.getByRole("navigation", { name: "A rajzos kitöltés állapota" })).getByRole("button", { name: /^Szakasz/u }));
    fireEvent.change(within(sectionStep()).getByLabelText("Fedettség"), { target: { value: "unclear" } });
    fireEvent.change(within(sectionStep()).getByLabelText("Fedettség"), { target: { value: "covered" } });
    expect(coverageCheck().checked).toBe(false);
    expect(latestScope!.coverageConfirmed).toBe(false);

    // Reopened from the strip, clearing the default name takes the section back out of "ready".
    fireEvent.click(within(screen.getByRole("navigation", { name: "A rajzos kitöltés állapota" })).getByRole("button", { name: /^Szakasz/u }));
    fireEvent.change(within(sectionStep()).getByLabelText("Szakasz neve"), { target: { value: "  " } });
    expect(within(sectionStep()).queryByRole("button", { name: "Kész" })).toBeNull();
    expect(latestScope!.sectionName.trim()).toBe("");
  });
});

describe("multi-page picker (T9)", () => {
  const pagePicker = () => screen.getByLabelText("Oldal") as HTMLSelectElement;
  const pageOptions = () => [...pagePicker().options].map((option) => option.textContent);

  it("says which pages already have an answer, and keeps clearing the page state on a switch", async () => {
    parsedPdf.pageCount = 2;
    render(<Harness />);
    await loadPdf();

    expect(pageOptions()).toEqual(["1. · nincs megadva", "2. · nincs megadva"]);
    answerPlanKind("Alaprajz");
    expect(pageOptions()).toEqual(["1. · Alaprajz", "2. · nincs megadva"]);

    // A label picked on page 1 must not survive the switch, exactly as before.
    fireEvent.click(hit("17,00"));
    expect(screen.getByRole("region", { name: "Felirat hozzárendelése" })).toBeTruthy();
    fireEvent.change(pagePicker(), { target: { value: "2" } });
    expect(screen.queryByRole("region", { name: "Felirat hozzárendelése" })).toBeNull();

    // Page 2 is unanswered, so its own question comes back while page 1 keeps its answer.
    expect(screen.getByRole("group", { name: "A lap típusa" })).toBeTruthy();
    expect(pageOptions()).toEqual(["1. · Alaprajz", "2. · nincs megadva"]);
    answerPlanKind("Tetőterv");
    expect(pageOptions()).toEqual(["1. · Alaprajz", "2. · Tetőterv"]);
  });
});

describe("step bar (T4)", () => {
  const bar = () => within(screen.getByRole("navigation", { name: "A rajzos kitöltés állapota" }));
  const stepChip = (label: RegExp) => bar().getByRole("button", { name: label });
  // P3.3d.1: a sávban a lépéschipek mellett az „Állapotok" kapcsoló is gomb, ezért a chipeket a listából olvassuk.
  const stepChips = () => within(bar().getByRole("list")).getAllByRole("button");
  const todo = () => screen.queryByRole("region", { name: "Teendők és figyelmeztetések" });

  it("reports the phases, marks the next required one and never makes calibration current", async () => {
    render(<Harness />);
    await loadPdf();
    expect(stepChips().map((button) => button.textContent)).toEqual([
      expect.stringMatching(/^A lap/u), expect.stringMatching(/^Szakasz/u),
      expect.stringMatching(/^Lépték/u), expect.stringMatching(/^Mezők/u),
      // P3.3d: az anyaglépés az anyagbemenetes kalkulátornál mindig ott van; a „Mentés" lépéshez a harness nem ad `save` propot.
      expect.stringMatching(/^Anyag/u),
    ]);
    expect(stepChip(/^Anyag/u).getAttribute("aria-current")).toBeNull();
    // P3.3d.1: a rövidített chipen is a teljes állapot a hozzáférhető név, és a kapcsoló a sávon belül él.
    expect(stepChips().map((button) => button.getAttribute("aria-label"))).toEqual([
      "A lap: nincs megadva", "Szakasz: kijelölés hiányzik", "Lépték: nem kötelező",
      "Mezők: 3 hiányzik, 3 megerősítendő", "Anyag: nincs kérve",
    ]);
    const toggle = bar().getByRole("button", { name: "Minden állapot" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(bar().getByRole("button", { name: "Állapotok elrejtése" }).getAttribute("aria-expanded")).toBe("true");
    // A kibontás csak megjelenítés: a lépések, a sorrend és az aktuális lépés változatlan.
    expect(stepChips().map((button) => button.textContent)).toEqual([
      expect.stringMatching(/^A lap/u), expect.stringMatching(/^Szakasz/u),
      expect.stringMatching(/^Lépték/u), expect.stringMatching(/^Mezők/u), expect.stringMatching(/^Anyag/u),
    ]);
    expect(stepChip(/^A lap/u).getAttribute("aria-current")).toBe("step");
    expect(stepChip(/^A lap/u).getAttribute("aria-current")).toBe("step");
    expect(stepChip(/^Lépték/u).getAttribute("aria-current")).toBeNull();
    expect(stepChip(/^Lépték/u).textContent).toMatch(/nem kötelező/u);

    coverActiveSection();
    expect(stepChip(/^Szakasz/u).textContent).toMatch(/fedett/u);
    expect(stepChip(/^Mezők/u).getAttribute("aria-current")).toBe("step");
    // Calibration stays untouched, so it must not be what the strip asks for next.
    expect(stepChip(/^Lépték/u).getAttribute("aria-current")).toBeNull();
  });

  it("reopens the page question from the strip, now that the separate summary is gone", async () => {
    render(<Harness />);
    await loadPdf();
    answerPlanKind("Alaprajz");
    expect(screen.queryByRole("group", { name: "A lap típusa" })).toBeNull();
    expect(stepChip(/^A lap/u).textContent).toMatch(/Alaprajz/u);

    fireEvent.click(stepChip(/^A lap/u));
    expect(screen.getByRole("group", { name: "A lap típusa" })).toBeTruthy();
  });

  it("keeps every warning, confirmation and save gate reachable alongside the strip", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();

    // The strip only points; the detailed blocks still carry the actual content.
    expect(todo()!.textContent).toMatch(/Még szükséges:/u);
    expect(todo()!.textContent).toMatch(/Alaprajz, nem tetőterv/u);
    expect(within(todo()!).getByRole("group", { name: "Megerősítendő alapértékek" })).toBeTruthy();
    expect(within(todo()!).getByRole("button", { name: /^Mind a kiírt alapérték elfogadása/u })).toBeTruthy();
    // The whole-roof gate survived the removal of the section status block around it.
    expect(screen.getByRole("checkbox", { name: /teljes épület tetejét lefedi/u })).toBeTruthy();
  });
});

describe("destructive confirmations (T6)", () => {
  /** Fires the drawing picker without waiting for new content: on a cancelled pick nothing new ever arrives. */
  const pickDrawing = async (name: string) => {
    const input = screen.getByLabelText(/PDF vagy kép kiválasztása/u);
    await act(async () => { fireEvent.change(input, { target: { files: [new File([name], name, { type: "application/pdf" })] } }); });
  };

  it("keeps the current drawing, section and transferred value when the new-drawing confirmation is cancelled", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    tapWithUnit("17,00", "m");
    expect(latest.lengthMm).toBe("17000");

    confirmation.accepted = false;
    await pickDrawing("demo-b.pdf");

    expect(confirmation.calls.at(-1)).toMatchObject({ title: "Új rajz megnyitása" });
    expect(confirmation.calls.at(-1)!.message).toMatch(/Elveszik:/u);
    // Nothing was reset: a real load clears the undo history, the chosen-unit list and the page answer (see the
    // "another PDF is chosen" case below); after a cancel all three survive and the value is untouched.
    expect(latest.lengthMm).toBe("17000");
    expect(quickBar().getByRole("button", { name: "Visszavonás" })).toBeTruthy();
    expect(quickBar().getByRole("list", { name: "Általad választott egységű értékek" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "A lap típusa" })).toBeNull();
  });

  it("keeps everything when the discard confirmation is cancelled, and clears only after it is accepted", async () => {
    render(<Harness />);
    await loadPdf();
    const discard = () => screen.getByRole("button", { name: /Fájl és javaslatok elvetése/u });

    confirmation.accepted = false;
    await act(async () => { fireEvent.click(discard()); });
    expect(confirmation.calls.at(-1)).toMatchObject({ title: "Fájl és javaslatok elvetése" });
    expect(hit("17,00")).toBeTruthy();

    confirmation.accepted = true;
    await act(async () => { fireEvent.click(discard()); });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Forrásszöveg: 17,00" })).toBeNull());
    expect(screen.getByLabelText(/PDF vagy kép kiválasztása/u)).toBeTruthy();
  });
});

describe("roof shape and overhang defaults on a drawing section", () => {
  it("P3.3f: a kártya jóváhagyása pontosan a kiírt tételekre vonatkozik, mást nem érint", async () => {
    render(<Harness />);
    await loadPdf();
    const assumptions = () => screen.queryByRole("group", { name: "Megerősítendő alapértékek" });
    // Másik tetőforma: a kártya csak az ehhez a formához tartozó alapértékeket írja ki, és a gomb ennyit ígér.
    fireEvent.change(within(assumptions()!).getByLabelText("Tetőforma"), { target: { value: "shed" } });
    const listed = assumptions() ? within(assumptions()!).getAllByRole("listitem").length : 0;
    expect(listed).toBeLessThan(3);
    expect(assumptions()).toBeNull();

    // A kézzel választott forma nem igényel alapérték-megerősítést.
    expect(Object.keys(latestScope?.assumptionConfirmations ?? {})).toEqual([]);
    expect(assumptions()).toBeNull();
  });

  it("asks to accept each silent default per section, writes 0 mm explicitly and keeps the acceptance with its section", async () => {
    render(<Harness />);
    await loadPdf();
    const assumptions = () => screen.queryByRole("group", { name: "Megerősítendő alapértékek" });
    expect(within(assumptions()!).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringMatching(/^Tetőforma: Nyeregtető/u),
      expect.stringMatching(/^Homlokzati kiülés · elöl: nincs megadva/u),
      expect.stringMatching(/^Homlokzati kiülés · hátul: nincs megadva/u),
    ]);

    // P3.3f: one approval covers the listed defaults.
    expect(within(assumptions()!).getByRole("button", { name: "Mind a kiírt alapérték elfogadása (3)" })).toBeTruthy();
    acceptAllDefaults(within(assumptions()!));
    expect(latestScope?.assumptionConfirmations).toEqual({ roofShape: "gable|gable", frontGableOverhangMm: "gable|0", rearGableOverhangMm: "gable|0" });
    expect(assumptions()).toBeNull();
    expect([latest.eaveOverhangMm, latest.frontGableOverhangMm, latest.rearGableOverhangMm]).toEqual(["", "0", "0"]);
    expect(screen.queryByText(/Számítási korlát/u)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Új tetőszakasz" }));
    expect(within(assumptions()!).getAllByRole("listitem")).toHaveLength(3);
    expect(within(assumptions()!).getByRole("button", { name: "Mind a kiírt alapérték elfogadása (3)" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Tetőszakasz 1 ·/u }));
    expect(assumptions()).toBeNull();
    expect(latestScope?.assumptionConfirmations).toMatchObject({ roofShape: "gable|gable" });
  });

  it("names the overhang limit of a shape without overhang input and asks nothing for an explicitly chosen shape", async () => {
    function ShapeHarness() {
      const values = { ...initialValues(), roofShape: "hip" };
      const doc = useDrawingDocument<SectionData>();
      return <PlanFieldTransfer doc={doc} definition={takeoff} current={values} calculation={computeConstruction(takeoff, values, initialMaterials, [])} wholeRoofConfirmed={false} materials={initialMaterials} initialMaterials={initialMaterials} profiles={[]} lengthDrafts={{}}
        onWholeRoofChange={noop} onScopeChange={noop} onSectionActivate={noop} onApply={noop} />;
    }
    render(<ShapeHarness />);
    await loadPdf();
    expect(screen.queryByRole("group", { name: "Megerősítendő alapértékek" })).toBeNull();
    expect(screen.getByRole("note").textContent).toMatch(/Számítási korlát · Ennél a tetőformánál a számítás nem kezel külön kiülést/u);
  });
});

describe("mixed-unit drawings", () => {
  it("asks for the unit of every unitless label and never reuses an answer, listing the chosen units (P0-1)", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    tapWithUnit("17,00", "m");
    expect(latest.lengthMm).toBe("17000");

    // A second label written the same way asks again: nothing proves it carries the same unit.
    setTarget(/^Tető szélessége/u);
    fireEvent.click(hit("6,00"));
    expect(latest.widthMm).toBe("");
    expect(message()).toMatch(/csak erre a feliratra/u);
    answerUnit("cm");
    expect(latest.widthMm).toBe("60");

    // Both chosen units stay listed with the value they produced, not only in the message that just scrolled by.
    const chosen = within(quickBar().getByRole("list", { name: "Általad választott egységű értékek" })).getAllByRole("listitem");
    expect(chosen.map((item) => item.textContent)).toEqual([
      expect.stringMatching(/Tető hossza: 17000 mm · „17,00” = m, általad választva/u),
      expect.stringMatching(/Tető szélessége: 60 mm · „6,00” = cm, általad választva/u),
    ]);
  });

  it("never takes a unitless number as a pitch in degrees", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    setTarget(/^Tetőhajlás/u);
    fireEvent.click(hit("90"));
    expect(latest.pitchDegrees).toBe("");
    expect(quickBar().queryByRole("group", { name: "Felirat egysége" })).toBeNull();
    expect(message()).toMatch(/egység nélküli.*csak °-kal jelölt/u);
  });
});

describe("page calibration (P1.1, experimental)", () => {
  // P1.6: the active calibration/measure UI now sits above the canvas, not only inside the "Lépték" disclosure, so
  // this scopes to the whole document rather than one container — the component under test renders alone (see
  // `Harness`), and every name queried below is unique within it either way.
  const calibrationPanel = () => within(document.body);
  /** The mocked page is 1190x842 pt: 0.4 of its width is 476 pt, 0.2 is 238 pt — one scale, two distinct spans. */
  const markAt = (x: number, y: number) => fireEvent.click(screen.getByRole("group", { name: /Léptékpont|Mérési pont/u }), at(x, y));
  const typeLength = (text: string, unit: string) => {
    fireEvent.change(calibrationPanel().getByLabelText("Ismert hossz"), { target: { value: text } });
    fireEvent.click(within(calibrationPanel().getByRole("group", { name: "Ismert hossz egysége" })).getByRole("button", { name: unit }));
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Kész" }));
  };
  const calibrate = () => {
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Lépték megadása" }));
    markAt(.1, .1); markAt(.5, .1);
    typeLength("10", "m");
    markAt(.1, .3); markAt(.3, .3);
    typeLength("5", "m");
  };

  it("accepts a scale two independent references agree on, and fills no calculator field", async () => {
    render(<Harness />);
    await loadPdf();
    calibrate();
    expect(calibrationPanel().getByText(/Lépték igazolva a\(z\) 1\. oldalon/u)).toBeTruthy();
    // 476 pt = 10 000 mm and 238 pt = 5 000 mm are the same scale, so the two references agree exactly.
    expect(calibrationPanel().getByText(/eltérése 0\.00%/u)).toBeTruthy();
    // A calibration is not a transfer: no geometry field may have been touched by it.
    expect([latest.lengthMm, latest.widthMm, latest.pitchDegrees]).toEqual(["", "", ""]);
  });

  it("refuses a second reference that states another scale, and keeps nothing after a re-calibration", async () => {
    render(<Harness />);
    await loadPdf();
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Lépték megadása" }));
    markAt(.1, .1); markAt(.5, .1);
    typeLength("10", "m");
    markAt(.1, .3); markAt(.3, .3);
    typeLength("8", "m");
    expect(calibrationPanel().getByRole("alert").textContent).toMatch(/nem ugyanazt a léptéket/u);
    expect(calibrationPanel().queryByText(/Lépték igazolva/u)).toBeNull();
  });

  it("measures a marked distance and says which reading of a label it supports, without transferring it", async () => {
    render(<Harness />);
    await loadPdf();
    calibrate();
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Méret mérése a rajzon" }));
    // 0.1 of the page width is 119 pt, which at 10 000 mm per 476 pt is 2 500 mm.
    markAt(.1, .5); markAt(.2, .5);
    const panel = () => document.body.textContent ?? "";
    // Taps land on whole pixels, so the marked span is within a pixel of the intended 0.1 of the page width.
    expect(Number(panel().match(/Mért hossz: (\d+) mm/u)![1])).toBeCloseTo(2500, -2);

    // Selecting a label alone does not pair it with the measurement (P1.4.1): being on the same page is not evidence.
    fireEvent.click(hit("90"));
    expect(panel()).toMatch(/még nincs összekapcsolva ezzel a méréssel/u);
    // Only the explicit link evaluates the evidence; "90" read as cm is 900 mm, far from 2 500 mm.
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Összekapcsolás a kijelölt felirattal" }));
    expect(panel()).toMatch(/A mérés egyetlen olvasatot sem támaszt alá/u);
    expect(latest.lengthMm).toBe("");
  });

  it("drops the label-measurement link as soon as a different label is selected (P1.4.1)", async () => {
    render(<Harness />);
    await loadPdf();
    calibrate();
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Méret mérése a rajzon" }));
    markAt(.1, .5); markAt(.2, .5); // ~2 500 mm
    fireEvent.click(hit("90"));
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Összekapcsolás a kijelölt felirattal" }));
    const panel = () => document.body.textContent ?? "";
    expect(panel()).toMatch(/A mérés egyetlen olvasatot sem támaszt alá/u);

    // A different label was never explicitly linked, even though the same measurement is still active.
    fireEvent.click(hit("8,20 m"));
    expect(panel()).toMatch(/még nincs összekapcsolva ezzel a méréssel/u);
  });

  it("keeps a restored calibration active when the matching document is re-attached after an import (P1.3)", async () => {
    render(<Harness />);
    await loadPdf();
    calibrate();
    expect(calibrationPanel().getByText(/Lépték igazolva a\(z\) 1\. oldalon/u)).toBeTruthy();

    let capturedBlob: Blob | null = null;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => { capturedBlob = blob as Blob; return "blob:captured"; });
    fireEvent.click(screen.getByText("További műveletek"));
    fireEvent.click(screen.getByRole("button", { name: "Munkaállapot mentése" }));
    const json = await capturedBlob!.text();
    expect(JSON.parse(json).calibration).not.toBeNull();

    cleanup();
    render(<Harness />);
    const importInput = screen.getByLabelText(/Korábbi munka folytatása/u);
    await act(async () => { fireEvent.change(importInput, { target: { files: [new File([json], "session.json", { type: "application/json" })] } }); });
    await screen.findByText(/Betöltött munka/u);

    // Re-attaching the SAME document (chooseFile's "resuming" path) must not silently drop the restored calibration.
    await loadPdf();
    expect(calibrationPanel().getByText(/Lépték igazolva a\(z\) 1\. oldalon/u)).toBeTruthy();
  });

  it("blocks the detailed transfer when its chosen unit conflicts with the user's own measurement, until acknowledged (P1.4)", async () => {
    render(<Harness />);
    await loadPdf();
    answerPlanKind("Tetőterv");
    calibrate();
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Méret mérése a rajzon" }));
    markAt(.1, .5); markAt(.2, .5); // ~2 500 mm, as in the measurement test above

    fireEvent.click(hit("17,00"));
    // The conflict check only ever sees evidence once the user explicitly links the label to the measurement.
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Összekapcsolás a kijelölt felirattal" }));
    const editor = () => within(screen.getByRole("region", { name: "Felirat hozzárendelése" }));
    const editorText = () => screen.getByRole("region", { name: "Felirat hozzárendelése" }).textContent ?? "";
    fireEvent.change(editor().getByLabelText(/Felirat egysége/u), { target: { value: "m" } });
    fireEvent.change(editor().getByLabelText("Kalkulátormező"), { target: { value: "lengthMm" } });
    // "17,00" read as metres is 17 000 mm, nowhere near the 2 500 mm the user measured on the same page.
    expect(editorText()).toMatch(/Az érték nem egyezik a mért hosszal/u);
    expect(editor().getByRole("button", { name: "Javaslat hozzáadása" })).toHaveProperty("disabled", true);

    fireEvent.click(editor().getByRole("checkbox", { name: /kézi döntésként mégis hozzáadom/u }));
    expect(editor().getByRole("button", { name: "Javaslat hozzáadása" })).toHaveProperty("disabled", false);
    fireEvent.click(editor().getByRole("button", { name: "Javaslat hozzáadása" }));
    const preview = within(screen.getByRole("region", { name: "Átvezetés előnézete" }));
    // The override stays visible as provenance, not a silent reclassification into a measurement-verified value.
    expect(preview.getByText(/mért hossznak ellentmondó, kézi felülbírálás/u)).toBeTruthy();
  });

  it("refuses a measurement too short to be reliable evidence, instead of reporting a confident mm figure", async () => {
    render(<Harness />);
    await loadPdf();
    calibrate();
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Méret mérése a rajzon" }));
    // 476 pt per page width, and CALIBRATION_MIN_SEGMENT_POINTS is 100 pt: 0.01 of the width is well under that.
    markAt(.2, .5); markAt(.21, .5);
    expect(calibrationPanel().queryByText(/Mért hossz:/u)).toBeNull();
    expect(calibrationPanel().getByRole("alert").textContent).toMatch(/túl rövid a megbízható összevetéshez/u);
  });

  it("also blocks the quick one-tap transfer when the tapped label was already linked to a conflicting measurement (P1.4.1)", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection(); // plan answered, section covered, targetFieldKey already "Tető hossza"
    calibrate();
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Méret mérése a rajzon" }));
    markAt(.1, .5); markAt(.2, .5); // ~2 500 mm

    setTarget(/^Nincs/u); // detailed mode, so tapping selects rather than quick-applies
    fireEvent.click(hit("90"));
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Összekapcsolás a kijelölt felirattal" }));

    setTarget(/^Tető hossza/u); // back to quick transfer
    // "90" read as cm is 900 mm, far from the 2 500 mm now explicitly linked to this exact label.
    tapWithUnit("90", "cm");
    expect(message()).toMatch(/ellentmond a hozzá kapcsolt mért hossznak/u);
    expect(latest.lengthMm).toBe("");
  });

  it("gives an unfinished measurement priority over an armed quick-transfer target", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    setTarget(/^Homlokzati kiülés · hátul/u);
    calibrate();
    fireEvent.click(calibrationPanel().getByRole("button", { name: "Méret mérése a rajzon" }));
    markAt(.1, .5); markAt(.2, .5); // ~2 500 mm, never linked to any label

    fireEvent.click(hit("10,00 m"));
    expect(latest.rearGableOverhangMm).toBe("");
    expect(screen.getByRole("region", { name: "Felirat hozzárendelése" }).textContent).toMatch(/10,00 m/u);
    expect(document.body.textContent).toMatch(/még nincs összekapcsolva ezzel a méréssel/u);
    expect((quickBar().getByLabelText("Kitöltendő mező") as HTMLSelectElement).value).toBe("");
  });
});

describe("tap-to-fill from a drawing (P1.1)", () => {
  it("holds an explicit eave-label to roof-width mismatch for a compact confirmation", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    setTarget(/^Tető szélessége/u);
    fireEvent.click(hit("0,50 m ereszkiülés"));

    expect(latest.widthMm).toBe("");
    const confirmation = within(quickBar().getByRole("group", { name: "Kockázatos rajzi átvitel jóváhagyása" }));
    expect(confirmation.getByText(/0,50 m ereszkiülés/u)).toBeTruthy();
    expect(confirmation.getAllByText(/Tető szélessége/u).length).toBeGreaterThan(0);
    expect(confirmation.getByText(/üres → 500 mm/u)).toBeTruthy();
    fireEvent.click(confirmation.getByRole("button", { name: "Mégse" }));
    expect(latest.widthMm).toBe("");

    fireEvent.click(hit("0,50 m ereszkiülés"));
    fireEvent.click(within(quickBar().getByRole("group", { name: "Kockázatos rajzi átvitel jóváhagyása" })).getByRole("button", { name: "Jóváhagyás és átvitel" }));
    expect(latest.widthMm).toBe("500");
    fireEvent.click(screen.getByText(/Átvitt értékek forrása/u));
    expect(screen.getByRole("region", { name: "Jóváhagyott források" }).textContent).toMatch(/szakmai címkeellentmondás kézi jóváhagyása/u);
  });

  it("fills the chosen field from one unambiguous PDF.js label with the answered unit, then moves on", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    tapWithUnit("17,00", "m");

    expect(latest.lengthMm).toBe("17000");
    expect(message()).toMatch(/Tető hossza: 17000 mm · „17,00” \(erre a feliratra választott egység: m\).*következő mező: Tető szélessége/u);
    expect(screen.getByLabelText("Kalkulátor tető hossza, cm")).toHaveProperty("value", "1700");
    fireEvent.click(hit("8,20 m"));
    expect(latest.widthMm).toBe("8200");
  });

  it("asks for the unit of a unitless label and applies it once chosen; a printed unit needs no choice", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    fireEvent.click(hit("17,00"));
    expect(latest.lengthMm).toBe("");
    expect(message()).toMatch(/a rajzon nincs egység/u);
    answerUnit("cm");
    expect(latest.lengthMm).toBe("170");

    setTarget(/^Tető hossza/u);
    fireEvent.click(hit("8,20 m"));
    expect(latest.lengthMm).toBe("170");
    fireEvent.click(within(quickBar().getByRole("group", { name: "Kockázatos rajzi átvitel jóváhagyása" })).getByRole("button", { name: "Jóváhagyás és átvitel" }));
    expect(latest.lengthMm).toBe("8200");
  });

  it("rejects percent slope, compound and dimensionally incompatible labels without touching the draft", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    setTarget(/^Tetőhajlás/u);
    fireEvent.click(hit("4,0%"));
    expect(message()).toMatch(/százalékos lejtés nem fokérték/u);
    fireEvent.click(hit("17,00"));
    expect(message()).toMatch(/egység nélküli, ezért nem illik/u);
    setTarget(/^Tető hossza/u);
    fireEvent.click(hit("30x50"));
    expect(message()).toMatch(/nem egyetlen, egyértelmű méret/u);
    fireEvent.click(hit("35°"));
    expect(message()).toMatch(/mértékegysége nem illik/u);
    expect([latest.lengthMm, latest.pitchDegrees]).toEqual(["", ""]);

    setTarget(/^Tetőhajlás/u);
    fireEvent.click(hit("35°"));
    expect(latest.pitchDegrees).toBe("35");
  });

  it("rejects a room area whose m² superscript is a separate PDF span, in quick and detailed transfer (E-01 QA)", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    fireEvent.click(hit("12,84 m"));
    expect(latest.lengthMm).toBe("");
    expect(message()).toMatch(/felső index/u);

    setTarget(/^Nincs/u);
    fireEvent.click(hit("12,84 m"));
    const editor = within(screen.getByRole("region", { name: "Felirat hozzárendelése" }));
    fireEvent.change(editor.getByLabelText("Kalkulátormező"), { target: { value: "lengthMm" } });
    expect(editor.getByRole("alert").textContent).toMatch(/terület vagy térfogat/u);
    expect(editor.getByRole("button", { name: "Javaslat hozzáadása" })).toHaveProperty("disabled", true);
  });

  it("asks what the page shows first, then holds the transfer until the section is covered (P0-2)", async () => {
    render(<Harness />);
    await loadPdf();
    setTarget(/^Tető hossza/u);
    fireEvent.click(hit("8,20 m"));
    expect(latest.lengthMm).toBe("");
    expect(message()).toMatch(/add meg, mit mutat ez a lap/u);

    answerPlanKind("Alaprajz");
    expect(screen.getByText(/Alaprajz, nem tetőterv/u)).toBeTruthy();
    fireEvent.click(hit("8,20 m"));
    expect(latest.lengthMm).toBe("");
    expect(message()).toMatch(/igazold, hogy tetővel fedett/u);
  });

  it("takes a roof-plan dimension without the covered-roof confirmation once the user declares a roof plan (P0-2)", async () => {
    render(<Harness />);
    await loadPdf();
    answerPlanKind("Tetőterv");
    expect(screen.queryByText(/Alaprajz, nem tetőterv/u)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Szakasz kijelölése a rajzon" }));
    const page = () => screen.getByRole("group", { name: /tetőszakasz kijelölésének/u });
    fireEvent.click(page(), { clientX: 10, clientY: 10 });
    fireEvent.click(page(), { clientX: 60, clientY: 40 });
    fireEvent.change(screen.getByLabelText("Fedettség"), { target: { value: "covered" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /tetővel fedett/u }));
    setTarget(/^Tető hossza/u);
    // A tetőterv a RAJZI HATÓKÖR külön pipáját spórolja meg, a fedettség igazolását nem.
    expect(quickBar().queryByRole("checkbox")).toBeNull();
    fireEvent.click(hit("8,20 m"));
    expect(latest.lengthMm).toBe("8200");
  });

  it("keeps the detailed, separately approved transfer when no target field is chosen", async () => {
    render(<Harness />);
    await loadPdf();
    fireEvent.click(hit("8,20 m"));
    expect(screen.getByRole("region", { name: "Felirat hozzárendelése" })).toBeTruthy();
    expect(latest.lengthMm).toBe("");
  });

  it("routes an OCR label to the detailed editor as an editable candidate, never directly into the draft", async () => {
    render(<Harness />);
    const input = screen.getByLabelText(/PDF vagy kép kiválasztása/u);
    await act(async () => { fireEvent.change(input, { target: { files: [new File(["png"], "demo.png", { type: "image/png" })] } }); });
    const ocr = screen.getByRole("button", { name: "OCR-javaslatok keresése" });
    await waitFor(() => expect(ocr).toHaveProperty("disabled", false));
    await act(async () => { fireEvent.click(ocr); });
    setTarget(/^Tető hossza/u);
    fireEvent.click(await screen.findByRole("button", { name: "Forrásszöveg: 17,00" }));

    expect(latest.lengthMm).toBe("");
    const editor = screen.getByRole("region", { name: "Felirat hozzárendelése" });
    expect(within(editor).getByText(/OCR, 91% confidence/u)).toBeTruthy();
    expect(message()).toMatch(/OCR-felirat/u);
  });

  it("requires confirmation before overwriting a visible previous value and keeps undo in sync", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    fireEvent.change(screen.getByLabelText("Kalkulátor tető hossza, cm"), { target: { value: "300" } });
    expect(latest.lengthMm).toBe("3000");
    setTarget(/^Tető hossza/u);
    fireEvent.click(hit("8,20 m"));
    expect(latest.lengthMm).toBe("3000");
    const confirmation = within(quickBar().getByRole("group", { name: "Kockázatos rajzi átvitel jóváhagyása" }));
    expect(confirmation.getByText(/3000 → 8200 mm/u)).toBeTruthy();
    fireEvent.click(confirmation.getByRole("button", { name: "Jóváhagyás és átvitel" }));
    expect(latest.lengthMm).toBe("8200");

    fireEvent.click(quickBar().getByRole("button", { name: "Visszavonás" }));
    expect(latest.lengthMm).toBe("3000");
    expect(screen.getByLabelText("Kalkulátor tető hossza, cm")).toHaveProperty("value", "300");
    expect(quickBar().queryByRole("button", { name: "Visszavonás" })).toBeNull();
  });

  it("refuses to undo over a value edited after the transfer", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    tapWithUnit("17,00", "m");
    fireEvent.change(screen.getByLabelText("Kalkulátor tető hossza, cm"), { target: { value: "900" } });
    fireEvent.click(quickBar().getByRole("button", { name: "Visszavonás" }));
    expect(latest.lengthMm).toBe("9000");
    expect(message()).toMatch(/módosult/u);
  });

  it("lets one label's unit be re-chosen afterwards and keeps that choice undoable", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    tapWithUnit("17,00", "m");
    fireEvent.click(within(quickBar().getByRole("group", { name: "Ennek a feliratnak az egysége" })).getByRole("button", { name: "cm" }));
    expect(latest.lengthMm).toBe("170");
    expect(message()).toMatch(/erre a feliratra választott egység: cm/u);
    fireEvent.click(quickBar().getByRole("button", { name: "Visszavonás" }));
    expect(latest.lengthMm).toBe("");
  });

  it("keeps two roof sections apart: values, undo history and section switches never cross", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    tapWithUnit("17,00", "m");
    expect(latest.lengthMm).toBe("17000");

    fireEvent.click(screen.getByRole("button", { name: "Új tetőszakasz" }));
    expect(latest.lengthMm).toBe("");
    expect(quickBar().queryByRole("button", { name: "Visszavonás" })).toBeNull();
    coverActiveSection();
    tapWithUnit("6,00", "m");
    expect(latest.lengthMm).toBe("6000");

    fireEvent.click(screen.getByRole("button", { name: /^Tetőszakasz 1 ·/u }));
    expect(latest.lengthMm).toBe("17000");
    expect(quickBar().queryByRole("button", { name: "Visszavonás" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Tetőszakasz 2 ·/u }));
    expect(latest.lengthMm).toBe("6000");
  });

  it("drops undo history, chosen units, the page answer and plan confirmation when another PDF is chosen", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    tapWithUnit("17,00", "m");
    expect(quickBar().getByRole("list", { name: "Általad választott egységű értékek" })).toBeTruthy();
    await loadPdf("demo-b.pdf");

    expect(quickBar().queryByRole("button", { name: "Visszavonás" })).toBeNull();
    expect(quickBar().queryByRole("list", { name: "Általad választott egységű értékek" })).toBeNull();
    expect(screen.getByRole("group", { name: "A lap típusa" })).toBeTruthy();
    setTarget(/^Tető hossza/u);
    fireEvent.click(hit("8,20 m"));
    expect(latest.lengthMm).toBe("");
    expect(message()).toMatch(/add meg, mit mutat ez a lap/u);
  });

  it("asks which label is meant when overlapping labels sit under the tap", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    // (0.13, 0.11) lies inside both the "17,00" and the overlapping "3,85" label.
    fireEvent.click(hit("17,00"), at(.13, .11));
    expect(latest.lengthMm).toBe("");
    const choices = within(quickBar().getByRole("group", { name: "Egymást átfedő feliratok" }));
    fireEvent.click(choices.getByRole("button", { name: "3,85" }));
    answerUnit("m");
    expect(latest.lengthMm).toBe("3850");

    setTarget(/^Tető hossza/u);
    fireEvent.click(hit("6,00"), at(.32, .51));
    // P0-1: the unit answered for "3,85" is not reused for another label, so this one asks again.
    expect(latest.lengthMm).toBe("3850");
    answerUnit("m");
    expect(latest.lengthMm).toBe("3850");
    fireEvent.click(within(quickBar().getByRole("group", { name: "Kockázatos rajzi átvitel jóváhagyása" })).getByRole("button", { name: "Jóváhagyás és átvitel" }));
    expect(latest.lengthMm).toBe("6000");
  });

  it("asks instead of letting the painting order decide when a tap lands in the overlap of two sense zones (P0-3)", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    // (0.18, 0.12) is past the right edge of both "17,00" (x .10–.15) and "3,85" (x .12–.17), yet inside both
    // 44 px zones: the margin where whichever button is painted last would otherwise receive the click.
    fireEvent.click(hit("17,00"), at(.18, .12));
    expect(latest.lengthMm).toBe("");
    const choices = within(quickBar().getByRole("group", { name: "Egymást átfedő feliratok" }));
    expect(choices.getAllByRole("button").map((button) => button.textContent)).toEqual(["17,00", "3,85"]);

    // The button — and with it the 44 px zone that grows around it — is centred on the label, not anchored to its
    // top-left corner: a corner-anchored box grew down and right of small text, into the next dimension row's zone.
    expect(hit("17,00").style).toMatchObject({ left: "12.5%", top: "11%", transform: "translate(-50%, -50%)" });

    // A tap inside one label's zone only goes straight through — to that label, not to the button that fired.
    fireEvent.click(hit("17,00"), at(.37, .51));
    answerUnit("m");
    expect(latest.lengthMm).toBe("6000");
    expect(message()).toMatch(/„6,00”/u);
  });

  it("keeps keyboard focus on the activated label button after a transfer", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    tapWithUnit("6,00", "m");
    setTarget(/^Tető hossza/u);
    const button = hit("17,00");
    button.focus();
    fireEvent.click(button);
    expect(document.activeElement).toBe(hit("17,00"));
  });
});

describe("result strip (P3.3a)", () => {
  const strip = () => screen.queryByRole("region", { name: "Számított eredmény előnézete" });
  const todo = () => within(screen.getByRole("region", { name: "Teendők és figyelmeztetések" }));
  const lengthBox = (label: string) => todo().getByLabelText(new RegExp(`^${label},`, "u")) as HTMLInputElement;

  it("stays hidden while no geometry is computed, then reports the area next to the drawing", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    expect(strip()).toBeNull();

    // A vezetett bekérés egy mezőt kérdez egyszerre; a LengthField alapértelmezett egysége cm.
    acceptAllDefaults(todo());
    fireEvent.change(lengthBox("Tető hossza"), { target: { value: "1000" } });
    fireEvent.change(lengthBox("Tető szélessége"), { target: { value: "600" } });
    fireEvent.change(todo().getByLabelText("Tetőhajlás"), { target: { value: "35" } });
    expect([latest.lengthMm, latest.widthMm, latest.pitchDegrees]).toEqual(["10000", "6000", "35"]);

    // Ugyanaz a szám, amit a részletes geometriai blokk is mutat erre a 10,00 × 6,00 m, 35°-os tetőre.
    expect(strip()!.textContent).toMatch(/Tetőfelület\s*73,25 m²/u);
    // Az anyagparaméterek nélkül ez nem kész eredmény, és a csík ezt kiírja.
    expect(strip()!.textContent).toMatch(/Hiányos · előnézet/u);
    expect(strip()!.textContent).toMatch(/nem beszerzési mennyiség/u);
  });

  it("does not take over the detailed result block, the warnings or the save gate", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    // A csík mellett az alapérték-kártya változatlanul ott van, amíg nincs jóváhagyva.
    expect(todo().getByRole("group", { name: "Megerősítendő alapértékek" })).toBeTruthy();
    acceptAllDefaults(todo());
    fireEvent.change(lengthBox("Tető hossza"), { target: { value: "1000" } });
    fireEvent.change(lengthBox("Tető szélessége"), { target: { value: "600" } });
    fireEvent.change(todo().getByLabelText("Tetőhajlás"), { target: { value: "35" } });

    expect(strip()).toBeTruthy();
    expect(screen.getByRole("region", { name: "Teendők és figyelmeztetések" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /teljes épület tetejét lefedi/u })).toBeTruthy();
    // A csík nem szerkeszthető, és egyetlen navigációs lehetőséget ad a teljes eredményhez.
    expect(within(strip()!).queryAllByRole("textbox").length).toBe(0);
    expect(within(strip()!).getAllByRole("button").map((button) => button.textContent)).toEqual(["Teljes eredmény"]);
  });

  it("a hibás érték eltünteti a csíkot, nem hagyja ott a korábbi felületet", async () => {
    render(<Harness />);
    await loadPdf();
    coverActiveSection();
    acceptAllDefaults(todo());
    fireEvent.change(lengthBox("Tető hossza"), { target: { value: "1000" } });
    fireEvent.change(lengthBox("Tető szélessége"), { target: { value: "600" } });
    fireEvent.change(todo().getByLabelText("Tetőhajlás"), { target: { value: "35" } });
    expect(strip()!.textContent).toMatch(/73,25 m²/u);

    // A kalkulátorűrlap felől kiürített kötelező méret: a csík eltűnik, nem hagyja ott a 73,25 m²-t.
    const formLength = () => screen.getByLabelText(/^Kalkulátor tető hossza,/u);
    fireEvent.change(formLength(), { target: { value: "" } });
    expect(latest.lengthMm).toBe("");
    expect(strip()).toBeNull();

    // Javítás után visszatér, a friss értékkel.
    fireEvent.change(formLength(), { target: { value: "2000" } });
    expect(strip()!.textContent).toMatch(/146,49 m²/u);
  });
});

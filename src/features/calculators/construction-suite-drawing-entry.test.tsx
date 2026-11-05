// @vitest-environment jsdom
/**
 * T10.1: a „Rajzból indítok” belépési pont és a kalkulátorváltás életciklusa a VALÓDI `ConstructionCalculatorSuite`-on.
 * `organizationId`/`userId` nélkül a mentési és átvételi panelek nem renderelődnek, így a Supabase-határ nem kerül bele.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { DrawingTextSource } from "@/infrastructure/drawings/drawing-text-source";

const confirmation = vi.hoisted(() => ({ accepted: true, calls: [] as { title: string; message: string }[] }));
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("@/components/feedback/app-interaction-provider", () => ({
  useAppInteraction: () => ({
    notify: vi.fn(), registerGuard: vi.fn(), requestNavigation: vi.fn(), hasUnsavedChanges: false, hasPendingChanges: false,
    requestConfirmation: async (options: { title: string; message: string }) => { confirmation.calls.push({ title: options.title, message: options.message }); return confirmation.accepted; },
  }),
  useUnsavedChangeGuard: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
// A mentési és átvételi panelek szerveroldali action-láncot húznak be (`server-only`); itt nem renderelődnek.
vi.mock("@/features/calculations/construction-actions", () => ({ saveConstructionCalculationAction: vi.fn() }));
vi.mock("@/features/execution/execution-document-link-actions", () => ({ linkExecutionPlanDocumentAction: vi.fn(), unlinkExecutionPlanDocumentAction: vi.fn(), createExecutionPlanAndLinkDocumentAction: vi.fn() }));

const span = (originalText: string, x: number, y: number, pageNumber = 1): DrawingTextSource => ({
  sourceDocumentId: "demo-doc", pageNumber, originalText, normalizedText: originalText, tokens: [], method: "pdf-text",
  engine: "pdfjs-dist@6.4.299", confidence: null, uncertainty: "unknown",
  rotationDegrees: 0, position: { x, y }, bounds: { x, y, width: .05, height: .02 },
});
vi.mock("@/infrastructure/drawings/pdf-text-extractor", () => ({
  processPdfDocument: vi.fn(async () => ({
    sourceDocumentId: "demo-doc", pageCount: 2,
    pages: [
      { pageNumber: 1, widthPoints: 1190, heightPoints: 842, rotationDegrees: 0, textSpans: [span("17,00", .1, .1), span("8,20 m", .3, .1)] },
      { pageNumber: 2, widthPoints: 1190, heightPoints: 842, rotationDegrees: 0, textSpans: [span("5,00", .2, .2, 2)] },
    ],
  })),
}));
vi.mock("@/infrastructure/drawings/pdf-preview", () => ({ renderPdfPage: vi.fn(async () => undefined) }));
vi.mock("@/infrastructure/drawings/ocr", () => ({ recognizeImage: vi.fn(async () => []), recognizePdfPage: vi.fn(async () => []) }));

import { ConstructionCalculatorSuite } from "./construction-suite";
import { forgetWorkspace, rememberWorkspace, workspaceKey } from "./construction-workspace-memory";

const TAKEOFF = /Tetőanyag-kimutatás/u;
const TIMBER = /Tetőszerkezet faanyag/u;

const [pageWidth, pageHeight] = [375, 531];
const at = (x: number, y: number) => ({ clientX: Math.round(x * pageWidth), clientY: Math.round(y * pageHeight) });
const objectUrls = { created: [] as string[], revoked: [] as string[] };
beforeEach(() => {
  confirmation.accepted = true; confirmation.calls = [];
  router.replace.mockClear(); router.push.mockClear();
  objectUrls.created = []; objectUrls.revoked = [];
  let n = 0;
  // A rajzlap valódi renderelt mérete (telefonszélesség, A4-arány): a kalibrációs kattintás ebből számol oldalpontot.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: pageWidth, height: pageHeight, right: pageWidth, bottom: pageHeight, x: 0, y: 0, toJSON: () => ({}) });
  vi.stubGlobal("URL", Object.assign(Object.create(URL), {
    createObjectURL: () => { const url = `blob:demo-${++n}`; objectUrls.created.push(url); return url; },
    revokeObjectURL: (url: string) => { objectUrls.revoked.push(url); },
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const heading = () => screen.getByRole("heading", { level: 2 }).textContent ?? "";
const fileName = () => document.querySelector(".plan-file-name")?.textContent ?? null;
/** P3.7: a rajzos munka a kiválasztott kalkulátor munkaterületén, a módválasztóból indul. */
const modeChooser = () => screen.getByRole("region", { name: "Adatbeviteli mód" });
const chooseMode = (name: RegExp) => fireEvent.click(within(modeChooser()).getByRole("button", { name }));
const startFromDrawing = () => chooseMode(/Tervrajzból dolgozom/u);
let rerenderSuite: ReturnType<typeof render>["rerender"];
/** Route prop update models an existing direct link; legacy tools are absent from normal roof navigation. */
const chooseTask = (name: RegExp) => rerenderSuite(<ConstructionCalculatorSuite initialCalculatorId={name === TIMBER ? "roof.timber-cutlist" : "roof.material-takeoff"} />);
const chooseGable = () => fireEvent.click(screen.getByRole("button", { name: /Nyeregtető/u }));
const completeGableGeometry = () => {
  fireEvent.change(document.querySelector("#lengthMm")!, { target: { value: "10000" } });
  fireEvent.change(document.querySelector("#widthMm")!, { target: { value: "6000" } });
  fireEvent.change(document.querySelector("#pitchDegrees")!, { target: { value: "35" } });
  fireEvent.change(document.querySelector("#eaveOverhangMm")!, { target: { value: "0" } });
};
const materialInput = (group: string, label: string) => document.querySelector<HTMLInputElement>(`fieldset[data-group="${group}"] input[aria-label^="${label}"]`);

async function renderSuite() {
  rerenderSuite = render(<ConstructionCalculatorSuite initialCalculatorId="roof.rafter-cut" />).rerender;
  await screen.findByRole("heading", { level: 2 });
}
async function loadImage(name = "DEMO.png") {
  const input = screen.getByLabelText(/PDF vagy kép kiválasztása/u);
  await act(async () => { fireEvent.change(input, { target: { files: [new File(["x"], name, { type: "image/png" })] } }); });
  await waitFor(() => expect(fileName()).toBe(name));
}
async function loadPdf(name = "DEMO-terv.pdf") {
  const input = screen.getByLabelText(/PDF vagy kép kiválasztása/u);
  await act(async () => { fireEvent.change(input, { target: { files: [new File([name], name, { type: "application/pdf" })] } }); });
  await screen.findByRole("button", { name: "Forrásszöveg: 17,00" });
}

describe("P3.7 — adatbeviteli mód a kalkulátor kiválasztása UTÁN", () => {
  it("a kalkulátorváltás frissíti az URL-t, megőrzi a többi query paramétert és az aktív állapotot", async () => {
    window.history.replaceState({}, "", "/kalkulatorok?organization=demo&calculator=roof.timber-cutlist&source=keep");
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.timber-cutlist" />);
    await screen.findByRole("heading", { level: 2 });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: "Tetők és faszerkezetek" })); });

    const [href, options] = router.push.mock.calls.at(-1) ?? [];
    const nextUrl = document.createElement("a");
    nextUrl.href = String(href);
    const params = new URLSearchParams(nextUrl.search);
    expect(nextUrl.pathname).toBe("/kalkulatorok");
    expect(params.get("organization")).toBe("demo");
    expect(params.get("source")).toBe("keep");
    expect(params.get("calculator")).toBe("roof.material-takeoff");
    expect(options).toEqual({ scroll: false });
    expect(heading()).toBe("Tető típus választása");
    expect(document.querySelector(".construction-suite-list")).toBeNull();
  });

  it("a normál tetőmunkában a forma az első döntés, kalkulátorlista nélkül", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });

    expect(heading()).toBe("Tető típus választása");
    expect(document.querySelector(".construction-suite-list")).toBeNull();
    expect(document.querySelector(".construction-suite-mobile-picker")).toBeNull();
    expect(screen.queryByText("További szakmai eszközök")).toBeNull();
    expect(screen.getByRole("region", { name: "Tetőforma kiválasztása" })).toBeTruthy();
  });

  it("a tetőforma-választón csak az egyetlen kért cím jelenik meg", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });

    expect(heading()).toBe("Tető típus választása");
    expect(screen.queryByText("Tetőanyag-kimutatás")).toBeNull();
    expect(screen.queryByText("Milyen tetőt szeretnél számolni?")).toBeNull();
    expect(screen.queryByText("A forma alapján jelennek meg a szükséges méretek.")).toBeNull();
  });

  it("új tetőmunka régi munkatér-emlék után is a központi kalkulátorral indul", async () => {
    const key = workspaceKey("demo-user", "demo-org", null);
    rememberWorkspace(key, { selectedId: "roof.timber-cutlist", category: "roof", drafts: {}, lengthDrafts: {}, dirtyDrafts: {}, materialByCalculator: {}, sessions: {}, draftEpoch: 0 });
    try {
      render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" organizationId="demo-org" userId="demo-user" />);
      await screen.findByRole("heading", { level: 2 });
      expect(heading()).toBe("Tető típus választása");
      expect(screen.getByRole("region", { name: "Tetőforma kiválasztása" })).toBeTruthy();
    } finally { forgetWorkspace(key); }
  });

  it("az új geometria-alapú tetőmunka előbb tetőformát kér, nem indít implicit nyeregtetőt", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });

    expect(screen.getByRole("region", { name: "Tetőforma kiválasztása" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Adatbeviteli mód" })).toBeNull();
    expect(document.querySelector("#construction-geometry-inputs")).toBeNull();
    expect(screen.queryByText(/A tetőforma még nincs kiválasztva/u)).toBeNull();
  });

  it("a tetőforma-választó rövid, döntést segítő jelzéseket használ", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });

    expect(screen.queryByText(/Geometria és síkonkénti kiosztás/u)).toBeNull();
    expect(screen.getAllByText("Alátétfólia · korlátozott")).toHaveLength(4);
    expect(within(screen.getByRole("region", { name: "Tetőforma kiválasztása" })).getAllByRole("button", { pressed: false })).toHaveLength(9);
  });

  it("the eight roof cards use their matching decorative 3D illustration", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });

    for (const [label, shape] of [["Nyeregtető", "gable"], ["Félnyeregtető", "shed"], ["Kontytető", "hip"], ["Sátortető", "pyramid"], ["Félkontytető", "halfHip"], ["L alaprajzú tető", "lShape"], ["T alaprajzú tető", "tShape"], ["Manzárdtető", "mansard"]]) {
      const card = screen.getByRole("button", { name: new RegExp(label, "u") });
      const art = card.querySelector(".roof-shape-art");
      const image = art?.querySelector("img");
      expect(image?.getAttribute("src")).toBe(`/images/roof-shapes/${shape}.webp`);
      expect(image?.getAttribute("alt")).toBe("");
      expect(art?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("every roof shape advances to input mode with its selected shape retained", async () => {
    rerenderSuite = render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />).rerender;
    for (const [label, shape] of [["Nyeregtető", "gable"], ["Félnyeregtető", "shed"], ["Kontytető", "hip"], ["Sátortető", "pyramid"], ["Félkontytető", "halfHip"], ["L alaprajzú tető", "lShape"], ["T alaprajzú tető", "tShape"], ["Manzárdtető", "mansard"]]) {
      rerenderSuite(<ConstructionCalculatorSuite key={shape} initialCalculatorId="roof.material-takeoff" />);
      await screen.findByRole("heading", { level: 2 });
      fireEvent.click(screen.getByRole("button", { name: new RegExp(label, "u") }));
      expect(modeChooser()).toBeTruthy();
      expect(screen.getByText(`Tetőforma: ${label}`)).toBeTruthy();
    }
  });

  it("a forma kiválasztása után nyitja meg a meglévő rajz/kézi módválasztást", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });

    fireEvent.click(screen.getByRole("button", { name: /Nyeregtető/u }));

    expect(screen.queryByRole("region", { name: "Tetőforma kiválasztása" })).toBeNull();
    expect(screen.getByRole("region", { name: "Adatbeviteli mód" })).toBeTruthy();
    expect(screen.getByText(/Tetőforma: Nyeregtető/u)).toBeTruthy();
  });

  it("kézi úton opcionális ereszkiülést mutat a nyeregtető geometriájánál", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });
    chooseGable();
    chooseMode(/Kézzel adom meg/u);

    expect(screen.getByRole("region", { name: "Geometriai adatbevitel" })).toBeTruthy();
    expect(screen.getByText(/Következő szükséges adat/u)).toBeTruthy();
    expect(document.querySelector("#construction-material-inputs")).toBeNull();
    expect((document.querySelector("#eaveOverhangMm") as HTMLInputElement).value).toBe("");
    expect(document.querySelector("#eaveOverhangMm")?.hasAttribute("required")).toBe(false);
    expect(document.body.textContent).toContain("Vízszintes ereszkiülés (opcionális)");
  });

  it("a forma váltása frissíti a látható geometriai mezőket", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });
    chooseGable();
    chooseMode(/Kézzel adom meg/u);

    fireEvent.change(document.querySelector("#roofShape")!, { target: { value: "pyramid" } });

    expect(document.querySelector("#sideMm")).toBeTruthy();
    expect(document.querySelector("#lengthMm")).toBeNull();
    expect(document.querySelector("#frontGableOverhangMm")).toBeNull();
  });

  it("a manzárd érvénytelen geometriájának hibáját csak egyszer jeleníti meg", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });
    chooseGable();
    chooseMode(/Kézzel adom meg/u);
    fireEvent.change(document.querySelector("#roofShape")!, { target: { value: "mansard" } });
    fireEvent.change(document.querySelector("#lengthMm")!, { target: { value: "1200" } });
    fireEvent.change(document.querySelector("#widthMm")!, { target: { value: "800" } });
    fireEvent.change(document.querySelector("#lowerRunMm")!, { target: { value: "250" } });
    fireEvent.change(document.querySelector("#lowerRiseMm")!, { target: { value: "280" } });
    fireEvent.change(document.querySelector("#upperRiseMm")!, { target: { value: "180" } });

    expect(screen.getAllByText("A manzárd alsó szakasza legyen meredekebb a felsőnél.")).toHaveLength(1);
  });

  it("a valid geometria önmagában eredmény, anyagcsoport nélkül nem jelenik meg hiányos anyagként", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });
    chooseGable();
    chooseMode(/Kézzel adom meg/u);
    completeGableGeometry();

    expect(screen.getByRole("heading", { name: "Geometriai eredmények" })).toBeTruthy();
    expect(screen.getAllByText(/A tetőfelület kiszámítható/u).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Válassz legalább egy számítandó anyagcsoportot/u)).toBeNull();
    expect(screen.getByRole("group", { name: /Mit szeretnél még kiszámolni/u })).toBeTruthy();
    expect(document.querySelector("fieldset[data-group]")).toBeNull();
  });

  it("csak fóliánál kizárólag a fólia-paraméterek jelennek meg", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });
    chooseGable();
    chooseMode(/Kézzel adom meg/u);
    completeGableGeometry();
    fireEvent.click(screen.getByRole("switch", { name: "Alátétfólia" }));

    expect(document.querySelector('fieldset[data-group="underlay"]')).toBeTruthy();
    expect(document.querySelector('fieldset[data-group="rafter"]')).toBeNull();
    expect(document.querySelector('fieldset[data-group="batten"]')).toBeNull();
    expect(document.querySelector('fieldset[data-group="covering"]')).toBeNull();
    expect(materialInput("underlay", "Alátétfólia · Tekercs szélessége")).toBeTruthy();
  });

  it("csak timbernél a támogatott faanyag-beállítások jelennek meg", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });
    chooseGable();
    chooseMode(/Kézzel adom meg/u);
    completeGableGeometry();
    fireEvent.click(screen.getByRole("switch", { name: "Faanyag — szarufa és léc" }));

    expect(document.querySelector('fieldset[data-group="rafter"]')).toBeTruthy();
    expect(document.querySelector('fieldset[data-group="batten"]')).toBeTruthy();
    expect(document.querySelector('fieldset[data-group="underlay"]')).toBeNull();
    expect(document.querySelector('fieldset[data-group="covering"]')).toBeNull();
    expect(materialInput("rafter", "Szarufa keresztmetszet · opcionális · Keresztmetszet szélessége")).toBeTruthy();
  });

  it("csak fedésnél kizárólag a fedési paraméterek jelennek meg", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });
    chooseGable();
    chooseMode(/Kézzel adom meg/u);
    completeGableGeometry();
    fireEvent.click(screen.getByRole("switch", { name: "Fedőanyag" }));

    expect(document.querySelector('fieldset[data-group="covering"]')).toBeTruthy();
    expect(document.querySelector('fieldset[data-group="rafter"]')).toBeNull();
    expect(document.querySelector('fieldset[data-group="batten"]')).toBeNull();
    expect(document.querySelector('fieldset[data-group="underlay"]')).toBeNull();
    expect(materialInput("covering", "Fedőtábla · Tábla névleges szélessége")).toBeTruthy();
  });

  it("több csoport választható, kikapcsoláskor a beállítás megmarad, visszakapcsoláskor visszatér", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });
    chooseGable();
    chooseMode(/Kézzel adom meg/u);
    completeGableGeometry();
    fireEvent.click(screen.getByRole("switch", { name: "Alátétfólia" }));
    fireEvent.click(within(document.querySelector('fieldset[data-group="underlay"]')!).getByRole("button", { name: "Kézi megadás" }));
    fireEvent.change(materialInput("underlay", "Alátétfólia · Tekercs szélessége")!, { target: { value: "1500" } });
    fireEvent.click(screen.getByRole("switch", { name: "Fedőanyag" }));
    expect(document.querySelector('fieldset[data-group="underlay"]')).toBeTruthy();
    expect(document.querySelector('fieldset[data-group="covering"]')).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: "Alátétfólia" }));
    expect(document.querySelector('fieldset[data-group="underlay"]')).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: "Alátétfólia" }));
    expect(materialInput("underlay", "Alátétfólia · Tekercs szélessége")?.value).toBe("1500");
  });

  it("a még nem azonosított forma nem ad számítható tetőmunkát és nem választ gable-t", async () => {
    render(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    await screen.findByRole("heading", { level: 2 });

    fireEvent.click(screen.getByRole("button", { name: /Még nem tudom/u }));

    expect(screen.getByText(/A számítás addig nem indul el/u)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Adatbeviteli mód" })).toBeNull();
    expect(document.querySelector("#construction-geometry-inputs")).toBeNull();
  });

  it("az önálló szarufa-kiszabás továbbra is forma nélkül indul", async () => {
    await renderSuite();

    expect(heading()).toMatch(/Szarufa kiszabása/u);
    expect(modeChooser()).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Tetőforma kiválasztása" })).toBeNull();
  });

  it("a két korábbi felső belépési gomb megszűnt", async () => {
    await renderSuite();
    expect(screen.queryByRole("group", { name: "Hogyan kezded a munkát" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Rajzból indítok/u })).toBeNull();
    expect(screen.queryByRole("button", { name: /Kalkulátort választok/u })).toBeNull();
    expect(document.querySelector(".construction-suite-list-label")).toBeNull();
  });

  it("tetős kalkulátornál előbb a módválasztó jön, űrlap, eredmény és rajzpanel nélkül", async () => {
    await renderSuite();
    expect(heading()).toMatch(/Szarufa kiszabása/u);
    expect(modeChooser()).toBeTruthy();
    // Mód nélkül nincs űrlap, nincs eredmény és nincs rajzpanel — egyetlen kérdés áll a képernyőn.
    expect(document.querySelector("#construction-geometry-inputs")).toBeNull();
    expect(document.querySelector("details.plan-field-transfer")).toBeNull();
    expect(document.querySelector("#construction-results")).toBeNull();
  });

  it("a „Kézzel adom meg” a megszokott űrlapot adja, rajzpanel nélkül", async () => {
    await renderSuite();
    await act(async () => { chooseMode(/Kézzel adom meg/u); });
    expect(document.querySelector("#construction-geometry-inputs")).toBeTruthy();
    expect(document.querySelector("details.plan-field-transfer")).toBeNull();
    expect(screen.queryByRole("region", { name: "Adatbeviteli mód" })).toBeNull();
  });

  it("a „Tervrajzból dolgozom” a meglévő rajzpanelt nyitja meg, nyitva", async () => {
    await renderSuite();
    await act(async () => { startFromDrawing(); });
    expect(document.querySelector("details.plan-field-transfer")?.hasAttribute("open")).toBe(true);
    await loadPdf();
    expect(fileName()).toBe("DEMO-terv.pdf");
  });

  it("a mód kalkulátoronként külön él, és a váltás nem kér felesleges megerősítést", async () => {
    await renderSuite();
    await act(async () => { chooseMode(/Kézzel adom meg/u); });
    // Másik kalkulátor: újra a saját kérdését teszi fel.
    await act(async () => { chooseTask(TAKEOFF); });
    await act(async () => { chooseGable(); });
    expect(heading()).toMatch(TAKEOFF);
    expect(modeChooser()).toBeTruthy();
    // Rajz nélkül a kézi módra váltás adatvesztés nélküli, tehát nincs megerősítés.
    await act(async () => { startFromDrawing(); });
    const switchBack = () => screen.getByRole("button", { name: "Váltás kézi bevitelre" });
    await act(async () => { fireEvent.click(switchBack()); });
    expect(confirmation.calls).toHaveLength(0);
    expect(document.querySelector("details.plan-field-transfer")).toBeNull();
  });

  it("nyitott rajznál a kézi módra váltás megerősítést kér, és elutasítva a rajz marad", async () => {
    await renderSuite();
    await act(async () => { startFromDrawing(); });
    await loadPdf();
    confirmation.accepted = false;
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Váltás kézi bevitelre" })); });
    expect(confirmation.calls).toHaveLength(1);
    expect(fileName()).toBe("DEMO-terv.pdf");

    confirmation.accepted = true;
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Váltás kézi bevitelre" })); });
    expect(document.querySelector("details.plan-field-transfer")).toBeNull();
    expect(document.querySelector("#construction-geometry-inputs")).toBeTruthy();
  });

  it("nyitott rajznál a másik tetős kalkulátor sem kérdez újra (T10 dokumentumállapot)", async () => {
    await renderSuite();
    await act(async () => { startFromDrawing(); });
    await loadPdf();
    await act(async () => { chooseTask(TIMBER); });
    // A rajz közös és túléli a váltást, ezért a mód adott: nincs újabb kérdés, a panel nyitva van.
    expect(screen.queryByRole("region", { name: "Adatbeviteli mód" })).toBeNull();
    expect(fileName()).toBe("DEMO-terv.pdf");
  });

  it("nem tetős kalkulátornál nincs módválasztó, az űrlap azonnal jön", async () => {
    await renderSuite();
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lépcsők/u })); });
    expect(screen.queryByRole("region", { name: "Adatbeviteli mód" })).toBeNull();
    expect(document.querySelector("details.plan-field-transfer")).toBeNull();
    expect(document.querySelector(".construction-suite-workspace")).toBeTruthy();
  });
});

describe("T10 — A → B → A kalkulátorváltás nyitott rajzzal", () => {
  it("megőrzi a rajzot, az oldalválaszt és a szakaszt, és nem szivárogtat kalkulátoradatot", async () => {
    await renderSuite();
    // P3.7: előbb a szakmai feladat (a szakaszkezelés ma a tetőanyag-kimutatáshoz tartozik), utána a rajzos mód.
    await act(async () => { chooseTask(TAKEOFF); });
    await act(async () => { chooseGable(); });
    await act(async () => { startFromDrawing(); });
    await loadPdf();

    // A: a lap típusa és egy szakasz a tetőanyag-kimutatásban.
    fireEvent.click(within(screen.getByRole("group", { name: "A lap típusa" })).getByRole("button", { name: "Tetőterv" }));
    const sectionChip = () => within(screen.getByLabelText("Tetőszakaszok")).getAllByRole("button")[0]!.textContent;
    const chipBefore = sectionChip();
    expect(chipBefore).toMatch(/Tetőszakasz 1/u);

    // A kalkulátor saját mezője kap értéket — ennek B-ben nem szabad megjelennie.
    const geometryInputs = () => [...document.querySelectorAll<HTMLInputElement>("#construction-geometry-inputs input:not([type=checkbox])")];
    const first = geometryInputs()[0];
    expect(first).toBeTruthy();
    const ownField = first!.id;
    await act(async () => { fireEvent.change(first!, { target: { value: "8237" } }); });
    expect(geometryInputs().some((input) => input.value === "8237")).toBe(true);

    await act(async () => { chooseTask(TIMBER); });
    expect(heading()).toMatch(TIMBER);
    // D + P megmaradt.
    expect(fileName()).toBe("DEMO-terv.pdf");
    expect(screen.getByRole("button", { name: "Forrásszöveg: 17,00" })).toBeTruthy();
    // A lap típusa a dokumentumhoz tartozik: nem kérdezi újra.
    expect(screen.queryByRole("group", { name: "A lap típusa" })).toBeNull();
    // C: a másik kalkulátor mezőértéke nem jelenik meg itt — sem a mezőben, sem más mezőkulcs alatt.
    expect(geometryInputs().some((input) => input.value === "8237")).toBe(false);

    await act(async () => { chooseTask(TAKEOFF); });
    expect(heading()).toMatch(TAKEOFF);
    expect(fileName()).toBe("DEMO-terv.pdf");
    // S-geo: ugyanaz a szakasz, ugyanazzal a névvel.
    expect(sectionChip()).toBe(chipBefore);
    // C: a saját kalkulátorába visszatérve a mezőérték visszajön.
    expect(document.querySelector<HTMLInputElement>(`#${ownField}`)?.value).toBe("8237");
  });

  it("a kalkulátorváltás nem von vissza élő Object URL-t", async () => {
    await renderSuite();
    await act(async () => { startFromDrawing(); });
    await loadImage();
    const live = objectUrls.created.at(-1)!;

    await act(async () => { chooseTask(TIMBER); });

    expect(fileName()).toBe("DEMO.png");
    expect(objectUrls.revoked).not.toContain(live);
    expect(document.querySelector<HTMLImageElement>(".plan-field-transfer-body img")?.src).toContain(live);
  });
});

describe("T10 — adatvesztési megerősítések és erőforrás-felszabadítás", () => {
  it("az „Új kalkuláció” megnevezi a rajz elvesztését, és elfogadás után elengedi a dokumentumot", async () => {
    await renderSuite();
    await act(async () => { startFromDrawing(); });
    await loadImage();
    const live = objectUrls.created.at(-1)!;
    confirmation.calls = [];

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Új kalkuláció" })); });

    const asked = confirmation.calls.find((call) => call.title === "Új kalkuláció");
    expect(asked?.message).toMatch(/tervrajzot/u);
    expect(asked?.message).toMatch(/tetőszakasz/u);
    await waitFor(() => expect(fileName()).toBeNull());
    // S5: az elengedett dokumentum Object URL-je felszabadul.
    await waitFor(() => expect(objectUrls.revoked).toContain(live));
  });

  it("dokumentumbezáráskor felszabadítja az Object URL-t", async () => {
    await renderSuite();
    await act(async () => { startFromDrawing(); });
    await loadImage();
    const live = objectUrls.created.at(-1)!;

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Fájl és javaslatok elvetése/u })); });

    await waitFor(() => expect(fileName()).toBeNull());
    await waitFor(() => expect(objectUrls.revoked).toContain(live));
  });

  it("forráscserénél az előző Object URL felszabadul, az új pedig él", async () => {
    await renderSuite();
    await act(async () => { startFromDrawing(); });
    await loadImage("DEMO-elso.png");
    const previous = objectUrls.created.at(-1)!;

    await loadImage("DEMO-masodik.png");

    expect(confirmation.calls.some((call) => call.title === "Új rajz megnyitása")).toBe(true);
    expect(fileName()).toBe("DEMO-masodik.png");
    const next = objectUrls.created.at(-1)!;
    expect(next).not.toBe(previous);
    await waitFor(() => expect(objectUrls.revoked).toContain(previous));
    expect(objectUrls.revoked).not.toContain(next);
  });

  it("elutasított megerősítés után a rajz érintetlen marad", async () => {
    await renderSuite();
    await act(async () => { startFromDrawing(); });
    await loadImage();
    const live = objectUrls.created.at(-1)!;
    confirmation.accepted = false;

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Új kalkuláció" })); });

    expect(fileName()).toBe("DEMO.png");
    expect(objectUrls.revoked).not.toContain(live);
  });
});

describe("T10.1 — SHA-256- és oldalszámhoz kötött kalibráció a kalkulátorváltáson át", () => {
  const markAt = (x: number, y: number) => fireEvent.click(screen.getByRole("group", { name: /Léptékpont|Mérési pont/u }), at(x, y));
  const typeLength = (text: string, unit: string) => {
    fireEvent.change(screen.getByLabelText("Ismert hossz"), { target: { value: text } });
    fireEvent.click(within(screen.getByRole("group", { name: "Ismert hossz egysége" })).getByRole("button", { name: unit }));
    fireEvent.click(screen.getByRole("button", { name: "Kész" }));
  };
  /** Két egyező referencia az 1190 pt széles lapon: 476 pt = 10 m és 238 pt = 5 m ugyanaz a lépték. */
  const calibrate = () => {
    fireEvent.click(screen.getByRole("button", { name: "Lépték megadása" }));
    markAt(.1, .1); markAt(.5, .1);
    typeLength("10", "m");
    markAt(.1, .3); markAt(.3, .3);
    typeLength("5", "m");
  };
  const acceptedOnPage1 = () => screen.queryByText(/Lépték igazolva a\(z\) 1\. oldalon/u);
  /**
   * A funkcionális kapu nem a szöveges összefoglaló (az szándékosan megnevezi, MELYIK oldalra igazolt a lépték),
   * hanem az `acceptedCalibration` — ami a dokumentum SHA-256-ját és az aktuális oldalszámot is egyezteti. Ez a
   * lépéssáv „Lépték” chipjében látszik.
   */
  const scaleStep = () => [...document.querySelectorAll("button.plan-step-chip")].find((chip) => /^Lépték/u.test(chip.textContent ?? ""))?.textContent ?? "";

  it("megtartja az 1. oldalhoz kötött léptéket, de a 2. oldalon nem mutatja igazoltnak", async () => {
    await renderSuite();
    await act(async () => { startFromDrawing(); });
    await loadPdf();
    calibrate();
    expect(acceptedOnPage1()).toBeTruthy();

    await act(async () => { chooseTask(TIMBER); });

    // A kalibráció a dokumentumhoz és az oldalhoz kötött, nem a kalkulátorhoz: váltás után is igazolt.
    expect(acceptedOnPage1()).toBeTruthy();
    expect(scaleStep()).toMatch(/igazolva/u);
    expect(fileName()).toBe("DEMO-terv.pdf");

    // Oldalváltás: ugyanaz a dokumentum, másik oldal — a kötés miatt itt nem igazolt.
    const pageSelect = screen.getByLabelText(/Oldal/u) as HTMLSelectElement;
    fireEvent.change(pageSelect, { target: { value: "2" } });
    expect(pageSelect.value).toBe("2");
    expect(scaleStep()).toMatch(/nem kötelező/u);
    // Az összefoglaló továbbra is megnevezi, melyik oldalra szól — de a 2. oldalon nem számít igazoltnak.
    expect(acceptedOnPage1()).toBeTruthy();
  });
});

/**
 * A3: a tetőszakasz-hatókör kiterjesztése. A `roof.timber-cutlist` mezősémája azonos a `roof.material-takeoff`-éval
 * és ugyanúgy a tető vízszintes geometriájából számol mennyiséget, ezért ugyanazt a fedettségi kaput kapja.
 * A `roof.rafter-cut` egyetlen szarufát szab ki — ott a „fedett tetőrész" nem jelentene semmit, és nem is jelenik meg.
 */
describe("A3 — tetőszakasz-hatókör a támogatott kalkulátorokon", () => {
  it("a faanyag-vágáslista is kap szakaszkezelést és fedettségi kaput", async () => {
    await renderSuite();
    await act(async () => { chooseTask(TIMBER); });
    await act(async () => { startFromDrawing(); });
    await loadPdf();

    expect(screen.getByLabelText("Tetőszakaszok")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Fedett tetőrész" })).toBeTruthy();

    // P3.5.1 itt is érvényes: a fedettség kiválasztása nem igazol, a megerősítés üresen jelenik meg.
    await act(async () => { fireEvent.change(screen.getByLabelText("Fedettség"), { target: { value: "covered" } }); });
    const check = screen.getByRole("checkbox", { name: /tetővel fedett/u }) as HTMLInputElement;
    expect(check.checked).toBe(false);
    // A szakasz nem „kész", amíg nincs igazolás: a lépés nyitva marad.
    expect(screen.getByRole("region", { name: "Fedett tetőrész" })).toBeTruthy();
  });

  it("az egyetlen szarufa kiszabása rajzpanelt kap, szakaszkezelést nem", async () => {
    await renderSuite();
    expect(heading()).toMatch(/Szarufa kiszabása/u);
    await act(async () => { startFromDrawing(); });
    await loadPdf();

    // A rajzos munka megy: a lap betöltve, a panel nyitva.
    expect(fileName()).toBe("DEMO-terv.pdf");
    // De szakasz és fedettség nincs — egyetlen szarufánál ez nem jelentene semmit.
    expect(screen.queryByLabelText("Tetőszakaszok")).toBeNull();
    expect(screen.queryByRole("region", { name: "Fedett tetőrész" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /tetővel fedett/u })).toBeNull();
  });
});

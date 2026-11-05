// @vitest-environment jsdom
/**
 * S2/S4/S5: mi marad meg és mi érvénytelenedik kalkulátorváltáskor.
 *
 * A dokumentum-, oldal- és szakaszgeometriai állapot tulajdonosa a kalkulátort túlélő szülő (`useDrawingDocument`),
 * a kalkulátorspecifikus és átmeneti állapotot pedig a `key={selectedId}` szerinti újramountolás nullázza. A
 * szakaszadat kalkulátoronkénti elkülönítését a tiszta `retargetSectionData` végzi; a harness csak azt a néhány
 * sort tükrözi, amivel a `ConstructionCalculatorSuite` meghívja.
 */
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { DrawingTextSource } from "@/infrastructure/drawings/drawing-text-source";
import { computeConstruction } from "./construction-computation";
import { initialMaterialState } from "./material-spec-editor";

vi.mock("@/components/feedback/app-interaction-provider", () => ({
  useAppInteraction: () => ({
    notify: vi.fn(), registerGuard: vi.fn(), requestNavigation: vi.fn(), hasUnsavedChanges: false, hasPendingChanges: false,
    requestConfirmation: async () => true,
  }),
  useUnsavedChangeGuard: vi.fn(),
}));

// DEMO, synthetic labels only; the PDF/OCR engines are replaced. This tests state ownership, not recognition.
const span = (originalText: string, x: number, y: number): DrawingTextSource => ({
  sourceDocumentId: "demo-doc", pageNumber: 1, originalText, normalizedText: originalText, tokens: [], method: "pdf-text",
  engine: "pdfjs-dist@6.4.299", confidence: null, uncertainty: "unknown",
  rotationDegrees: 0, position: { x, y }, bounds: { x, y, width: .05, height: .02 },
});
const demoSpans = [span("17,00", .1, .1), span("8,20 m", .3, .1), span("35°", .1, .5)];
vi.mock("@/infrastructure/drawings/pdf-text-extractor", () => ({
  processPdfDocument: vi.fn(async () => ({
    sourceDocumentId: "demo-doc", pageCount: 1,
    pages: [{ pageNumber: 1, widthPoints: 1190, heightPoints: 842, rotationDegrees: 0, textSpans: demoSpans }],
  })),
}));
vi.mock("@/infrastructure/drawings/pdf-preview", () => ({ renderPdfPage: vi.fn(async () => undefined) }));
vi.mock("@/infrastructure/drawings/ocr", () => ({ recognizeImage: vi.fn(async () => []), recognizePdfPage: vi.fn(async () => []) }));

import { PlanFieldTransfer, type SectionData } from "./plan-field-transfer";
import { retargetSectionData, useDrawingDocument } from "./use-drawing-document";
import { definitions } from "./roof-calculator-definitions";

const materials = initialMaterialState([], false);
const freshFor = (id: string): SectionData => ({
  fields: Object.fromEntries(definitions[id]!.fields.map((field) => [field.key, field.initial ?? ""])),
  materials, lengthDrafts: {}, approvedEntries: [],
});

/** Mirrors the suite's ownership: the document hook above, the panel keyed by the calculator below. */
function SwitchHarness() {
  const [selectedId, setSelectedId] = useState("roof.material-takeoff");
  const doc = useDrawingDocument<SectionData>();
  const [stash, setStash] = useState<Record<string, Record<string, SectionData>>>({});
  const [dataOwner, setDataOwner] = useState(selectedId);
  const [draftsBy, setDraftsBy] = useState<Record<string, Record<string, string>>>({});
  const definition = definitions[selectedId]!;
  if (dataOwner !== selectedId) {
    const next = retargetSectionData({ sections: doc.sections, leaving: dataOwner, entering: selectedId, stash, fresh: freshFor(selectedId) });
    setStash(next.stash);
    doc.setSections(next.sections);
    doc.setRemovedSections([]);
    setDataOwner(selectedId);
  }
  const values = draftsBy[selectedId] ?? freshFor(selectedId).fields;
  return <>
    <button type="button" onClick={() => setSelectedId((id) => id === "roof.material-takeoff" ? "roof.timber-cutlist" : "roof.material-takeoff")}>Kalkulátorváltás</button>
    <p data-testid="active-calculator">{selectedId}</p>
    <PlanFieldTransfer key={selectedId} doc={doc} definition={definition} current={values}
      calculation={computeConstruction(definition, values, materials, [])} wholeRoofConfirmed={false}
      materials={materials} initialMaterials={materials} profiles={[]} lengthDrafts={{}}
      onWholeRoofChange={() => undefined} onScopeChange={() => undefined}
      onSectionActivate={(data) => setDraftsBy((current) => ({ ...current, [selectedId]: data.fields }))}
      onApply={(fields) => setDraftsBy((current) => ({ ...current, [selectedId]: { ...values, ...fields } }))} />
  </>;
}

async function loadPdf(name = "demo-a.pdf") {
  const input = screen.getByLabelText(/PDF vagy kép kiválasztása/u);
  await act(async () => { fireEvent.change(input, { target: { files: [new File([name], name, { type: "application/pdf" })] } }); });
  await screen.findByRole("button", { name: "Forrásszöveg: 17,00" });
}
const switchCalculator = () => fireEvent.click(screen.getByRole("button", { name: "Kalkulátorváltás" }));

afterEach(cleanup);

describe("retargetSectionData", () => {
  const geometry = { id: "s1", sourceDocumentId: "demo-doc", name: "Déli tető", page: 2, points: [{ x: .1, y: .1 }, { x: .4, y: .4 }], coverage: "covered" as const, coverageConfirmed: true };
  const takeoffData: SectionData = { ...freshFor("roof.material-takeoff"), fields: { eaveLengthMm: "8200" }, approvedEntries: [] };

  it("keeps the section geometry and swaps only the calculator-specific data", () => {
    const next = retargetSectionData({ sections: [{ ...geometry, data: takeoffData }], leaving: "roof.material-takeoff", entering: "roof.timber-cutlist", stash: {}, fresh: freshFor("roof.timber-cutlist") });
    const [section] = next.sections;
    expect(section).toMatchObject({ id: "s1", name: "Déli tető", page: 2, coverage: "covered", coverageConfirmed: true, points: geometry.points });
    expect(section!.data.fields.eaveLengthMm).toBeUndefined();
    expect(section!.data.fields).toEqual(freshFor("roof.timber-cutlist").fields);
  });

  it("stashes the leaving calculator's data and restores it on the way back", () => {
    const away = retargetSectionData({ sections: [{ ...geometry, data: takeoffData }], leaving: "roof.material-takeoff", entering: "roof.timber-cutlist", stash: {}, fresh: freshFor("roof.timber-cutlist") });
    const back = retargetSectionData({ sections: away.sections, leaving: "roof.timber-cutlist", entering: "roof.material-takeoff", stash: away.stash, fresh: freshFor("roof.material-takeoff") });
    expect(back.sections[0]!.data).toEqual(takeoffData);
    expect(back.stash["roof.material-takeoff"]).toEqual({ s1: takeoffData });
  });

  it("gives a section the empty starting data for a calculator that has not been here yet", () => {
    const next = retargetSectionData({ sections: [{ ...geometry, data: takeoffData }], leaving: "roof.material-takeoff", entering: "roof.timber-cutlist", stash: { "roof.rafter-cut": { s1: takeoffData } }, fresh: freshFor("roof.timber-cutlist") });
    expect(next.sections[0]!.data).toEqual(freshFor("roof.timber-cutlist"));
    expect(next.stash["roof.rafter-cut"]).toEqual({ s1: takeoffData });
  });
});

describe("calculator switch with the drawing open", () => {
  it("keeps the loaded drawing and drops the calculator-specific label assignment", async () => {
    render(<SwitchHarness />);
    await loadPdf();
    fireEvent.click(screen.getByRole("button", { name: "Forrásszöveg: 17,00" }));
    expect(screen.getByRole("region", { name: "Felirat hozzárendelése" })).toBeTruthy();

    await act(async () => { switchCalculator(); });

    expect(screen.getByTestId("active-calculator").textContent).toBe("roof.timber-cutlist");
    // D: the document survives — the panel still names the loaded file and still shows its labels.
    expect(document.querySelector(".plan-file-name")?.textContent).toBe("demo-a.pdf");
    expect(screen.getByRole("button", { name: "Forrásszöveg: 17,00" })).toBeTruthy();
    // C: the label-to-field assignment belonged to the previous calculator and is gone.
    expect(screen.queryByRole("region", { name: "Felirat hozzárendelése" })).toBeNull();
  });

  it("keeps the drawing across a round trip back to the first calculator", async () => {
    render(<SwitchHarness />);
    await loadPdf("demo-b.pdf");
    await act(async () => { switchCalculator(); });
    await act(async () => { switchCalculator(); });
    expect(screen.getByTestId("active-calculator").textContent).toBe("roof.material-takeoff");
    expect(document.querySelector(".plan-file-name")?.textContent).toBe("demo-b.pdf");
    expect(screen.getByRole("button", { name: "Forrásszöveg: 17,00" })).toBeTruthy();
  });

  it("keeps the named section and its geometry while the calculator changes", async () => {
    render(<SwitchHarness />);
    await loadPdf();
    const sectionName = () => within(screen.getByLabelText("Tetőszakaszok")).getAllByRole("button")[0]?.textContent ?? "";
    const before = sectionName();
    expect(before).toMatch(/Tetőszakasz 1/u);
    await act(async () => { switchCalculator(); });
    await act(async () => { switchCalculator(); });
    expect(sectionName()).toBe(before);
  });
});

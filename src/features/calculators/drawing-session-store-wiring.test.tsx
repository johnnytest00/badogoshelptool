// @vitest-environment jsdom
/**
 * A1 bekötés: a helyi megőrzés és a rajzpanel kapcsolata. A tároló DÖNTÉSEIT a
 * `drawing-session-retention.test.ts` fedi; itt az a kérdés, hogy a panel helyesen használja-e őket.
 *
 * Kiemelten: a folytatási ajánlat megjelenése NEM indíthat mentést (nem írhatja felül a tárolt munkát), és a
 * visszaállítás a fájlimporttal azonos kapun megy be — forráshoz kötött bizonyíték SHA-256-egyezés előtt nem él.
 */
import { useCallback, useMemo, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { computeConstruction } from "./construction-computation";
import { definitions } from "./roof-calculator-definitions";
import { initialMaterialState } from "./material-spec-editor";
import { inactiveDrawingTakeoffScope, type DrawingTakeoffScope } from "./drawing-field-transfer";
import { createRoofWorkSessionJson } from "./drawing-roof-work-session";
import type { StoredRoofWorkSession } from "./drawing-session-retention";

vi.mock("@/components/feedback/app-interaction-provider", () => ({
  useAppInteraction: () => ({
    notify: vi.fn(), registerGuard: vi.fn(), requestNavigation: vi.fn(), hasUnsavedChanges: false, hasPendingChanges: false,
    requestConfirmation: async () => true,
  }),
  useUnsavedChangeGuard: vi.fn(),
}));
vi.mock("@/infrastructure/drawings/pdf-text-extractor", () => ({ processPdfDocument: vi.fn() }));
vi.mock("@/infrastructure/drawings/pdf-preview", () => ({ renderPdfPage: vi.fn(async () => undefined) }));
vi.mock("@/infrastructure/drawings/ocr", () => ({ recognizeImage: vi.fn(async () => []), recognizePdfPage: vi.fn(async () => []) }));

const store = vi.hoisted(() => ({
  records: [] as StoredRoofWorkSession[],
  put: vi.fn(async () => ({ ok: true as const, seq: 1 })),
  remove: vi.fn(async () => true),
  clear: vi.fn(async () => true),
}));
vi.mock("@/infrastructure/drawings/roof-work-session-store", () => ({
  listRoofWorkSessions: async () => ({ ok: true as const, records: store.records }),
  putRoofWorkSession: store.put,
  removeRoofWorkSession: store.remove,
  clearRoofWorkSessionsOnDevice: store.clear,
}));

import { PlanFieldTransfer, type SectionData } from "./plan-field-transfer";
import { useDrawingDocument } from "./use-drawing-document";
import { drawingSessionStorageKey } from "@/features/preferences/drawing-session-storage";

const takeoff = definitions["roof.material-takeoff"];
const OWNER = { userId: "u1", organizationId: "org1" };
const SHA = "a".repeat(64);

/** Valódi v3 payload a valódi szerializálóval — a teszt nem talál ki formátumot. */
function storedRecord(): StoredRoofWorkSession {
  const data: SectionData = { fields: { roofShape: "gable", lengthMm: "10000" }, materials: initialMaterialState([], false), lengthDrafts: {}, approvedEntries: [] };
  const json = createRoofWorkSessionJson({
    source: { kind: "pdf", documentId: "doc-1", sha256: SHA, pageCount: 1 },
    activeSectionId: "s1",
    sections: [{ id: "s1", sourceDocumentId: "doc-1", name: "Főépület", page: 1, points: [{ x: .1, y: .1 }, { x: .4, y: .4 }], coverage: "covered", coverageConfirmed: true, data }],
    calibration: null,
  });
  return { id: `u1:org1:${SHA}`, userId: "u1", organizationId: "org1", documentSha256: SHA, json, seq: 4, updatedAt: Date.now() - 3600_000, sectionCount: 1, sourceKind: "pdf", sourceName: "terv.pdf" };
}

let latestScope: DrawingTakeoffScope = inactiveDrawingTakeoffScope;
function Harness({ owner }: Readonly<{ owner: typeof OWNER | null }>) {
  const [values, setValues] = useState<Record<string, string>>({ roofShape: "gable" });
  const [materials, setMaterials] = useState(initialMaterialState([], false));
  const doc = useDrawingDocument<SectionData>();
  const onScopeChange = useCallback((next: DrawingTakeoffScope) => { latestScope = next; }, []);
  const calculation = useMemo(() => computeConstruction(takeoff, values, materials, []), [values, materials]);
  return <PlanFieldTransfer definition={takeoff} current={values} calculation={calculation} wholeRoofConfirmed={false}
    materials={materials} initialMaterials={initialMaterialState([], false)} profiles={[]} lengthDrafts={{}}
    onApply={(fields) => setValues((current) => ({ ...current, ...fields }))}
    onSectionActivate={(data) => { setValues(data.fields); setMaterials(data.materials); }}
    onScopeChange={onScopeChange} onWholeRoofChange={() => undefined} doc={doc} openPanel owner={owner} />;
}

beforeEach(() => {
  store.records = []; store.put.mockClear(); store.remove.mockClear(); store.clear.mockClear();
  latestScope = inactiveDrawingTakeoffScope;
  window.localStorage.clear();
});
afterEach(() => cleanup());

const renderPanel = async (owner: typeof OWNER | null = OWNER) => {
  render(<Harness owner={owner} />);
  await screen.findByText(/Kitöltés tervrajzból/u);
};

describe("A1 — engedély nélkül semmi nem kerül az eszközre", () => {
  it("bekapcsolás előtt az engedélykérés látszik, felajánlás és mentés nincs", async () => {
    store.records = [storedRecord()];
    await renderPanel();
    expect(screen.getByLabelText(/Folytathatóvá teszem a rajzos munkát/u)).toBeTruthy();
    expect(screen.queryByText(/Folytatható munka:/u)).toBeNull();
    expect(store.put).not.toHaveBeenCalled();
  });

  it("bejelentkezett tulajdonos nélkül a megőrzés egyáltalán nem jelenik meg", async () => {
    window.localStorage.setItem(drawingSessionStorageKey, "true");
    store.records = [storedRecord()];
    await renderPanel(null);
    expect(screen.queryByLabelText(/Folytathatóvá teszem/u)).toBeNull();
    expect(screen.queryByText(/Folytatható munka:/u)).toBeNull();
    expect(store.put).not.toHaveBeenCalled();
  });
});

describe("A1 — a felajánlás megjelenése nem írhatja felül a tárolt munkát", () => {
  it("üres rajzi állapotban a felajánlás látszik, de mentés nem indul", async () => {
    window.localStorage.setItem(drawingSessionStorageKey, "true");
    store.records = [storedRecord()];
    await renderPanel();
    await screen.findByText(/Folytatható munka:/u);
    expect(screen.getByText(/terv\.pdf/u)).toBeTruthy();
    // A késleltetett mentés ideje bőven letelt volna; forrás és szakasz nélkül nincs mit írni.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1500)); });
    expect(store.put).not.toHaveBeenCalled();
  });

  it("az „Eldobom” törli a rekordot, és nem ír helyette újat", async () => {
    window.localStorage.setItem(drawingSessionStorageKey, "true");
    const record = storedRecord();
    store.records = [record];
    await renderPanel();
    await screen.findByText(/Folytatható munka:/u);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Eldobom" })); });
    expect(store.remove).toHaveBeenCalledWith(record.id);
    expect(store.put).not.toHaveBeenCalled();
  });
});

describe("A1 — visszaállítás a fájlimporttal azonos kapun", () => {
  it("a tárolt munka betöltése után a forrás még nincs igazolva, és a fedettséget újra kell adni", async () => {
    window.localStorage.setItem(drawingSessionStorageKey, "true");
    store.records = [storedRecord()];
    await renderPanel();
    await screen.findByText(/Folytatható munka:/u);

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Folytatom" })); });

    // A meglévő import-visszajelzés: a forrás `pending`, a rajzot újra ki kell választani.
    await waitFor(() => expect(screen.getByText(/Válaszd ki az eredeti rajzot a kijelölésekhez/u)).toBeTruthy());
    expect(screen.getByText(/a fedettséget és a rajzi jóváhagyásokat újra meg kell adni/u)).toBeTruthy();
    // P3.5.1: a tárolt rekord `coverageConfirmed: true` volt, a visszaállítás mégis igazolatlanul indul.
    expect(latestScope.coverageConfirmed).toBe(false);
    expect(latestScope.wholeRoofConfirmed).toBe(false);
    expect(latestScope.sectionName).toBe("Főépület");
  });

  it("a felajánlás kimondja, hogy a tervrajzot újra ki kell választani", async () => {
    window.localStorage.setItem(drawingSessionStorageKey, "true");
    store.records = [storedRecord()];
    await renderPanel();
    await screen.findByText(/A tervrajzot újra ki kell választanod/u);
  });
});

describe("A1 — kikapcsolás törli a helyi munkákat", () => {
  it("a kikapcsoló művelet üríti a tárat", async () => {
    window.localStorage.setItem(drawingSessionStorageKey, "true");
    store.records = [storedRecord()];
    await renderPanel();
    await screen.findByText(/Folytatható munka:/u);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Kikapcsolom és törlöm/u })); });
    expect(store.clear).toHaveBeenCalled();
    expect(window.localStorage.getItem(drawingSessionStorageKey)).toBe("false");
  });
});

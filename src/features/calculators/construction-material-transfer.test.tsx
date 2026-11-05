// @vitest-environment jsdom
/**
 * P3.3c: anyagprofil újrahasználata mentett kalkulációból, explicit, külön jóváhagyással.
 *
 * Amit bizonyít: az anyagátvétel alapból kikapcsolt és jóváhagyás nélkül az anyagállapot nem változik (D2); a
 * jóváhagyott átvétel a célkalkulátor számára kompatibilis csoportokat és a `layout`-ot adja át, a `requested`
 * anyagcsoport-választást nem; a már nem elérhető termék egyértelmű hibát ad és kimarad; a DEMO-eredet látható;
 * a visszavonás a korábbi anyagállapotot pontosan visszaállítja.
 */
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConstructionFieldTransferControl, FIELD_TRANSFER_PANEL_ID, openFieldTransferPanel, type AppliedTransferDisplay } from "./construction-field-transfer-control";
import { initialMaterialState, type RoofMaterialUiState } from "./material-spec-editor";
import type { MaterialProfile } from "@/domain/calculations/roof-material-spec";
import type { Field } from "./construction-calculator-types";

const listRoofShapeTransferSourcesAction = vi.fn();
vi.mock("@/features/calculations/construction-actions", () => ({
  listRafterCutTransferSourcesAction: () => Promise.resolve({ ok: false as const }),
  listRoofShapeTransferSourcesAction: (...args: unknown[]) => listRoofShapeTransferSourcesAction(...args),
}));

const FIELDS: readonly Field[] = [
  { key: "roofShape", label: "Tetőforma", unit: "" },
  { key: "widthMm", label: "Tető szélessége", unit: "mm" },
];

/** DEMO, nem gyártói katalógusadat; a teszt a provenance megjelenítését és a feloldást vizsgálja, nem a termékadatot. */
const COVERING_PRODUCT: MaterialProfile = {
  id: "catalog-covering", group: "covering", label: "DEMO Trapézlemez T-18", verification: "verified",
  sourceReference: "DEMO gyártói adatlap",
  catalog: { productId: "p1", variantId: "v1", productName: "DEMO Trapézlemez T-18", variantName: "0,5 mm RAL 7016", manufacturerName: "DEMO Gyártó", sku: "DEMO-T18-05", purchasingUnit: "db", categoryId: "c1", categoryName: "Fedőanyag", categoryMatch: true },
  values: { nominalWidthMm: 1180, effectiveCoveringWidthMm: 1100, physicalLengthMm: 6000, usableCoveringLengthMm: 5900 },
};
const DEMO_RAFTER: MaterialProfile = {
  id: "demo-rafter", group: "rafter", label: "DEMO szarufa 100×150", verification: "demo", sourceReference: "DEMO minta",
  values: { sectionWidthMm: 100, sectionHeightMm: 150 },
};
const PROFILES: readonly MaterialProfile[] = [COVERING_PRODUCT, DEMO_RAFTER];

const SOURCE_MATERIAL = {
  requested: { timber: true, underlay: true, covering: true },
  layout: { rafterMaxSpacingMm: 900, battenMaxSpacingMm: 350 },
  specs: {
    covering: { mode: "product" as const, profileId: "catalog-covering", profile: undefined, entered: { usableCoveringLengthMm: 5800 } },
    underlay: { mode: "manual" as const, profileId: null, entered: { rollWidthMm: 1500, rollLengthMm: 50000, sideOverlapMm: 100, endOverlapMm: 150, installationDirection: "eave-to-ridge" } },
    rafter: { mode: "product" as const, profileId: "demo-rafter", entered: {} },
    batten: { mode: "manual" as const, profileId: null, entered: { sectionWidthMm: 30, sectionHeightMm: 50 } },
  },
} as unknown as RoofMaterialUiState;

const source = (material: unknown = SOURCE_MATERIAL) => ({
  calculationId: "calc-earlier", displayName: "DEMO korábbi ház", revisionId: "r2", revisionNumber: 3,
  sourceCalculatorId: "roof.material-takeoff", roofShape: "gable",
  fields: { roofShape: "gable", widthMm: "9000" },
  geometry: { widthMm: "9000" },
  material, revisionCreatedAt: "2026-10-27T09:30:00Z",
});

let applied: RoofMaterialUiState | null = null;
let appliedDisplay: AppliedTransferDisplay | null = null;

function Harness({ target, initial }: Readonly<{ target: string; initial: RoofMaterialUiState }>) {
  const [display, setDisplay] = useState<AppliedTransferDisplay | null>(null);
  const [material, setMaterial] = useState(initial);
  const [fields, setFields] = useState<Record<string, string>>({ roofShape: "gable", widthMm: "" });
  applied = material;
  appliedDisplay = display;
  return <ConstructionFieldTransferControl organizationId="org" targetCalculatorId={target} fields={FIELDS} currentFields={fields} roofShape="gable"
    applied={display} onAppliedChange={setDisplay} onApply={(next) => setFields((current) => ({ ...current, ...next }))}
    excludeCalculationId="calc-open" materialProfiles={PROFILES} currentMaterial={material} onApplyMaterial={setMaterial} />;
}

async function openPreview(target = "roof.material-takeoff", initial = initialMaterialState(PROFILES, false)) {
  const view = render(<Harness target={target} initial={initial} />);
  const details = view.container.querySelector("details.plan-link-add") as HTMLDetailsElement;
  await act(async () => { details.open = true; fireEvent(details, new Event("toggle")); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Adatok megtekintése" })); });
  return view;
}

const transfer = () => fireEvent.click(screen.getByRole("button", { name: "Adatok átvétele" }));
const materialCheckbox = () => screen.getByRole("checkbox", { name: /Az anyagadatokat is átveszem/ }) as HTMLInputElement;

beforeEach(() => {
  applied = null;
  appliedDisplay = null;
  listRoofShapeTransferSourcesAction.mockResolvedValue({ ok: true, sources: [source()] });
});
afterEach(cleanup);

describe("P3.3c anyagátvétel", () => {
  it("a most szerkesztett kalkulációt kizárja a forráslistából, nem a kalkulátortípust", async () => {
    await openPreview();
    expect(listRoofShapeTransferSourcesAction).toHaveBeenCalledWith("org", "calc-open");
  });

  it("kiírja a felhasznált revízió saját dátumát, a termékazonosságot, a mértékegységet és a DEMO-eredetet", async () => {
    const view = await openPreview();
    expect(view.container.textContent).toContain("DEMO korábbi ház · V3 · a felhasznált revízió dátuma: 2026-10-27");
    expect(view.container.textContent).toContain("DEMO-T18-05");
    expect(view.container.textContent).toContain("Hasznos fedési szélesség (mm)");
    expect(view.container.textContent).toContain("1100 mm");
    expect(view.container.textContent).toContain("DEMO termék");
    expect(view.container.textContent).toContain("Felülírva");
  });

  it("jóváhagyás nélkül az anyagállapot bitre azonos marad, a mezőátvétel viszont megtörténik", async () => {
    const initial = initialMaterialState(PROFILES, false);
    await openPreview("roof.material-takeoff", initial);
    expect(materialCheckbox().checked).toBe(false);
    await act(async () => { transfer(); });
    expect(applied).toEqual(initial);
    expect(appliedDisplay?.materialSnapshot).toBeNull();
    expect(appliedDisplay?.newFields).toEqual({ roofShape: "gable", widthMm: "9000" });
  });

  it("jóváhagyás után átveszi a kompatibilis csoportokat és a layoutot, de a requested választást nem", async () => {
    const initial = initialMaterialState(PROFILES, false);
    await openPreview("roof.material-takeoff", initial);
    await act(async () => { fireEvent.click(materialCheckbox()); });
    await act(async () => { transfer(); });
    expect(applied?.requested).toEqual(initial.requested);
    expect(applied?.layout).toEqual({ rafterMaxSpacingMm: 900, battenMaxSpacingMm: 350 });
    expect(applied?.specs.covering).toEqual(SOURCE_MATERIAL.specs.covering);
    expect(applied?.specs.underlay).toEqual(SOURCE_MATERIAL.specs.underlay);
    expect(applied?.specs.rafter).toEqual(SOURCE_MATERIAL.specs.rafter);
    expect(applied?.specs.batten).toEqual(SOURCE_MATERIAL.specs.batten);
  });

  it("faanyag-vágáslista célnál a fedő- és alátétadatokat nem ajánlja és nem veszi át", async () => {
    const initial = initialMaterialState(PROFILES, true);
    const view = await openPreview("roof.timber-cutlist", initial);
    expect(view.container.textContent).not.toContain("Fedőtábla ·");
    expect(view.container.textContent).not.toContain("Alátétfólia ·");
    await act(async () => { fireEvent.click(materialCheckbox()); });
    await act(async () => { transfer(); });
    expect(applied?.specs.covering).toEqual(initial.specs.covering);
    expect(applied?.specs.underlay).toEqual(initial.specs.underlay);
    expect(applied?.specs.rafter).toEqual(SOURCE_MATERIAL.specs.rafter);
  });

  it("már nem elérhető termék esetén egyértelmű hibát ad, és azt a csoportot nem veszi át", async () => {
    listRoofShapeTransferSourcesAction.mockResolvedValue({ ok: true, sources: [source({
      ...SOURCE_MATERIAL, specs: { ...SOURCE_MATERIAL.specs, covering: { mode: "product", profileId: "torolt-termek", entered: {} } },
    })] });
    const initial = initialMaterialState(PROFILES, false);
    const view = await openPreview("roof.material-takeoff", initial);
    expect(view.container.textContent).toContain("A mentett termék már nem elérhető az Anyagkezelőben");
    await act(async () => { fireEvent.click(materialCheckbox()); });
    await act(async () => { transfer(); });
    expect(applied?.specs.covering).toEqual(initial.specs.covering);
    expect(applied?.specs.rafter).toEqual(SOURCE_MATERIAL.specs.rafter);
  });

  it("a visszavonás a korábbi anyagállapotot pontosan visszaállítja", async () => {
    const initial = initialMaterialState(PROFILES, false);
    await openPreview("roof.material-takeoff", initial);
    await act(async () => { fireEvent.click(materialCheckbox()); });
    await act(async () => { transfer(); });
    expect(applied).not.toEqual(initial);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Visszavonás" })); });
    expect(applied).toEqual(initial);
    expect(appliedDisplay).toBeNull();
  });
});

/**
 * P3.5/A: az Anyag lépés belépési pontja UGYANEZT a panelt nyitja meg. A teszt azt védi, hogy a panel
 * megtalálható és megnyitható kívülről — így nem keletkezik második, párhuzamos átvételi felület.
 */
describe("P3.5/A — az átvételi panel az Anyag lépésből nyitható", () => {
  it("a panel azonosítóval és csukva renderelődik, a megnyitó kinyitja és fókuszálja", () => {
    const view = render(<Harness target="roof.material-takeoff" initial={initialMaterialState(PROFILES, false)} />);
    const panel = view.container.querySelector(`#${FIELD_TRANSFER_PANEL_ID}`) as HTMLDetailsElement;
    expect(panel).toBeTruthy();
    expect(panel.open).toBe(false);

    expect(openFieldTransferPanel()).toBe(true);
    expect(panel.open).toBe(true);
    expect(document.activeElement).toBe(panel.querySelector("summary"));
  });

  it("a megnyitó nem dob, ha a panel nincs a DOM-ban", () => {
    expect(openFieldTransferPanel()).toBe(false);
  });

  it("a megnyitás önmagában nem módosítja az anyagállapotot", () => {
    const initial = initialMaterialState(PROFILES, false);
    render(<Harness target="roof.material-takeoff" initial={initial} />);
    openFieldTransferPanel();
    expect(applied).toEqual(initial);
  });
});

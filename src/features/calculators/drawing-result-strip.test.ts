import { describe, expect, it } from "vitest";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { calculateRoofMaterialTakeoff } from "@/domain/calculations/roof-material-takeoff";
import { computeConstruction } from "./construction-computation";
import { definitions } from "./roof-calculator-definitions";
import { initialMaterialState, type RoofMaterialUiState } from "./material-spec-editor";
import { drawingResultStrip, type DrawingResultStripInput } from "./drawing-result-strip";

// P3.1 DEMO geometria: 10,00 × 6,00 m fal, 35°, 500 mm ereszkiülés → 85,45 m².
const gable = (rearGableOverhangMm: number) => calculateRoofGeometry({
  type: "gable",
  geometry: { inputMode: "angle", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofPitchDegrees: 35, eaveOverhangMm: 500, frontGableOverhangMm: 0, rearGableOverhangMm },
});
const geometry = gable(0);

const input = (overrides: Partial<DrawingResultStripInput> = {}): DrawingResultStripInput => ({
  geometry, takeoff: null, completenessStatus: "complete", scopeActive: true, coverageConfirmed: true, wholeRoofConfirmed: true, ...overrides,
});

describe("drawingResultStrip", () => {
  it("geometria nélkül nem mutat semmit", () => {
    expect(drawingResultStrip(input({ geometry: null }))).toBeNull();
  });

  it("a tetőfelületet a részletes blokkal azonos értékkel írja ki", () => {
    const strip = drawingResultStrip(input());
    expect(strip?.items[0]).toEqual({ label: "Tetőfelület", text: "85,45 m²", proven: true });
    expect(strip?.tone).toBe("ok");
    expect(strip?.state).toBe("Teljes eredmény");
  });

  it("a hibás átvitel megduplázott felülete azonnal látszik a csíkon", () => {
    // P3.1 F.1/B: a 10 000 mm hátsó kiülés 85,45 m²-ről 170,91 m²-re vitte a felületet.
    expect(drawingResultStrip(input({ geometry: gable(10_000) }))?.items[0].text).toBe("170,91 m²");
  });

  it("igazolt anyagrészhez a mennyiség, hiányoshoz az állapot kerül a szám helyére", () => {
    const takeoff = calculateRoofMaterialTakeoff(geometry, {
      requested: { timber: true, underlay: false, covering: false },
      timber: { rafter: { maxSpacingMm: 800, startInsetMm: 0, endInsetMm: 0 }, batten: { maxSpacingMm: 350, startInsetMm: 0, endInsetMm: 0 } },
    });
    const items = drawingResultStrip(input({ takeoff }))!.items;
    const rafters = items.find((item) => item.label === "Szarufa")!;
    expect(rafters).toEqual({ label: "Szarufa", text: "28 db", proven: true });
    expect(items.every((item) => item.proven || item.text === "hiányos" || item.text === "hibás adat")).toBe(true);
    expect(items.some((item) => item.label === "Alátétfólia")).toBe(false);
  });

  it("a távoli eredményblokk minősítéseit ismétli, nem sajátot ad", () => {
    expect(drawingResultStrip(input({ completenessStatus: "invalid" }))).toMatchObject({ state: "Nem számítható", tone: "error" });
    expect(drawingResultStrip(input({ completenessStatus: "unsupported" }))).toMatchObject({ tone: "error" });
    expect(drawingResultStrip(input({ completenessStatus: "incomplete" }))).toMatchObject({ state: "Hiányos · előnézet", tone: "warn" });
    expect(drawingResultStrip(input({ coverageConfirmed: false }))).toMatchObject({ state: "Nem igazolt fedettség · előnézet", tone: "warn" });
    expect(drawingResultStrip(input({ wholeRoofConfirmed: false }))).toMatchObject({ state: "Tetőszakasz-eredmény · nem a teljes tető", tone: "warn" });
  });

  it("szakaszra nem szűkítő kalkulátornál a szakasz-megerősítések nem minősítenek", () => {
    expect(drawingResultStrip(input({ scopeActive: false, coverageConfirmed: false, wholeRoofConfirmed: false }))).toMatchObject({ state: "Teljes eredmény", tone: "ok" });
  });
});

describe("drawingResultStrip a valódi kalkulátorokkal", () => {
  const shown = (calculatorId: keyof typeof definitions, values: Record<string, string>, materials: RoofMaterialUiState | null) => {
    const definition = definitions[calculatorId];
    const calculation = computeConstruction(definition, values, materials, []);
    return {
      calculation,
      strip: drawingResultStrip({
        geometry: calculation.geometry, takeoff: calculation.materialTakeoff, completenessStatus: calculation.completeness.status,
        scopeActive: false, coverageConfirmed: true, wholeRoofConfirmed: true,
      }),
    };
  };
  const gableValues = { roofShape: "gable", lengthMm: "10000", widthMm: "6000", pitchDegrees: "35", eaveOverhangMm: "500" };
  const timberMaterials: RoofMaterialUiState = {
    ...initialMaterialState([], true),
    layout: { rafterMaxSpacingMm: 800, battenMaxSpacingMm: 350 },
  };

  it("szarufa-kiszabásnál nem mutat tetőfelületet és nem talál ki anyagmennyiséget", () => {
    // Ennek a kalkulátornak nincs tetőgeometriája; a csík ilyenkor egyáltalán nem jelenik meg.
    const { calculation, strip } = shown("roof.rafter-cut", { horizontalHalfSpanMm: "3500", riseMm: "2100", eaveProjectionMm: "0", seatCutHeightMm: "0", ridgeJoint: "opposed" }, null);
    expect(calculation.rows.length).toBeGreaterThan(0);
    expect(strip).toBeNull();
  });

  it("faanyag-vágáslistánál csak a kért anyagcsoportok jelennek meg", () => {
    const { strip } = shown("roof.timber-cutlist", gableValues, timberMaterials);
    expect(strip!.items.map((item) => item.label)).toEqual(["Tetőfelület", "Szarufa", "Léc"]);
    expect(strip!.items.every((item) => item.proven)).toBe(true);
  });

  /**
   * P3.5/B: az alátétfólia ELSŐ mennyisége a csíkok száma, ezért a korábbi „első mennyiség" logika
   * „Alátétfólia 6 db"-ot írt ki, amit a P3.4 DEMO-ban tekercsnek lehetett olvasni. A csíkot és a tekercset
   * külön, a kalkulátor saját eredményéből nevezzük meg; új képlet és új érték nincs.
   */
  const underlayMaterials: RoofMaterialUiState = {
    ...initialMaterialState([], false),
    requested: { timber: true, underlay: true, covering: true },
    layout: { rafterMaxSpacingMm: 800, battenMaxSpacingMm: 350 },
    specs: {
      ...initialMaterialState([], false).specs,
      rafter: { mode: "product", profileId: null, entered: { sectionWidthMm: 80, sectionHeightMm: 200 } },
      batten: { mode: "product", profileId: null, entered: { sectionWidthMm: 50, sectionHeightMm: 30 } },
      underlay: { mode: "product", profileId: null, entered: { rollWidthMm: 1500, rollLengthMm: 50_000, sideOverlapMm: 100, endOverlapMm: 100, installationDirection: "eave-to-ridge" } },
      covering: { mode: "product", profileId: null, entered: { nominalWidthMm: 1100, effectiveCoveringWidthMm: 1000, physicalLengthMm: 4000, usableCoveringLengthMm: 3900 } },
    },
  };

  it("a fóliacsíkot és a fóliatekercset külön, egyértelműen nevezi meg", () => {
    const items = shown("roof.material-takeoff", gableValues, underlayMaterials).strip!.items;
    const underlay = items.find((item) => item.label === "Alátétfólia")!;
    // A P3.1 referencia: 6 csík a kiosztásból, 2 tekercs a pontos vágási minimumból.
    expect(underlay).toEqual({ label: "Alátétfólia", text: "6 csík · 2 tekercs", proven: true });
    expect(underlay.text).not.toBe("6 db");
  });

  it("a többi anyagcsoport és a tetőfelület megjelenítése változatlan", () => {
    const items = shown("roof.material-takeoff", gableValues, underlayMaterials).strip!.items;
    expect(items.find((item) => item.label === "Tetőfelület")!.text).toBe("85,45 m²");
    expect(items.find((item) => item.label === "Szarufa")!.text).toBe("28 db");
    expect(items.find((item) => item.label === "Léc")!.text).toBe("27 db");
    expect(items.find((item) => item.label === "Fedőtáblák")!.text).toBe("40 db");
  });

  it("hiányos fóliaadatnál állapot áll a szám helyén, nem félrevezető darabszám", () => {
    const noUnderlaySpec: RoofMaterialUiState = {
      ...underlayMaterials,
      specs: { ...underlayMaterials.specs, underlay: { mode: "product", profileId: null, entered: {} } },
    };
    const underlay = shown("roof.material-takeoff", gableValues, noUnderlaySpec).strip!.items.find((item) => item.label === "Alátétfólia")!;
    expect(underlay).toEqual({ label: "Alátétfólia", text: "hiányos", proven: false });
    expect(underlay.text).not.toMatch(/csík|tekercs|\d/);
  });

  it("hibás mezőérték után eltűnik a csík, nem marad ott a korábbi felület", () => {
    expect(shown("roof.material-takeoff", gableValues, timberMaterials).strip!.items[0].text).toBe("85,45 m²");
    // A mezőszerződés szerint a megadott, de érvénytelen érték nem „meg nem adott": a geometria elvész.
    const broken = shown("roof.material-takeoff", { ...gableValues, widthMm: "-6000" }, timberMaterials);
    expect(broken.calculation.completeness.status).toBe("invalid");
    expect(broken.strip).toBeNull();
    // Hiányzó kötelező érték ugyanígy: nincs mit mutatni.
    expect(shown("roof.material-takeoff", { ...gableValues, pitchDegrees: "" }, timberMaterials).strip).toBeNull();
  });
});

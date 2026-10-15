import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./flashing-actions", () => ({ saveFlashingCalculationAction: vi.fn(), createFlashingTakeoffDraftAction: vi.fn() }));
vi.mock("@/features/sheet-metal/profile-actions", () => ({ saveSheetMetalProfileAction: vi.fn(), createProfileTakeoffDraftAction: vi.fn() }));

import { FlashingCalculator, isFlashingDraftDirty } from "./flashing-calculator";
import { ProfileEditor } from "@/features/sheet-metal/profile-editor";
import { ProfileDrawing } from "@/features/sheet-metal/profile-drawing";
import { calculateDraft, createTemplate } from "@/features/sheet-metal/profile-editor-model";
import { calculateFlashingMaterial, type FlashingMaterialInput } from "@/domain/calculations/flashing-material";

describe("szegély- és profilkalkulátor szakmai feliratai", () => {
  it("a szegély megnevezésének változását is mentetlen módosításnak tekinti", () => {
    expect(isFlashingDraftDirty('{"length":1}', '{"length":1}', "Új név", "Régi név")).toBe(true);
    expect(isFlashingDraftDirty('{"length":1}', '{"length":1}', "Azonos", "Azonos")).toBe(false);
  });
  it("a szegélynél a további szál hasznos hosszát nevezi meg", () => {
    const html = renderToStaticMarkup(createElement(FlashingCalculator, {
      organizationId: "org", projectId: "project", suggestions: [], saved: null, catalogVariants: [],
    }));
    expect(html).toContain("Toldásonkénti átfedést adok meg");
    expect(html).toContain("Minden további szál hasznos fedési hosszát adom meg");
    expect(html).toContain("Átfedés nélküli kapcsolatot csak akkor adj meg");
    expect(html).toContain("Új, még nem mentett számítás");
    expect(html).not.toContain("F9.6.2");
  });
  it("projekt nélkül is menthető, és nem mutat takeoff műveletet", () => {
    const html = renderToStaticMarkup(createElement(FlashingCalculator, {
      organizationId: "org", suggestions: [], saved: null, catalogVariants: [],
    }));
    expect(html).toContain("Bádogos szegélyek kalkulátora");
    expect(html).toContain("Új, még nem mentett számítás");
    expect(html).toContain("Számítás mentése");
    expect(html).toContain("Önálló módban nincs projekt tetőgeometria");
    expect(html).not.toContain("Anyagkimutatás előkészítése");
  });
  it("a felmérés szegélyhosszait felhasználói eredetként tölti be", () => {
    const html = renderToStaticMarkup(createElement(FlashingCalculator, {
      organizationId: "org", suggestions: [], saved: null, catalogVariants: [],
      initialHandoff: { sectionLengthMm: 2000, overlapMm: 100, runs: [{ id: "survey-run", name: "Oromszegély", lengthMm: 5000 }] },
      handoffSource: { surveyId: "survey-id", revisionId: "revision-id", version: 5 },
    }));
    expect(html).toContain("Adatok átvéve a felmérésből");
    expect(html).toContain("revízió: revision-id");
    expect(html).toContain("Felhasználó által megadott adat a felmérésből; nem gyártói igazolás");
    expect(html).toContain('value="5000"');
    expect(html).toContain('value="100"');
  });
  it("a profilnál a tangensméretet, irányt és a BA/K forrásigényét mutatja", () => {
    const html = renderToStaticMarkup(createElement(ProfileEditor, {
      organizationId: "org", projectId: "project", profiles: [], catalogCandidates: [],
    }));
    expect(html).toContain("tangenciapontok közötti");
    expect(html).toContain("Az elfordulás balra pozitív, jobbra negatív");
    expect(html).toContain("A rendszer nem állít be gyártási alapértéket");
    expect(html).not.toContain("F9.6.3.4.1");
  });
  it("a profil önálló módban számít és standalone menthető", () => {
    const html = renderToStaticMarkup(createElement(ProfileEditor, {
      organizationId: "org", profiles: [], catalogCandidates: [],
    }));
    expect(html).toContain("Önálló számítás · lemezprofilok");
    expect(html).toContain("Önálló, helyi előnézet");
    expect(html).toContain("Számítás mentése");
    expect(html).toContain("Mentett számításaim");
    expect(html).not.toContain("csak ezen az oldalon marad");
    expect(html).not.toContain("Anyagkimutatás előkészítése");
  });

  it("mentett szegélynél az eredmény, rajz, katalógus és átadási megerősítés elérhető", () => {
    const source = { kind: "user_provided" as const, label: "DEMO forrás", sourceUrl: null, sourceDate: null, catalogVariantId: null, manuallyOverridden: false };
    const input: FlashingMaterialInput = { sectionSpec: { nominalLengthMm: 2000, nominalLengthSource: source, connection: { mode: "no_overlap_confirmed", source } }, runs: [{ id: "run-1", category: "verge", name: "DEMO szegély", lengthMm: 2500, lengthSource: "demo", roofEdgeReference: null, startExtensionMm: 0, endExtensionMm: 0, reserveMm: 0, installationNotes: [] }], manualComponents: [] };
    const revision = { revisionId: "revision-1", revisionNumber: 1, displayName: "DEMO szegély", input, output: calculateFlashingMaterial(input), createdAt: "2026-10-13T00:00:00Z", stale: false };
    const html = renderToStaticMarkup(createElement(FlashingCalculator, { organizationId: "org", projectId: "project", suggestions: [], catalogVariants: [], saved: { ...revision, calculationId: "calculation-1", revisions: [revision] } }));
    expect(html).toContain("Becsült szál:");
    expect(html).toContain("Szegélyszakaszok méretezett sémája");
    expect(html).toContain('aria-label="Szegélyrajz, vízszintesen görgethető"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("Katalógusváltozat");
    expect(html).toContain("V1 változat");
    expect(html).toContain("Átadás megerősítése · új piszkozat");
    expect(html).toContain("Válassz kompatibilis katalógusváltozatot");
  });

  it("a profilrajz tényleges zoomot és egyetlen közös illesztés/alaphelyzet vezérlőt kínál", () => {
    const calculation = calculateDraft(createTemplate("l"));
    expect(calculation.ok).toBe(true);
    if (!calculation.ok) return;
    const html = renderToStaticMarkup(createElement(ProfileDrawing, { output: calculation.output, thicknessMm: calculation.input.thicknessMm, selection: null, onSelect: vi.fn() }));
    expect(html).toContain('aria-label="Kicsinyítés"');
    expect(html).toContain('aria-label="Nagyítás"');
    expect(html.match(/aria-label="Profil illesztése és nézet alaphelyzetbe állítása"/g)).toHaveLength(1);
    expect(html).toContain("egy ujjal vagy egérrel mozgatható");
    expect(html).toContain("nem gyártási rajz");
  });
});

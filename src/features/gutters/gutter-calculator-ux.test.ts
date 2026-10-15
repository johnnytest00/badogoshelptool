import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./gutter-actions", () => ({ saveGutterCalculationAction: vi.fn(), createGutterTakeoffDraftAction: vi.fn() }));

import { GutterCalculator } from "./gutter-calculator";
import { calculateGutterMaterial, type GutterMaterialInput } from "@/domain/calculations/gutter-material";

describe("ereszcsatorna-kalkulátor felülete", () => {
  it("nem kínál forrás nélküli szálhosszt és jelzi a lefolyótartozékok átadását", () => {
    const html = renderToStaticMarkup(createElement(GutterCalculator, {
      organizationId: "org", projectId: "project", suggestions: [], saved: null, catalogVariants: [],
    }));
    expect(html).toContain("Választott ereszcsatorna-szál hossza (mm)");
    expect(html).toContain("A könyökök a rajzon megjelennek, de nem kerülnek automatikusan az anyagkimutatásba.");
    expect(html).toContain("Új, még nem mentett számítás");
    expect(html).toContain("Mentés új változatként · V1");
    expect(html).not.toContain('value="4000"');
    expect(html).not.toContain("F9.6.1.1.1");
  });

  it("projekt nélkül számol és standalone mentést kínál, takeoff nélkül", () => {
    const html = renderToStaticMarkup(createElement(GutterCalculator, {
      organizationId: "org", suggestions: [], saved: null, catalogVariants: [],
    }));
    expect(html).toContain("Ereszcsatorna-kalkulátor");
    expect(html).toContain("Új, még nem mentett számítás");
    expect(html).toContain("Számítás mentése");
    expect(html).toContain("Mentett számításaim");
    expect(html).not.toContain("Anyagkimutatás-piszkozat");
  });

  it("a felmérés ereszméréseit előtölti, és a forrásrevíziót jelzi", () => {
    const html = renderToStaticMarkup(createElement(GutterCalculator, {
      organizationId: "org", suggestions: [], saved: null, catalogVariants: [],
      initialInput: { gutterStockLengthMm: 3000, runs: [{ id: "survey-run", name: "Északi eresz", lengthMm: 8500, description: "", measurementSource: "site_measurement", roofEdge: null, bracketSpacingMm: 1000 }], downpipes: [], manualComponents: [] },
      handoffSource: { surveyId: "survey-id", revisionId: "revision-id", version: 3 },
    }));
    expect(html).toContain("Adatok átvéve a felmérésből");
    expect(html).toContain("Felmérés: survey-id · V3 · revízió: revision-id");
    expect(html).toContain("Északi eresz");
    expect(html).toContain('value="8500"');
    expect(html).toContain('value="1000"');
  });

  it("mentett számításnál az eredmény, rajz, katalógus és átadás olvasási sorrendjét megőrzi", () => {
    const input: GutterMaterialInput = { gutterStockLengthMm: 4000, runs: [{ id: "r1", name: "DEMO eresz", lengthMm: 5000, description: "DEMO", measurementSource: "demo", roofEdge: null, bracketSpacingMm: null }], downpipes: [], manualComponents: [] };
    const output = calculateGutterMaterial(input);
    const revision = { revisionId: "revision-1", revisionNumber: 1, input, output, createdAt: "2026-10-13T00:00:00Z" };
    const html = renderToStaticMarkup(createElement(GutterCalculator, {
      organizationId: "org", projectId: "project", suggestions: [], catalogVariants: [],
      saved: { calculationId: "calculation-1", ...revision, sourceRoofRevisionId: null, revisions: [revision] },
    }));
    expect(html).toContain("DEMO eresz");
    expect(html).toContain("Mentett aktuális változat · V1");
    expect(html.indexOf("Előzetes mennyiségek")).toBeLessThan(html.indexOf("Ereszcsatorna anyagbecslési séma"));
    expect(html.indexOf("Ereszcsatorna anyagbecslési séma")).toBeLessThan(html.indexOf("Anyagok hozzárendelése"));
    expect(html).toContain("Átadás megerősítése · új piszkozat");
    expect(html).toContain("legalább egy kompatibilis katalógusváltozatot");
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateGableTrapezoidalCovering } from "@/domain/calculations/gable-trapezoidal-covering";
import type { GableCoveringTakeoffOption } from "@/features/material-takeoffs/takeoff-data";
import type { SavedGableCovering, SavedGableCoveringRevision } from "./gable-trapezoidal-covering-data";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./gable-trapezoidal-covering-takeoff-actions", () => ({ createGableCoveringTakeoffAction: vi.fn() }));
import { GableCoveringTakeoffCreation } from "./gable-covering-takeoff-creation";

const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const input = { nominalSheetWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, selectedSheetLengthMm: 5_000, minimumSheetLengthMm: null, maximumSheetLengthMm: null, endAllowanceMm: null, longitudinalOverlapMm: null, lapCompatibilityConfirmed: false, maximumSheetCount: 100_000 };
const geometry = calculateGableRoof(geometryInput);
const covering = calculateGableTrapezoidalCovering(geometry, input);
const revision: SavedGableCoveringRevision = { revisionId: "covering-v1", revisionNumber: 1, scope: "project", input: { scope: "project", source: { mode: "project", projectId: "project", roofModelId: "roof", roofModelRevisionId: "roof-v1", geometryCalculationId: "geometry", geometryCalculationRevisionId: "geometry-v1", geometryInput }, coveringInput: input }, output: { geometry, covering }, provenance: { geometry: "saved_verified_roof_model_revision", coveringParameters: "user_provided", calculation: "server_recomputed", professionalApproval: false }, validationStatus: "estimated", createdAt: "2026-10-15T10:00:00Z" };
const saved: SavedGableCovering = { calculationId: "covering", organizationId: "org", projectId: "project", roofModelId: "roof", displayName: "DEMO fedés", currentRevisionId: "covering-v2", currentRevisionNumber: 2, revisions: [revision] };
const option: GableCoveringTakeoffOption = { id: "variant", productId: "product", productName: "DEMO lemez", productCode: null, productCategory: "roof_covering", variantName: "1100×1000×5000", purchasingUnit: "piece", nominalWidthMm: 1_100, effectiveWidthMm: 1_000, lengthMm: 5_000, provenance: "user_provided", sourceName: "DEMO user mapping", latestPrice: null };
const props = { organizationId: "org", projectId: "project", projectName: "DEMO projekt", roofModelId: "roof", currentRoofRevisionId: "roof-v2", currentRoofRevisionNumber: 2, saved, revision, dirty: false, unsavedRoofGeometry: false, options: [option] };

describe("fedési takeoff megerősítés", () => {
  it("a kiválasztott V1 snapshotot, 20 darabot, méreteket, stale forrást és árat mutatja", () => {
    const html = renderToStaticMarkup(createElement(GableCoveringTakeoffCreation, props));
    expect(html).toContain("Anyagkimutatás készítése");
    expect(html).toContain("V1 · covering-v1");
    expect(html).toContain("20 db (piece)");
    expect(html).toContain("5000 mm");
    expect(html).toContain("1100 mm");
    expect(html).toContain("1000 mm");
    expect(html).toContain("történeti forrást őrzi meg");
    expect(html).toContain("DEMO lemez · 1100×1000×5000 · Tetőfedés · piece");
    expect(html).toContain("nem hoz létre árajánlatot");
  });

  it("unsaved szerkesztésnél csak explicit mentett revízió-jóváhagyás után enged megerősítést", () => {
    const html = renderToStaticMarkup(createElement(GableCoveringTakeoffCreation, { ...props, dirty: true }));
    expect(html).toContain("A lemezkiosztás ezt nem tartalmazza");
    expect(html).toContain("A pontos mentett revízió használatát választom");
    expect(html).toContain("Szerkesztések mentése előbb");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("Új piszkozat megerősítése");
  });

  it("ismert dimenzióban eltérő variánshoz nem kínál átadási műveletet", () => {
    const html = renderToStaticMarkup(createElement(GableCoveringTakeoffCreation, { ...props, options: [{ ...option, lengthMm: 4_000 }] }));
    expect(html).not.toContain("Anyagkimutatás készítése");
    expect(html).toContain("Nincs a mentett szélességekkel és lemezhosszal egyező db variáns");
  });
});

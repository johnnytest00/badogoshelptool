import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("./gable-trapezoidal-covering-actions", () => ({ saveGableTrapezoidalCovering: vi.fn(), readGableTrapezoidalCovering: vi.fn() }));
vi.mock("./gable-trapezoidal-covering-takeoff-actions", () => ({ createGableCoveringTakeoffAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
import { StandaloneGablePreview } from "./standalone-gable-preview";

describe("standalone gable geometry preview", () => {
  it("exposes only project-free geometry input until dimensions are supplied", () => {
    const html = renderToStaticMarkup(createElement(StandaloneGablePreview, { organizationId: "org" }));
    expect(html).toContain('aria-labelledby="standalone-gable-title"');
    expect(html).toContain('<h1 id="standalone-gable-title">Nyeregtető</h1>');
    expect(html).toContain("Önálló tetőgeometria");
    expect(html).toContain("Tetőemelkedés");
    expect(html).toContain('aria-label="Tetőmérési munkaterület"');
    expect(html).toContain("Add meg az összes méretet");
    expect(html).not.toContain("<button");
  });

  it("prefills explicit survey dimensions and retains the exact revision banner", () => {
    const html = renderToStaticMarkup(createElement(StandaloneGablePreview, {
      organizationId: "org", initialHandoff: { inputMode: "height", buildingLengthMm: "10000", buildingWidthMm: "8000", roofRiseMm: "3000", roofPitchDegrees: "", eaveOverhangMm: "0", frontGableOverhangMm: "0", rearGableOverhangMm: "0" },
      handoffSource: { surveyId: "survey-id", revisionId: "revision-id", version: 2 },
    }));
    expect(html).toContain("Méretek átvéve a felmérésből · V2");
    expect(html).toContain("Felmérés: survey-id · felmérésrevízió: revision-id · V2");
    expect(html).toContain('value="10000"');
    expect(html).toContain("Teljes tetőfelület");
    expect(html).toContain("technical-drawing is-compact");
    expect(html.indexOf("<form class=\"roof-form roof-measurement-inputs roof-form-grid-compact\"")).toBeLessThan(html.indexOf("technical-drawing is-compact"));
    expect(html.indexOf("technical-drawing is-compact")).toBeLessThan(html.indexOf("roof-results"));
  });

  it("prioritizes results over duplicate survey inputs and keeps geometry editing available", () => {
    const html = renderToStaticMarkup(createElement(StandaloneGablePreview, {
      organizationId: "org", embedded: true,
      initialHandoff: { inputMode: "height", buildingLengthMm: "10000", buildingWidthMm: "6000", roofRiseMm: "3000", roofPitchDegrees: "", eaveOverhangMm: "0", frontGableOverhangMm: "0", rearGableOverhangMm: "0" },
      handoffSource: { surveyId: "survey-id", revisionId: "revision-id", version: 2 },
    }));

    expect(html).toContain("Átvett tetőméretek");
    expect(html).toContain("Tetőméretek szerkesztése");
    expect(html).toContain("84,853 m²");
    expect(html).not.toContain('<input id="buildingLengthMm"');
    expect(html).toContain("technical-drawing is-compact");
  });
});

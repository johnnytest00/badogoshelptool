import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("./gable-trapezoidal-covering-actions", () => ({ saveGableTrapezoidalCovering: vi.fn(), readGableTrapezoidalCovering: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
import { StandaloneGablePreview } from "./standalone-gable-preview";

describe("standalone gable geometry preview", () => {
  it("exposes only project-free geometry input until dimensions are supplied", () => {
    const html = renderToStaticMarkup(createElement(StandaloneGablePreview, { organizationId: "org" }));
    expect(html).toContain("Nyeregtető geometria");
    expect(html).toContain("Tetőemelkedés");
    expect(html).toContain("projekt nélküli számítás");
    expect(html).not.toContain("<button");
  });
});

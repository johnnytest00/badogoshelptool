import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StandaloneGablePreview } from "./standalone-gable-preview";

describe("standalone gable geometry preview", () => {
  it("exposes only project-free geometry input until dimensions are supplied", () => {
    const html = renderToStaticMarkup(createElement(StandaloneGablePreview));
    expect(html).toContain("Nyeregtető geometria");
    expect(html).toContain("Tetőemelkedés");
    expect(html).toContain("projekt nélküli előnézet");
    expect(html).not.toContain("<button");
  });
});

import { describe, expect, it } from "vitest";
import { boundedPdfRenderScale, PDF_PREVIEW_MAX_PIXELS } from "./pdf-preview";

describe("PDF preview render limits", () => {
  it("keeps requested zoom when the canvas is below the pixel cap", () => {
    expect(boundedPdfRenderScale(1000, 1000, 2)).toBe(2);
  });

  it("reduces zoom to stay within the maximum canvas pixel count", () => {
    const scale = boundedPdfRenderScale(3000, 2000, 3);
    expect(3000 * scale * 2000 * scale).toBeLessThanOrEqual(PDF_PREVIEW_MAX_PIXELS);
    expect(scale).toBeLessThan(3);
  });
});

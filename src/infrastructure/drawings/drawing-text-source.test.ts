import { describe, expect, it } from "vitest";
import { drawingUncertainty } from "./drawing-text-source";
import { mapRotatedPoint, OCR_LIMITS, parseImageDimensions, recognizeImage } from "./ocr";

describe("drawing text source confidence", () => {
  it("marks low confidence OCR as ambiguous without assigning technical meaning", () => {
    expect(drawingUncertainty("ocr", 59)).toBe("ambiguous");
    expect(drawingUncertainty("ocr", 60)).toBe("unknown");
    expect(drawingUncertainty("ocr", 99)).toBe("unknown");
    expect(drawingUncertainty("pdf-text", null)).toBe("unknown");
  });
});

describe("OCR input guards", () => {
  it("rejects unsupported and oversized files before decoding", async () => {
    await expect(recognizeImage(new File(["not an image"], "sample.txt", { type: "text/plain" })))
      .rejects.toMatchObject({ code: "unsupported_file" });
    await expect(recognizeImage(new File([new Uint8Array(OCR_LIMITS.maxFileBytes + 1)], "large.png", { type: "image/png" })))
      .rejects.toMatchObject({ code: "file_too_large" });
  });

  it("honors cancellation before allocating the OCR worker", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(recognizeImage(new File(["fixture"], "sample.png", { type: "image/png" }), { signal: controller.signal }))
      .rejects.toMatchObject({ code: "cancelled" });
  });

  it("rejects oversized raster dimensions from headers before decoding", async () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47], 0);
    png.set([0x49, 0x48, 0x44, 0x52], 12);
    new DataView(png.buffer).setUint32(16, 4096);
    new DataView(png.buffer).setUint32(20, 2049);
    expect(parseImageDimensions(png, "image/png")).toEqual({ width: 4096, height: 2049 });
    await expect(recognizeImage(new File([png], "oversized.png", { type: "image/png" })))
      .rejects.toMatchObject({ code: "image_too_large" });
  });

  it.each([
    [0, 50, 50, 200, 100],
    [90, 50, 50, 100, 200],
    [180, 150, 50, 200, 100],
    [270, 50, 150, 100, 200],
  ] as const)("maps OCR crop coordinates back to the source at %i degrees", (rotation, x, y, width, height) => {
    expect(mapRotatedPoint(x, y, width, height, rotation)).toEqual({ x: 0.25, y: 0.5 });
  });
});

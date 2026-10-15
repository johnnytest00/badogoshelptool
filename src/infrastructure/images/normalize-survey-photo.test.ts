import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeSurveyPhoto } from "./normalize-survey-photo";

describe("survey photo normalization", () => {
  it("keeps a valid JPEG preview while removing embedded EXIF", async () => {
    const input = await sharp({ create: { width: 4, height: 3, channels: 3, background: "red" } })
      .jpeg().withExif({ IFD0: { ImageDescription: "DEMO location note" } }).toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const output = await normalizeSurveyPhoto(input, "image/jpeg");
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(4);
    expect(metadata.exif).toBeUndefined();
  });

  it("rejects content that contradicts its claimed type", async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: "blue" } }).png().toBuffer();
    await expect(normalizeSurveyPhoto(png, "image/jpeg")).rejects.toThrow("invalid_image_content");
  });

  it("rejects corrupt image bytes", async () => {
    await expect(normalizeSurveyPhoto(Uint8Array.from([0xff, 0xd8, 0xff]), "image/jpeg")).rejects.toThrow();
  });
});

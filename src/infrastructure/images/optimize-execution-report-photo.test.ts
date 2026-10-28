import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { optimizeExecutionReportPhoto } from "./optimize-execution-report-photo";

describe("execution report photo optimization", () => {
  it("downscales JPEG and removes EXIF before embedding", async () => {
    const input = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "blue" } }).jpeg().withExif({ IFD0: { ImageDescription: "DEMO" } }).toBuffer();
    const output = await optimizeExecutionReportPhoto(input, "image/jpeg");
    const metadata = await sharp(output).metadata();
    expect(metadata.width).toBe(2000);
    expect(metadata.height).toBe(1000);
    expect(metadata.exif).toBeUndefined();
  });

  it("preserves PNG format and never enlarges a small photo", async () => {
    const input = await sharp({ create: { width: 320, height: 180, channels: 4, background: "transparent" } }).png().toBuffer();
    const output = await optimizeExecutionReportPhoto(input, "image/png");
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(320);
    expect(metadata.height).toBe(180);
  });
});

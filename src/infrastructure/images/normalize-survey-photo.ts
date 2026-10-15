import sharp from "sharp";

const maxPixels = 40_000_000;
const maxBytes = 10 * 1024 * 1024;
const formats = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" } as const;

export async function normalizeSurveyPhoto(bytes: Uint8Array, mimeType: string): Promise<Buffer> {
  const expectedFormat = formats[mimeType as keyof typeof formats];
  if (!expectedFormat) throw new Error("unsupported_format");
  const processor = sharp(bytes, { limitInputPixels: maxPixels, failOn: "error" });
  const metadata = await processor.metadata();
  if (metadata.format !== expectedFormat || !metadata.width || !metadata.height || metadata.width * metadata.height > maxPixels || metadata.pages && metadata.pages > 1) {
    throw new Error("invalid_image_content");
  }
  // Re-encoding applies orientation while dropping EXIF, including GPS coordinates.
  const normalized = await processor.rotate().toFormat(expectedFormat).toBuffer();
  if (normalized.length < 1 || normalized.length > maxBytes) throw new Error("normalized_image_too_large");
  return normalized;
}

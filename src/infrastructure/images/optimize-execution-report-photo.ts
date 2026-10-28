import sharp from "sharp";

export async function optimizeExecutionReportPhoto(bytes: Uint8Array, mimeType: "image/jpeg" | "image/png") {
  const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true });
  return mimeType === "image/jpeg" ? image.jpeg({ quality: 84, mozjpeg: true }).toBuffer() : image.png({ compressionLevel: 9 }).toBuffer();
}

const maxPhotoBytes = 10 * 1024 * 1024;
const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateSurveyPhotoSelection(file: Pick<File, "name" | "type" | "size">): { ok: true } | { ok: false; error: string } {
  if (file.type === "image/heic" || file.type === "image/heif" || /\.hei[cf]$/i.test(file.name)) {
    return { ok: false, error: "HEIC/HEIF képet ez a telepítés nem tud biztonságosan átalakítani. Az iPhone Kamera beállításaiban válaszd a „Leginkább kompatibilis” formátumot, majd készíts új képet; meglévő képet JPEG-ként exportálj." };
  }
  if (!supportedTypes.has(file.type)) return { ok: false, error: "JPEG, PNG vagy WebP képet válassz. A fájlnév nem igazolja a kép típusát." };
  if (file.size < 1 || file.size > maxPhotoBytes) return { ok: false, error: "A fénykép mérete legfeljebb 10 MB lehet." };
  return { ok: true };
}

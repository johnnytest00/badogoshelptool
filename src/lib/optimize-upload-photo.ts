const maxSourceBytes = 10 * 1024 * 1024;
const maxUploadBytes = 3 * 1024 * 1024;
const maxDimension = 2560;

export async function optimizeUploadPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Csak JPEG, PNG vagy WebP kép tölthető fel.");
  if (!file.size || file.size > maxSourceBytes) throw new Error("A kiválasztott kép legfeljebb 10 MB lehet.");
  if (file.size <= 1024 * 1024) return { file, originalBytes: file.size, optimizedBytes: file.size, savedPercent: 0 };

  let output: File = file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("A kép böngészős feldolgozása nem érhető el.");
      context.drawImage(bitmap, 0, 0, width, height);
      const type = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("A kép tömörítése nem sikerült.")), type, type === "image/jpeg" ? 0.84 : undefined));
      if (file.type === "image/png" ? blob.size < file.size : blob.size < file.size * 0.97) {
        const name = file.name.replace(/\.[^.]+$/, "") + (type === "image/png" ? ".png" : ".jpg");
        output = new File([blob], name, { type, lastModified: file.lastModified });
      }
    } finally { bitmap.close(); }
  } catch (cause) {
    if (file.size > maxUploadBytes) throw new Error(cause instanceof Error && cause.message.includes("3 MB") ? cause.message : "A kép nem dolgozható fel a böngészőben; válassz kisebb képet (legfeljebb 3 MB).", { cause });
  }
  if (output.size > maxUploadBytes) throw new Error("A kép optimalizálás után is nagyobb 3 MB-nál. Válassz kisebb képet.");
  return { file: output, originalBytes: file.size, optimizedBytes: output.size, savedPercent: Math.max(0, (1 - output.size / file.size) * 100) };
}

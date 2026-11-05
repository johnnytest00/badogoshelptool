import { normalizeDrawingText } from "./pdf-text-normalizer";
import { createSourceDocumentId, drawingUncertainty, type DrawingTextSource } from "./drawing-text-source";
import { PDF_PROCESSING_LIMITS, PdfProcessingError } from "./pdf-text-extractor";
import { boundedPdfRenderScale, PDF_PREVIEW_MAX_PIXELS } from "./pdf-preview";

export const OCR_LIMITS = { maxFileBytes: 16 * 1024 * 1024, maxPixels: PDF_PREVIEW_MAX_PIXELS } as const;
export type OcrOptions = {
  signal?: AbortSignal;
  pageNumber?: number;
  rotationDegrees?: 0 | 90 | 180 | 270;
  region?: { x: number; y: number; width: number; height: number };
  scale?: 1 | 2;
  onProgress?: (status: string, progress: number) => void;
};

export class OcrProcessingError extends Error {
  constructor(readonly code: "unsupported_file" | "file_too_large" | "image_too_large" | "invalid_region" | "text_layer_available" | "cancelled" | "processing_failed") {
    super({
      unsupported_file: "Csak JPG, PNG és WebP kép, illetve PDF-oldal támogatott.",
      file_too_large: "A kép meghaladja a 16 MiB-os OCR-korlátot.",
      image_too_large: "A feldolgozott kép meghaladja a 8 megapixeles korlátot.",
      invalid_region: "A kijelölt részterület érvénytelen.",
      text_layer_available: "Az oldalon van PDF-szövegréteg; az OCR kihagyva.",
      cancelled: "Az OCR feldolgozása megszakadt.",
      processing_failed: "Az OCR feldolgozása nem sikerült.",
    }[code]);
    this.name = "OcrProcessingError";
  }
}

function checkSignal(signal?: AbortSignal) {
  if (signal?.aborted) throw new OcrProcessingError("cancelled");
}

function checkedRegion(region?: OcrOptions["region"]) {
  const value = region ?? { x: 0, y: 0, width: 1, height: 1 };
  if (![value.x, value.y, value.width, value.height].every(Number.isFinite) || value.x < 0 || value.y < 0 || value.width <= 0 || value.height <= 0 || value.x + value.width > 1 || value.y + value.height > 1) {
    throw new OcrProcessingError("invalid_region");
  }
  return value;
}

export function parseImageDimensions(data: Uint8Array, mimeType: string) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (mimeType === "image/png" && data.length >= 24 && data[0] === 0x89 && String.fromCharCode(...data.subarray(1, 4)) === "PNG" && String.fromCharCode(...data.subarray(12, 16)) === "IHDR") {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mimeType === "image/webp" && data.length >= 30 && String.fromCharCode(...data.subarray(0, 4)) === "RIFF" && String.fromCharCode(...data.subarray(8, 12)) === "WEBP") {
    const kind = String.fromCharCode(...data.subarray(12, 16));
    if (kind === "VP8X") return { width: 1 + data[24] + (data[25] << 8) + (data[26] << 16), height: 1 + data[27] + (data[28] << 8) + (data[29] << 16) };
    if (kind === "VP8 " && data.length >= 30 && data[23] === 0x9d && data[24] === 0x01 && data[25] === 0x2a) {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    if (kind === "VP8L" && data.length >= 25 && data[20] === 0x2f) {
      return { width: 1 + data[21] + ((data[22] & 0x3f) << 8), height: 1 + ((data[22] & 0xc0) >> 6) + (data[23] << 2) + ((data[24] & 0x0f) << 10) };
    }
  }
  if (mimeType === "image/jpeg" && data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
    const frameTypes = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 0xff) return null;
      while (data[offset] === 0xff) offset += 1;
      const marker = data[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > data.length) return null;
      if (frameTypes.has(marker) && length >= 7) return { height: view.getUint16(offset + 3), width: view.getUint16(offset + 5) };
      offset += length;
    }
  }
  return null;
}

function cropCanvas(source: HTMLCanvasElement, region: NonNullable<OcrOptions["region"]>, scale: 1 | 2) {
  const sx = Math.floor(region.x * source.width);
  const sy = Math.floor(region.y * source.height);
  const sw = Math.max(1, Math.ceil(region.width * source.width));
  const sh = Math.max(1, Math.ceil(region.height * source.height));
  const multiplier = Math.min(scale, Math.sqrt(OCR_LIMITS.maxPixels / (sw * sh)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(sw * multiplier));
  canvas.height = Math.max(1, Math.floor(sh * multiplier));
  const context = canvas.getContext("2d", { willReadFrequently: false });
  if (!context) throw new OcrProcessingError("processing_failed");
  context.imageSmoothingEnabled = multiplier > 1;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return { canvas, sx, sy, sw, sh };
}

export function mapRotatedPoint(x: number, y: number, width: number, height: number, rotation: number) {
  if (rotation === 90) return { x: y / height, y: 1 - x / width };
  if (rotation === 180) return { x: 1 - x / width, y: 1 - y / height };
  if (rotation === 270) return { x: 1 - y / height, y: x / width };
  return { x: x / width, y: y / height };
}

function rotateCanvas(source: HTMLCanvasElement, rotation: number) {
  if (rotation === 0) return source;
  const width = rotation % 180 === 0 ? source.width : source.height;
  const height = rotation % 180 === 0 ? source.height : source.width;
  const rotated = document.createElement("canvas");
  rotated.width = width;
  rotated.height = height;
  const context = rotated.getContext("2d");
  if (!context) throw new OcrProcessingError("processing_failed");
  context.translate(width / 2, height / 2);
  context.rotate(rotation * Math.PI / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return rotated;
}

async function recognize(canvas: HTMLCanvasElement, sourceDocumentId: string, pageNumber: number, options: OcrOptions, mapPoint: (x: number, y: number) => { x: number; y: number }) {
  checkSignal(options.signal);
  let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | undefined;
  let abortHandler: (() => void) | undefined;
  try {
    const { createWorker, OEM } = await import("tesseract.js");
    checkSignal(options.signal);
    worker = await createWorker("hun", OEM.LSTM_ONLY, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
      cacheMethod: "none",
      workerBlobURL: false,
      gzip: true,
      logger: ({ status, progress }) => options.onProgress?.(status, progress),
    });
    abortHandler = () => { void worker?.terminate(); };
    options.signal?.addEventListener("abort", abortHandler, { once: true });
    checkSignal(options.signal);
    const result = await worker.recognize(canvas, {}, { blocks: true });
    checkSignal(options.signal);
    const lines = (result.data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines));
    return lines.flatMap((line) => {
      const text = line.text.trim();
      if (!text) return [];
      const normalized = normalizeDrawingText(text);
      const confidence = Math.max(0, Math.min(100, line.confidence));
      const p0 = mapPoint(line.bbox.x0, line.bbox.y0);
      const p1 = mapPoint(line.bbox.x1, line.bbox.y1);
      const left = Math.min(p0.x, p1.x);
      const top = Math.min(p0.y, p1.y);
      const right = Math.max(p0.x, p1.x);
      const bottom = Math.max(p0.y, p1.y);
      return [{
        sourceDocumentId, pageNumber, originalText: text, ...normalized,
        method: "ocr" as const, engine: "tesseract.js@7.0.0" as const,
        confidence, uncertainty: drawingUncertainty("ocr", confidence), rotationDegrees: null,
        position: { x: left, y: top }, bounds: { x: left, y: top, width: right - left, height: bottom - top },
      }];
    });
  } catch (cause) {
    if (cause instanceof OcrProcessingError) throw cause;
    throw new OcrProcessingError(options.signal?.aborted ? "cancelled" : "processing_failed");
  } finally {
    if (abortHandler) options.signal?.removeEventListener("abort", abortHandler);
    if (worker) await worker.terminate().catch(() => undefined);
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function recognizeImage(file: File, options: OcrOptions = {}): Promise<DrawingTextSource[]> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new OcrProcessingError("unsupported_file");
  if (file.size > OCR_LIMITS.maxFileBytes) throw new OcrProcessingError("file_too_large");
  checkSignal(options.signal);
  const header = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
  const dimensions = parseImageDimensions(new Uint8Array(header), file.type);
  if (!dimensions) throw new OcrProcessingError("processing_failed");
  if (dimensions.width <= 0 || dimensions.height <= 0 || dimensions.width * dimensions.height > OCR_LIMITS.maxPixels) throw new OcrProcessingError("image_too_large");
  const rotation = options.rotationDegrees ?? 0;
  const bitmap = await createImageBitmap(file);
  const source = document.createElement("canvas");
  try {
    const outputWidth = rotation % 180 === 0 ? bitmap.width : bitmap.height;
    const outputHeight = rotation % 180 === 0 ? bitmap.height : bitmap.width;
    if (bitmap.width * bitmap.height > OCR_LIMITS.maxPixels || outputWidth * outputHeight > OCR_LIMITS.maxPixels) throw new OcrProcessingError("image_too_large");
    source.width = outputWidth;
    source.height = outputHeight;
    const context = source.getContext("2d");
    if (!context) throw new OcrProcessingError("processing_failed");
    context.translate(outputWidth / 2, outputHeight / 2);
    context.rotate(rotation * Math.PI / 180);
    context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    const region = checkedRegion(options.region);
    const { canvas, sx, sy, sw, sh } = cropCanvas(source, region, options.scale ?? 1);
    const sourceDocumentId = createSourceDocumentId();
    return await recognize(canvas, sourceDocumentId, 1, options, (x, y) => {
      const rotated = mapRotatedPoint(sx + x / canvas.width * sw, sy + y / canvas.height * sh, source.width, source.height, rotation);
      return rotated;
    });
  } catch (cause) {
    if (cause instanceof OcrProcessingError) throw cause;
    throw new OcrProcessingError("processing_failed");
  } finally {
    bitmap.close();
    source.width = 0;
    source.height = 0;
  }
}

export async function recognizePdfPage(data: Uint8Array, pageNumber: number, options: OcrOptions = {}): Promise<DrawingTextSource[]> {
  if (data.byteLength > PDF_PROCESSING_LIMITS.maxFileBytes) throw new PdfProcessingError("file_too_large");
  checkSignal(options.signal);
  let loadingTask: { promise: Promise<unknown>; destroy(): Promise<void> } | undefined;
  let page: { getViewport(options: { scale: number }): { width: number; height: number }; getTextContent(): Promise<{ items: Array<{ str?: string }> }>; render(options: { canvas: HTMLCanvasElement; viewport: { width: number; height: number } }): { promise: Promise<void>; cancel(): void }; cleanup(): void } | undefined;
  let renderTask: { promise: Promise<void>; cancel(): void } | undefined;
  let abortHandler: (() => void) | undefined;
  let cropSource: HTMLCanvasElement | undefined;
  let ocrCanvas: HTMLCanvasElement | undefined;
  const canvas = document.createElement("canvas");
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    loadingTask = pdfjs.getDocument({ data: data.slice(), verbosity: 0 });
    abortHandler = () => {
      try { renderTask?.cancel(); } catch { /* render task already settled */ }
      void loadingTask?.destroy().catch(() => undefined);
    };
    options.signal?.addEventListener("abort", abortHandler, { once: true });
    const documentProxy = await loadingTask.promise as { numPages: number; getPage(number: number): Promise<typeof page> };
    checkSignal(options.signal);
    if (pageNumber < 1 || pageNumber > documentProxy.numPages) throw new OcrProcessingError("processing_failed");
    page = await documentProxy.getPage(pageNumber) ?? undefined;
    if (!page) throw new OcrProcessingError("processing_failed");
    const content = await page.getTextContent();
    if (content.items.some((item) => item.str?.trim())) throw new OcrProcessingError("text_layer_available");
    const base = page.getViewport({ scale: 1 });
    const scale = boundedPdfRenderScale(base.width, base.height, 2);
    const viewport = page.getViewport({ scale });
    if (Math.ceil(viewport.width) * Math.ceil(viewport.height) > OCR_LIMITS.maxPixels) throw new OcrProcessingError("image_too_large");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    renderTask = page.render({ canvas, viewport });
    await renderTask.promise;
    checkSignal(options.signal);
    const region = checkedRegion(options.region);
    const crop = cropCanvas(canvas, region, options.scale ?? 1);
    cropSource = crop.canvas;
    ocrCanvas = rotateCanvas(crop.canvas, options.rotationDegrees ?? 0);
    const rotation = options.rotationDegrees ?? 0;
    const id = createSourceDocumentId();
    return await recognize(ocrCanvas, id, pageNumber, options, (x, y) => {
      const original = mapRotatedPoint(x, y, ocrCanvas!.width, ocrCanvas!.height, rotation);
      return { x: (crop.sx + original.x * crop.sw) / canvas.width, y: (crop.sy + original.y * crop.sh) / canvas.height };
    });
  } catch (cause) {
    if (cause instanceof OcrProcessingError || cause instanceof PdfProcessingError) throw cause;
    throw new OcrProcessingError(options.signal?.aborted ? "cancelled" : "processing_failed");
  } finally {
    if (abortHandler) options.signal?.removeEventListener("abort", abortHandler);
    page?.cleanup();
    await loadingTask?.destroy().catch(() => undefined);
    canvas.width = 0;
    canvas.height = 0;
    if (cropSource && cropSource !== ocrCanvas) {
      cropSource.width = 0;
      cropSource.height = 0;
    }
  }
}

import { PdfProcessingError, type PdfProcessOptions } from "./pdf-text-extractor";

export const PDF_PREVIEW_MAX_PIXELS = 8_000_000;

export function boundedPdfRenderScale(width: number, height: number, requestedScale: number) {
  if (![width, height, requestedScale].every(Number.isFinite) || width <= 0 || height <= 0 || requestedScale <= 0) {
    throw new PdfProcessingError("processing_failed");
  }
  const pixelCount = (scale: number) => Math.ceil(width * scale) * Math.ceil(height * scale);
  if (pixelCount(requestedScale) <= PDF_PREVIEW_MAX_PIXELS) return requestedScale;
  let low = 0;
  let high = requestedScale;
  for (let iteration = 0; iteration < 32; iteration += 1) {
    const mid = (low + high) / 2;
    if (pixelCount(mid) <= PDF_PREVIEW_MAX_PIXELS) low = mid;
    else high = mid;
  }
  return low;
}

type PdfPreviewOptions = Pick<PdfProcessOptions, "rotationOffset"> & {
  pageNumber: number;
  zoom: number;
  signal?: AbortSignal;
};

type PdfPreviewPage = {
  rotate: number;
  getViewport(options: { scale: number; rotation: number }): { width: number; height: number };
  render(options: { canvas: HTMLCanvasElement; viewport: { width: number; height: number } }): { promise: Promise<void>; cancel(extraDelay?: number): void };
  cleanup(): void;
};

export async function renderPdfPage(data: Uint8Array, canvas: HTMLCanvasElement, options: PdfPreviewOptions) {
  const { pageNumber, zoom, rotationOffset = 0, signal } = options;
  if (typeof window === "undefined") throw new PdfProcessingError("processing_failed");
  if (signal?.aborted) throw new PdfProcessingError("cancelled");

  let loadingTask: { promise: Promise<unknown>; destroy(): Promise<void> } | undefined;
  let page: PdfPreviewPage | undefined;
  let abortHandler: (() => void) | undefined;
  let renderTask: { promise: Promise<unknown>; cancel(extraDelay?: number): void } | undefined;
  try {
    const pdfjs = await import("pdfjs-dist");
    if (signal?.aborted) throw new PdfProcessingError("cancelled");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    if (![0, 90, 180, 270].includes(rotationOffset)) throw new PdfProcessingError("invalid_rotation");
    loadingTask = pdfjs.getDocument({ data: data.slice(), verbosity: 0 });
    abortHandler = () => {
      try { renderTask?.cancel(); } catch { /* render task already settled */ }
      void loadingTask?.destroy().catch(() => undefined);
    };
    signal?.addEventListener("abort", abortHandler, { once: true });
    const document = await loadingTask.promise as Awaited<typeof loadingTask.promise> & {
      numPages: number;
      getPage(number: number): Promise<PdfPreviewPage>;
    };
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > document.numPages) throw new PdfProcessingError("processing_failed");
    page = await document.getPage(pageNumber);
    const rotationDegrees = (page.rotate + rotationOffset) % 360;
    const size = page.getViewport({ scale: 1, rotation: rotationDegrees });
    const scale = boundedPdfRenderScale(size.width, size.height, zoom);
    const viewport = page.getViewport({ scale, rotation: rotationDegrees });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const activeRender = page.render({ canvas, viewport });
    renderTask = activeRender;
    await activeRender.promise;
    if (signal?.aborted) throw new PdfProcessingError("cancelled");
    return { width: canvas.width, height: canvas.height, scale, rotationDegrees };
  } catch (error) {
    if (error instanceof PdfProcessingError) throw error;
    throw new PdfProcessingError(signal?.aborted ? "cancelled" : "processing_failed");
  } finally {
    if (abortHandler) signal?.removeEventListener("abort", abortHandler);
    page?.cleanup();
    await loadingTask?.destroy().catch(() => undefined);
  }
}

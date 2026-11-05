import { normalizeDrawingText } from "./pdf-text-normalizer";
import { createSourceDocumentId, drawingUncertainty, type DrawingTextSource } from "./drawing-text-source";

export const PDF_PROCESSING_LIMITS = {
  maxFileBytes: 32 * 1024 * 1024,
  maxPages: 100,
  maxTextItems: 100_000,
  maxTextCharacters: 5 * 1024 * 1024,
  maxTokens: 200_000,
} as const;

export type PdfProcessingErrorCode =
  | "invalid_pdf"
  | "password_required"
  | "file_too_large"
  | "too_many_pages"
  | "document_too_complex"
  | "cancelled"
  | "invalid_rotation"
  | "processing_failed";

const errorMessages: Record<PdfProcessingErrorCode, string> = {
  invalid_pdf: "A PDF sérült vagy nem olvasható.",
  password_required: "A jelszóval védett PDF nem támogatott.",
  file_too_large: "A PDF meghaladja a 32 MiB-os feldolgozási korlátot.",
  too_many_pages: "A PDF meghaladja a 100 oldalas feldolgozási korlátot.",
  document_too_complex: "A PDF szövegrétege meghaladja a feldolgozási korlátot.",
  cancelled: "A PDF feldolgozása megszakadt.",
  invalid_rotation: "A forgatás csak 0, 90, 180 vagy 270 fok lehet.",
  processing_failed: "A PDF feldolgozása nem sikerült.",
};

export class PdfProcessingError extends Error {
  constructor(readonly code: PdfProcessingErrorCode) {
    super(errorMessages[code]);
    this.name = "PdfProcessingError";
  }
}

export type PdfTextBounds = { x: number; y: number; width: number; height: number };

export type PdfTextSpan = DrawingTextSource;

export type PdfTextPage = {
  pageNumber: number;
  widthPoints: number;
  heightPoints: number;
  rotationDegrees: number;
  textSpans: PdfTextSpan[];
};

export type PdfDocumentText = {
  sourceDocumentId: string;
  pageCount: number;
  pages: PdfTextPage[];
};

export type PdfProgress = { completedPages: number; totalPages: number };

export type PdfProcessOptions = {
  signal?: AbortSignal;
  rotationOffset?: 0 | 90 | 180 | 270;
  onProgress?: (progress: PdfProgress) => void;
};

type Point = { x: number; y: number };

function finitePoint(point: Point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function pointInPage(point: Point, width: number, height: number) {
  return finitePoint(point) && point.x >= 0 && point.y >= 0 && point.x <= width && point.y <= height;
}

function normalizeAngle(degrees: number) {
  return (degrees % 360 + 360) % 360;
}

function mapPdfError(error: unknown, signal?: AbortSignal): PdfProcessingError {
  if (error instanceof PdfProcessingError) return error;
  if (signal?.aborted || (error as { name?: string } | null)?.name === "AbortException") return new PdfProcessingError("cancelled");
  const pdfError = error as { name?: string; code?: number } | null;
  if (pdfError?.name === "PasswordException") return new PdfProcessingError("password_required");
  if (["InvalidPDFException", "MissingPDFException", "UnexpectedResponseException"].includes(pdfError?.name ?? "")) return new PdfProcessingError("invalid_pdf");
  return new PdfProcessingError("processing_failed");
}

function textSpan(item: { str: string; transform: number[]; width: number; height: number }, viewport: { width: number; height: number; convertToViewportPoint(x: number, y: number): [number, number] }, normalizedText: ReturnType<typeof normalizeDrawingText>): Omit<DrawingTextSource, "sourceDocumentId" | "pageNumber"> {
  const [a, b, c, d, sourceX, sourceY] = item.transform;
  const start = viewport.convertToViewportPoint(sourceX, sourceY);
  const position = pointInPage({ x: start[0], y: start[1] }, viewport.width, viewport.height)
    ? { x: start[0] / viewport.width, y: start[1] / viewport.height }
    : null;
  const baselineLength = Math.hypot(a, b);
  let rotationDegrees: number | null = null;
  if (baselineLength > 0 && Number.isFinite(baselineLength)) {
    const unitX = a / baselineLength;
    const unitY = b / baselineLength;
    const next = viewport.convertToViewportPoint(sourceX + unitX, sourceY + unitY);
    if (Number.isFinite(next[0]) && Number.isFinite(next[1])) {
      rotationDegrees = normalizeAngle(Math.atan2(next[1] - start[1], next[0] - start[0]) * 180 / Math.PI);
    }
  }

  const verticalLength = Math.hypot(c, d);
  let bounds: PdfTextBounds | null = null;
  if (position && baselineLength > 0 && verticalLength > 0 && item.width > 0 && item.height > 0
    && [baselineLength, verticalLength, item.width, item.height].every(Number.isFinite)) {
    const ux = a / baselineLength;
    const uy = b / baselineLength;
    const vx = c / verticalLength;
    const vy = d / verticalLength;
    const sourceCorners = [
      [sourceX, sourceY],
      [sourceX + ux * item.width, sourceY + uy * item.width],
      [sourceX + ux * item.width + vx * item.height, sourceY + uy * item.width + vy * item.height],
      [sourceX + vx * item.height, sourceY + vy * item.height],
    ] as const;
    const corners = sourceCorners.map(([x, y]) => {
      const [pointX, pointY] = viewport.convertToViewportPoint(x, y);
      return { x: pointX, y: pointY };
    });
    if (corners.every((point) => pointInPage(point, viewport.width, viewport.height))) {
      const left = Math.min(...corners.map(({ x }) => x));
      const top = Math.min(...corners.map(({ y }) => y));
      const right = Math.max(...corners.map(({ x }) => x));
      const bottom = Math.max(...corners.map(({ y }) => y));
      if (right > left && bottom > top) bounds = {
        x: left / viewport.width,
        y: top / viewport.height,
        width: (right - left) / viewport.width,
        height: (bottom - top) / viewport.height,
      };
    }
  }

  return {
    originalText: item.str,
    ...normalizedText,
    method: "pdf-text",
    engine: "pdfjs-dist@6.4.299",
    confidence: null,
    uncertainty: drawingUncertainty("pdf-text", null),
    rotationDegrees,
    position,
    bounds,
  };
}

export async function processPdfDocument(data: Uint8Array, options: PdfProcessOptions = {}): Promise<PdfDocumentText> {
  const { signal, onProgress, rotationOffset = 0 } = options;
  const sourceDocumentId = createSourceDocumentId();
  if (![0, 90, 180, 270].includes(rotationOffset)) throw new PdfProcessingError("invalid_rotation");
  if (signal?.aborted) throw new PdfProcessingError("cancelled");
  if (data.byteLength < 5) throw new PdfProcessingError("invalid_pdf");
  if (data.byteLength > PDF_PROCESSING_LIMITS.maxFileBytes) throw new PdfProcessingError("file_too_large");

  let loadingTask: { promise: Promise<unknown>; destroy(): Promise<void> } | undefined;
  let abortHandler: (() => void) | undefined;
  try {
    const pdfjs = typeof window === "undefined"
      ? await import("pdfjs-dist/legacy/build/pdf.mjs")
      : await import("pdfjs-dist");

    if (signal?.aborted) throw new PdfProcessingError("cancelled");
    if (typeof window !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    }

    loadingTask = pdfjs.getDocument({ data: data.slice(), verbosity: 0 });
    abortHandler = () => { void loadingTask?.destroy().catch(() => undefined); };
    signal?.addEventListener("abort", abortHandler, { once: true });
    const document = await loadingTask.promise as Awaited<typeof loadingTask.promise> & {
      numPages: number;
      getPage(pageNumber: number): Promise<{
        rotate: number;
        getViewport(options: { scale: number; rotation: number }): { width: number; height: number; convertToViewportPoint(x: number, y: number): [number, number] };
        streamTextContent(): ReadableStream<unknown>;
        cleanup(): void;
      }>;
    };
    if (document.numPages < 1) throw new PdfProcessingError("invalid_pdf");
    if (document.numPages > PDF_PROCESSING_LIMITS.maxPages) throw new PdfProcessingError("too_many_pages");

    const pages: PdfTextPage[] = [];
    let textItemCount = 0;
    let textCharacterCount = 0;
    let tokenCount = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      if (signal?.aborted) throw new PdfProcessingError("cancelled");
      const page = await document.getPage(pageNumber);
      try {
        const rotationDegrees = normalizeAngle(page.rotate + rotationOffset);
        const viewport = page.getViewport({ scale: 1, rotation: rotationDegrees });
        const textSpans: PdfTextSpan[] = [];
        const reader = page.streamTextContent().getReader();
        try {
          while (true) {
            if (signal?.aborted) throw new PdfProcessingError("cancelled");
            const chunk = await reader.read();
            if (chunk.done) {
              break;
            }
            const items = (chunk.value as { items?: Array<{ str?: string; transform?: number[]; width?: number; height?: number }> }).items ?? [];
            for (const item of items) {
              if (!("str" in item) || !item.str || !item.transform || typeof item.width !== "number" || typeof item.height !== "number") continue;
              textItemCount += 1;
              textCharacterCount += item.str.length;
              if (textItemCount > PDF_PROCESSING_LIMITS.maxTextItems || textCharacterCount > PDF_PROCESSING_LIMITS.maxTextCharacters) {
                throw new PdfProcessingError("document_too_complex");
              }
              let normalizedText: ReturnType<typeof normalizeDrawingText>;
              try {
                normalizedText = normalizeDrawingText(item.str, PDF_PROCESSING_LIMITS.maxTokens - tokenCount);
              } catch (error) {
                if (error instanceof RangeError) throw new PdfProcessingError("document_too_complex");
                throw error;
              }
              tokenCount += normalizedText.tokens.length;
              textSpans.push({ ...textSpan(item as { str: string; transform: number[]; width: number; height: number }, viewport, normalizedText), sourceDocumentId, pageNumber });
            }
          }
        } finally {
          // Destroying the loading task aborts PDF.js streams; cancelling the reader races its worker controller.
          reader.releaseLock();
        }
        pages.push({ pageNumber, widthPoints: viewport.width, heightPoints: viewport.height, rotationDegrees, textSpans });
      } finally {
        page.cleanup();
      }
      onProgress?.({ completedPages: pageNumber, totalPages: document.numPages });
    }
    return { sourceDocumentId, pageCount: document.numPages, pages };
  } catch (error) {
    throw mapPdfError(error, signal);
  } finally {
    if (abortHandler) signal?.removeEventListener("abort", abortHandler);
    await loadingTask?.destroy().catch(() => undefined);
  }
}

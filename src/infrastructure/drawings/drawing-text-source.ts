import type { DrawingTextToken } from "./pdf-text-normalizer";

export type DrawingTextMethod = "pdf-text" | "ocr";
export type DrawingTextUncertainty = "unknown" | "ambiguous";
export type DrawingTextSource = {
  sourceDocumentId: string;
  pageNumber: number;
  originalText: string;
  normalizedText: string;
  tokens: DrawingTextToken[];
  method: DrawingTextMethod;
  engine: "pdfjs-dist@6.4.299" | "tesseract.js@7.0.0";
  confidence: number | null;
  uncertainty: DrawingTextUncertainty;
  rotationDegrees: number | null;
  position: { x: number; y: number } | null;
  bounds: { x: number; y: number; width: number; height: number } | null;
};

export function drawingUncertainty(method: DrawingTextMethod, confidence: number | null): DrawingTextUncertainty {
  return method === "ocr" && confidence !== null && confidence < 60 ? "ambiguous" : "unknown";
}

export function createSourceDocumentId() {
  return crypto.randomUUID();
}

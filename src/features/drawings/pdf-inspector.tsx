"use client";

import { useEffect, useRef, useState } from "react";
import { PDF_PROCESSING_LIMITS, PdfProcessingError, processPdfDocument, type PdfDocumentText, type PdfTextSpan } from "@/infrastructure/drawings/pdf-text-extractor";
import { renderPdfPage } from "@/infrastructure/drawings/pdf-preview";
import { recognizeImage, recognizePdfPage, OcrProcessingError, type OcrOptions } from "@/infrastructure/drawings/ocr";
import type { DrawingTextSource } from "@/infrastructure/drawings/drawing-text-source";

type RotationOffset = 0 | 90 | 180 | 270;

function drawTextOverlay(canvas: HTMLCanvasElement, spans: PdfTextSpan[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = Math.max(1, canvas.width / 1200);
  for (const span of spans) {
    if (span.bounds) {
      context.strokeStyle = "rgba(220, 38, 38, 0.8)";
      context.strokeRect(span.bounds.x * canvas.width, span.bounds.y * canvas.height, span.bounds.width * canvas.width, span.bounds.height * canvas.height);
    }
    if (span.position) {
      context.beginPath();
      context.fillStyle = "#dc2626";
      context.arc(span.position.x * canvas.width, span.position.y * canvas.height, Math.max(2, canvas.width / 600), 0, Math.PI * 2);
      context.fill();
    }
  }
}

export default function PdfInspector() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const bytesRef = useRef<Uint8Array | null>(null);
  const processingRef = useRef<AbortController | null>(null);
  const [result, setResult] = useState<PdfDocumentText | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [rotationOffset, setRotationOffset] = useState<RotationOffset>(0);
  const [zoom, setZoom] = useState(1);
  const [selectedSpanIndex, setSelectedSpanIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Válassz egy helyi PDF-et. A feldolgozás csak a böngésző memóriájában történik.");
  const [error, setError] = useState<string | null>(null);
  const [renderInfo, setRenderInfo] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrResults, setOcrResults] = useState<DrawingTextSource[]>([]);
  const [ocrRotation, setOcrRotation] = useState<OcrOptions["rotationDegrees"]>(0);
  const [ocrScale, setOcrScale] = useState<1 | 2>(1);
  const [roi, setRoi] = useState({ x: 0, y: 0, width: 100, height: 100 });

  const page = result?.pages[pageNumber - 1] ?? null;
  const selectedSpan = page?.textSpans[selectedSpanIndex] ?? null;
  async function processBytes(bytes: Uint8Array, rotation: RotationOffset) {
    processingRef.current?.abort();
    const controller = new AbortController();
    processingRef.current = controller;
    setResult(null);
    setBusy(true);
    setError(null);
    setRenderInfo(null);
    setPageNumber(1);
    setSelectedSpanIndex(0);
    setStatus("PDF.js feldolgozás…");
    try {
      const processed = await processPdfDocument(bytes, {
        signal: controller.signal,
        rotationOffset: rotation,
        onProgress: ({ completedPages, totalPages }) => setStatus(`Feldolgozás: ${completedPages}/${totalPages} oldal.`),
      });
      setResult(processed);
      const spanCount = processed.pages.reduce((total, item) => total + item.textSpans.length, 0);
      setStatus(`Kész: ${processed.pageCount} oldal, ${spanCount} szövegelem; a PDF csak memóriában maradt.`);
    } catch (cause) {
      const processingError = cause instanceof PdfProcessingError ? cause : new PdfProcessingError("processing_failed");
      if (processingError.code === "cancelled") setStatus("A feldolgozás megszakadt.");
      else {
        setError(processingError.message);
        setStatus("A feldolgozás nem fejeződött be.");
      }
    } finally {
      if (processingRef.current === controller) {
        processingRef.current = null;
        setBusy(false);
      }
    }
  }

  async function runOcr() {
    processingRef.current?.abort();
    const controller = new AbortController();
    processingRef.current = controller;
    setBusy(true);
    setError(null);
    setOcrResults([]);
    setStatus("Tesseract helyi worker indul…");
    const options = {
      signal: controller.signal,
      rotationDegrees: ocrRotation,
      scale: ocrScale,
      region: { x: roi.x / 100, y: roi.y / 100, width: roi.width / 100, height: roi.height / 100 },
      onProgress: (stage: string, progress: number) => setStatus(`${stage}: ${Math.round(progress * 100)}%`),
    } satisfies OcrOptions;
    try {
      const spans = imageFile
        ? await recognizeImage(imageFile, options)
        : bytesRef.current && page && page.textSpans.length === 0
          ? await recognizePdfPage(bytesRef.current, pageNumber, options)
          : [];
      setOcrResults(spans);
      setStatus(`OCR kész: ${spans.length} szövegsor; ellenőrizetlen felismerés, nincs műszaki besorolás.`);
    } catch (cause) {
      const ocrError = cause instanceof OcrProcessingError ? cause : null;
      if (controller.signal.aborted || ocrError?.code === "cancelled") setStatus("Az OCR megszakadt.");
      else {
        setError(ocrError?.message ?? "Az OCR feldolgozása nem sikerült.");
        setStatus("Az OCR nem fejeződött be.");
      }
    } finally {
      if (processingRef.current === controller) {
        processingRef.current = null;
        setBusy(false);
      }
    }
  }

  useEffect(() => () => processingRef.current?.abort(), []);

  useEffect(() => {
    if (!page || !bytesRef.current || !canvasRef.current || !overlayRef.current) return;
    let active = true;
    const controller = new AbortController();
    const bytes = bytesRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    void renderPdfPage(bytes, canvas, { pageNumber, zoom, rotationOffset, signal: controller.signal })
      .then(({ width, height, scale, rotationDegrees }) => {
        if (!active) return;
        overlay.width = width;
        overlay.height = height;
        drawTextOverlay(overlay, page.textSpans);
        setRenderInfo(`Előnézet: ${rotationDegrees}°, ${scale.toFixed(2)}×, ${width}×${height} px.`);
      })
      .catch((cause) => {
        if (!active || (cause instanceof PdfProcessingError && cause.code === "cancelled")) return;
        setError(cause instanceof PdfProcessingError ? cause.message : new PdfProcessingError("processing_failed").message);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [page, pageNumber, rotationOffset, zoom]);

  async function handleFile(file: File | undefined) {
    processingRef.current?.abort();
    bytesRef.current = null;
    setImageFile(null);
    setResult(null);
    setOcrResults([]);
    setError(null);
    if (!file) return;
    if (file.size > PDF_PROCESSING_LIMITS.maxFileBytes) {
      setError(new PdfProcessingError("file_too_large").message);
      setStatus("A fájl mérete meghaladja a korlátot.");
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      bytesRef.current = bytes;
      setRotationOffset(0);
      await processBytes(bytes, 0);
    } catch {
      setError("A helyi PDF nem olvasható.");
      setStatus("A fájl feldolgozása nem indult el.");
    }
  }

  async function loadSynthetic(name: "synthetic-drawing.png" | "synthetic-scanned-drawing.pdf" | "sketch-readable.png" | "sketch-ambiguous.png" | "sketch-missing-label.png") {
    try {
      const response = await fetch(`/ocr/fixtures/${name}`);
      if (!response.ok) throw new Error("fixture_unavailable");
      const blob = await response.blob();
      const file = new File([blob], `DEMO-${name}`, { type: blob.type });
      if (name.endsWith(".pdf")) {
        setImageFile(null);
        await handleFile(file);
      } else {
        bytesRef.current = null;
        setResult(null);
        setOcrResults([]);
        setImageFile(file);
        setStatus("DEMO kép betöltve; készen áll helyi OCR-re.");
      }
    } catch {
      setError("A jogtiszta szintetikus fixture nem érhető el.");
    }
  }

  function rotatePreview() {
    const bytes = bytesRef.current;
    if (!bytes) return;
    const nextRotation = ((rotationOffset + 90) % 360) as RotationOffset;
    setRotationOffset(nextRotation);
    void processBytes(bytes, nextRotation);
  }

  return (
    <main style={{ maxWidth: 1200, margin: "24px auto", padding: 20, fontFamily: "sans-serif", color: "#202124" }}>
      <h1>M12.2 PDF és OCR diagnosztika</h1>
      <p>Fejlesztői ellenőrző felület. A fájlok helyi böngészőmemóriában maradnak; nincs feltöltés, mentés vagy kalkulátorkitöltés.</p>
      <label>Helyi PDF kiválasztása <input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => void handleFile(event.currentTarget.files?.[0])} /></label>
      <button type="button" disabled={busy} onClick={() => void loadSynthetic("synthetic-scanned-drawing.pdf")}>DEMO szkennelt PDF</button>
      <label style={{ display: "block", marginTop: 8 }}>Helyi JPG / PNG / WebP kép <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { setImageFile(event.currentTarget.files?.[0] ?? null); setOcrResults([]); }} /></label>
      <button type="button" disabled={busy} onClick={() => void loadSynthetic("synthetic-drawing.png")}>DEMO szintetikus kép</button>{" "}
      <button type="button" disabled={busy} onClick={() => void loadSynthetic("sketch-readable.png")}>DEMO kézi A</button>{" "}
      <button type="button" disabled={busy} onClick={() => void loadSynthetic("sketch-ambiguous.png")}>DEMO kézi B</button>{" "}
      <button type="button" disabled={busy} onClick={() => void loadSynthetic("sketch-missing-label.png")}>DEMO kézi C</button>
      <fieldset style={{ maxWidth: 900, margin: "12px 0" }}>
        <legend>OCR opciók</legend>
        <label>Forgatás <select value={ocrRotation} disabled={busy} onChange={(event) => setOcrRotation(Number(event.target.value) as OcrOptions["rotationDegrees"])}>{[0, 90, 180, 270].map((value) => <option key={value} value={value}>{value}°</option>)}</select></label>{" "}
        <label>Részlet nagyítása <select value={ocrScale} disabled={busy} onChange={(event) => setOcrScale(Number(event.target.value) as 1 | 2)}><option value={1}>1×</option><option value={2}>2×</option></select></label>{" "}
        {(["x", "y", "width", "height"] as const).map((key) => <label key={key} style={{ marginLeft: 8 }}>{key}% <input aria-label={`${key} százalék`} type="number" min={0} max={100} value={roi[key]} disabled={busy} onChange={(event) => setRoi((current) => ({ ...current, [key]: Number(event.target.value) }))} style={{ width: 70 }} /></label>)}
          <button type="button" disabled={busy || (!imageFile && (!page || page.textSpans.length > 0))} onClick={() => void runOcr()} style={{ marginLeft: 8 }}>{imageFile ? "Kép OCR" : "Szkennelt oldal OCR"}</button>
      </fieldset>
      <p role="status">{status}</p>
      {error && <p role="alert">{error}</p>}
      {busy && <button type="button" onClick={() => processingRef.current?.abort()}>Megszakítás</button>}
      {result && page && <>
        <section aria-label="PDF vezérlők" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", margin: "16px 0" }}>
          <label>Oldal <select aria-label="Oldal" value={pageNumber} disabled={busy} onChange={(event) => { setPageNumber(Number(event.target.value)); setSelectedSpanIndex(0); }}>
            {result.pages.map((item) => <option key={item.pageNumber} value={item.pageNumber}>{item.pageNumber}</option>)}
          </select></label>
          <label>Nagyítás <select aria-label="Nagyítás" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
            {[0.5, 1, 1.5, 2, 4].map((value) => <option key={value} value={value}>{value * 100}%</option>)}
          </select></label>
          <button type="button" disabled={busy} onClick={rotatePreview}>Forgatás +90°</button>
          <span>{page.widthPoints.toFixed(2)} × {page.heightPoints.toFixed(2)} pt; PDF-forgatás {page.rotationDegrees}°; {page.textSpans.length} szövegelem.</span>
        </section>
        <p>Az apró piros pontok a PDF.js szövegkezdőpontjai; a piros keret a PDF.js szövegmetrikáiból számolt futam-befoglaló.</p>
        <div style={{ position: "relative", width: "min(100%, 1000px)", border: "1px solid #a1a1aa", marginBottom: 12 }}>
          <canvas ref={canvasRef} aria-label={`PDF ${pageNumber}. oldal előnézete`} style={{ display: "block", width: "100%", height: "auto" }} />
          <canvas ref={overlayRef} aria-hidden="true" style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "auto", pointerEvents: "none" }} />
        </div>
        {renderInfo && <p role="status">{renderInfo}</p>}
        <fieldset style={{ maxWidth: 600, marginTop: 16 }}>
          <legend>Forráspozíció ellenőrzése</legend>
          {page.textSpans.length > 0 ? <>
            <label>Szövegelem sorszáma <input type="number" min={1} max={page.textSpans.length} value={selectedSpanIndex + 1} onChange={(event) => {
              const index = Number(event.target.value) - 1;
              if (Number.isInteger(index) && index >= 0 && index < page.textSpans.length) setSelectedSpanIndex(index);
            }} style={{ width: 100 }} /></label>
            <p>Módszer: {selectedSpan?.method}; koordináta: {selectedSpan?.position ? `${selectedSpan.position.x.toFixed(4)}, ${selectedSpan.position.y.toFixed(4)}` : "nem megbízható / nincs"}; befoglaló: {selectedSpan?.bounds ? `${selectedSpan.bounds.x.toFixed(4)}, ${selectedSpan.bounds.y.toFixed(4)}, ${selectedSpan.bounds.width.toFixed(4)}, ${selectedSpan.bounds.height.toFixed(4)}` : "nem számítható megbízhatóan"}.</p>
            <p>Forrásszöveg: <output>{selectedSpan?.originalText}</output></p>
          </> : <p>Ezen az oldalon nincs kinyerhető szövegréteg.</p>}
        </fieldset>
      </>}
      {ocrResults.length > 0 && <section aria-label="OCR eredmények"><h2>OCR sorok – {ocrResults.length}</h2><p>Tesseract confidence tájékoztató jellegű; a felismert számok műszaki jelentése „unknown”.</p><ol>{ocrResults.map((span, index) => <li key={`${span.pageNumber}-${index}`}><output>{span.originalText}</output> — {span.confidence?.toFixed(1)}%; {span.uncertainty}; pozíció {span.position?.x.toFixed(4)}, {span.position?.y.toFixed(4)}; keret {span.bounds?.x.toFixed(4)}, {span.bounds?.y.toFixed(4)}, {span.bounds?.width.toFixed(4)} × {span.bounds?.height.toFixed(4)}</li>)}</ol></section>}
    </main>
  );
}

import { describe, expect, it } from "vitest";
import { PDF_PROCESSING_LIMITS, PdfProcessingError, processPdfDocument } from "./pdf-text-extractor";

type SyntheticText = { text: string; x: number; y: number; rotation?: number; size?: number };
type SyntheticPage = { width: number; height: number; rotation?: number; texts: SyntheticText[] };

function syntheticPdf(pages: SyntheticPage[], passwordProtected = false) {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  pages.forEach((page, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Rotate ${page.rotation ?? 0} /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    const content = page.texts.map(({ text, x, y, rotation = 0, size = 12 }) => {
      const radians = rotation * Math.PI / 180;
      const a = size * Math.cos(radians);
      const b = size * Math.sin(radians);
      const c = -b;
      const d = a;
      const literal = text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
      const position = rotation === 0 ? `${x} ${y} Td` : `${a} ${b} ${c} ${d} ${x} ${y} Tm`;
      return `BT /F1 ${size} Tf ${position} (${literal}) Tj ET`;
    }).join("\n");
    objects[contentId - 1] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });
  const encryptionId = objects.length + 1;
  if (passwordProtected) objects.push(`<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${"00".repeat(32)}> /U <${"00".repeat(32)}> /P -4 >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  const encryptTrailer = passwordProtected ? ` /Encrypt ${encryptionId} 0 R /ID [<${"00".repeat(16)}> <${"00".repeat(16)}>]` : "";
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R${encryptTrailer} >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

describe("PDF text processing", () => {
  it("preserves source text and extracts a normalized point and reliable text bounds", async () => {
    const result = await processPdfDocument(syntheticPdf([{ width: 300, height: 400, texts: [{ text: "M12 DEMO 17,00 m", x: 72, y: 320 }] }]));
    const [page] = result.pages;
    const [span] = page.textSpans;

    expect(result.pageCount).toBe(1);
    expect(page.pageNumber).toBe(1);
    expect(page.widthPoints).toBe(300);
    expect(page.heightPoints).toBe(400);
    expect(page.rotationDegrees).toBe(0);
    expect(page.textSpans.map(({ originalText }) => originalText).join("")).toBe("M12 DEMO 17,00 m");
    expect(span.method).toBe("pdf-text");
    expect(span.position?.x).toBeCloseTo(0.24, 2);
    expect(span.position?.y).toBeCloseTo(0.2, 2);
    expect(span.bounds).not.toBeNull();
    expect(span.bounds?.x).toBeCloseTo(0.24, 2);
    expect(span.bounds!.y).toBeLessThan(span.position!.y);
  });

  it("processes multiple pages sequentially and reports each page size and intrinsic rotation", async () => {
    const result = await processPdfDocument(syntheticPdf([
      { width: 300, height: 400, texts: [{ text: "first", x: 20, y: 30 }] },
      { width: 600, height: 200, rotation: 90, texts: [{ text: "second", x: 80, y: 100 }] },
    ]));

    expect(result.pageCount).toBe(2);
    expect(result.pages.map(({ pageNumber }) => pageNumber)).toEqual([1, 2]);
    expect(result.pages[1]).toMatchObject({ widthPoints: 200, heightPoints: 600, rotationDegrees: 90 });
    expect(result.pages[1].textSpans[0].position).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
  });

  it("applies quarter-turn offsets to the viewport and transforms source points", async () => {
    const bytes = syntheticPdf([{ width: 300, height: 400, texts: [{ text: "corner", x: 60, y: 320 }] }]);
    const normal = await processPdfDocument(bytes);
    const turned = await processPdfDocument(bytes, { rotationOffset: 90 });

    expect(turned.pages[0]).toMatchObject({ widthPoints: 400, heightPoints: 300, rotationDegrees: 90 });
    expect(turned.pages[0].textSpans[0].position?.x).toBeCloseTo(0.8, 2);
    expect(turned.pages[0].textSpans[0].position?.y).toBeCloseTo(0.2, 2);
    expect(normal.pages[0].textSpans[0].position).not.toEqual(turned.pages[0].textSpans[0].position);
  });

  it("preserves rotated text orientation in viewport coordinates", async () => {
    const result = await processPdfDocument(syntheticPdf([
      { width: 300, height: 400, texts: [{ text: "vertical label", x: 60, y: 120, rotation: 90 }] },
    ]));

    expect(result.pages[0].textSpans[0].rotationDegrees).toBeGreaterThan(270);
    expect(result.pages[0].textSpans[0].rotationDegrees).toBeLessThan(330);
  });

  it("returns null geometry for source points outside the visible page", async () => {
    const result = await processPdfDocument(syntheticPdf([{ width: 300, height: 400, texts: [{ text: "off-page", x: 320, y: 100 }] }]));
    expect(result.pages[0].textSpans.every(({ position, bounds }) => position === null && bounds === null)).toBe(true);
  });

  it("rejects invalid PDFs with a stable, content-free error code", async () => {
    await expect(processPdfDocument(new TextEncoder().encode("not a pdf"))).rejects.toMatchObject({ code: "invalid_pdf" });
  });

  it("rejects password-protected PDFs without requesting or logging a password", async () => {
    await expect(processPdfDocument(syntheticPdf([{ width: 100, height: 100, texts: [] }], true)))
      .rejects.toMatchObject({ code: "password_required" });
  });

  it("rejects files above the memory-safety byte cap before parsing", async () => {
    await expect(processPdfDocument(new Uint8Array(PDF_PROCESSING_LIMITS.maxFileBytes + 1))).rejects.toMatchObject({ code: "file_too_large" });
  });

  it("rejects text content above the extracted-character cap", async () => {
    const result = processPdfDocument(syntheticPdf([{ width: 10_000_000, height: 100, texts: [{ text: "A".repeat(PDF_PROCESSING_LIMITS.maxTextCharacters + 1), x: 10, y: 10, size: 0.001 }] }]));
    await expect(result).rejects.toMatchObject({ code: "document_too_complex" });
  });

  it("rejects text with too many lexical tokens before returning a partial result", async () => {
    const result = processPdfDocument(syntheticPdf([{ width: 10_000_000, height: 100, texts: [{ text: "!".repeat(PDF_PROCESSING_LIMITS.maxTokens + 1), x: 10, y: 10, size: 0.001 }] }]));
    await expect(result).rejects.toMatchObject({ code: "document_too_complex" });
  });

  it("rejects unsupported rotation offsets", async () => {
    await expect(processPdfDocument(syntheticPdf([{ width: 100, height: 100, texts: [] }]), { rotationOffset: 45 as never }))
      .rejects.toMatchObject({ code: "invalid_rotation" });
  });

  it("rejects documents above the page-count cap", async () => {
    const pages = Array.from({ length: PDF_PROCESSING_LIMITS.maxPages + 1 }, () => ({ width: 100, height: 100, texts: [] }));
    await expect(processPdfDocument(syntheticPdf(pages))).rejects.toMatchObject({ code: "too_many_pages" });
  });

  it("cancels at a page boundary and allows a fresh session with the same input", async () => {
    const bytes = syntheticPdf([
      { width: 100, height: 100, texts: [{ text: "one", x: 10, y: 10 }] },
      { width: 100, height: 100, texts: [{ text: "two", x: 10, y: 10 }] },
    ]);
    const controller = new AbortController();

    await expect(processPdfDocument(bytes, { signal: controller.signal, onProgress: ({ completedPages }) => {
      if (completedPages === 1) controller.abort();
    } })).rejects.toBeInstanceOf(PdfProcessingError);
    await expect(processPdfDocument(bytes)).resolves.toMatchObject({ pageCount: 2 });
  });

  it("reports an already-aborted request as cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(processPdfDocument(syntheticPdf([{ width: 100, height: 100, texts: [] }]), { signal: controller.signal }))
      .rejects.toMatchObject({ code: "cancelled" });
  });
});

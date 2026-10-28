import { describe, expect, it } from "vitest";
import { renderExecutionReportPdf, renderExecutionReportPdfStream, safeExecutionReportFilename } from "./execution-report-pdf";
import type { ExecutionReportData } from "./execution-report-document";

const data: ExecutionReportData = {
  organizationName: "DEMO műhely",
  generatedAt: "2026-10-13T10:00:00.000Z",
  project: { name: "DEMO tetőprojekt", clientName: "DEMO ügyfél", location: "Budapest" },
  plan: { title: "DEMO munkanapló", description: "Áttekintő.", tasks: [], timeline: [], sourceQuotationName: null, sourceQuotationStatus: null, sourceRevisionId: null, sourceRevisionNumber: null, sourceSubtotal: null, photos: [] },
  sections: ["overview", "tasks", "journal", "events", "photos", "quotation"],
};

describe("execution report PDF", () => {
  it("renders an A4 report with empty-state sections and safe filename", async () => {
    const buffer = await renderExecutionReportPdf(data);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1000);
    expect(safeExecutionReportFilename("Árvíz / projekt", "Terv #1")).toBe("Kivitelezesi_osszefoglalo_Arviz-projekt-Terv-1.pdf");
  });

  it("streams a valid PDF document", async () => {
    const stream = await renderExecutionReportPdfStream(data);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const pdf = Buffer.concat(chunks);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("renders a multi-page journal with 101 distinct entries", async () => {
    const timeline = Array.from({ length: 101 }, (_, index) => ({
      id: `j${index}`, type: "journal" as const, date: "2026-10-13", recordedAt: "2026-10-13T10:00:00.000Z",
      authorAvailable: true, taskTitle: null, category: "general" as const, content: `DEMO bejegyzés ${index}`, problems: null, nextSteps: null,
    }));
    const buffer = await renderExecutionReportPdf({ ...data, plan: { ...data.plan, timeline }, sections: ["journal"] });
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect((buffer.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });
});

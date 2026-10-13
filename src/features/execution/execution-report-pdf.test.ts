import { describe, expect, it } from "vitest";
import { renderExecutionReportPdf, safeExecutionReportFilename } from "./execution-report-pdf";
import type { ExecutionReportData } from "./execution-report-document";

const data: ExecutionReportData = {
  organizationName: "DEMO műhely",
  generatedAt: "2026-10-13T10:00:00.000Z",
  project: { name: "DEMO tetőprojekt", clientName: "DEMO ügyfél", location: "Budapest" },
  plan: { title: "DEMO kivitelezési terv", description: "Áttekintő.", tasks: [], timeline: [], sourceQuotationName: null, sourceQuotationStatus: null, sourceRevisionId: null, sourceRevisionNumber: null, sourceSubtotal: null, photos: [] },
  sections: ["overview", "tasks", "journal", "events", "photos", "quotation"],
};

describe("execution report PDF", () => {
  it("renders an A4 report with empty-state sections and safe filename", async () => {
    const buffer = await renderExecutionReportPdf(data);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1000);
    expect(safeExecutionReportFilename("Árvíz / projekt", "Terv #1")).toBe("Kivitelezesi_osszefoglalo_Arviz-projekt-Terv-1.pdf");
  });
});

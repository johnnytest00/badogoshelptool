import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotationPdfDocument, StandaloneDraftQuotationPdfDocument, type QuotationDocumentData, type QuotationPdfData } from "./quotation-document";

export async function renderQuotationPdf(data: QuotationPdfData) {
  const document = "mode" in data && data.mode === "standalone-draft"
    ? createElement(StandaloneDraftQuotationPdfDocument, { data })
    : createElement(QuotationPdfDocument, { data: data as QuotationDocumentData });
  return renderToBuffer(document as never);
}

export function safeQuotationFilename(projectName: string, revisionNumber: number) {
  const safe = projectName.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "projekt";
  return `Ajanlat_${safe}_v${revisionNumber}.pdf`;
}

export function safeStandaloneDraftFilename(quotationId: string) {
  const safeId = quotationId.toLowerCase().replace(/[^a-f0-9-]/g, "").slice(0, 36) || "ajanlat";
  return `ajanlat-piszkozat-${safeId}.pdf`;
}


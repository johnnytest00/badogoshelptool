import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotationPdfDocument, type QuotationDocumentData } from "./quotation-document";

export async function renderQuotationPdf(data: QuotationDocumentData) {
  return renderToBuffer(createElement(QuotationPdfDocument, { data }) as never);
}

export function safeQuotationFilename(projectName: string, revisionNumber: number) {
  const safe = projectName.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "projekt";
  return `Ajanlat_${safe}_v${revisionNumber}.pdf`;
}


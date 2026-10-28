import { createElement } from "react";
import { renderToBuffer, renderToStream } from "@react-pdf/renderer";
import { ExecutionReportDocument, type ExecutionReportData } from "./execution-report-document";

export async function renderExecutionReportPdf(data: ExecutionReportData) {
  return renderToBuffer(createElement(ExecutionReportDocument, { data }) as never);
}

export async function renderExecutionReportPdfStream(data: ExecutionReportData) {
  return renderToStream(createElement(ExecutionReportDocument, { data }) as never);
}

export function safeExecutionReportFilename(projectName: string, planTitle: string) {
  const safe = `${projectName}-${planTitle}`.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "projekt";
  return `Kivitelezesi_osszefoglalo_${safe}.pdf`;
}

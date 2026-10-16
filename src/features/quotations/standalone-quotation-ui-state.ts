import type { QuotationDocumentDraft } from "@/domain/quotations/document-readiness";

export type StandaloneSaveOperation = { id: string; payload: string };

export const standaloneNetLabels = {
  unitPrice: "Nettó egységár (Ft)",
  lineTotal: "Nettó tételösszeg (Ft)",
  subtotal: "Összesen nettó (Ft)",
} as const;

export function getStandaloneSaveOperation(
  current: StandaloneSaveOperation | null,
  payload: string,
  createId: () => string,
): StandaloneSaveOperation {
  return current?.payload === payload ? current : { id: createId(), payload };
}

export function isHistoricalStandaloneRevision(currentRevisionId: string | null, requestedRevisionId?: string): boolean {
  return Boolean(requestedRevisionId && requestedRevisionId !== currentRevisionId);
}

export function standaloneManualRecipient(document: QuotationDocumentDraft): QuotationDocumentDraft {
  return { ...document, recipientSource: "manual", recipientClientId: "" };
}

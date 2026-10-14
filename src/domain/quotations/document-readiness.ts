export type IssuerDocumentProfile = {
  businessName: string | null;
  businessAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  taxIdentifier: string | null;
};

export type QuotationDocumentDraft = {
  recipientSource: "manual" | "client";
  recipientClientId: string;
  recipientName: string;
  recipientAddress: string;
  recipientEmail: string;
  recipientPhone: string;
  recipientTaxIdentifier: string;
  reference: string;
  validUntil: string;
  notes: string;
  terms: string;
};

export type DocumentReadiness = {
  status: "valid_draft" | "missing_issuance_data" | "invalid_document_data";
  canIssue: false;
  blockers: Array<{ code: string; message: string }>;
};

export type QuotationReadinessFinancialState = {
  hasCurrentRevision: boolean;
  hasCompleteLines: boolean;
  monetaryValuesConsistent: boolean;
  currency: string | null;
  priceBasis: "net" | "gross" | null;
  taxTreatment: "unresolved" | "unsupported";
  documentSnapshotMatches?: boolean;
};

const isDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

export function validateQuotationDocumentReadiness(
  issuer: IssuerDocumentProfile,
  document: QuotationDocumentDraft,
  today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date()),
  financial?: QuotationReadinessFinancialState,
): DocumentReadiness {
  const blockers: DocumentReadiness["blockers"] = [];
  const email = document.recipientSource === "client" ? "" : document.recipientEmail.trim();
  if (document.validUntil && (!isDateOnly(document.validUntil) || document.validUntil < today)) {
    blockers.push({ code: "INVALID_VALIDITY_DATE", message: "Az érvényesség dátuma legyen valós, mai vagy későbbi naptári nap." });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    blockers.push({ code: "INVALID_RECIPIENT_EMAIL", message: "A címzett e-mail-címe nem érvényes formátumú." });
  }
  if (issuer.contactEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(issuer.contactEmail.trim())) {
    blockers.push({ code: "INVALID_ISSUER_EMAIL", message: "A kibocsátó kapcsolati e-mail-címe nem érvényes formátumú." });
  }
  if (!issuer.businessName?.trim()) blockers.push({ code: "ISSUER_NAME_MISSING", message: "A kibocsátó vállalkozási neve hiányzik." });
  if (!issuer.businessAddress?.trim()) blockers.push({ code: "ISSUER_ADDRESS_MISSING", message: "A kibocsátó címe hiányzik." });
  if (!document.recipientName.trim()) blockers.push({ code: "RECIPIENT_NAME_MISSING", message: "A címzett neve hiányzik." });
  if (!document.recipientAddress.trim()) blockers.push({ code: "RECIPIENT_ADDRESS_MISSING", message: "A címzett címe hiányzik." });
  if (document.recipientSource === "client" && !document.recipientClientId) blockers.push({ code: "RECIPIENT_CLIENT_MISSING", message: "Válassz egy műhelyhez tartozó ügyfelet, vagy használd a kézi címzettet." });
  if (!financial?.hasCurrentRevision) blockers.push({ code: "CURRENT_REVISION_MISSING", message: "Az ajánlat aktuális, mentett revíziója hiányzik." });
  if (!financial?.hasCompleteLines || !financial.priceBasis || !financial.currency) {
    blockers.push({ code: "FINANCIAL_DATA_MISSING", message: "Az ajánlat pénzügyi adatai nem teljesek." });
  }
  if (financial && !financial.monetaryValuesConsistent) {
    blockers.push({ code: "FINANCIAL_TOTALS_INCONSISTENT", message: "Az ajánlat pénzügyi összegei nem egyeznek a mentett tételekkel." });
  }
  if (financial?.currency && financial.currency !== "HUF") {
    blockers.push({ code: "UNSUPPORTED_CURRENCY", message: "Az ajánlat pénzneme nem támogatott." });
  }
  if (financial?.documentSnapshotMatches === false) {
    blockers.push({ code: "DOCUMENT_SNAPSHOT_STALE", message: "Mentsd el a dokumentumadatokat az aktuális revízióba az ellenőrzés előtt." });
  }
  const invalid = blockers.some(({ code }) => code.startsWith("INVALID_")
    || code === "FINANCIAL_TOTALS_INCONSISTENT" || code === "UNSUPPORTED_CURRENCY" || code === "DOCUMENT_SNAPSHOT_STALE");
  const missing = blockers.some(({ code }) => code.endsWith("_MISSING"));
  blockers.push({ code: financial?.taxTreatment === "unsupported" ? "TAX_TREATMENT_UNSUPPORTED" : "TAX_UNCONFIGURED", message: financial?.taxTreatment === "unsupported" ? "A kiválasztott adózási mód még nem támogatott." : "Az adókezelés nincs beállítva." });
  blockers.push({ code: "NUMBER_NOT_ALLOCATED", message: "A végleges dokumentumszám csak kiállításkor lesz kiosztható." });
  blockers.push({ code: "FINALIZATION_UNSUPPORTED", message: "A véglegesítés ebben a mérföldkőben nem támogatott." });
  return { status: invalid ? "invalid_document_data" : missing ? "missing_issuance_data" : "valid_draft", canIssue: false, blockers };
}

export const emptyQuotationDocumentDraft = (): QuotationDocumentDraft => ({
  recipientSource: "manual", recipientClientId: "", recipientName: "", recipientAddress: "", recipientEmail: "", recipientPhone: "", recipientTaxIdentifier: "", reference: "", validUntil: "", notes: "", terms: "",
});

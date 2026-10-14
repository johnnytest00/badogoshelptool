import { describe, expect, it } from "vitest";
import { emptyQuotationDocumentDraft, validateQuotationDocumentReadiness } from "./document-readiness";

const issuer = { businessName: "DEMO Műhely", businessAddress: "DEMO cím", contactEmail: null, contactPhone: null, taxIdentifier: null };
const complete = { ...emptyQuotationDocumentDraft(), recipientName: "DEMO címzett", recipientAddress: "DEMO cím" };
const financial = { hasCurrentRevision: true, hasCompleteLines: true, monetaryValuesConsistent: true, currency: "HUF", priceBasis: "net" as const, taxTreatment: "unresolved" as const };

describe("standalone quotation document readiness", () => {
  it("accepts complete draft metadata but never says it can be issued", () => {
    const result = validateQuotationDocumentReadiness(issuer, complete, "2026-10-14", financial);
    expect(result.status).toBe("valid_draft");
    expect(result.canIssue).toBe(false);
    expect(result.blockers.map(({ code }) => code)).toEqual(["TAX_UNCONFIGURED", "NUMBER_NOT_ALLOCATED", "FINALIZATION_UNSUPPORTED"]);
  });

  it("blocks missing revisions and inconsistent or unsupported financial states", () => {
    const missing = validateQuotationDocumentReadiness(issuer, complete, "2026-10-14");
    expect(missing.blockers.map(({ code }) => code)).toContain("CURRENT_REVISION_MISSING");
    expect(missing.blockers.map(({ code }) => code)).toContain("FINANCIAL_DATA_MISSING");
    const unsupported = validateQuotationDocumentReadiness(issuer, complete, "2026-10-14", { ...financial, monetaryValuesConsistent: false, taxTreatment: "unsupported" });
    expect(unsupported.status).toBe("invalid_document_data");
    expect(unsupported.blockers.map(({ code }) => code)).toContain("FINANCIAL_TOTALS_INCONSISTENT");
    expect(unsupported.blockers.map(({ code }) => code)).toContain("TAX_TREATMENT_UNSUPPORTED");
    expect(unsupported.canIssue).toBe(false);
    const stale = validateQuotationDocumentReadiness(issuer, complete, "2026-10-14", { ...financial, documentSnapshotMatches: false });
    expect(stale.status).toBe("invalid_document_data");
    expect(stale.blockers.map(({ code }) => code)).toContain("DOCUMENT_SNAPSHOT_STALE");
  });

  it("lists actionable missing issuer and recipient details", () => {
    const result = validateQuotationDocumentReadiness({ ...issuer, businessAddress: null }, emptyQuotationDocumentDraft(), "2026-10-14");
    expect(result.status).toBe("missing_issuance_data");
    expect(result.blockers.map(({ code }) => code)).toContain("ISSUER_ADDRESS_MISSING");
    expect(result.blockers.map(({ code }) => code)).toContain("RECIPIENT_NAME_MISSING");
  });

  it.each(["2026-02-30", "2026-10-13", "yesterday"]) ("rejects inconsistent validity date %s", (validUntil) => {
    const result = validateQuotationDocumentReadiness(issuer, { ...complete, validUntil }, "2026-10-14");
    expect(result.status).toBe("invalid_document_data");
    expect(result.blockers.map(({ code }) => code)).toContain("INVALID_VALIDITY_DATE");
    expect(result.canIssue).toBe(false);
  });

  it("marks malformed manual email as invalid", () => {
    const result = validateQuotationDocumentReadiness(issuer, { ...complete, recipientEmail: "not-an-email" }, "2026-10-14");
    expect(result.status).toBe("invalid_document_data");
    expect(result.blockers.map(({ code }) => code)).toContain("INVALID_RECIPIENT_EMAIL");
  });

  it("marks malformed issuer contact email as invalid", () => {
    const result = validateQuotationDocumentReadiness({ ...issuer, contactEmail: "not-an-email" }, complete, "2026-10-14");
    expect(result.status).toBe("invalid_document_data");
    expect(result.blockers.map(({ code }) => code)).toContain("INVALID_ISSUER_EMAIL");
  });
});

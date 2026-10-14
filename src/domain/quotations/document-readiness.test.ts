import { describe, expect, it } from "vitest";
import { emptyQuotationDocumentDraft, validateQuotationDocumentReadiness } from "./document-readiness";

const issuer = { businessName: "DEMO Műhely", businessAddress: "DEMO cím", contactEmail: null, contactPhone: null, taxIdentifier: null };
const complete = { ...emptyQuotationDocumentDraft(), recipientName: "DEMO címzett", recipientAddress: "DEMO cím" };

describe("standalone quotation document readiness", () => {
  it("accepts complete draft metadata but never says it can be issued", () => {
    const result = validateQuotationDocumentReadiness(issuer, complete, "2026-10-14");
    expect(result.status).toBe("valid_draft");
    expect(result.canIssue).toBe(false);
    expect(result.blockers.map(({ code }) => code)).toEqual(["TAX_UNCONFIGURED", "NUMBER_NOT_ALLOCATED", "FINALIZATION_UNSUPPORTED"]);
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

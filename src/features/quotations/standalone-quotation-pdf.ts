import { decimalToScaled, lineTotal, scaledToDecimal, sumMoney } from "@/domain/quotations/money";
import type { StandaloneDraftQuotationDocumentData } from "./quotation-document";

type RevisionSnapshot = {
  id: string;
  revision_number: number;
  currency: string;
  price_class: string | null;
  input_snapshot: unknown;
  line_items_snapshot: unknown;
  subtotal: string | number | null;
  totals_snapshot: unknown;
  financial_contract: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const decimal = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : null;
const sameMoney = (left: unknown, right: unknown) => {
  const a = decimal(left);
  const b = decimal(right);
  if (a === null || b === null) return false;
  try { return decimalToScaled(a, 2) === decimalToScaled(b, 2); } catch { return false; }
};

export type StandalonePdfDataResult = { ok: true; data: StandaloneDraftQuotationDocumentData } | { ok: false; error: string };

/** Validates persisted values for safe display. Rendered amounts always come from the saved snapshots. */
export function buildStandaloneDraftPdfData(input: {
  quotation: { id: string; name: string; currency: string };
  organizationName: string;
  revision: RevisionSnapshot;
}): StandalonePdfDataResult {
  const { quotation, revision } = input;
  if (quotation.currency !== "HUF" || revision.currency !== "HUF" || revision.price_class !== "net") {
    return { ok: false, error: "A PDF-előnézet jelenleg csak egységes, nettó HUF árbesorolású mentett revízióhoz érhető el." };
  }
  if (!Number.isInteger(revision.revision_number) || revision.revision_number < 1 || revision.subtotal == null) {
    return { ok: false, error: "A mentett revízió pénzügyi összesítése hiányos; PDF nem készíthető." };
  }
  const financial = revision.financial_contract;
  const totals = revision.totals_snapshot;
  if (!isRecord(financial) || financial.schemaVersion !== 1 || financial.sourceVersion !== "F9.7.6.6.3.2b" || financial.currency !== "HUF"
    || financial.priceBasis !== "net" || financial.taxAmount !== null || financial.grossAmount !== null
    || financial.totalPayable !== null || !isRecord(financial.taxTreatment) || financial.taxTreatment.status !== "unresolved"
    || financial.taxTreatment.treatmentId !== null || financial.taxTreatment.parameters !== null
    || !isRecord(financial.rounding) || financial.rounding.quantityScale !== 6 || financial.rounding.moneyScale !== 2
    || financial.rounding.mode !== "half_up" || financial.rounding.scope !== "line"
    || !sameMoney(financial.netAmount, revision.subtotal)) {
    return { ok: false, error: "A mentett pénzügyi pillanatkép nem támogatott vagy ellentmondásos; ellenőrizd az ajánlatot." };
  }
  if (!isRecord(totals) || totals.complete !== true || totals.currency !== "HUF" || totals.priceClass !== "net"
    || !sameMoney(totals.subtotal, revision.subtotal)) {
    return { ok: false, error: "A mentett tételösszesítés hiányos vagy nem egyezik a pénzügyi pillanatképpel; PDF nem készíthető." };
  }
  if (!Array.isArray(revision.line_items_snapshot) || revision.line_items_snapshot.length === 0 || revision.line_items_snapshot.length > 200) {
    return { ok: false, error: "Ehhez a revízióhoz nincs PDF-ben biztonságosan megjeleníthető nettó tételsor." };
  }
  const lines: Array<Record<string, unknown>> = [];
  try {
    for (const entry of revision.line_items_snapshot) {
      if (!isRecord(entry) || !["MATERIAL", "LABOR", "OTHER"].includes(String(entry.type))
        || typeof entry.description !== "string" || !entry.description.trim()
        || typeof entry.quantity !== "string" || typeof entry.unit !== "string" || !entry.unit.trim()
        || typeof entry.unitPrice !== "string" || entry.priceClass !== "net"
        || entry.lineTotal == null) throw new Error("invalid line");
      const expected = lineTotal(entry.quantity, entry.unitPrice);
      if (!sameMoney(expected.minor === BigInt(0) ? "0.00" : scaledToDecimal(expected.minor, 2), entry.lineTotal)) throw new Error("inconsistent line");
      lines.push(entry);
    }
    const subtotal = sumMoney(lines.map((line) => ({ currency: "HUF" as const, minor: decimalToScaled(String(line.lineTotal), 2) })));
    if (subtotal.minor !== decimalToScaled(String(revision.subtotal), 2)) throw new Error("inconsistent subtotal");
  } catch {
    return { ok: false, error: "A mentett sorösszeg vagy tételadat ellentmondásos; PDF nem készíthető." };
  }
  const snapshot = isRecord(revision.input_snapshot) && isRecord(revision.input_snapshot.document) ? revision.input_snapshot.document : {};
  const inputSnapshot = isRecord(revision.input_snapshot) ? revision.input_snapshot : {};
  const savedName = typeof inputSnapshot.name === "string" && inputSnapshot.name.trim() ? inputSnapshot.name : quotation.name;
  const issuer = isRecord(snapshot.issuer) ? snapshot.issuer : {};
  const recipient = isRecord(snapshot.recipient) ? snapshot.recipient : {};
  const textOrNull = (value: unknown) => typeof value === "string" && value.trim() ? value : null;
  return { ok: true, data: {
    mode: "standalone-draft", organizationName: input.organizationName,
    quotation: { id: quotation.id, name: savedName, currency: "HUF" },
    revision: { id: revision.id, number: revision.revision_number, lines, subtotal: String(revision.subtotal), currency: "HUF" },
    issuer, recipient, reference: textOrNull(snapshot.reference), validUntil: textOrNull(snapshot.validUntil),
    notes: textOrNull(snapshot.notes), terms: textOrNull(snapshot.terms),
  } };
}

import { quotationLineSchema, type QuotationLine } from "./contracts";
import { decimalToScaled, lineTotal, scaledToDecimal, sumMoney } from "./money";

const MAX_QUANTITY = BigInt("999999999999999999"); // 999999999999.999999 at quantity scale 6.
const MAX_UNIT_PRICE_MINOR = BigInt("99999999999999999999"); // NUMERIC(20,2).
const MAX_SUBTOTAL_MINOR = BigInt("99999999999999999999");

export type StandaloneTotals = { subtotal: string; currency: "HUF"; priceClass: "net" | "gross" | null };
export type StandaloneLineValidation =
  | { ok: true; lines: QuotationLine[]; totals: StandaloneTotals }
  | { ok: false; error: string };

/** Pure input validation and fixed-point preview. The save RPC repeats all financial checks. */
export function validateStandaloneLines(input: unknown): StandaloneLineValidation {
  // JSONB snapshots store absent optional fields as null. Normalize only those
  // descriptive/link fields; monetary values are parsed and validated unchanged.
  const normalizedInput = Array.isArray(input) ? input.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return entry;
    const line = { ...entry } as Record<string, unknown>;
    for (const key of ["notes", "variantId", "priceId", "takeoffItemId"]) {
      if (line[key] === null) delete line[key];
    }
    return line;
  }) : input;
  const parsed = quotationLineSchema.array().max(200).safeParse(normalizedInput);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "A tételek adatai érvénytelenek." };
  const classes = new Set(parsed.data.map((line) => line.priceClass));
  if (classes.size > 1) return { ok: false, error: "Nettó és bruttó tételek nem keverhetők." };
  try {
    const quantities = parsed.data.map((line) => decimalToScaled(line.quantity, 6));
    const prices = parsed.data.map((line) => decimalToScaled(line.unitPrice, 2));
    if (quantities.some((value) => value <= BigInt(0) || value > MAX_QUANTITY)
      || prices.some((value) => value < BigInt(0) || value > MAX_UNIT_PRICE_MINOR)) {
      return { ok: false, error: "A mennyiség vagy egységár kívül esik az engedélyezett tartományon." };
    }
    const total = sumMoney(parsed.data.map((line) => lineTotal(line.quantity, line.unitPrice)));
    if (total.minor > MAX_SUBTOTAL_MINOR) return { ok: false, error: "Az ajánlat összege túllépi a támogatott értéket." };
    return { ok: true, lines: parsed.data, totals: { subtotal: scaledToDecimal(total.minor, 2), currency: "HUF", priceClass: [...classes][0] ?? null } };
  } catch { return { ok: false, error: "A mennyiség vagy egységár érvénytelen." }; }
}

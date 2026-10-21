import type { $ZodIssue } from "zod/v4/core";

/**
 * Magyar, mezőszintű hibaszöveg a Zod-hibákból.
 *
 * A sémák és a matematikai ellenőrzések változatlanok maradnak: ez csak a megjelenítés
 * határán fordítja le a Zod belső, angol üzeneteit. A `refine` saját (már magyar) szövegeit
 * érintetlenül továbbadja.
 *
 * A hiányzó bemenetet a nyers mezőszöveg alapján ismerjük fel, mert a Zod ugyanazt az
 * `invalid_type` kódot adja üres és nem numerikus értékre is.
 */
const numberFormat = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 });

const limit = (value: number | bigint) => numberFormat.format(typeof value === "bigint" ? Number(value) : value);

export function validationMessage(issue: $ZodIssue | undefined, rawValue?: string): string {
  if (rawValue !== undefined && rawValue.trim() === "") return "Add meg a méretet.";
  if (!issue) return "Ellenőrizd a megadott értéket.";

  switch (issue.code) {
    case "invalid_type":
      if (issue.expected === "int") return "Egész értéket adj meg.";
      return "Csak számot adj meg.";
    case "too_small": {
      const min = limit(issue.minimum);
      if (Number(issue.minimum) === 0) return issue.inclusive ? "Az érték ne legyen negatív." : "Az érték legyen nullánál nagyobb.";
      return issue.inclusive ? `Az érték legalább ${min} legyen.` : `Az érték legyen ${min}-nál nagyobb.`;
    }
    case "too_big": {
      const max = limit(issue.maximum);
      return issue.inclusive ? `Az érték legfeljebb ${max} lehet.` : `Az érték legyen ${max}-nál kisebb.`;
    }
    case "custom":
      // A refine-ok saját, már magyar szövegei (pl. „A szárny szélessége legyen kisebb…”).
      return issue.message || "Ellenőrizd a megadott értéket.";
    default:
      return "Ellenőrizd a megadott értéket.";
  }
}

/** „Mező neve: üzenet” alakú, mező mellé tehető szöveg. */
export function labelledValidationMessage(label: string, issue: $ZodIssue | undefined, rawValue?: string): string {
  return `${label}: ${validationMessage(issue, rawValue)}`;
}

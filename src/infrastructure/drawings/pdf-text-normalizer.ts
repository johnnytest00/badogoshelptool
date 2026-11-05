export type DrawingTextToken = {
  kind: "number" | "unit-candidate" | "word" | "symbol";
  raw: string;
  start: number;
  end: number;
  normalizedNumber?: string | null;
};

export type NormalizedDrawingText = {
  normalizedText: string;
  tokens: DrawingTextToken[];
};

const defaultTokenLimit = 200_000;
const tokenPattern = /[+-]?(?:\d{1,3}(?:[ \u00a0]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)|(?:mm|cm|m)(?:[²³])?|°C|%|°|[\p{L}_][\p{L}\p{N}_]*|[^\s]/gu;
const unitCandidates = new Set(["mm", "cm", "m", "mm²", "cm²", "m²", "mm³", "cm³", "m³", "%", "°", "°c"]);

function normalizeNumericCandidate(value: string): string | null {
  const commaCount = (value.match(/,/g) ?? []).length;
  const dotCount = (value.match(/\./g) ?? []).length;
  if (commaCount && dotCount) {
    if (commaCount !== 1 || value.lastIndexOf(",") < value.lastIndexOf(".")) return null;
    return value.replace(/[. \u00a0]/g, "").replace(",", ".");
  }
  if (commaCount === 1) return value.replace(/[ \u00a0]/g, "").replace(",", ".");
  if (commaCount > 1) return null;
  return value.replace(/[ \u00a0]/g, "");
}

export function normalizeDrawingText(originalText: string, maxTokens = defaultTokenLimit): NormalizedDrawingText {
  if (!Number.isSafeInteger(maxTokens) || maxTokens < 0) throw new RangeError("invalid_token_limit");
  const normalizedText = originalText.normalize("NFC").replace(/\s+/gu, " ").trim();
  const tokens: DrawingTextToken[] = [];
  for (const match of normalizedText.matchAll(tokenPattern)) {
    if (tokens.length >= maxTokens) throw new RangeError("drawing_text_token_limit");
    const raw = match[0];
    const start = match.index;
    const end = start + raw.length;
    if (/^[+-]?(?:\d|\d{1,3}[ \u00a0]\d)/u.test(raw)) {
      tokens.push({ kind: "number", raw, start, end, normalizedNumber: normalizeNumericCandidate(raw) });
    } else if (unitCandidates.has(raw.toLocaleLowerCase("hu-HU")) && (raw === raw.toLocaleLowerCase("hu-HU") || raw === "°C")) {
      tokens.push({ kind: "unit-candidate", raw, start, end });
    } else if (/^[\p{L}_][\p{L}\p{N}_]*$/u.test(raw)) {
      tokens.push({ kind: "word", raw, start, end });
    } else {
      tokens.push({ kind: "symbol", raw, start, end });
    }
  }
  return { normalizedText, tokens };
}

import { describe, expect, it } from "vitest";
import { normalizeDrawingText } from "./pdf-text-normalizer";

describe("drawing text normalization", () => {
  it("normalizes whitespace and separates numbers, unit candidates and symbols without assigning meaning", () => {
    const result = normalizeDrawingText("  M=1:100\r\n17,00   m² ±0,00  ");

    expect(result.normalizedText).toBe("M=1:100 17,00 m² ±0,00");
    expect(result.tokens.filter((token) => token.kind === "number").map(({ raw, normalizedNumber }) => [raw, normalizedNumber]))
      .toEqual([["1", "1"], ["100", "100"], ["17,00", "17.00"], ["0,00", "0.00"]]);
    expect(result.tokens.filter((token) => token.kind === "unit-candidate").map(({ raw }) => raw)).toEqual(["m²"]);
    expect(result.tokens.filter((token) => token.kind === "symbol").map(({ raw }) => raw)).toEqual(["=", ":", "±"]);
  });

  it("keeps ambiguous mixed separators as source text without numeric conversion", () => {
    const result = normalizeDrawingText("1.234,50 / 1,234.50");
    expect(result.normalizedText).toBe("1.234,50 / 1,234.50");
    expect(result.tokens.filter(({ kind }) => kind === "number").some(({ normalizedNumber }) => normalizedNumber === null)).toBe(true);
  });

  it("does not infer a lost decimal separator or convert unit candidates", () => {
    const result = normalizeDrawingText("14,50 m 1450 m 14.50 cm 4,0% 43,38 m²");
    expect(result.tokens.filter(({ kind }) => kind === "number").map(({ raw, normalizedNumber }) => [raw, normalizedNumber]))
      .toEqual([["14,50", "14.50"], ["1450", "1450"], ["14.50", "14.50"], ["4,0", "4.0"], ["43,38", "43.38"]]);
    expect(result.tokens.filter(({ kind }) => kind === "unit-candidate").map(({ raw }) => raw)).toEqual(["m", "m", "cm", "%", "m²"]);
  });

  it("stops tokenization when the per-call token safety cap is reached", () => {
    expect(() => normalizeDrawingText("! ! !", 2)).toThrow(RangeError);
  });
});

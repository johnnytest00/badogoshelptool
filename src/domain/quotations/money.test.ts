import { describe, expect, it } from "vitest";
import { formatMoney, lineTotal, scaledToDecimal, sumMoney } from "./money";

describe("quotation money reference cases", () => {
  it("12.5 × 1500 = 18,750 HUF", () => expect(scaledToDecimal(lineTotal("12.5", "1500").minor, 2)).toBe("18750.00"));
  it("3 × 2499.50 = 7,498.50 HUF", () => expect(scaledToDecimal(lineTotal("3", "2499.50").minor, 2)).toBe("7498.50"));
  it("sums compatible net lines", () => expect(formatMoney(sumMoney([lineTotal("12.5", "1500"), lineTotal("3", "2499.50")]))).toBe("26 248,50 HUF"));
  it("rejects unsupported precision", () => expect(() => lineTotal("1.0000001", "1")).toThrow());
});

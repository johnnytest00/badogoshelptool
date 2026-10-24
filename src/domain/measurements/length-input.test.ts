import { describe, expect, it } from "vitest";
import { DEFAULT_LENGTH_UNIT, formatLength, parseLengthInput, type LengthUnit } from "./length-input";

const mm = (text: string, unit: LengthUnit, mmDecimals = 0) => {
  const result = parseLengthInput(text, unit, { mmDecimals });
  return result.state === "valid" ? result.mm : result.state;
};

describe("parseLengthInput", () => {
  it("defaults to centimetres and keeps the physical size across units", () => {
    expect(DEFAULT_LENGTH_UNIT).toBe("cm");
    expect(mm("250", "cm")).toBe(2500);
    expect(mm("2,5", "m")).toBe(2500);
    expect(mm("2500", "mm")).toBe(2500);
  });

  it("accepts the Hungarian decimal comma, the dot and digit-group spaces", () => {
    expect(mm("12,5", "cm")).toBe(125);
    expect(mm("12.5", "cm")).toBe(125);
    expect(mm(" 1 250 ", "mm")).toBe(1250);
    expect(mm("1 250", "mm")).toBe(1250);
    expect(mm("1 250", "mm")).toBe(1250);
    expect(mm(",5", "m")).toBe(500);
    expect(mm("12,", "cm")).toBe(120);
  });

  it("converts exactly where floating point multiplication drifts", () => {
    expect(1.001 * 1000).not.toBe(1001);
    expect(mm("1,001", "m")).toBe(1001);
    expect(mm("0,07", "m")).toBe(70);
    expect(mm("99,999", "m")).toBe(99_999);
  });

  it("separates empty, half-typed and invalid text", () => {
    expect(mm("", "cm")).toBe("empty");
    expect(mm("   ", "cm")).toBe("empty");
    expect(mm(",", "cm")).toBe("incomplete");
    expect(mm("-", "cm")).toBe("incomplete");
    expect(mm("12,3,4", "cm")).toBe("invalid");
    expect(mm("abc", "cm")).toBe("invalid");
    expect(mm("1e3", "mm")).toBe("invalid");
  });

  it("rejects negative and out-of-range values instead of clamping", () => {
    const negative = parseLengthInput("-5", "cm");
    expect(negative).toMatchObject({ state: "invalid" });
    expect(negative.state === "invalid" && negative.error).toMatch(/negatív/);
    expect(mm("1000,001", "m")).toBe("invalid");
    expect(mm("1000", "m")).toBe(1_000_000);
    expect(mm("0", "cm")).toBe(0);
  });

  it("never rounds away a fractional millimetre on integer fields", () => {
    const result = parseLengthInput("12,34", "cm");
    expect(result.state).toBe("invalid");
    expect(result.state === "invalid" && result.error).toMatch(/egész milliméter/);
    expect(mm("1,0005", "m")).toBe("invalid");
  });

  it("allows the field's own millimetre precision", () => {
    expect(mm("0,063", "cm", 2)).toBe(0.63);
    expect(mm("1100,25", "mm", 2)).toBe(1100.25);
    expect(mm("1100,255", "mm", 2)).toBe("invalid");
  });

  it("allows 0.1 mm where the engine accepts fractional millimetres", () => {
    expect(mm("12,34", "cm", 1)).toBe(123.4);
    expect(mm("2500,5", "mm", 1)).toBe(2500.5);
    expect(mm("12,345", "cm", 1)).toBe("invalid");
  });
});

describe("formatLength", () => {
  it("formats canonical millimetres with a decimal comma and no trailing zeros", () => {
    expect(formatLength(2500, "cm")).toBe("250");
    expect(formatLength(2500, "m")).toBe("2,5");
    expect(formatLength(2500, "mm")).toBe("2500");
    expect(formatLength(1001, "m")).toBe("1,001");
    expect(formatLength(5, "m")).toBe("0,005");
    expect(formatLength(123.4, "cm")).toBe("12,34");
    expect(formatLength(0, "m")).toBe("0");
    expect(formatLength(1100.25, "cm")).toBe("110,025");
    expect(formatLength(0.63, "m")).toBe("0,00063");
  });

  it("round-trips every unit without drift", () => {
    const units: LengthUnit[] = ["mm", "cm", "m"];
    for (let value = 0; value <= 20_000; value += 7) {
      for (const from of units) for (const to of units) {
        const text = formatLength(value, from);
        const back = parseLengthInput(formatLength(mm(text, from) as number, to), to);
        expect(back).toEqual({ state: "valid", mm: value });
      }
    }
    for (const value of [0.1, 123.4, 99_999.9]) {
      for (const unit of units) expect(parseLengthInput(formatLength(value, unit), unit, { mmDecimals: 1 })).toEqual({ state: "valid", mm: value });
    }
  });
});

import { describe, expect, it } from "vitest";
import { isUnitlessDrawingMeasurement, suggestDrawingValue } from "./drawing-value-suggestion";

describe("suggestDrawingValue", () => {
  it.each([
    ["TETŐSZÉLESSÉG 8,20 m", "mm", { value: "8200", sourceUnit: "m", targetUnit: "mm", unitOrigin: "pdf" }],
    ["SZARUFA 14.50 m", "mm", { value: "14500", sourceUnit: "m", targetUnit: "mm", unitOrigin: "pdf" }],
    ["FAL 1450 mm", "mm", { value: "1450", sourceUnit: "mm", targetUnit: "mm", unitOrigin: "pdf" }],
    ["HAJLÁS 30°", "°", { value: "30", sourceUnit: "°", targetUnit: "°", unitOrigin: "pdf" }],
    ["OSZTÁS 6 db", "db", { value: "6", sourceUnit: "db", targetUnit: "db", unitOrigin: "pdf" }],
  ])("normalizes the explicit measurement in %s for %s", (text, targetUnit, expected) => {
    expect(suggestDrawingValue(text, "pdf-text", targetUnit)).toEqual(expected);
  });

  it.each([
    ["17,00", "mm"],
    ["1450", "mm"],
    ["4,0%", "°"],
    ["43,38 m²", "mm"],
    ["12×16,25/27 mm", "mm"],
    ["8,20 m / 14,50 m", "mm"],
    ["G1 8,20 m", "mm"],
    ["8,20 m 1:100", "mm"],
    ["8,20 m", "°"],
    ["3,5 db", "db"],
  ])("does not guess from %s for target unit %s", (text, targetUnit) => {
    expect(suggestDrawingValue(text, "pdf-text", targetUnit)).toBeNull();
  });

  it("never suggests a value from OCR text", () => {
    expect(suggestDrawingValue("TETŐ 8,20 m", "ocr", "mm")).toBeNull();
  });

  it.each([
    ["17,00", "cm", "170"],
    ["14,50", "m", "14500"],
    ["4.55", "mm", "4.55"],
    ["1450", "mm", "1450"],
  ])("uses only the user's explicit %s source unit", (text, sourceUnit, expected) => {
    expect(suggestDrawingValue(text, "pdf-text", "mm", sourceUnit)).toMatchObject({ value: expected, sourceUnit, unitOrigin: "user" });
  });

  it("requires a source unit for a unitless number and prefers a unit printed in the PDF", () => {
    expect(isUnitlessDrawingMeasurement("FÖLDMÉRET 17,00", "pdf-text")).toBe(true);
    expect(suggestDrawingValue("17,00", "pdf-text", "mm")).toBeNull();
    expect(suggestDrawingValue("8,20 m", "pdf-text", "mm", "cm")).toMatchObject({ value: "8200", sourceUnit: "m", unitOrigin: "pdf" });
    expect(isUnitlessDrawingMeasurement("17,00%", "pdf-text")).toBe(false);
    expect(isUnitlessDrawingMeasurement("G1 17,00", "pdf-text")).toBe(false);
    expect(isUnitlessDrawingMeasurement("17,00 m²", "pdf-text")).toBe(false);
  });
});

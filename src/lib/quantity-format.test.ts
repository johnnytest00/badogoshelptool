import { describe, expect, it } from "vitest";
import { formatQuantity, formatQuantityValue, quantityPrecision } from "@/lib/quantity-format";

describe("mennyiség-formázás", () => {
  it("a felületet és a hosszt rögzített két tizedesre hozza, így egy panelen belül egy oszlopban olvashatók", () => {
    expect(formatQuantity(97.66213, "m²")).toBe("97,66 m²");
    expect(formatQuantity(80, "m²")).toBe("80,00 m²");
    expect(formatQuantity(6.3124, "m")).toBe("6,31 m");
    expect(formatQuantity(26, "m")).toBe("26,00 m");
  });

  it("a szöget és a százalékot nem tölti fel felesleges tizedessel", () => {
    expect(formatQuantity(35, "°")).toBe("35 °");
    expect(formatQuantity(70.0213, "%")).toBe("70 %");
    expect(formatQuantity(37.5, "°")).toBe("37,5 °");
  });

  it("a milliméteres és darabos értéket egészre kerekítve mutatja", () => {
    expect(formatQuantity(1250.4, "mm")).toBe("1250 mm");
    expect(formatQuantity(3, "db")).toBe("3 db");
  });

  it("ismeretlen mértékegységnél a korábbi három tizedes marad", () => {
    expect(quantityPrecision("liter")).toEqual({ min: 0, max: 3 });
    expect(formatQuantityValue(1.23456, "liter")).toBe("1,235");
  });

  it("érvénytelen értéknél nem ír ki számot", () => {
    expect(formatQuantity(Number.NaN, "m²")).toBe("—");
    expect(formatQuantity(Number.POSITIVE_INFINITY, "m")).toBe("—");
  });
});

describe("kis, nem nulla mennyiségek", () => {
  it("a rögzített két tizedes alatti pozitív értéket nem mutatja pontos nullaként", () => {
    expect(formatQuantity(0.004, "m²")).toBe("<0,01 m²");
    expect(formatQuantity(0.0000001, "m")).toBe("<0,01 m");
    expect(formatQuantity(1e-12, "m²")).toBe("<0,01 m²");
  });

  it("a valódi nullát és a negatív nullát továbbra is nullaként mutatja", () => {
    expect(formatQuantity(0, "m²")).toBe("0,00 m²");
    expect(formatQuantity(-0, "m²")).toBe("0,00 m²");
    expect(formatQuantity(0, "mm")).toBe("0 mm");
  });

  it("a kerekítési határon a szokásos megjelenítés marad", () => {
    expect(formatQuantity(0.005, "m²")).toBe("0,01 m²");
    expect(formatQuantity(0.01, "m²")).toBe("0,01 m²");
    expect(formatQuantity(0.004999, "m²")).toBe("<0,01 m²");
  });

  it("negatív kis értéknél az irányt is jelöli", () => {
    expect(formatQuantity(-0.004, "m")).toBe(">-0,01 m");
    expect(formatQuantity(-1.5, "m")).toBe("-1,50 m");
  });

  it("egész felbontású mértékegységnél a küszöb egy egység", () => {
    expect(formatQuantity(0.4, "mm")).toBe("<1 mm");
    expect(formatQuantity(0.4, "db")).toBe("<1 db");
    expect(formatQuantity(2, "mm")).toBe("2 mm");
  });

  it("a nem véges értéket nem számként jelzi", () => {
    expect(formatQuantity(Number.NaN, "m²")).toBe("—");
    expect(formatQuantity(Number.NEGATIVE_INFINITY, "m")).toBe("—");
  });
});

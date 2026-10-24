import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LengthField, canonicalLength, lengthStateFromCanonical, switchLengthUnit, type LengthFieldState } from "./length-field";

describe("LengthField state", () => {
  it("shows canonical millimetres in the default centimetre unit", () => {
    expect(lengthStateFromCanonical("2500", "cm")).toEqual({ text: "250", unit: "cm" });
    expect(lengthStateFromCanonical("", "cm")).toEqual({ text: "", unit: "cm" });
    expect(lengthStateFromCanonical("123.4", "m")).toEqual({ text: "0,1234", unit: "m" });
  });

  it("keeps the physical size when switching units, back and forth", () => {
    let state: LengthFieldState = { text: "250", unit: "cm" };
    let next = switchLengthUnit(state, "m");
    expect(next).toEqual({ text: "2,5", unit: "m" });
    next = switchLengthUnit(switchLengthUnit(next, "mm"), "cm");
    expect(next).toEqual(state);
    expect(canonicalLength(next)).toBe("2500");
    state = { text: "1,001", unit: "m" };
    expect(canonicalLength(switchLengthUnit(switchLengthUnit(state, "cm"), "m"))).toBe("1001");
  });

  it("emits no value for empty, half-typed or invalid text", () => {
    expect(canonicalLength({ text: "", unit: "cm" })).toBe("");
    expect(canonicalLength({ text: ",", unit: "cm" })).toBe("");
    expect(canonicalLength({ text: "12,34", unit: "cm" })).toBe("");
    expect(canonicalLength({ text: "12,34", unit: "cm" }, { mmDecimals: 1 })).toBe("123.4");
  });

  it("reads text that is not yet a length in the newly chosen unit", () => {
    expect(switchLengthUnit({ text: "12,34", unit: "cm" }, "m")).toEqual({ text: "12,34", unit: "m" });
    expect(canonicalLength({ text: "12,34", unit: "m" })).toBe("12340");
  });
});

describe("LengthField markup", () => {
  it("renders a decimal text input and a labelled mm / cm / m switch", () => {
    const html = renderToStaticMarkup(<LengthField id="lengthMm" label="Tető hossza" value="2500" onChange={() => undefined} required />);
    expect(html).toContain('inputMode="decimal"');
    expect(html).toContain('type="text"');
    expect(html).toContain('value="250"');
    expect(html).toContain('aria-label="Tető hossza, cm"');
    expect(html).toContain('aria-label="Tető hossza mértékegysége"');
    expect(html).toContain('aria-pressed="true">cm</button>');
    expect(html).toContain('aria-pressed="false">mm</button>');
    expect(html).not.toContain("role=\"alert\"");
  });

  it("shows the form's own error, keeps help text described and disables the switch with the input", () => {
    const html = renderToStaticMarkup(<LengthField id="widthMm" label="Szélesség" value="" onChange={() => undefined} error="Kötelező mező." describedBy="widthMm-help" disabled />);
    expect(html).toContain('aria-describedby="widthMm-help widthMm-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('<small id="widthMm-error" class="length-field-error" role="alert">Kötelező mező.</small>');
    expect(html.match(/disabled=""/g)).toHaveLength(4);
  });

  it("shows saved values with more decimals exactly instead of rounding them", () => {
    expect(renderToStaticMarkup(<LengthField label="Szélesség" value="1100.25" mmDecimals={2} onChange={() => undefined} />)).toContain('value="110,025"');
  });
});

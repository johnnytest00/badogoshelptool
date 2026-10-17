import { describe, expect, it } from "vitest";
import { calculatorSuiteHref } from "./calculator-navigation";

describe("calculator suite navigation", () => {
  it("keeps the selected calculator and organization when redirecting the legacy route", () => {
    expect(calculatorSuiteHref({ calculator: "stair.wood.90_landing", organization: "workshop 1" })).toBe(
      "/kalkulatorok?calculator=stair.wood.90_landing&organization=workshop+1",
    );
  });

  it("supports the suite default when legacy links omit a calculator", () => {
    expect(calculatorSuiteHref({ organization: "org-1" })).toBe("/kalkulatorok?organization=org-1");
    expect(calculatorSuiteHref({})).toBe("/kalkulatorok");
  });
});

import { describe, expect, it } from "vitest";
import { areaMeasurementKeys, linearMeasurementKeys } from "@/domain/material-takeoffs/contracts";
import { areaSources, linearSources, methodForUnit, methodOptionsForUnit } from "./takeoff-form-options";

describe("anyagkimutatás-mérési választék", () => {
  it("pontosan a számítási motor által támogatott geometriai értékeket kínálja", () => {
    expect(areaSources.map((source) => source.value)).toEqual(areaMeasurementKeys);
    expect(linearSources.map((source) => source.value)).toEqual(linearMeasurementKeys);
    expect([...areaSources, ...linearSources].every((source) => source.label.includes("("))).toBe(true);
  });
  it("csak a beszerzési egységgel összeegyeztethető módszert kínálja a kézi adat mellett", () => {
    expect(methodForUnit("square_meter")).toBe("area");
    expect(methodOptionsForUnit("square_meter").map((option) => option.value)).toEqual(["area", "manual"]);
    expect(methodOptionsForUnit("linear_meter").map((option) => option.value)).toEqual(["linear", "manual"]);
    expect(methodOptionsForUnit("piece").map((option) => option.value)).toEqual(["manual"]);
  });
});

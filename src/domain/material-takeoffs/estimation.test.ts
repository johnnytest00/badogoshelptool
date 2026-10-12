import { describe, expect, it } from "vitest";
import { estimateArea, estimateLinear, estimateManual, isMethodCompatible } from "./estimation";

const output = { areas: { combinedRoofM2: 140.625, individualRoofPlaneM2: 70.3125, horizontalProjectedM2: 125 }, lengths: { ridgeLineMm: 12500, totalEaveEdgesMm: 25000, totalSlopingGableEdgesMm: 30000 } } as never;

describe("material takeoff estimation", () => {
  it("calculates the reference area with explicit allowance", () => expect(estimateArea(output, "combinedRoofM2", 10).finalQuantity).toBe(154.6875));
  it("converts ridge and eave lengths from millimeters", () => {
    expect(estimateLinear(output, "ridgeLineMm").finalQuantity).toBe(12.5);
    expect(estimateLinear(output, "totalEaveEdgesMm").finalQuantity).toBe(25);
  });
  it("keeps manual quantities unverified and checks units", () => {
    expect(estimateManual(12, "piece").warning).toContain("Kézi");
    expect(isMethodCompatible("area", "piece")).toBe(false);
    expect(isMethodCompatible("manual", "piece")).toBe(true);
  });
});

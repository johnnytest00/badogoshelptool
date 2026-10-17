import { describe, expect, it } from "vitest";
import { roofCoveringProductParametersSchema } from "./roof-covering-parameters";

describe("normalized roof covering product parameters", () => {
  it("accepts explicitly supplied roll and sheet dimensions without inventing defaults", () => {
    expect(roofCoveringProductParametersSchema.parse({ form: "roll", nominalWidthMm: 1500, effectiveCoveringWidthMm: 1350, physicalLengthMm: 50000, usableCoveringLengthMm: 48000, sideOverlapMm: 150, endOverlapMm: 2000, installationDirection: "eave-to-ridge" })).toMatchObject({ form: "roll", nominalWidthMm: 1500, effectiveCoveringWidthMm: 1350, physicalLengthMm: 50000, usableCoveringLengthMm: 48000 });
    expect(roofCoveringProductParametersSchema.parse({ form: "sheet", nominalWidthMm: 1200, effectiveCoveringWidthMm: 1100, physicalLengthMm: 4000, sideOverlapMm: 100, endOverlapMm: 0, minimumPhysicalLengthMm: 1000, maximumPhysicalLengthMm: 6000, canCutAlongLength: true, manufacturerConstraintReference: "DEMO product sheet v1" })).toMatchObject({ form: "sheet", maximumPhysicalLengthMm: 6000, canCutAlongLength: true, manufacturerConstraintReference: "DEMO product sheet v1" });
  });

  it("rejects inconsistent effective dimensions and contradictory physical bounds", () => {
    expect(roofCoveringProductParametersSchema.safeParse({ form: "roll", nominalWidthMm: 1000, effectiveCoveringWidthMm: 1100 }).success).toBe(false);
    expect(roofCoveringProductParametersSchema.safeParse({ form: "sheet", physicalLengthMm: 2000, usableCoveringLengthMm: 2500 }).success).toBe(false);
    expect(roofCoveringProductParametersSchema.safeParse({ form: "sheet", minimumPhysicalLengthMm: 5000, maximumPhysicalLengthMm: 4000 }).success).toBe(false);
    expect(roofCoveringProductParametersSchema.safeParse({ form: "sheet", manufacturerConstraintReference: "" }).success).toBe(false);
  });
});

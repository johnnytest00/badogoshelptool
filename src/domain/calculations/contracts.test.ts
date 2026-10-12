import { describe, expect, it } from "vitest";

import {
  calculationRevisionContractSchema,
  roofModelRevisionInputSchema,
} from "./contracts";

describe("versioned calculation contracts", () => {
  it("accepts explicit DEMO roof input provenance", () => {
    const parsed = roofModelRevisionInputSchema.parse({
      schemaVersion: "roof.gable.input.v1",
      dataOrigin: "demo",
      payload: { spanMm: 12000 },
    });

    expect(parsed.dataOrigin).toBe("demo");
  });

  it("keeps calculation input and output as separate versioned snapshots", () => {
    const snapshot = {
      schemaVersion: "demo.v1",
      rawUserInputs: { spanMm: 12000 },
      derivedResults: {},
      manualOverrides: {},
      dataSources: { source: "demo" },
      issues: [],
    };

    const parsed = calculationRevisionContractSchema.parse({
      calculatorType: "roof.gable",
      calculatorImplementationVersion: "not-implemented",
      input: snapshot,
      output: snapshot,
      provenance: "demo",
    });

    expect(parsed.input).not.toBe(parsed.output);
  });

  it("rejects unlabelled or unknown provenance", () => {
    expect(() =>
      roofModelRevisionInputSchema.parse({
        schemaVersion: "roof.gable.input.v1",
        dataOrigin: "verified_by_guess",
        payload: {},
      }),
    ).toThrow();
  });
});

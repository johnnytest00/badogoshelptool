import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CalculatorRegistry, executeCalculator } from "@/domain/calculations/engine";

const rectangleAreaDemo = {
  id: "math.rectangle-area.demo",
  implementationVersion: "1.0.0",
  inputSchemaVersion: "1.0.0",
  resultSchemaVersion: "1.0.0",
  inputSchema: z.object({ widthMm: z.number().int().positive(), heightMm: z.number().int().positive() }),
  outputSchema: z.object({ areaMm2: z.number().int().positive() }),
  calculate: ({ widthMm, heightMm }: { widthMm: number; heightMm: number }) => ({ areaMm2: widthMm * heightMm }),
};

describe("calculation engine and registry", () => {
  it("executes a validated mathematical DEMO with version metadata", () => {
    const result = executeCalculator(rectangleAreaDemo, { widthMm: 2000, heightMm: 3000 });
    expect(result).toMatchObject({ ok: true, status: "success", output: { areaMm2: 6_000_000 } });
    expect(result.metadata).toEqual({
      calculatorId: "math.rectangle-area.demo",
      calculatorVersion: "1.0.0",
      inputSchemaVersion: "1.0.0",
      resultSchemaVersion: "1.0.0",
    });
  });

  it("returns structured validation failures and does not coerce invalid input", () => {
    const result = executeCalculator(rectangleAreaDemo, { widthMm: "2000", heightMm: 3000 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ code: "VALIDATION_ERROR", path: ["widthMm"] });
  });

  it("resolves calculators, rejects duplicates and unknown IDs", () => {
    const registry = new CalculatorRegistry().register(rectangleAreaDemo);
    expect(registry.metadata()[0].calculatorId).toBe(rectangleAreaDemo.id);
    expect(() => registry.register(rectangleAreaDemo)).toThrow(/already registered/);
    expect(() => registry.resolve("roof.gable")).toThrow(/Unknown calculator/);
  });

  it("preserves calculation failure metadata", () => {
    const result = new CalculatorRegistry().register(rectangleAreaDemo).execute(rectangleAreaDemo.id, { widthMm: 0, heightMm: 3000 });
    expect(result).toMatchObject({ ok: false, status: "failure", metadata: { calculatorVersion: "1.0.0" } });
  });
});

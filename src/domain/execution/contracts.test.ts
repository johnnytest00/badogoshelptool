import { describe, expect, it } from "vitest";
import { executionPhotoCategorySchema, executionProjectDetailsSchema, executionProjectStatusSchema } from "./contracts";

describe("execution photo categories", () => {
  it("accepts the four explicit user-selected categories", () => {
    expect(executionPhotoCategorySchema.options).toEqual(["before", "during", "after", "uncategorized"]);
  });

  it("rejects timestamp-derived or unknown categories", () => {
    expect(executionPhotoCategorySchema.safeParse("uploaded-first").success).toBe(false);
    expect(executionPhotoCategorySchema.safeParse("before").success).toBe(true);
  });
});

describe("execution project details", () => {
  it("keeps the operational lifecycle separate and intentionally small", () => {
    expect(executionProjectStatusSchema.options).toEqual(["planned", "active", "paused", "completed", "archived"]);
  });

  it("accepts optional project data and rejects an inverted planned date range", () => {
    expect(executionProjectDetailsSchema.safeParse({ title: "Tetőcsere", description: "", status: "active", clientName: "", location: "", plannedStartDate: "2026-11-10", plannedEndDate: "2026-11-20", version: 2 }).success).toBe(true);
    expect(executionProjectDetailsSchema.safeParse({ title: "Tetőcsere", description: "", status: "active", clientName: "", location: "", plannedStartDate: "2026-11-20", plannedEndDate: "2026-11-10", version: 2 }).success).toBe(false);
  });
});

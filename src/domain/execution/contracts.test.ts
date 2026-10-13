import { describe, expect, it } from "vitest";
import { executionPhotoCategorySchema } from "./contracts";

describe("execution photo categories", () => {
  it("accepts the four explicit user-selected categories", () => {
    expect(executionPhotoCategorySchema.options).toEqual(["before", "during", "after", "uncategorized"]);
  });

  it("rejects timestamp-derived or unknown categories", () => {
    expect(executionPhotoCategorySchema.safeParse("uploaded-first").success).toBe(false);
    expect(executionPhotoCategorySchema.safeParse("before").success).toBe(true);
  });
});

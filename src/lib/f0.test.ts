import { describe, expect, it } from "vitest";
import { isF0FoundationReady } from "@/lib/f0";

describe("F0 alapállapot", () => {
  it("csak akkor tekinti késznek az alapot, ha minden ellenőrzés sikeres", () => {
    expect(isF0FoundationReady([true, true, true])).toBe(true);
    expect(isF0FoundationReady([true, false, true])).toBe(false);
    expect(isF0FoundationReady([])).toBe(false);
  });
});

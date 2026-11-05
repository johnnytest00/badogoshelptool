import { describe, expect, it } from "vitest";
import { greetingLabel, greetingName } from "./account-name";

describe("greetingName", () => {
  it("uses the first word of the trusted profile name and never derives it from email", () => {
    expect(greetingName("Bence Kovács")).toBe("Bence");
    expect(greetingName(null)).toBe(null);
    expect(greetingName("   ")).toBe(null);
    expect(greetingLabel(null)).toBe("Szia!");
    expect(greetingLabel("Bence Kovács")).toBe("Szia Bence!");
  });
});

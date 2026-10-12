import { describe, expect, it } from "vitest";
import { getSafeReturnTo } from "@/features/auth/redirect";

describe("auth redirect safety", () => {
  it("keeps safe internal destinations", () => {
    expect(getSafeReturnTo("/demo/meretezes?mode=local")).toBe("/demo/meretezes?mode=local");
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(getSafeReturnTo("https://evil.example")).toBe("/");
    expect(getSafeReturnTo("//evil.example")).toBe("/");
  });

  it("does not redirect back to the login page", () => {
    expect(getSafeReturnTo("/bejelentkezes?returnTo=/")).toBe("/");
  });
});

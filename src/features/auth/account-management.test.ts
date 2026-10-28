import { describe, expect, it } from "vitest";
import { accountEmailSchema, accountPasswordSchema, getAccountAuthErrorMessage } from "./account-management";

describe("F9.14.9 account credential validation", () => {
  it("normalizes valid email input and rejects invalid addresses", () => {
    expect(accountEmailSchema.parse({ email: "  user@example.test " }).email).toBe("user@example.test");
    expect(accountEmailSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("matches password confirmation and accepts an optional current password", () => {
    expect(accountPasswordSchema.safeParse({ password: "a", confirmation: "a" }).success).toBe(true);
    expect(accountPasswordSchema.safeParse({ password: "a", confirmation: "b" }).success).toBe(false);
    expect(accountPasswordSchema.safeParse({ password: "a", confirmation: "a", currentPassword: "old" }).success).toBe(true);
    expect(getAccountAuthErrorMessage({ code: "weak_password" })).toContain("biztonsági követelményeknek");
  });

  it("explains duplicate, expired, rate limited and reauthentication responses", () => {
    expect(getAccountAuthErrorMessage({ code: "email_exists" })).toContain("másik fiókhoz");
    expect(getAccountAuthErrorMessage({ code: "otp_expired" })).toContain("lejárt");
    expect(getAccountAuthErrorMessage({ status: 429 })).toContain("Túl sok kérés");
    expect(getAccountAuthErrorMessage({ code: "reauthentication_needed" })).toContain("jelentkezz be újra");
    expect(getAccountAuthErrorMessage({ code: "bad_code_verifier" })).toContain("lejárt");
    expect(getAccountAuthErrorMessage({ code: "flow_state_expired" })).toContain("lejárt");
  });
});

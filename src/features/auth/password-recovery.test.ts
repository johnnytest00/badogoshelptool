import { describe, expect, it } from "vitest";
import { getPasswordRecoveryRedirectTo, isPasswordRecoveryCallback, isValidRecoverySession } from "./password-recovery";

describe("password recovery callback", () => {
  it("builds a same-origin PKCE callback URL", () => {
    expect(getPasswordRecoveryRedirectTo("https://badogoshelptool.vercel.app")).toBe(
      "https://badogoshelptool.vercel.app/auth/callback/recovery",
    );
  });

  it("accepts only a callback with a PKCE code", () => {
    expect(isPasswordRecoveryCallback("single-use-code")).toBe(true);
    expect(isPasswordRecoveryCallback(null)).toBe(false);
  });

  it("requires both the server recovery marker and a valid user session", () => {
    expect(isValidRecoverySession("1", true)).toBe(true);
    expect(isValidRecoverySession(undefined, true)).toBe(false);
    expect(isValidRecoverySession("1", false)).toBe(false);
  });
});

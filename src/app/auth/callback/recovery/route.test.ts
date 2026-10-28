import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { auth } = vi.hoisted(() => ({ auth: { exchangeCodeForSession: vi.fn() } }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => ({ auth }) }));

import { GET } from "./route";

describe("password recovery callback route", () => {
  beforeEach(() => auth.exchangeCodeForSession.mockReset());

  it("requires a PKCE code and offers a new request for an invalid link", async () => {
    const response = await GET(new NextRequest("https://app.test/auth/callback/recovery"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.test/jelszo-visszaallitas?hiba=link");
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("marks the session as recovery-authorized only after the PKCE exchange succeeds", async () => {
    auth.exchangeCodeForSession.mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null });
    const response = await GET(new NextRequest("https://app.test/auth/callback/recovery?code=one-time-code"));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(response.headers.get("location")).toBe("https://app.test/jelszo-visszaallitas");
    expect(response.headers.get("set-cookie")).toContain("tetopro-password-recovery=1");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("does not authorize password changes when code exchange fails", async () => {
    auth.exchangeCodeForSession.mockResolvedValueOnce({ data: { user: null }, error: { code: "otp_expired" } });
    const response = await GET(new NextRequest("https://app.test/auth/callback/recovery?code=expired-code"));
    expect(response.headers.get("location")).toBe("https://app.test/jelszo-visszaallitas?hiba=link");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

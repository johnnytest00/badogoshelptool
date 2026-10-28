import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore, auth } = vi.hoisted(() => ({
  cookieStore: { marker: undefined as string | undefined, get: vi.fn(), delete: vi.fn() },
  auth: { getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() },
}));

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => ({ auth }) }));

import { finishPasswordRecovery } from "./password-recovery-actions";

describe("password recovery server action", () => {
  beforeEach(() => {
    cookieStore.marker = undefined;
    cookieStore.get.mockImplementation((name: string) => name === "tetopro-password-recovery" && cookieStore.marker ? { value: cookieStore.marker } : undefined);
    cookieStore.delete.mockClear();
    auth.getUser.mockReset(); auth.updateUser.mockReset(); auth.signOut.mockReset();
  });

  it("rejects missing recovery authority without updating a password", async () => {
    const result = await finishPasswordRecovery({ password: "new-password", confirmation: "new-password" });
    expect(result).toHaveProperty("error");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("requires an authenticated user and updates then ends only the local session", async () => {
    cookieStore.marker = "1";
    auth.getUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null });
    auth.updateUser.mockResolvedValueOnce({ error: null });
    auth.signOut.mockResolvedValueOnce({ error: null });

    const result = await finishPasswordRecovery({ password: "new-password", confirmation: "new-password" });

    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(cookieStore.delete).toHaveBeenCalledWith("tetopro-password-recovery");
    expect(result).toEqual({ success: true });
  });
});

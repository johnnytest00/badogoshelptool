import { describe, expect, it, vi } from "vitest";
import { createIdempotencyKey, generateSecureUuid } from "./secure-uuid";

describe("generateSecureUuid", () => {
  it("uses the native randomUUID when available", () => {
    const randomUUID = vi.fn(() => "native-id");
    const getRandomValues = vi.fn((bytes: Uint8Array) => bytes);
    expect(generateSecureUuid({ randomUUID, getRandomValues })).toBe("native-id");
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it("uses secure random values and sets RFC 4122 v4/version bits", () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => { bytes.fill(0); return bytes; });
    const uuid = generateSecureUuid({ getRandomValues });
    expect(uuid).toBe("00000000-0000-4000-8000-000000000000");
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(getRandomValues).toHaveBeenCalledOnce();
  });

  it("fails explicitly when secure randomness is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    expect(() => generateSecureUuid()).toThrow("Secure random number generation is unavailable.");
    expect(() => generateSecureUuid({} as Crypto)).toThrow("Secure random number generation is unavailable.");
    vi.unstubAllGlobals();
  });
});

describe("createIdempotencyKey", () => {
  it("reuses the key for retries and changes it only for a new operation", () => {
    const createKey = vi.fn().mockReturnValueOnce("operation-1").mockReturnValueOnce("operation-2");
    const key = createIdempotencyKey(createKey);
    const firstAttempt = key.current();
    const retry = key.current();
    expect(retry).toBe(firstAttempt);
    expect(createKey).toHaveBeenCalledOnce();
    expect(key.renew()).toBe("operation-2");
    expect(key.current()).toBe("operation-2");
    expect(createKey).toHaveBeenCalledTimes(2);
  });
});

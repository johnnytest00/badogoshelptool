type SecureCrypto = Pick<Crypto, "getRandomValues"> & { randomUUID?: () => string };

/** Generates an RFC 4122 v4 UUID without falling back to non-cryptographic randomness. */
export function generateSecureUuid(cryptoApi: SecureCrypto | undefined = globalThis.crypto): string {
  if (!cryptoApi) throw new Error("Secure random number generation is unavailable.");
  if (typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  if (typeof cryptoApi.getRandomValues !== "function") {
    throw new Error("Secure random number generation is unavailable.");
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Holds one idempotency key until the caller completes a logical operation and renews it. */
export function createIdempotencyKey(createKey: () => string = generateSecureUuid) {
  let key = createKey();
  return {
    current: () => key,
    renew: () => {
      key = createKey();
      return key;
    },
  };
}

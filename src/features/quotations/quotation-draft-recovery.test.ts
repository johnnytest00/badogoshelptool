import { describe, expect, it } from "vitest";
import { clearOtherQuotationRecoveryOwners, isQuotationRecoveryCurrent, quotationRecoveryKey, readQuotationRecovery, writeQuotationRecovery, type QuotationRecovery } from "./quotation-draft-recovery";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

const recovery: QuotationRecovery = { sourceVersion: 4, sourceRevisionId: "rev-4", values: { name: "Munka", clientId: "client-1", lines: [{ type: "LABOR", description: "Szerelés", quantity: "2", unit: "óra", unitPrice: "12000", priceClass: "net", variantId: "", priceId: "", takeoffItemId: "", notes: "" }] } };

describe("quotation session recovery", () => {
  it("stores meaningful edits only under a user/org/project/quotation scoped key", () => {
    const storage = memoryStorage();
    const alice = quotationRecoveryKey("alice", "org-1", "project-1", "quote-1");
    const bob = quotationRecoveryKey("bob", "org-1", "project-1", "quote-1");
    const otherProject = quotationRecoveryKey("alice", "org-1", "project-2", "quote-1");
    writeQuotationRecovery(storage, alice, recovery);
    expect(readQuotationRecovery(storage, alice)).toEqual(recovery);
    expect(readQuotationRecovery(storage, bob)).toBeNull();
    expect(readQuotationRecovery(storage, otherProject)).toBeNull();
    expect(quotationRecoveryKey("alice", "org-2", "project-1", "quote-1")).not.toBe(alice);
  });

  it("requires an explicit current source revision and invalidates old account data", () => {
    const storage = memoryStorage();
    const key = quotationRecoveryKey("alice", "org-1", "project-1", "quote-1");
    writeQuotationRecovery(storage, key, recovery);
    expect(isQuotationRecoveryCurrent(recovery, 4, "rev-4")).toBe(true);
    expect(isQuotationRecoveryCurrent(recovery, 5, "rev-5")).toBe(false);
    clearOtherQuotationRecoveryOwners(storage as Storage, "alice");
    clearOtherQuotationRecoveryOwners(storage as Storage, "bob");
    expect(readQuotationRecovery(storage, key)).toBeNull();
  });

  it("removes malformed data instead of offering it for restore", () => {
    const storage = memoryStorage();
    const key = quotationRecoveryKey("alice", "org-1", "project-1", null);
    storage.setItem(key, "not-json");
    expect(readQuotationRecovery(storage, key)).toBeNull();
    expect(storage.getItem(key)).toBeNull();
  });
});

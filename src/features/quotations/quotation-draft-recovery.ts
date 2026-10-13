export type QuotationDraftValues = {
  name: string;
  clientId: string;
  lines: Array<{ type: "MATERIAL" | "LABOR" | "OTHER"; description: string; quantity: string; unit: string; unitPrice: string; priceClass: "net" | "gross"; variantId: string; priceId: string; takeoffItemId: string; notes: string }>;
};

export type QuotationRecovery = {
  sourceVersion: number;
  sourceRevisionId: string | null;
  values: QuotationDraftValues;
};

const prefix = "tetopro:quotation-recovery:";
const ownerKey = `${prefix}owner`;

export function quotationRecoveryKey(userId: string, organizationId: string, projectId: string, quotationId: string | null): string {
  return `${prefix}${encodeURIComponent(userId)}:${encodeURIComponent(organizationId)}:${encodeURIComponent(projectId)}:${encodeURIComponent(quotationId ?? "new")}`;
}

export function isQuotationRecoveryCurrent(recovery: QuotationRecovery, version: number, revisionId: string | null): boolean {
  return recovery.sourceVersion === version && recovery.sourceRevisionId === revisionId;
}

export function clearOtherQuotationRecoveryOwners(storage: Pick<Storage, "length" | "key" | "removeItem" | "getItem" | "setItem">, userId: string): void {
  const owner = storage.getItem(ownerKey);
  if (owner !== userId) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix) && key !== ownerKey) storage.removeItem(key);
    }
    storage.setItem(ownerKey, userId);
  }
}

export function readQuotationRecovery(storage: Pick<Storage, "getItem" | "removeItem">, key: string): QuotationRecovery | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) throw new Error("invalid");
    const candidate = parsed as Partial<QuotationRecovery>;
    if (typeof candidate.sourceVersion !== "number" || !(typeof candidate.sourceRevisionId === "string" || candidate.sourceRevisionId === null)) throw new Error("invalid");
    const values = candidate.values;
    if (!values || typeof values.name !== "string" || typeof values.clientId !== "string" || !Array.isArray(values.lines)) throw new Error("invalid");
    return candidate as QuotationRecovery;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function writeQuotationRecovery(storage: Pick<Storage, "setItem">, key: string, recovery: QuotationRecovery): void {
  storage.setItem(key, JSON.stringify(recovery));
}

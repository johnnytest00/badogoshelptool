export const quotationStatuses = ["draft", "finalized", "sent", "accepted", "rejected"] as const;
export type QuotationStatus = typeof quotationStatuses[number];
export type TransitionableQuotationStatus = Exclude<QuotationStatus, "draft" | "finalized">;

const transitions: Record<QuotationStatus, readonly QuotationStatus[]> = {
  draft: ["finalized"],
  finalized: ["sent"],
  sent: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

export const canTransitionQuotation = (from: QuotationStatus, to: QuotationStatus) => transitions[from].includes(to);

import { describe, expect, it } from "vitest";
import { canTransitionQuotation } from "./status";

describe("quotation lifecycle state machine", () => {
  it("allows the forward business transitions", () => {
    expect(canTransitionQuotation("draft", "finalized")).toBe(true);
    expect(canTransitionQuotation("finalized", "sent")).toBe(true);
    expect(canTransitionQuotation("sent", "accepted")).toBe(true);
    expect(canTransitionQuotation("sent", "rejected")).toBe(true);
  });

  it("rejects reopening and terminal transitions", () => {
    expect(canTransitionQuotation("sent", "draft")).toBe(false);
    expect(canTransitionQuotation("accepted", "draft")).toBe(false);
    expect(canTransitionQuotation("rejected", "draft")).toBe(false);
    expect(canTransitionQuotation("accepted", "rejected")).toBe(false);
  });
});

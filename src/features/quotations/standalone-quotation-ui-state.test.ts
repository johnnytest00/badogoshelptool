import { describe, expect, it } from "vitest";
import { getStandaloneSaveOperation, isHistoricalStandaloneRevision, standaloneNetLabels } from "./standalone-quotation-ui-state";

describe("standalone quotation UI state", () => {
  it("keeps one operation id for an unchanged retry and rotates it when the payload changes", () => {
    let generated = 0;
    const createId = () => `operation-${++generated}`;
    const first = getStandaloneSaveOperation(null, "draft-v1", createId);
    const retry = getStandaloneSaveOperation(first, "draft-v1", createId);
    const changed = getStandaloneSaveOperation(retry, "draft-v2", createId);
    expect(retry).toBe(first);
    expect(changed.id).not.toBe(first.id);
    expect(generated).toBe(2);
  });

  it("marks only a non-current requested revision as historical", () => {
    expect(isHistoricalStandaloneRevision("revision-2", "revision-1")).toBe(true);
    expect(isHistoricalStandaloneRevision("revision-2", "revision-2")).toBe(false);
    expect(isHistoricalStandaloneRevision(null, undefined)).toBe(false);
  });

  it("labels each money value as net HUF", () => {
    expect(standaloneNetLabels).toEqual({
      unitPrice: "Nettó egységár (Ft)",
      lineTotal: "Nettó tételösszeg (Ft)",
      subtotal: "Összesen nettó (Ft)",
    });
  });
});

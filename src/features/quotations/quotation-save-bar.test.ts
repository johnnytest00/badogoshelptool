import { describe, expect, it } from "vitest";
import { quotationSaveState } from "./quotation-save-bar";

describe("quotationSaveState", () => {
  const base = { pending: false, error: false, dirty: false, hasRevision: false };
  it("prioritises saving, then error, then unsaved", () => {
    expect(quotationSaveState({ ...base, pending: true, error: true, dirty: true })).toBe("saving");
    expect(quotationSaveState({ ...base, error: true, dirty: true })).toBe("error");
    expect(quotationSaveState({ ...base, dirty: true, hasRevision: true })).toBe("unsaved");
  });
  it("distinguishes saved from a never-saved draft", () => {
    expect(quotationSaveState({ ...base, hasRevision: true })).toBe("saved");
    expect(quotationSaveState(base)).toBe("new");
  });
});

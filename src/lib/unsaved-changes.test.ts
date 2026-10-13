import { describe, expect, it, vi } from "vitest";
import { warnBeforeUnloadIfDirty } from "./unsaved-changes";

describe("warnBeforeUnloadIfDirty", () => {
  it("requests a browser warning only when edits are unsaved", () => {
    const event = { preventDefault: vi.fn(), returnValue: "initial" } as unknown as BeforeUnloadEvent;
    warnBeforeUnloadIfDirty(true, event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe("");

    const cleanEvent = { preventDefault: vi.fn(), returnValue: "initial" } as unknown as BeforeUnloadEvent;
    warnBeforeUnloadIfDirty(false, cleanEvent);
    expect(cleanEvent.preventDefault).not.toHaveBeenCalled();
    expect(cleanEvent.returnValue).toBe("initial");
  });
});

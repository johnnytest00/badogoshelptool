import { describe, expect, it, vi } from "vitest";
import { guardUnsavedNavigation, warnBeforeUnloadIfDirty } from "./unsaved-changes";

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

describe("guardUnsavedNavigation", () => {
  it("keeps the editor open when the user cancels discard", () => {
    const preventDefault = vi.fn();
    const onDiscard = vi.fn();
    const allowed = guardUnsavedNavigation({ preventDefault }, { dirty: true, pending: false, confirmDiscard: () => false, onDiscard });
    expect(allowed).toBe(false);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("allows confirmed discard and does not prompt for clean or pending navigation", () => {
    const preventDefault = vi.fn();
    const onDiscard = vi.fn();
    const confirmDiscard = vi.fn(() => true);
    expect(guardUnsavedNavigation({ preventDefault }, { dirty: true, pending: false, confirmDiscard, onDiscard })).toBe(true);
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(guardUnsavedNavigation({ preventDefault }, { dirty: false, pending: false, confirmDiscard, onDiscard })).toBe(true);
    expect(guardUnsavedNavigation({ preventDefault }, { dirty: true, pending: true, confirmDiscard, onDiscard })).toBe(false);
    expect(confirmDiscard).toHaveBeenCalledOnce();
  });
});

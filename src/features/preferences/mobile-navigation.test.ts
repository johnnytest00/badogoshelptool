import { describe, expect, it } from "vitest";
import { mobileNavigationStorageKey, parseMobileNavigationPreference, persistMobileNavigationPreference } from "./mobile-navigation";

describe("mobile navigation preference", () => {
  it("defaults off unless the user explicitly enabled it", () => {
    expect(parseMobileNavigationPreference(null)).toBe(false);
    expect(parseMobileNavigationPreference("true")).toBe(true);
    expect(parseMobileNavigationPreference("false")).toBe(false);
  });

  it("persists the explicit choice on this device", () => {
    const values = new Map<string, string>();
    const storage = { setItem: (key: string, value: string) => values.set(key, value) };
    persistMobileNavigationPreference(storage, true);
    expect(values.get(mobileNavigationStorageKey)).toBe("true");
    persistMobileNavigationPreference(storage, false);
    expect(values.get(mobileNavigationStorageKey)).toBe("false");
  });
});

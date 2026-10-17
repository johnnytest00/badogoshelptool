import { describe, expect, it } from "vitest";
import {
  backgroundAnimationStorageKey,
  parseBackgroundAnimationPreference,
  persistBackgroundAnimationPreference,
} from "./background-animation";

describe("background animation preference", () => {
  it("defaults to enabled and recognizes only an explicit off value", () => {
    expect(parseBackgroundAnimationPreference(null)).toBe(true);
    expect(parseBackgroundAnimationPreference("true")).toBe(true);
    expect(parseBackgroundAnimationPreference("false")).toBe(false);
    expect(parseBackgroundAnimationPreference("invalid")).toBe(true);
  });

  it("persists an explicit user choice", () => {
    const values = new Map<string, string>();
    persistBackgroundAnimationPreference({ setItem: (key, value) => values.set(key, value) }, false);
    expect(values.get(backgroundAnimationStorageKey)).toBe("false");
    persistBackgroundAnimationPreference({ setItem: (key, value) => values.set(key, value) }, true);
    expect(values.get(backgroundAnimationStorageKey)).toBe("true");
  });
});

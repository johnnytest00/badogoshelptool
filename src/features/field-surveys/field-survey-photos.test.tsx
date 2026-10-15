import { describe, expect, it } from "vitest";
import { photoErrorMessage } from "./field-survey-photos";

describe("field survey photo feedback", () => {
  it("keeps an interrupted upload actionable in Hungarian while retaining server validation messages", () => {
    const network = "A kapcsolat megszakadt. A kép várakozik; kapcsolódás után próbáld újra.";
    const fallback = "A fénykép feltöltése nem sikerült.";
    expect(photoErrorMessage(new TypeError("Failed to fetch"), network, fallback)).toBe(network);
    expect(photoErrorMessage(new Error("A fájl túl nagy."), network, fallback)).toBe("A fájl túl nagy.");
  });
});

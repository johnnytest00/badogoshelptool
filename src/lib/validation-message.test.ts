import { describe, expect, it } from "vitest";
import { z } from "zod";
import { labelledValidationMessage, validationMessage } from "@/lib/validation-message";

const schema = z.object({ widthMm: z.number().int().positive().max(100_000), pitchDegrees: z.number().finite().positive().lt(80) });
const issueFor = (input: unknown, key: string) => {
  const result = schema.safeParse(input);
  return result.success ? undefined : result.error.issues.find((issue) => issue.path.includes(key));
};

describe("magyar validációs üzenetek", () => {
  it("az üres mezőre hiányzó adatot jelez, nem Zod-szöveget", () => {
    expect(validationMessage(issueFor({ pitchDegrees: 35 }, "widthMm"), "")).toBe("Add meg a méretet.");
    expect(labelledValidationMessage("Tető külső szélessége", issueFor({ pitchDegrees: 35 }, "widthMm"), "   "))
      .toBe("Tető külső szélessége: Add meg a méretet.");
  });

  it("a nem numerikus bemenetet megkülönbözteti a hiányzótól", () => {
    expect(validationMessage(issueFor({ widthMm: Number.NaN, pitchDegrees: 35 }, "widthMm"), "abc")).toBe("Csak számot adj meg.");
  });

  it("a törtszámot egész követelményként jelzi", () => {
    expect(validationMessage(issueFor({ widthMm: 1.5, pitchDegrees: 35 }, "widthMm"), "1,5")).toBe("Egész értéket adj meg.");
  });

  it("a tartományon kívüli értéket iránnyal együtt mondja ki", () => {
    expect(validationMessage(issueFor({ widthMm: -5, pitchDegrees: 35 }, "widthMm"), "-5")).toBe("Az érték legyen nullánál nagyobb.");
    expect(validationMessage(issueFor({ widthMm: 1_000_000, pitchDegrees: 35 }, "widthMm"), "1000000")).toBe("Az érték legfeljebb 100\u00a0000 lehet.");
    expect(validationMessage(issueFor({ widthMm: 6000, pitchDegrees: 95 }, "pitchDegrees"), "95")).toBe("Az érték legyen 80-nál kisebb.");
  });

  it("a refine saját magyar szövegét változatlanul továbbadja", () => {
    const refined = z.object({ a: z.number(), b: z.number() }).refine((v) => v.a > v.b, "A hossz legyen nagyobb a szélességnél.");
    const result = refined.safeParse({ a: 1, b: 2 });
    expect(result.success).toBe(false);
    if (!result.success) expect(validationMessage(result.error.issues[0])).toBe("A hossz legyen nagyobb a szélességnél.");
  });

  it("érvényes bemenetnél nincs hiba", () => {
    expect(schema.safeParse({ widthMm: 6000, pitchDegrees: 35 }).success).toBe(true);
    expect(issueFor({ widthMm: 6000, pitchDegrees: 35 }, "widthMm")).toBeUndefined();
  });
});

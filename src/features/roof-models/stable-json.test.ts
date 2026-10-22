import { describe, expect, it } from "vitest";
import { stableJsonStringify } from "./stable-json";

describe("stableJsonStringify", () => {
  it("rekurzívan rendezi az objektumkulcsokat, de megtartja a tömbök sorrendjét", () => {
    const value = {
      z: [{ b: 2, a: 1 }],
      a: { y: 2, x: 1 },
      list: [2, 1],
    };

    expect(stableJsonStringify(value)).toBe('{"a":{"x":1,"y":2},"list":[2,1],"z":[{"a":1,"b":2}]}');
  });

  it("megőrzi a null és undefined natív JSON viselkedését", () => {
    expect(stableJsonStringify(null)).toBe("null");
    expect(stableJsonStringify({ present: null, omitted: undefined })).toBe('{"present":null}');
    expect(stableJsonStringify([undefined, null])).toBe("[null,null]");
    expect(stableJsonStringify(undefined)).toBeUndefined();
  });

  it("megőrzi a JSON számkonverziót és a forrásobjektumot nem módosítja", () => {
    const value = Object.freeze({
      z: Object.freeze([{ b: 2, a: 1 }]),
      a: Object.freeze({ y: 2, x: 1 }),
      values: Object.freeze({ fraction: 0.1 + 0.2, minusZero: -0, notANumber: Number.NaN, positiveInfinity: Number.POSITIVE_INFINITY }),
    });
    const before = structuredClone(value);

    expect(stableJsonStringify(value)).toBe('{"a":{"x":1,"y":2},"values":{"fraction":0.30000000000000004,"minusZero":0,"notANumber":null,"positiveInfinity":null},"z":[{"a":1,"b":2}]}');
    expect(value).toEqual(before);
  });

  it("megőrzi a BigInt és a ciklikus input jelenlegi hibáit", () => {
    expect(() => stableJsonStringify({ value: BigInt(1) })).toThrow(TypeError);
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => stableJsonStringify(cyclic)).toThrow(RangeError);
  });
});

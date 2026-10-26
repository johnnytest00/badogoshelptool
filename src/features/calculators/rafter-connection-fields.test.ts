import { describe, expect, it } from "vitest";
import { definitions } from "./roof-calculator-definitions";
import { isRafterConnectionField } from "./rafter-connection-fields";

describe("rafter connection workflow fields", () => {
  it("keeps the shared connection fields together across the three roof calculators", () => {
    for (const id of ["roof.rafter-cut", "roof.material-takeoff", "roof.timber-cutlist"]) {
      const keys = definitions[id].fields.filter((field) => isRafterConnectionField(field, id)).map((field) => field.key);
      expect(keys).toContain("purlinFaceMm");
      expect(keys).toContain("purlinTopMm");
      expect(keys).toContain("ridgeJoint");
    }
    expect(definitions["roof.material-takeoff"].fields.filter((field) => isRafterConnectionField(field, "roof.material-takeoff")).map((field) => field.key)).toContain("seatCutHeightMm");
    expect(definitions["roof.rafter-cut"].fields.filter((field) => isRafterConnectionField(field, "roof.rafter-cut")).map((field) => field.key)).not.toContain("seatCutHeightMm");
  });
});

import { jointGroupState } from "./rafter-connection-fields";
describe("jointGroupState (M9.15.1)", () => {
  it("names the five section states", () => {
    expect(jointGroupState([], false).label).toBe("Nincs még elég adat");
    expect(jointGroupState([], true).label).toBe("Nincs megadva · opcionális");
    expect(jointGroupState(["incomplete"], false).tone).toBe("empty");
    expect(jointGroupState(["computed", "computed"], false).tone).toBe("ok");
    expect(jointGroupState(["computed", "unsupported"], false).tone).toBe("limited");
    expect(jointGroupState(["computed", "invalid"], false).tone).toBe("invalid");
    expect(jointGroupState(["unsupported", "not-applicable"], false).tone).toBe("unsupported");
  });
});

import { karmiStatusText } from "./rafter-connection-fields";
describe("karmiStatusText (M9.15.3)", () => {
  it("states the KARMI preview separately from the material takeoff", () => {
    expect(karmiStatusText([{ status: "computed" }], true)).toMatchObject({ tone: "ok", label: expect.stringContaining("bevágási előnézet elkészült") });
    expect(karmiStatusText([{ status: "computed" }, { status: "not-applicable" }], true).tone).toBe("limited");
    expect(karmiStatusText([{ status: "incomplete", missing: ["HAP"] }], true).label).toContain("hiányzik: HAP");
    expect(karmiStatusText([{ status: "invalid", reason: "túl nagy" }], true).tone).toBe("invalid");
    expect(karmiStatusText([], false).tone).toBe("unsupported");
  });
});

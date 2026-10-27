import { describe, expect, it } from "vitest";
import type { RafterCutTransferSource } from "@/features/calculations/construction-data";
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
  it("states the Karmi preview separately from the material takeoff", () => {
    expect(karmiStatusText([{ status: "computed" }], true)).toMatchObject({ tone: "ok", label: expect.stringContaining("bevágási előnézet elkészült") });
    expect(karmiStatusText([{ status: "computed" }, { status: "not-applicable" }], true).tone).toBe("limited");
    expect(karmiStatusText([{ status: "incomplete", missing: ["HAP"] }], true).label).toContain("hiányzik: HAP");
    expect(karmiStatusText([{ status: "invalid", reason: "túl nagy" }], true).tone).toBe("invalid");
    expect(karmiStatusText([], false).tone).toBe("unsupported");
  });
});

import { rafterJointTransferValues } from "./rafter-connection-fields";
describe("rafterJointTransferValues (M10 Fázis 0)", () => {
  it("keeps only the HAP/ridge-connection keys that have a value", () => {
    expect(rafterJointTransferValues({ seatCutHeightMm: "120", ridgeJoint: "purlin", ridgePurlinWidthMm: "", horizontalHalfSpanMm: "3000", riseMm: "1200" }))
      .toEqual({ seatCutHeightMm: "120", ridgeJoint: "purlin" });
  });
  it("returns nothing when the source has none of the transferable fields", () => {
    expect(rafterJointTransferValues({ horizontalHalfSpanMm: "3000" })).toEqual({});
  });
  it("only transfers fields that are also keys of the two target calculators", () => {
    const targetKeys = new Set(definitions["roof.material-takeoff"].fields.map((field) => field.key));
    for (const key of Object.keys(rafterJointTransferValues({ seatCutHeightMm: "1", plateWidthMm: "1", purlinFaceMm: "1", purlinTopMm: "1", ridgeJoint: "board", ridgeBoardThicknessMm: "1", ridgePurlinWidthMm: "1", ridgePurlinTopMm: "1", eaveProjectionMm: "1" }))) {
      expect(targetKeys.has(key)).toBe(true);
    }
  });
});

describe("rafterJointTransferValues eave overhang mapping (M10 Fázis 1)", () => {
  it("maps the source's eaveProjectionMm onto the target's eaveOverhangMm key", () => {
    expect(rafterJointTransferValues({ eaveProjectionMm: "500" })).toEqual({ eaveOverhangMm: "500" });
  });
  it("still excludes the half-span and rise fields, which are not proven equivalent across all roof shapes", () => {
    const result = rafterJointTransferValues({ horizontalHalfSpanMm: "3000", riseMm: "1200", eaveProjectionMm: "500" });
    expect(result).toEqual({ eaveOverhangMm: "500" });
    expect(result).not.toHaveProperty("widthMm");
    expect(result).not.toHaveProperty("pitchDegrees");
  });
});

import { rafterCutTransferFields } from "./rafter-connection-fields";
const gableSource: RafterCutTransferSource = {
  calculationId: "c1", displayName: "DEMO szarufa", revisionId: "r1", revisionNumber: 1,
  fields: { seatCutHeightMm: "100", ridgeJoint: "purlin" },
  geometry: { horizontalHalfSpanMm: "4000", riseMm: "2800", seatCutHeightMm: "100" },
};
describe("rafterCutTransferFields (M10 Fázis 1)", () => {
  it("always transfers the Karmi/joint fields and turns the joint fields on, independent of the gable symmetry decision", () => {
    expect(rafterCutTransferFields(gableSource, "hip", false)).toEqual({ seatCutHeightMm: "100", ridgeJoint: "purlin", birdsmouth: "true" });
    expect(rafterCutTransferFields(gableSource, "gable", false)).toEqual({ seatCutHeightMm: "100", ridgeJoint: "purlin", birdsmouth: "true" });
  });

  it("adds widthMm/pitchDegrees only for a gable target with explicit symmetry confirmation", () => {
    const result = rafterCutTransferFields(gableSource, "gable", true);
    expect(result.widthMm).toBe("8000");
    expect(Number(result.pitchDegrees)).toBeCloseTo(34.019, 3);
    expect(result.seatCutHeightMm).toBe("100");
    expect(result.birdsmouth).toBe("true");
  });

  it("never writes widthMm/pitchDegrees for a non-gable target, even with symmetry confirmed", () => {
    const result = rafterCutTransferFields(gableSource, "hip", true);
    expect(result).not.toHaveProperty("widthMm");
    expect(result).not.toHaveProperty("pitchDegrees");
  });

  it("skips widthMm/pitchDegrees when the source geometry cannot be converted, without estimating", () => {
    const missingHap: RafterCutTransferSource = { ...gableSource, geometry: { horizontalHalfSpanMm: "4000", riseMm: "2800" } };
    const result = rafterCutTransferFields(missingHap, "gable", true);
    expect(result).not.toHaveProperty("widthMm");
    expect(result).not.toHaveProperty("pitchDegrees");
  });
});

import { invalidateGableGeometryOnShapeChange } from "./rafter-connection-fields";
describe("invalidateGableGeometryOnShapeChange (M10.1.2 P1 — M10_PHASE1_INDEPENDENT_QA.md §6)", () => {
  const applied = { newFields: { widthMm: "8000", pitchDegrees: "34.01934998982646", seatCutHeightMm: "100", ridgeJoint: "purlin" }, snapshot: { widthMm: "", pitchDegrees: "", seatCutHeightMm: "", ridgeJoint: "" } };
  const confirmedFields = { widthMm: "8000", pitchDegrees: "34.01934998982646", seatCutHeightMm: "100", ridgeJoint: "purlin" };

  it("confirm → hip/shed: resets the untouched gable geometry, keeps the Karmi fields applied", () => {
    for (const nextShape of ["hip", "shed"]) {
      const transition = invalidateGableGeometryOnShapeChange("gable", nextShape, applied, confirmedFields);
      expect(transition?.resetFields).toEqual({ widthMm: "", pitchDegrees: "" });
      expect(transition?.nextApplied).toEqual({ newFields: { seatCutHeightMm: "100", ridgeJoint: "purlin" }, snapshot: { seatCutHeightMm: "", ridgeJoint: "" } });
    }
  });

  it("M10.1.3: resets only the still-untouched geometry field when the other was manually edited (per-field, not all-or-nothing)", () => {
    const widthEdited = { ...confirmedFields, widthMm: "9500" };
    const widthTransition = invalidateGableGeometryOnShapeChange("gable", "hip", applied, widthEdited);
    expect(widthTransition?.resetFields).toEqual({ pitchDegrees: "" });
    expect(widthTransition?.nextApplied).toEqual({ newFields: { widthMm: "8000", seatCutHeightMm: "100", ridgeJoint: "purlin" }, snapshot: { widthMm: "", seatCutHeightMm: "", ridgeJoint: "" } });

    const pitchEdited = { ...confirmedFields, pitchDegrees: "40" };
    const pitchTransition = invalidateGableGeometryOnShapeChange("gable", "hip", applied, pitchEdited);
    expect(pitchTransition?.resetFields).toEqual({ widthMm: "" });
    expect(pitchTransition?.nextApplied).toEqual({ newFields: { pitchDegrees: "34.01934998982646", seatCutHeightMm: "100", ridgeJoint: "purlin" }, snapshot: { pitchDegrees: "", seatCutHeightMm: "", ridgeJoint: "" } });
  });

  it("does nothing when both geometry fields were manually edited (nothing left to invalidate)", () => {
    const bothEdited = { ...confirmedFields, widthMm: "9500", pitchDegrees: "40" };
    expect(invalidateGableGeometryOnShapeChange("gable", "hip", applied, bothEdited)).toBeNull();
  });

  it("does nothing when only Karmi fields were transferred (no gable geometry to invalidate)", () => {
    const jointOnly = { newFields: { seatCutHeightMm: "100", ridgeJoint: "purlin" }, snapshot: { seatCutHeightMm: "", ridgeJoint: "" } };
    expect(invalidateGableGeometryOnShapeChange("gable", "hip", jointOnly, { seatCutHeightMm: "100", ridgeJoint: "purlin" })).toBeNull();
  });

  it("does nothing while staying on gable, or when nothing was applied yet", () => {
    expect(invalidateGableGeometryOnShapeChange("gable", "gable", applied, confirmedFields)).toBeNull();
    expect(invalidateGableGeometryOnShapeChange("hip", "shed", applied, confirmedFields)).toBeNull();
    expect(invalidateGableGeometryOnShapeChange("gable", "hip", null, confirmedFields)).toBeNull();
  });

  it("does not silently resurrect the invalidated geometry when switching back to gable", () => {
    const afterInvalidation = invalidateGableGeometryOnShapeChange("gable", "hip", applied, confirmedFields);
    const backToGable = invalidateGableGeometryOnShapeChange("hip", "gable", afterInvalidation!.nextApplied, { seatCutHeightMm: "100", ridgeJoint: "purlin" });
    expect(backToGable).toBeNull();
  });
});

import { roofShapeToRafterCutTransferValues, rafterCutTargetTransferFields } from "./rafter-connection-fields";
describe("roofShapeToRafterCutTransferValues (M10.2 — reverse of rafterJointTransferValues)", () => {
  it("maps the target's known joint/eave keys back onto roof.rafter-cut's own keys", () => {
    expect(roofShapeToRafterCutTransferValues({ seatCutHeightMm: "100", ridgeJoint: "purlin", eaveOverhangMm: "500" }))
      .toEqual({ seatCutHeightMm: "100", ridgeJoint: "purlin", eaveProjectionMm: "500" });
  });
  it("never includes widthMm/pitchDegrees, which have no proven mapping outside the gable geometry helper", () => {
    const result = roofShapeToRafterCutTransferValues({ widthMm: "8000", pitchDegrees: "30", roofShape: "gable", seatCutHeightMm: "0" });
    expect(result).toEqual({ seatCutHeightMm: "0" });
  });
  it("is the exact inverse of the forward map — round-tripping every key returns the original value", () => {
    const forward = rafterJointTransferValues({ seatCutHeightMm: "1", plateWidthMm: "1", purlinFaceMm: "1", purlinTopMm: "1", ridgeJoint: "board", ridgeBoardThicknessMm: "1", ridgePurlinWidthMm: "1", ridgePurlinTopMm: "1", eaveProjectionMm: "1" });
    expect(roofShapeToRafterCutTransferValues(forward)).toEqual({ seatCutHeightMm: "1", plateWidthMm: "1", purlinFaceMm: "1", purlinTopMm: "1", ridgeJoint: "board", ridgeBoardThicknessMm: "1", ridgePurlinWidthMm: "1", ridgePurlinTopMm: "1", eaveProjectionMm: "1" });
  });
});

describe("rafterCutTargetTransferFields (M10.2)", () => {
  const siblingSource = { fields: { seatCutHeightMm: "100", ridgeJoint: "purlin", eaveOverhangMm: "0" }, geometry: { widthMm: "8000", pitchDegrees: "34.01934998982646", seatCutHeightMm: "100", eaveOverhangMm: "0" } };

  it("always transfers the joint fields, independent of the gable symmetry decision", () => {
    expect(rafterCutTargetTransferFields(siblingSource, "hip", false)).toEqual({ seatCutHeightMm: "100", ridgeJoint: "purlin", eaveProjectionMm: "0" });
    expect(rafterCutTargetTransferFields(siblingSource, "gable", false)).toEqual({ seatCutHeightMm: "100", ridgeJoint: "purlin", eaveProjectionMm: "0" });
  });

  it("adds horizontalHalfSpanMm/riseMm/eaveProjectionMm only for a gable source with explicit symmetry confirmation", () => {
    const result = rafterCutTargetTransferFields(siblingSource, "gable", true);
    expect(Number(result.horizontalHalfSpanMm)).toBeCloseTo(4000, 6);
    expect(Number(result.riseMm)).toBeCloseTo(2800, 6);
    expect(result.eaveProjectionMm).toBe("0");
    expect(result.seatCutHeightMm).toBe("100");
  });

  it("never writes the geometry fields for a non-gable source, even with symmetry confirmed", () => {
    const result = rafterCutTargetTransferFields(siblingSource, "hip", true);
    expect(result).not.toHaveProperty("horizontalHalfSpanMm");
    expect(result).not.toHaveProperty("riseMm");
  });

  it("skips the geometry fields when the source HAP is missing, without estimating", () => {
    const missingHap = { ...siblingSource, geometry: { widthMm: "8000", pitchDegrees: "34.01934998982646", eaveOverhangMm: "0" } };
    const result = rafterCutTargetTransferFields(missingHap, "gable", true);
    expect(result).not.toHaveProperty("horizontalHalfSpanMm");
    expect(result).not.toHaveProperty("riseMm");
  });

  it("round-trips with rafterCutTransferFields: converting forward then back recovers the original half-span/rise", () => {
    const rafterCutSource: RafterCutTransferSource = { calculationId: "c1", displayName: "x", revisionId: "r1", revisionNumber: 1, fields: {}, geometry: { horizontalHalfSpanMm: "4000", riseMm: "2800", seatCutHeightMm: "100" } };
    const forward = rafterCutTransferFields(rafterCutSource, "gable", true);
    const back = rafterCutTargetTransferFields({ fields: {}, geometry: { widthMm: forward.widthMm, pitchDegrees: forward.pitchDegrees, seatCutHeightMm: "100", eaveOverhangMm: "0" } }, "gable", true);
    expect(Number(back.horizontalHalfSpanMm)).toBeCloseTo(4000, 6);
    expect(Number(back.riseMm)).toBeCloseTo(2800, 6);
  });
});

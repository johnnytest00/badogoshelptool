// @vitest-environment jsdom
import { Fragment, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LengthField, type LengthFieldState } from "@/components/ui/length-field";
import { calculatorFieldKey } from "./construction-drafts";

afterEach(cleanup);

/** The `renderField` keying of construction-suite.tsx, with a native number input and a LengthField. */
function Fields({ keyWithValue = false }: Readonly<{ keyWithValue?: boolean }>) {
  const [values, setValues] = useState<Record<string, string>>({ pitchDegrees: "", lengthMm: "" });
  const [drafts, setDrafts] = useState<Record<string, LengthFieldState>>({});
  const key = (field: string) => keyWithValue ? `${calculatorFieldKey("roof.material-takeoff", 0, field)}:${values[field]}` : calculatorFieldKey("roof.material-takeoff", 0, field);
  return <>
    <Fragment key={key("pitchDegrees")}><label>Tetőhajlás<input type="number" value={values.pitchDegrees} onChange={(event) => setValues((current) => ({ ...current, pitchDegrees: event.target.value }))} /></label></Fragment>
    <Fragment key={key("lengthMm")}><LengthField label="Tető hossza" value={values.lengthMm} draftState={drafts.lengthMm} onDraftStateChange={(state) => setDrafts((current) => ({ ...current, lengthMm: state }))} onChange={(value) => setValues((current) => ({ ...current, lengthMm: value }))} /></Fragment>
  </>;
}

function typeKeyByKey(label: string, text: string) {
  for (let index = 1; index <= text.length; index++) {
    const input = screen.getByLabelText(label, { exact: false }) as HTMLInputElement;
    input.focus();
    const before = document.activeElement;
    fireEvent.change(input, { target: { value: text.slice(0, index) } });
    if (document.activeElement !== before) return { focusKept: false, value: (screen.getByLabelText(label, { exact: false }) as HTMLInputElement).value };
  }
  return { focusKept: true, value: (screen.getByLabelText(label, { exact: false }) as HTMLInputElement).value };
}

describe("calculator field focus while typing (M12 audit T1)", () => {
  it("keeps focus key by key in native and LengthField inputs with the stable key", () => {
    render(<Fields />);
    expect(typeKeyByKey("Tetőhajlás", "35")).toEqual({ focusKept: true, value: "35" });
    expect(typeKeyByKey("Tető hossza, cm", "820")).toEqual({ focusKept: true, value: "820" });
  });

  it("control: a value in the key remounts the input and drops focus after the first key", () => {
    render(<Fields keyWithValue />);
    expect(typeKeyByKey("Tetőhajlás", "35").focusKept).toBe(false);
  });
});

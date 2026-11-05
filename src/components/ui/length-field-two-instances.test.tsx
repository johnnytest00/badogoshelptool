// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LengthField, type LengthFieldState } from "./length-field";

/**
 * T7 előkészítés: mi történik, ha UGYANAZT a mezőt két helyen rajzoljuk ki (a kalkulátor űrlapján és a rajzpanelben),
 * közös szülőállapottal? A `LengthField` saját belső `useState`-et tart, és a `draftState`-et csak mountkor olvassa —
 * ezek a tesztek azt rögzítik, hol tér el ezért a két példány. A T7 ezért átvételt használ, nem két példányt.
 */
afterEach(cleanup);

function TwoInstances() {
  const [value, setValue] = useState("");
  const [draft, setDraft] = useState<LengthFieldState | undefined>(undefined);
  return <>
    <p data-testid="canonical">{value}</p>
    <p data-testid="draft">{draft ? `${draft.text}|${draft.unit}` : "-"}</p>
    <LengthField id="form" label="Űrlap" value={value} draftState={draft} onDraftStateChange={setDraft} onChange={setValue} />
    <LengthField id="panel" label="Panel" value={value} draftState={draft} onDraftStateChange={setDraft} onChange={setValue} />
  </>;
}

const box = (label: string) => screen.getByLabelText(new RegExp(`^${label},`, "u")) as HTMLInputElement;
const unitButton = (label: string, unit: string) =>
  screen.getByRole("group", { name: `${label} mértékegysége` }).querySelector(`button[aria-pressed]:nth-of-type(${["mm", "cm", "m"].indexOf(unit) + 1})`) as HTMLButtonElement;

describe("the same length field rendered twice", () => {
  it("propagates a complete value, because it travels through the parent's canonical millimetres", () => {
    render(<TwoInstances />);
    fireEvent.change(box("Űrlap"), { target: { value: "250" } });
    expect(screen.getByTestId("canonical").textContent).toBe("2500");
    expect(box("Panel").value).toBe("250");
  });

  it("empties the other copy while one copy holds invalid text, because an unparsable text clears the value", () => {
    render(<TwoInstances />);
    fireEvent.change(box("Űrlap"), { target: { value: "250" } });
    expect(box("Panel").value).toBe("250");

    // "25x" is not a length: the field emits an empty canonical value, so the stored millimetres are cleared.
    // The copy being edited keeps its invalid text and its error, the other copy just goes blank — two boxes
    // showing the same field disagree on screen. This is why T7 takes the field over instead of duplicating it.
    fireEvent.change(box("Űrlap"), { target: { value: "25x" } });
    expect(box("Űrlap").value).toBe("25x");
    expect(screen.getByTestId("canonical").textContent).toBe("");
    expect(box("Panel").value).toBe("");
    expect(screen.getAllByRole("alert").length).toBe(1);
  });

  it("does NOT propagate a unit switch, so the two copies can show different units for one value", () => {
    render(<TwoInstances />);
    fireEvent.change(box("Űrlap"), { target: { value: "250" } });
    fireEvent.click(unitButton("Űrlap", "m"));
    // The physical size is unchanged, so nothing is emitted to the parent — only the draft records the new unit.
    expect(box("Űrlap").value).toBe("2,5");
    expect(box("Panel").value).toBe("250");
    expect(screen.getByTestId("canonical").textContent).toBe("2500");
  });

  it("lets the last writer win the shared draft, which is what a remount would restore", () => {
    render(<TwoInstances />);
    fireEvent.change(box("Űrlap"), { target: { value: "25x" } });
    expect(screen.getByTestId("draft").textContent).toBe("25x|cm");
    expect(box("Panel").value).toBe("");
    // The other copy writes the shared draft too; the in-progress text of the first copy is gone from the store,
    // and emitting a canonical value also resyncs the first copy, discarding what was being typed there.
    fireEvent.change(box("Panel"), { target: { value: "30" } });
    expect(screen.getByTestId("draft").textContent).toBe("30|cm");
    expect(screen.getByTestId("canonical").textContent).toBe("300");
    expect(box("Űrlap").value).toBe("30");
  });
});

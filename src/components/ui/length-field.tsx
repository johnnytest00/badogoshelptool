"use client";

import { useId, useState } from "react";
import { DEFAULT_LENGTH_UNIT, LENGTH_UNITS, formatLength, parseLengthInput, type LengthInputOptions, type LengthUnit } from "@/domain/measurements/length-input";

export type LengthFieldState = Readonly<{ text: string; unit: LengthUnit }>;

/** Canonical millimetres as a string ("" when there is no valid value). */
export function canonicalLength(state: LengthFieldState, options?: LengthInputOptions): string {
  const parsed = parseLengthInput(state.text, state.unit, options);
  return parsed.state === "valid" ? String(parsed.mm) : "";
}

export function lengthStateFromCanonical(canonical: string, unit: LengthUnit): LengthFieldState {
  const mm = canonical.trim() === "" ? Number.NaN : Number(canonical.replace(",", "."));
  return { text: Number.isFinite(mm) ? formatLength(mm, unit) : "", unit };
}

/** A valid value keeps its physical size; text that is not yet a length is simply read in the new unit. */
export function switchLengthUnit(state: LengthFieldState, unit: LengthUnit, options?: LengthInputOptions): LengthFieldState {
  const parsed = parseLengthInput(state.text, state.unit, options);
  return parsed.state === "valid" ? { text: formatLength(parsed.mm, unit), unit } : { ...state, unit };
}

const sameCanonical = (left: string, right: string) => left === right || (left !== "" && right !== "" && Number(left) === Number(right));

type Props = LengthInputOptions & Readonly<{
  id?: string;
  name?: string;
  /** Canonical millimetres as a string; "" when empty. */
  value: string;
  onChange: (canonicalMm: string) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultUnit?: LengthUnit;
  /** Validation message from the form's own contract; the field's parse error takes precedence. */
  error?: string;
  /** Extra description (help text) element id. */
  describedBy?: string;
  onFocus?: () => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}>;

/** Linear length input with a per-field mm / cm / m switch; the parent only ever sees millimetres. */
export function LengthField({ id, name, value, onChange, label, required, disabled, placeholder, defaultUnit = DEFAULT_LENGTH_UNIT, mmDecimals, maxMm, error, describedBy, onFocus, onBlur, onKeyDown }: Props) {
  const options = { mmDecimals, maxMm };
  const [state, setState] = useState(() => ({ ...lengthStateFromCanonical(value, defaultUnit), synced: value }));
  const generatedId = useId();
  const errorId = `${id ?? generatedId}-error`;
  // The parent may reset or replace the value (calculator switch, product pick); follow it, keeping the unit.
  if (value !== state.synced) setState({ ...lengthStateFromCanonical(value, state.unit), synced: value });
  const parsed = parseLengthInput(state.text, state.unit, options);
  const message = parsed.state === "invalid" ? parsed.error : error;
  const update = (next: LengthFieldState) => {
    const canonical = canonicalLength(next, options);
    const emit = !sameCanonical(canonical, value);
    setState({ ...next, synced: emit ? canonical : value });
    if (emit) onChange(canonical);
  };
  return <span className="length-field">
    <input id={id} name={name} type="text" inputMode="decimal" autoComplete="off" placeholder={placeholder} required={required} disabled={disabled} value={state.text}
      aria-label={`${label}, ${state.unit}`} aria-invalid={message ? true : undefined} aria-describedby={[describedBy, message ? errorId : null].filter(Boolean).join(" ") || undefined}
      onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown} onChange={(event) => update({ ...state, text: event.target.value })} />
    <span className="length-field-units" role="group" aria-label={`${label} mértékegysége`}>
      {LENGTH_UNITS.map((unit) => <button key={unit} type="button" disabled={disabled} aria-pressed={state.unit === unit} onClick={() => update(switchLengthUnit(state, unit, options))}>{unit}</button>)}
    </span>
    {message && <small id={errorId} className="length-field-error" role="alert">{message}</small>}
  </span>;
}

"use client";

import { useState } from "react";
import type { SyntheticEvent } from "react";
import { ArrowLeftRight } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { listRafterCutTransferSourcesAction } from "@/features/calculations/construction-actions";
import type { RafterCutTransferSource } from "@/features/calculations/construction-data";
import type { Field } from "./construction-calculator-types";

type Status = "idle" | "loading" | "error" | "loaded";
type Applied = Readonly<{ displayName: string; revisionNumber: number; newFields: Readonly<Record<string, string>>; snapshot: Readonly<Record<string, string>> }>;

function fieldValueLabel(field: Field | undefined, value: string): string {
  if (!value) return "nincs megadva";
  const option = field?.options?.find((candidate) => candidate.value === value);
  if (option) return option.label;
  return field?.unit ? `${value} ${field.unit}` : value;
}

/**
 * M10 Fázis 0: explicit, kétlépéses, megerősítést igénylő adatátvétel mentett roof.rafter-cut kalkulációból a HAP
 * és gerinckapcsolati mezőkre. Az előnézet megnyitása nem módosít draftot; csak a kifejezett megerősítés ír, és a
 * megerősítés utáni rövid visszavonás a korábbi (előnézet előtti) mezőértékeket állítja vissza.
 */
export function ConstructionFieldTransferControl({ organizationId, fields, currentFields, onApply }: Readonly<{
  organizationId: string;
  fields: readonly Field[];
  currentFields: Readonly<Record<string, string>>;
  onApply: (fields: Readonly<Record<string, string>>, sourceRevisionId: string | null) => void;
}>) {
  const [status, setStatus] = useState<Status>("idle");
  const [sources, setSources] = useState<readonly RafterCutTransferSource[]>([]);
  const [previewing, setPreviewing] = useState<RafterCutTransferSource | null>(null);
  const [applied, setApplied] = useState<Applied | null>(null);
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));

  async function load() {
    setStatus("loading");
    const result = await listRafterCutTransferSourcesAction(organizationId).catch(() => ({ ok: false as const }));
    if (!result.ok) { setStatus("error"); return; }
    setSources(result.sources);
    setStatus("loaded");
  }

  function onToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (event.currentTarget.open && status === "idle") void load();
  }

  function confirm(source: RafterCutTransferSource) {
    const newFields = { ...source.fields, birdsmouth: "true" };
    const snapshot = Object.fromEntries(Object.keys(newFields).map((key) => [key, currentFields[key] ?? ""]));
    onApply(source.fields, source.revisionId);
    setApplied({ displayName: source.displayName, revisionNumber: source.revisionNumber, newFields, snapshot });
    setPreviewing(null);
  }

  const canUndo = applied !== null && Object.entries(applied.newFields).every(([key, value]) => (currentFields[key] ?? "") === value);
  function undo() {
    if (!applied) return;
    onApply(applied.snapshot, null);
    setApplied(null);
  }

  function renderPreview(source: RafterCutTransferSource) {
    const rows = Object.entries(source.fields).map(([key, newValue]) => {
      const field = fieldByKey.get(key);
      const currentValue = currentFields[key] ?? "";
      return { key, label: field?.label ?? key, current: fieldValueLabel(field, currentValue), next: fieldValueLabel(field, newValue), changed: currentValue !== newValue };
    });
    const birdsmouthChanged = (currentFields.birdsmouth ?? "") !== "true";
    const hasChange = rows.some((row) => row.changed) || birdsmouthChanged;
    return <div className="field-transfer-preview" aria-label="Átvétel előnézete">
      <p className="plan-link-note">{source.displayName} · V{source.revisionNumber}</p>
      <table className="field-transfer-diff">
        <thead><tr><th scope="col">Mező</th><th scope="col">Jelenlegi</th><th scope="col">Átvenni kívánt</th></tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.key} className={row.changed ? "is-changed" : undefined}>
            <th scope="row">{row.label}</th><td>{row.current}</td><td>{row.next}</td>
          </tr>)}
          {birdsmouthChanged && <tr className="is-changed"><th scope="row">Bevágás bekapcsolása</th><td>kikapcsolva</td><td>bekapcsolva</td></tr>}
        </tbody>
      </table>
      {!hasChange && <p className="plan-link-note">Nincs új adat; minden érték megegyezik a jelenlegi mezőkkel.</p>}
      <div className="field-transfer-actions">
        <button type="button" className="secondary-button" onClick={() => setPreviewing(null)}>Mégse</button>
        <button type="button" className="primary-button" disabled={!hasChange} onClick={() => confirm(source)}>Adatok átvétele</button>
      </div>
    </div>;
  }

  return <section className="plan-link-control" aria-label="Adatok átvétele">
    <GlassDisclosure className="plan-link-add" summary={<><ArrowLeftRight aria-hidden="true" size={17} /> Adatok átvétele mentett szarufa-kiszabásból</>} onToggle={onToggle}>
      {status === "loading" && <p className="plan-link-note" role="status">Betöltés…</p>}
      {status === "error" && <p className="form-message is-error" role="alert">A mentett számítások listája most nem tölthető be. <button type="button" className="text-action" onClick={() => void load()}>Újrapróbálás</button></p>}
      {status === "loaded" && sources.length === 0 && <p className="plan-link-empty">Nincs mentett, kompatibilis „Szarufa kiszabása” számítás ebben a műhelyben.</p>}
      {status === "loaded" && sources.length > 0 && !previewing && <ul className="plan-link-list">
        {sources.map((source) => <li key={source.revisionId}>
          <span>{source.displayName} <small>· V{source.revisionNumber}</small></span>
          <button type="button" className="text-action" onClick={() => setPreviewing(source)}>Adatok megtekintése</button>
        </li>)}
      </ul>}
      {previewing && renderPreview(previewing)}
      {applied && <p className="plan-link-note" role="status">
        Adatok átvéve: {applied.displayName} · V{applied.revisionNumber}. A HAP és gerinckapcsolati mezők kitöltve; ellenőrizd, majd mentsd a kalkulációt.
        {canUndo && <> <button type="button" className="text-action" onClick={undo}>Visszavonás</button></>}
      </p>}
    </GlassDisclosure>
  </section>;
}

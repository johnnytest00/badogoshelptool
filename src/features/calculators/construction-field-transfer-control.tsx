"use client";

import { useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import { ArrowLeftRight } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { listRafterCutTransferSourcesAction } from "@/features/calculations/construction-actions";
import type { RafterCutTransferSource } from "@/features/calculations/construction-data";
import { convertGableGeometryFromRafterCut, type GableGeometryTransferReason } from "@/domain/calculations/construction/roofs";
import { rafterCutTransferFields } from "./rafter-connection-fields";
import type { Field } from "./construction-calculator-types";

type Status = "idle" | "loading" | "error" | "loaded";
export type AppliedTransferDisplay = Readonly<{ displayName: string; revisionNumber: number; newFields: Readonly<Record<string, string>>; snapshot: Readonly<Record<string, string>> }>;
type DiffRow = Readonly<{ key: string; label: string; current: string; next: string; changed: boolean; computed?: string }>;

function fieldValueLabel(field: Field | undefined, value: string): string {
  if (!value) return "nincs megadva";
  const option = field?.options?.find((candidate) => candidate.value === value);
  if (option) return option.label;
  return field?.unit ? `${value} ${field.unit}` : value;
}

const GABLE_SKIP_REASON_LABEL: Readonly<Record<GableGeometryTransferReason, string>> = {
  INVALID_SOURCE_GEOMETRY: "A forrás fél fesztávja vagy gerincemelkedése nem érvényes, ezért a tetőszélesség és a hajlás nem számítható.",
  MISSING_HAP: "A forrás nem tartalmaz HAP-adatot, ezért a hajlás nem számítható.",
  INVALID_HAP: "A forrás HAP-adata érvénytelen (negatív, vagy nem kisebb a gerincemelkedésnél), ezért a hajlás nem számítható.",
  TARGET_RANGE: "A számított tetőszélesség vagy hajlás kívül esik az érvényes tartományon.",
};

/**
 * M10 Fázis 0: explicit, kétlépéses, megerősítést igénylő adatátvétel mentett roof.rafter-cut kalkulációból a HAP
 * és gerinckapcsolati mezőkre. Az előnézet megnyitása nem módosít draftot; csak a kifejezett megerősítés ír, és a
 * megerősítés utáni rövid visszavonás a korábbi (előnézet előtti) mezőértékeket állítja vissza.
 *
 * M10 Fázis 1: gable célnál, a felhasználó explicit szimmetria-elfogadása mellett, a widthMm/pitchDegrees mezők is
 * átvehetők, matematikai konverzióval (docs/M10_PHASE1_GEOMETRY_TRANSFER_DESIGN.md). A szimmetria-elfogadás minden
 * előnézet-megnyitáskor és tetőforma-váltáskor visszaáll, hogy ne maradjon érvényben egy már nem releváns döntés.
 */
export function ConstructionFieldTransferControl({ organizationId, fields, currentFields, roofShape, applied, onApply, onAppliedChange }: Readonly<{
  organizationId: string;
  fields: readonly Field[];
  currentFields: Readonly<Record<string, string>>;
  roofShape: string;
  applied: AppliedTransferDisplay | null;
  onApply: (fields: Readonly<Record<string, string>>, sourceRevisionId: string | null) => void;
  onAppliedChange: (applied: AppliedTransferDisplay | null) => void;
}>) {
  const [status, setStatus] = useState<Status>("idle");
  const [sources, setSources] = useState<readonly RafterCutTransferSource[]>([]);
  const [previewing, setPreviewing] = useState<RafterCutTransferSource | null>(null);
  const [symmetryConfirmed, setSymmetryConfirmed] = useState(false);
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  const isGableTarget = roofShape === "gable";
  // Forma váltás vagy másik forrás előnézete a korábbi szimmetria-elfogadást érvényteleníti (M10.1 §2.4).
  useEffect(() => setSymmetryConfirmed(false), [roofShape, previewing?.revisionId]);

  // M10.1.3: a gable→más forma váltás és az átvett widthMm/pitchDegrees érvénytelenítése a tulajdonos
  // (ConstructionCalculatorSuite) `updateValue`-jában, egyetlen atomi draft-frissítésként történik — nem itt,
  // gyermek passive effectben (docs/M10_PHASE1_FINAL_INDEPENDENT_QA.md §16.4 kritikus architekturális követelmény).

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
    const newFields = rafterCutTransferFields(source, roofShape, symmetryConfirmed);
    const snapshot = Object.fromEntries(Object.keys(newFields).map((key) => [key, currentFields[key] ?? ""]));
    onApply(newFields, source.revisionId);
    onAppliedChange({ displayName: source.displayName, revisionNumber: source.revisionNumber, newFields, snapshot });
    setPreviewing(null);
  }

  const canUndo = applied !== null && Object.entries(applied.newFields).every(([key, value]) => (currentFields[key] ?? "") === value);
  function undo() {
    if (!applied) return;
    onApply(applied.snapshot, null);
    onAppliedChange(null);
  }

  function renderPreview(source: RafterCutTransferSource) {
    const jointRows: DiffRow[] = Object.entries(source.fields).map(([key, newValue]) => {
      const field = fieldByKey.get(key);
      const currentValue = currentFields[key] ?? "";
      return { key, label: field?.label ?? key, current: fieldValueLabel(field, currentValue), next: fieldValueLabel(field, newValue), changed: currentValue !== newValue };
    });
    const geometryConversion = isGableTarget ? convertGableGeometryFromRafterCut(source.geometry) : null;
    const geometryRows: DiffRow[] = geometryConversion?.ok && symmetryConfirmed ? [
      { key: "widthMm", label: fieldByKey.get("widthMm")?.label ?? "Tető szélessége", current: fieldValueLabel(fieldByKey.get("widthMm"), currentFields.widthMm ?? ""), next: fieldValueLabel(fieldByKey.get("widthMm"), String(geometryConversion.widthMm)), changed: (currentFields.widthMm ?? "") !== String(geometryConversion.widthMm), computed: "szimmetrikus nyeregtető alapján" },
      { key: "pitchDegrees", label: fieldByKey.get("pitchDegrees")?.label ?? "Tetőhajlás", current: fieldValueLabel(fieldByKey.get("pitchDegrees"), currentFields.pitchDegrees ?? ""), next: `≈ ${fieldValueLabel(fieldByKey.get("pitchDegrees"), String(Math.round(geometryConversion.pitchDegrees * 1000) / 1000))} (a mentett érték teljes pontosságú: ${geometryConversion.pitchDegrees}°)`, changed: (currentFields.pitchDegrees ?? "") !== String(geometryConversion.pitchDegrees), computed: "gerincemelkedésből és HAP-ból számítva" },
    ] : [];
    const rows = [...jointRows, ...geometryRows];
    const birdsmouthChanged = (currentFields.birdsmouth ?? "") !== "true";
    const hasChange = rows.some((row) => row.changed) || birdsmouthChanged;
    return <div className="field-transfer-preview" aria-label="Átvétel előnézete">
      <p className="plan-link-note">{source.displayName} · V{source.revisionNumber}</p>
      {isGableTarget && <div className="field-transfer-symmetry">
        <label>
          <input type="checkbox" checked={symmetryConfirmed} onChange={(event) => setSymmetryConfirmed(event.target.checked)} />
          A tető szimmetrikus nyeregtető, a két tetősík vízszintes fél fesztávja azonos.
        </label>
        {!symmetryConfirmed && <p className="plan-link-note">Jóváhagyás nélkül a tetőszélesség és a hajlás nem kerül át; a csatlakozási mezők attól függetlenül átvehetők.</p>}
        {symmetryConfirmed && geometryConversion && !geometryConversion.ok && <p className="form-message is-error" role="alert">{GABLE_SKIP_REASON_LABEL[geometryConversion.reason]}</p>}
      </div>}
      <table className="field-transfer-diff">
        <thead><tr><th scope="col">Mező</th><th scope="col">Jelenlegi</th><th scope="col">Átvenni kívánt</th><th scope="col">Eredet</th></tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.key} className={row.changed ? "is-changed" : undefined}>
            <th scope="row">{row.label}</th><td>{row.current}</td><td>{row.next}</td><td>{row.computed ? `Számított · ${row.computed}` : "Átvett"}</td>
          </tr>)}
          {birdsmouthChanged && <tr className="is-changed"><th scope="row">Bevágás bekapcsolása</th><td>kikapcsolva</td><td>bekapcsolva</td><td>Átvett</td></tr>}
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
        Adatok átvéve: {applied.displayName} · V{applied.revisionNumber}. A kitöltött mezőket ellenőrizd, majd mentsd a kalkulációt.
        {canUndo && <> <button type="button" className="text-action" onClick={undo}>Visszavonás</button></>}
      </p>}
    </GlassDisclosure>
  </section>;
}

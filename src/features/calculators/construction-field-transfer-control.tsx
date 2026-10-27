"use client";

import { useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import { ArrowLeftRight } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { listRafterCutTransferSourcesAction, listRoofShapeTransferSourcesAction } from "@/features/calculations/construction-actions";
import type { RafterCutTransferSource, RoofShapeTransferSource } from "@/features/calculations/construction-data";
import { convertGableGeometryFromRafterCut, convertRafterCutGeometryFromGable, type GableGeometryTransferReason } from "@/domain/calculations/construction/roofs";
import { rafterCutTransferFields, rafterCutTargetTransferFields, roofShapeToRafterCutTransferValues } from "./rafter-connection-fields";
import type { Field } from "./construction-calculator-types";

type Status = "idle" | "loading" | "error" | "loaded";
export type AppliedTransferDisplay = Readonly<{ displayName: string; revisionNumber: number; newFields: Readonly<Record<string, string>>; snapshot: Readonly<Record<string, string>> }>;
type DiffRow = Readonly<{ key: string; label: string; current: string; next: string; changed: boolean; computed?: string }>;

/**
 * M10.2: a single list mixes two provenances when the target is roof.material-takeoff/roof.timber-cutlist — a
 * roof.rafter-cut source (M10.1, half-span/rise → width/pitch) and the other roof-shape calculator as a sibling
 * source (identical field schema, full copy, any roof shape). When the target is roof.rafter-cut, every source
 * is the reverse ("roof-shape-to-rafter-cut"): joint/eave fields via the reverse map, plus gable-only geometry.
 */
type TransferSource =
  | Readonly<{ kind: "rafter-cut"; calculationId: string; displayName: string; revisionId: string; revisionNumber: number; source: RafterCutTransferSource }>
  | Readonly<{ kind: "roof-shape-sibling"; calculationId: string; displayName: string; revisionId: string; revisionNumber: number; source: RoofShapeTransferSource }>
  | Readonly<{ kind: "roof-shape-to-rafter-cut"; calculationId: string; displayName: string; revisionId: string; revisionNumber: number; source: RoofShapeTransferSource }>;

const SOURCE_LABEL: Readonly<Record<TransferSource["kind"], string>> = {
  "rafter-cut": "mentett szarufa-kiszabásból",
  "roof-shape-sibling": "másik mentett tetőgeometriai kalkulációból",
  "roof-shape-to-rafter-cut": "mentett tetőgeometriai kalkulációból",
};

function fieldValueLabel(field: Field | undefined, value: string): string {
  if (!value) return "nincs megadva";
  const option = field?.options?.find((candidate) => candidate.value === value);
  if (option) return option.label;
  return field?.unit ? `${value} ${field.unit}` : value;
}

const GABLE_SKIP_REASON_LABEL: Readonly<Record<GableGeometryTransferReason, string>> = {
  INVALID_SOURCE_GEOMETRY: "A forrás fél fesztávja/gerincemelkedése vagy a tetőszélesség/hajlás nem érvényes, ezért a geometria nem számítható.",
  MISSING_HAP: "A forrás nem tartalmaz HAP-adatot, ezért a geometria nem számítható.",
  INVALID_HAP: "A forrás HAP-adata érvénytelen (negatív, vagy nem kisebb a gerincemelkedésnél), ezért a geometria nem számítható.",
  TARGET_RANGE: "A számított érték kívül esik az érvényes tartományon.",
};

/**
 * M10 Fázis 0: explicit, kétlépéses, megerősítést igénylő adatátvétel mentett roof.rafter-cut kalkulációból a HAP
 * és gerinckapcsolati mezőkre. Az előnézet megnyitása nem módosít draftot; csak a kifejezett megerősítés ír, és a
 * megerősítés utáni rövid visszavonás a korábbi (előnézet előtti) mezőértékeket állítja vissza.
 *
 * M10 Fázis 1: gable célnál, a felhasználó explicit szimmetria-elfogadása mellett, a widthMm/pitchDegrees mezők is
 * átvehetők, matematikai konverzióval (docs/M10_PHASE1_GEOMETRY_TRANSFER_DESIGN.md).
 *
 * M10.2: a forráskör kibővül a másik roof.material-takeoff/roof.timber-cutlist kalkulációval (azonos mezőséma,
 * teljes másolás) és — roof.rafter-cut célnál — ugyanezek fordított irányban (docs/M10_PHASE2_CALCULATOR_CONNECTIONS.md).
 * A szimmetria-elfogadás minden előnézet-megnyitáskor és tetőforma-váltáskor visszaáll.
 */
export function ConstructionFieldTransferControl({ organizationId, targetCalculatorId, fields, currentFields, roofShape, applied, onApply, onAppliedChange }: Readonly<{
  organizationId: string;
  targetCalculatorId: string;
  fields: readonly Field[];
  currentFields: Readonly<Record<string, string>>;
  roofShape: string;
  applied: AppliedTransferDisplay | null;
  onApply: (fields: Readonly<Record<string, string>>, sourceRevisionId: string | null) => void;
  onAppliedChange: (applied: AppliedTransferDisplay | null) => void;
}>) {
  const [status, setStatus] = useState<Status>("idle");
  const [sources, setSources] = useState<readonly TransferSource[]>([]);
  const [previewing, setPreviewing] = useState<TransferSource | null>(null);
  const [symmetryConfirmed, setSymmetryConfirmed] = useState(false);
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  const isShapeTarget = targetCalculatorId === "roof.material-takeoff" || targetCalculatorId === "roof.timber-cutlist";
  const isGableTarget = isShapeTarget && roofShape === "gable";
  // Forma váltás vagy másik forrás előnézete a korábbi szimmetria-elfogadást érvényteleníti (M10.1 §2.4).
  useEffect(() => setSymmetryConfirmed(false), [roofShape, previewing?.revisionId]);

  // M10.1.3: a gable→más forma váltás és az átvett widthMm/pitchDegrees érvénytelenítése a tulajdonos
  // (ConstructionCalculatorSuite) `updateValue`-jában, egyetlen atomi draft-frissítésként történik — nem itt,
  // gyermek passive effectben (docs/M10_PHASE1_FINAL_INDEPENDENT_QA.md §16.4 kritikus architekturális követelmény).

  async function load() {
    setStatus("loading");
    if (targetCalculatorId === "roof.rafter-cut") {
      const result = await listRoofShapeTransferSourcesAction(organizationId).catch(() => ({ ok: false as const }));
      if (!result.ok) { setStatus("error"); return; }
      setSources(result.sources.map((source): TransferSource => ({ kind: "roof-shape-to-rafter-cut", calculationId: source.calculationId, displayName: source.displayName, revisionId: source.revisionId, revisionNumber: source.revisionNumber, source })));
      setStatus("loaded");
      return;
    }
    const excludeCalculatorId = targetCalculatorId === "roof.material-takeoff" || targetCalculatorId === "roof.timber-cutlist" ? targetCalculatorId : undefined;
    const [rafterResult, siblingResult] = await Promise.all([
      listRafterCutTransferSourcesAction(organizationId).catch(() => ({ ok: false as const })),
      listRoofShapeTransferSourcesAction(organizationId, excludeCalculatorId).catch(() => ({ ok: false as const })),
    ]);
    if (!rafterResult.ok && !siblingResult.ok) { setStatus("error"); return; }
    setSources([
      ...(rafterResult.ok ? rafterResult.sources.map((source): TransferSource => ({ kind: "rafter-cut", calculationId: source.calculationId, displayName: source.displayName, revisionId: source.revisionId, revisionNumber: source.revisionNumber, source })) : []),
      ...(siblingResult.ok ? siblingResult.sources.map((source): TransferSource => ({ kind: "roof-shape-sibling", calculationId: source.calculationId, displayName: source.displayName, revisionId: source.revisionId, revisionNumber: source.revisionNumber, source })) : []),
    ]);
    setStatus("loaded");
  }

  function onToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (event.currentTarget.open && status === "idle") void load();
  }

  function fieldsForTransfer(item: TransferSource): Readonly<Record<string, string>> {
    if (item.kind === "rafter-cut") return rafterCutTransferFields(item.source, roofShape, symmetryConfirmed);
    if (item.kind === "roof-shape-sibling") return item.source.fields;
    return rafterCutTargetTransferFields(item.source, item.source.roofShape, symmetryConfirmed);
  }

  function confirm(item: TransferSource) {
    const newFields = fieldsForTransfer(item);
    const snapshot = Object.fromEntries(Object.keys(newFields).map((key) => [key, currentFields[key] ?? ""]));
    onApply(newFields, item.revisionId);
    onAppliedChange({ displayName: item.displayName, revisionNumber: item.revisionNumber, newFields, snapshot });
    setPreviewing(null);
  }

  const canUndo = applied !== null && Object.entries(applied.newFields).every(([key, value]) => (currentFields[key] ?? "") === value);
  function undo() {
    if (!applied) return;
    onApply(applied.snapshot, null);
    onAppliedChange(null);
  }

  function renderPreview(item: TransferSource) {
    const geometryEligible = item.kind === "rafter-cut" ? isGableTarget : item.kind === "roof-shape-to-rafter-cut" ? item.source.roofShape === "gable" : false;
    const directFields: Readonly<Record<string, string>> = item.kind === "rafter-cut" ? item.source.fields : item.kind === "roof-shape-sibling" ? item.source.fields : {};
    const jointOnlyFields = item.kind === "roof-shape-to-rafter-cut" ? roofShapeToRafterCutTransferValues(item.source.fields) : directFields;
    const jointRows: DiffRow[] = Object.entries(jointOnlyFields).map(([key, newValue]) => {
      const field = fieldByKey.get(key);
      const currentValue = currentFields[key] ?? "";
      return { key, label: field?.label ?? key, current: fieldValueLabel(field, currentValue), next: fieldValueLabel(field, newValue), changed: currentValue !== newValue };
    });
    const forwardGeometry = item.kind === "rafter-cut" && geometryEligible ? convertGableGeometryFromRafterCut(item.source.geometry) : null;
    const reverseGeometry = item.kind === "roof-shape-to-rafter-cut" && geometryEligible ? convertRafterCutGeometryFromGable(item.source.geometry) : null;
    const geometryRows: DiffRow[] = forwardGeometry?.ok && symmetryConfirmed ? [
      { key: "widthMm", label: fieldByKey.get("widthMm")?.label ?? "Tető szélessége", current: fieldValueLabel(fieldByKey.get("widthMm"), currentFields.widthMm ?? ""), next: fieldValueLabel(fieldByKey.get("widthMm"), String(forwardGeometry.widthMm)), changed: (currentFields.widthMm ?? "") !== String(forwardGeometry.widthMm), computed: "szimmetrikus nyeregtető alapján" },
      { key: "pitchDegrees", label: fieldByKey.get("pitchDegrees")?.label ?? "Tetőhajlás", current: fieldValueLabel(fieldByKey.get("pitchDegrees"), currentFields.pitchDegrees ?? ""), next: `≈ ${fieldValueLabel(fieldByKey.get("pitchDegrees"), String(Math.round(forwardGeometry.pitchDegrees * 1000) / 1000))} (a mentett érték teljes pontosságú: ${forwardGeometry.pitchDegrees}°)`, changed: (currentFields.pitchDegrees ?? "") !== String(forwardGeometry.pitchDegrees), computed: "gerincemelkedésből és HAP-ból számítva" },
    ] : reverseGeometry?.ok && symmetryConfirmed ? [
      { key: "horizontalHalfSpanMm", label: fieldByKey.get("horizontalHalfSpanMm")?.label ?? "Fél fesztáv", current: fieldValueLabel(fieldByKey.get("horizontalHalfSpanMm"), currentFields.horizontalHalfSpanMm ?? ""), next: fieldValueLabel(fieldByKey.get("horizontalHalfSpanMm"), String(reverseGeometry.horizontalHalfSpanMm)), changed: (currentFields.horizontalHalfSpanMm ?? "") !== String(reverseGeometry.horizontalHalfSpanMm), computed: "a tetőszélesség feléből" },
      { key: "riseMm", label: fieldByKey.get("riseMm")?.label ?? "Gerincemelkedés", current: fieldValueLabel(fieldByKey.get("riseMm"), currentFields.riseMm ?? ""), next: `≈ ${fieldValueLabel(fieldByKey.get("riseMm"), String(Math.round(reverseGeometry.riseMm * 1000) / 1000))} (a mentett érték teljes pontosságú: ${reverseGeometry.riseMm} mm)`, changed: (currentFields.riseMm ?? "") !== String(reverseGeometry.riseMm), computed: "hajlásszögből és HAP-ból számítva" },
      { key: "eaveProjectionMm", label: fieldByKey.get("eaveProjectionMm")?.label ?? "Vízszintes ereszkiülés", current: fieldValueLabel(fieldByKey.get("eaveProjectionMm"), currentFields.eaveProjectionMm ?? ""), next: fieldValueLabel(fieldByKey.get("eaveProjectionMm"), String(reverseGeometry.eaveProjectionMm)), changed: (currentFields.eaveProjectionMm ?? "") !== String(reverseGeometry.eaveProjectionMm), computed: undefined },
    ] : [];
    const geometryConversion = forwardGeometry ?? reverseGeometry;
    const geometryKeys = new Set(geometryRows.map((row) => row.key));
    const rows = [...jointRows.filter((row) => !geometryKeys.has(row.key)), ...geometryRows];
    const forcesBirdsmouth = item.kind === "rafter-cut";
    const birdsmouthChanged = forcesBirdsmouth && (currentFields.birdsmouth ?? "") !== "true";
    const hasChange = rows.some((row) => row.changed) || birdsmouthChanged;
    return <div className="field-transfer-preview" aria-label="Átvétel előnézete">
      <p className="plan-link-note">{item.displayName} · V{item.revisionNumber}</p>
      {geometryEligible && <div className="field-transfer-symmetry">
        <label>
          <input type="checkbox" checked={symmetryConfirmed} onChange={(event) => setSymmetryConfirmed(event.target.checked)} />
          A tető szimmetrikus nyeregtető, a két tetősík vízszintes fél fesztávja azonos.
        </label>
        {!symmetryConfirmed && <p className="plan-link-note">Jóváhagyás nélkül a geometriai mezők nem kerülnek át; a csatlakozási mezők attól függetlenül átvehetők.</p>}
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
        <button type="button" className="primary-button" disabled={!hasChange} onClick={() => confirm(item)}>Adatok átvétele</button>
      </div>
    </div>;
  }

  return <section className="plan-link-control" aria-label="Adatok átvétele">
    <GlassDisclosure className="plan-link-add" summary={<><ArrowLeftRight aria-hidden="true" size={17} /> Adatok átvétele mentett kalkulációból</>} onToggle={onToggle}>
      {status === "loading" && <p className="plan-link-note" role="status">Betöltés…</p>}
      {status === "error" && <p className="form-message is-error" role="alert">A mentett számítások listája most nem tölthető be. <button type="button" className="text-action" onClick={() => void load()}>Újrapróbálás</button></p>}
      {status === "loaded" && sources.length === 0 && <p className="plan-link-empty">Nincs mentett, kompatibilis számítás ebben a műhelyben.</p>}
      {status === "loaded" && sources.length > 0 && !previewing && <ul className="plan-link-list">
        {sources.map((item) => <li key={`${item.kind}:${item.revisionId}`}>
          <span>{item.displayName} <small>· V{item.revisionNumber} · {SOURCE_LABEL[item.kind]}</small></span>
          <button type="button" className="text-action" onClick={() => setPreviewing(item)}>Adatok megtekintése</button>
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

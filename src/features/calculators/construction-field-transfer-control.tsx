"use client";

import { useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import { ArrowLeftRight } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { listRafterCutTransferSourcesAction, listRoofShapeTransferSourcesAction } from "@/features/calculations/construction-actions";
import type { RafterCutTransferSource, RoofShapeTransferSource } from "@/features/calculations/construction-data";
import { convertGableGeometryFromRafterCut, convertRafterCutGeometryFromGable, type GableGeometryTransferReason } from "@/domain/calculations/construction/roofs";
import { MATERIAL_SPEC_FIELDS, resolveMaterialSpec, type MaterialGroup, type MaterialProfile, type ResolvedSpec, type SpecFieldDef, type SpecState } from "@/domain/calculations/roof-material-spec";
import { materialProvenanceLabels } from "@/domain/materials/contracts";
import type { RoofMaterialUiState } from "./material-spec-editor";
import { rafterCutTransferFields, rafterCutTargetTransferFields, roofShapeToRafterCutTransferValues } from "./rafter-connection-fields";
import type { Field } from "./construction-calculator-types";

type Status = "idle" | "loading" | "error" | "loaded";

/**
 * P3.5/A: az anyagbeállítások ettől a paneltől távol, a mentés mellett állnak, ezért mobilon hosszú görgetés
 * kellett hozzá. Az Anyag lépés belépési pontja UGYANEZT a panelt nyitja meg — nincs második átvételi felület,
 * második forráslista vagy párhuzamos állapot; a forrásválasztás, a diff, a jóváhagyás és a visszavonás itt marad.
 */
export const FIELD_TRANSFER_PANEL_ID = "construction-field-transfer";

/** A panel megnyitása és fókuszálása az Anyag lépésből. false: a panel most nincs a DOM-ban. */
export function openFieldTransferPanel(): boolean {
  const panel = document.getElementById(FIELD_TRANSFER_PANEL_ID);
  if (!(panel instanceof HTMLDetailsElement)) return false;
  panel.open = true;
  // A fókusz a panel élére kerül, a görgetést viszont a smooth scroll végzi, hogy ne ugorjon kettőt.
  panel.querySelector("summary")?.focus({ preventScroll: true });
  panel.scrollIntoView?.({ behavior: "smooth", block: "start" });
  return true;
}
export type AppliedTransferDisplay = Readonly<{ displayName: string; revisionNumber: number; newFields: Readonly<Record<string, string>>; snapshot: Readonly<Record<string, string>>;
  /** P3.3c: the material state from before an approved material transfer, so the undo restores it exactly; null when no material was taken over. */
  materialSnapshot: RoofMaterialUiState | null }>;
type DiffRow = Readonly<{ key: string; label: string; current: string; next: string; changed: boolean; computed?: string }>;
type MaterialDiffRow = Readonly<{ key: string; label: string; current: string; next: string; changed: boolean; origin: string }>;

/**
 * P3.3c: which material groups the target calculator can actually use. roof.timber-cutlist is timber-only, so the
 * covering/underlay specifications are never carried into it. The `requested` group selection itself is NEVER
 * transferred: it is the scope of the work at hand, not a material profile.
 */
const MATERIAL_GROUPS_BY_TARGET: Readonly<Record<string, readonly MaterialGroup[]>> = {
  "roof.material-takeoff": ["covering", "underlay", "rafter", "batten"],
  "roof.timber-cutlist": ["rafter", "batten"],
};
const MATERIAL_GROUP_TITLE: Readonly<Record<MaterialGroup, string>> = { covering: "Fedőtábla", underlay: "Alátétfólia", rafter: "Szarufa keresztmetszet", batten: "Léc keresztmetszet" };
const MATERIAL_LAYOUT_FIELDS = [["rafterMaxSpacingMm", "Szarufa · legnagyobb tengelytávolság"], ["battenMaxSpacingMm", "Léc · legnagyobb sortávolság"]] as const;
/** An untouched group has nothing to give, so it can never blank an existing specification. */
const isFilledSpec = (state: SpecState) => state.profileId !== null || Object.keys(state.entered).length > 0;

function specValueLabel(field: SpecFieldDef, value: string | number | undefined): string {
  if (value === undefined || value === "") return "nincs megadva";
  if (field.kind === "select") return field.options?.find((option) => option.value === value)?.label ?? String(value);
  return field.kind === "text" || !field.unit ? String(value) : `${value} ${field.unit}`;
}

function specOrigin(spec: ResolvedSpec, key: string): string {
  const source = spec.sources[key];
  if (!source) return "—";
  if (source === "product") return spec.profile?.verification === "demo" ? "DEMO termék" : "Termék";
  return source === "override" ? "Felülírva" : "Kézi";
}

/** Product identity and provenance of the group being offered, so DEMO or manual data can never read as manufacturer data. */
function groupOriginLabel(spec: ResolvedSpec): string {
  if (spec.profile === null) return "Kézi adat · felhasználó által megadott, nem gyártói";
  const catalog = spec.profile.catalog;
  if (!catalog) return `${spec.profile.label} · DEMO minta · nem gyártói adat`;
  return [catalog.productName, catalog.variantName, catalog.sku ? `SKU: ${catalog.sku}` : null, materialProvenanceLabels[spec.profile.verification]].filter(Boolean).join(" · ");
}

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
  // P3.3c/D1: ugyanaz a kalkulátortípus is lehet forrás, ezért nem „másik".
  "roof-shape-sibling": "mentett tetőgeometriai kalkulációból",
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
export function ConstructionFieldTransferControl({ organizationId, targetCalculatorId, fields, currentFields, roofShape, applied, onApply, onAppliedChange, excludeCalculationId, materialProfiles = [], currentMaterial = null, onApplyMaterial }: Readonly<{
  organizationId: string;
  targetCalculatorId: string;
  fields: readonly Field[];
  currentFields: Readonly<Record<string, string>>;
  roofShape: string;
  applied: AppliedTransferDisplay | null;
  onApply: (fields: Readonly<Record<string, string>>, sourceRevisionId: string | null, geometryContractVersion?: "legacy-wall" | "outer-footprint") => void;
  onAppliedChange: (applied: AppliedTransferDisplay | null) => void;
  /** P3.3c/D1: the calculation being edited, left out of its own source list; the same calculator type stays offered. */
  excludeCalculationId?: string;
  /** P3.3c: live catalog plus DEMO samples, so a transferred profileId is re-resolved against what exists now. */
  materialProfiles?: readonly MaterialProfile[];
  currentMaterial?: RoofMaterialUiState | null;
  onApplyMaterial?: (material: RoofMaterialUiState) => void;
}>) {
  const [status, setStatus] = useState<Status>("idle");
  const [sources, setSources] = useState<readonly TransferSource[]>([]);
  const [previewing, setPreviewing] = useState<TransferSource | null>(null);
  const [symmetryConfirmed, setSymmetryConfirmed] = useState(false);
  const [materialConfirmed, setMaterialConfirmed] = useState(false);
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  const isShapeTarget = targetCalculatorId === "roof.material-takeoff" || targetCalculatorId === "roof.timber-cutlist";
  const isGableTarget = isShapeTarget && roofShape === "gable";
  // Forma váltás vagy másik forrás előnézete a korábbi szimmetria-elfogadást érvényteleníti (M10.1 §2.4).
  // P3.3c/D2: ugyanez áll az anyagátvételi jóváhagyásra, és minden előnézet kikapcsolt állapotban indul.
  useEffect(() => { setSymmetryConfirmed(false); setMaterialConfirmed(false); }, [roofShape, previewing?.revisionId]);

  // M10.1.3: a gable→más forma váltás és az átvett widthMm/pitchDegrees érvénytelenítése a tulajdonos
  // (ConstructionCalculatorSuite) `updateValue`-jában, egyetlen atomi draft-frissítésként történik — nem itt,
  // gyermek passive effectben (docs/M10_PHASE1_FINAL_INDEPENDENT_QA.md §16.4 kritikus architekturális követelmény).

  async function load() {
    setStatus("loading");
    if (targetCalculatorId === "roof.rafter-cut") {
      const result = await listRoofShapeTransferSourcesAction(organizationId, excludeCalculationId).catch(() => ({ ok: false as const }));
      if (!result.ok) { setStatus("error"); return; }
      setSources(result.sources.map((source): TransferSource => ({ kind: "roof-shape-to-rafter-cut", calculationId: source.calculationId, displayName: source.displayName, revisionId: source.revisionId, revisionNumber: source.revisionNumber, source })));
      setStatus("loaded");
      return;
    }
    const [rafterResult, siblingResult] = await Promise.all([
      listRafterCutTransferSourcesAction(organizationId).catch(() => ({ ok: false as const })),
      listRoofShapeTransferSourcesAction(organizationId, excludeCalculationId).catch(() => ({ ok: false as const })),
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

  /**
   * P3.3c: the material block the source offers, resolved against the LIVE catalog on both sides. A group whose
   * saved profileId no longer resolves is reported as an error and left out — never silently substituted. The
   * `requested` selection is kept as it is, and only layout keys the source actually provides are written, so an
   * absent source value cannot delete an existing one.
   */
  function materialPlanFor(item: TransferSource) {
    const groupsForTarget = MATERIAL_GROUPS_BY_TARGET[targetCalculatorId];
    if (item.kind !== "roof-shape-sibling" || !groupsForTarget || !currentMaterial) return null;
    const sourceMaterial = item.source.material;
    if (!sourceMaterial) return null;
    const groups = groupsForTarget.flatMap((group) => {
      const sourceState = sourceMaterial.specs[group];
      if (!isFilledSpec(sourceState)) return [];
      const sourceSpec = resolveMaterialSpec(group, sourceState, materialProfiles);
      const currentSpec = resolveMaterialSpec(group, currentMaterial.specs[group], materialProfiles);
      const unresolved = sourceState.profileId !== null && sourceSpec.profile === null;
      const rows: MaterialDiffRow[] = MATERIAL_SPEC_FIELDS[group].map((field) => ({
        key: field.key, label: field.unit && field.kind !== "text" ? `${field.label} (${field.unit})` : field.label,
        current: specValueLabel(field, currentSpec.values[field.key]), next: specValueLabel(field, sourceSpec.values[field.key]),
        changed: currentSpec.values[field.key] !== sourceSpec.values[field.key], origin: specOrigin(sourceSpec, field.key),
      }));
      return [{ group, title: MATERIAL_GROUP_TITLE[group], origin: groupOriginLabel(sourceSpec), unresolved, state: sourceState, rows }];
    });
    const transferable = groups.filter((group) => !group.unresolved);
    const layoutRows = MATERIAL_LAYOUT_FIELDS.flatMap(([key, label]) => {
      const next = sourceMaterial.layout[key];
      if (next === undefined) return [];
      const current = currentMaterial.layout[key];
      return [{ key, label: `${label} (mm)`, current: current === undefined ? "nincs megadva" : `${current} mm`, next: `${next} mm`, changed: current !== next, origin: "Átvett" }];
    });
    const next: RoofMaterialUiState = {
      requested: currentMaterial.requested,
      layout: { ...currentMaterial.layout, ...Object.fromEntries(layoutRows.map((row) => [row.key, sourceMaterial.layout[row.key]])) },
      specs: { ...currentMaterial.specs, ...Object.fromEntries(transferable.map((group) => [group.group, group.state])) },
    };
    if (groups.length === 0 && layoutRows.length === 0) return null;
    return { groups, layoutRows, next, hasChange: transferable.some((group) => group.rows.some((row) => row.changed)) || layoutRows.some((row) => row.changed) };
  }

  function confirm(item: TransferSource) {
    const newFields = fieldsForTransfer(item);
    const snapshot = Object.fromEntries(Object.keys(newFields).map((key) => [key, currentFields[key] ?? ""]));
    const materialPlan = materialPlanFor(item);
    const takesMaterial = materialConfirmed && materialPlan !== null && onApplyMaterial !== undefined;
    onApply(newFields, item.revisionId, item.kind === "roof-shape-sibling" ? item.source.geometryContractVersion : undefined);
    if (takesMaterial) onApplyMaterial(materialPlan.next);
    onAppliedChange({ displayName: item.displayName, revisionNumber: item.revisionNumber, newFields, snapshot, materialSnapshot: takesMaterial ? currentMaterial : null });
    setPreviewing(null);
  }

  const canUndo = applied !== null && Object.entries(applied.newFields).every(([key, value]) => (currentFields[key] ?? "") === value);
  function undo() {
    if (!applied) return;
    onApply(applied.snapshot, null);
    if (applied.materialSnapshot && onApplyMaterial) onApplyMaterial(applied.materialSnapshot);
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
    const materialPlan = materialPlanFor(item);
    const hasChange = rows.some((row) => row.changed) || birdsmouthChanged;
    const canConfirm = hasChange || Boolean(materialConfirmed && materialPlan?.hasChange);
    return <div className="field-transfer-preview" aria-label="Átvétel előnézete">
      <p className="plan-link-note">{item.displayName} · V{item.revisionNumber}{item.kind === "roof-shape-sibling" ? ` · a felhasznált revízió dátuma: ${item.source.revisionCreatedAt.slice(0, 10)}` : ""}</p>
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
      {!hasChange && <p className="plan-link-note">Nincs új mezőadat; minden érték megegyezik a jelenlegi mezőkkel.</p>}
      {materialPlan && <div className="field-transfer-material" aria-label="Anyagadatok átvétele">
        <div className="field-transfer-symmetry">
          <label>
            <input type="checkbox" checked={materialConfirmed} onChange={(event) => setMaterialConfirmed(event.target.checked)} />
            Az anyagadatokat is átveszem ebből a revízióból.
          </label>
          {!materialConfirmed && <p className="plan-link-note">Jóváhagyás nélkül az anyagadatok nem változnak; a mezőátvétel ettől függetlenül elvégezhető.</p>}
        </div>
        {materialPlan.groups.map((group) => <table className="field-transfer-diff" key={group.group}>
          <caption>{group.title} · {group.origin}</caption>
          <thead><tr><th scope="col">Anyagadat</th><th scope="col">Jelenlegi</th><th scope="col">Átvenni kívánt</th><th scope="col">Eredet</th></tr></thead>
          <tbody>
            {group.unresolved
              ? <tr><td colSpan={4}><span className="form-message is-error" role="alert">A mentett termék már nem elérhető az Anyagkezelőben, ezért ez az anyagcsoport nem kerül át. Válassz terméket, vagy add meg kézzel.</span></td></tr>
              : group.rows.map((row) => <tr key={row.key} className={row.changed ? "is-changed" : undefined}>
                <th scope="row">{row.label}</th><td>{row.current}</td><td>{row.next}</td><td>{row.origin}</td>
              </tr>)}
          </tbody>
        </table>)}
        {materialPlan.layoutRows.length > 0 && <table className="field-transfer-diff">
          <caption>Faanyag kiosztása</caption>
          <thead><tr><th scope="col">Anyagadat</th><th scope="col">Jelenlegi</th><th scope="col">Átvenni kívánt</th><th scope="col">Eredet</th></tr></thead>
          <tbody>{materialPlan.layoutRows.map((row) => <tr key={row.key} className={row.changed ? "is-changed" : undefined}>
            <th scope="row">{row.label}</th><td>{row.current}</td><td>{row.next}</td><td>{row.origin}</td>
          </tr>)}</tbody>
        </table>}
        <p className="plan-link-note">Az anyagcsoport-választás (melyik anyagra kell mennyiség) az aktuális munkához tartozik, ezért nem kerül át. Az átvett értékek szerkeszthetők maradnak, és az átvétel egy művelettel visszavonható.</p>
        {!materialPlan.hasChange && <p className="plan-link-note">Nincs új anyagadat; minden átvehető érték megegyezik a jelenlegivel.</p>}
      </div>}
      <div className="field-transfer-actions">
        <button type="button" className="secondary-button" onClick={() => setPreviewing(null)}>Mégse</button>
        <button type="button" className="primary-button" disabled={!canConfirm} onClick={() => confirm(item)}>Adatok átvétele</button>
      </div>
    </div>;
  }

  return <section className="plan-link-control" aria-label="Adatok átvétele">
    <GlassDisclosure id={FIELD_TRANSFER_PANEL_ID} className="plan-link-add" summary={<><ArrowLeftRight aria-hidden="true" size={17} /> Adatok átvétele mentett kalkulációból</>} onToggle={onToggle}>
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
        Adatok átvéve: {applied.displayName} · V{applied.revisionNumber}{applied.materialSnapshot ? " (az anyagadatokkal együtt)" : ""}. A kitöltött mezőket ellenőrizd, majd mentsd a kalkulációt.
        {canUndo && <> <button type="button" className="text-action" onClick={undo}>Visszavonás</button></>}
      </p>}
    </GlassDisclosure>
  </section>;
}

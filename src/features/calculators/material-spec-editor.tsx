"use client";

import { useState } from "react";
import { LengthField } from "@/components/ui/length-field";
import { WorkflowMaterialProductPicker, type WorkflowMaterialProductOption } from "@/features/material-takeoffs/workflow-material-product-picker";
import { MATERIAL_SPEC_FIELDS, initialSpecState, resolveMaterialSpec, restoreProductValues, setSpecEntry, switchSpecMode, type MaterialGroup, type MaterialProfile, type SpecFieldDef, type SpecState, type SpecValueSource } from "@/domain/calculations/roof-material-spec";
import { materialProvenanceLabels } from "@/domain/materials/contracts";
import type { RoofTimberParameters } from "@/domain/calculations/roof-timber-layout";

export type RoofMaterialUiState = Readonly<{
  requested: Readonly<{ timber: boolean; underlay: boolean; covering: boolean }>;
  layout: RoofTimberParameters;
  specs: Readonly<Record<MaterialGroup, SpecState>>;
}>;

export const initialMaterialState = (profiles: readonly MaterialProfile[], timberRequested: boolean): RoofMaterialUiState => ({
  requested: { timber: timberRequested, underlay: false, covering: false },
  layout: {},
  specs: Object.fromEntries((["covering", "underlay", "rafter", "batten"] as const).map((group) => [group, initialSpecState(profiles.some((profile) => profile.group === group))])) as Record<MaterialGroup, SpecState>,
});

const PICKER_COPY = { searchLabel: "Keresés terméknév, variáns, SKU vagy gyártó szerint", dialogLabel: "Termék kiválasztása", listLabel: "Elérhető termékek", emptyText: "Nincs a keresésnek megfelelő termék." } as const;
const BADGE: Record<SpecValueSource, string> = { product: "Termék", override: "Felülírva", manual: "Kézi" };

type EditorProps = Readonly<{ group: MaterialGroup; title: string; profiles: readonly MaterialProfile[]; catalogError?: boolean; state: SpecState; onChange: (next: SpecState) => void }>;

/** One material group: pick a profile (values fill in, editable) or type the specification by hand. */
export function MaterialSpecEditor({ group, title, profiles, catalogError = false, state, onChange }: EditorProps) {
  const options = profiles.filter((profile) => profile.group === group);
  const spec = resolveMaterialSpec(group, state, profiles);
  const productMode = state.mode === "product";
  const [categoryId, setCategoryId] = useState("");
  const categories = [...new Map(options.flatMap((profile) => profile.catalog ? [[profile.catalog.categoryId, profile.catalog.categoryName] as const] : [])).entries()];
  const pickerOptions: WorkflowMaterialProductOption[] = options
    .filter((profile) => profile.id === state.profileId || (categoryId === "" ? true : profile.catalog?.categoryId === categoryId))
    .map((profile) => profile.catalog
      ? { id: profile.id, name: profile.label, group: "Anyagkezelő termékei", detail: `${profile.catalog.categoryName} · ${materialProvenanceLabels[profile.verification]}${profile.catalog.sku ? ` · ${profile.catalog.sku}` : ""}`, searchText: [profile.catalog.manufacturerName, profile.catalog.productName, profile.catalog.variantName, profile.catalog.sku, profile.catalog.categoryName].filter(Boolean).join(" ") }
      : { id: profile.id, name: profile.label, group: "DEMO minták (nem gyártói)", detail: "DEMO · nem gyártói adat", searchText: "demo minta" })
    .sort((left, right) => Number(left.group !== "Anyagkezelő termékei") - Number(right.group !== "Anyagkezelő termékei"));
  const setMode = (mode: "product" | "manual") => onChange(switchSpecMode(state, mode, spec));
  const parse = (field: SpecFieldDef, raw: string) => field.kind === "text" || field.kind === "select" ? raw : raw.trim() === "" ? undefined : Number(raw.replace(",", "."));
  const renderField = (field: SpecFieldDef) => {
    const source = spec.sources[field.key];
    const value = spec.values[field.key];
    const missingInProduct = spec.missingKeys.includes(field.key);
    const isLength = field.kind !== "text" && field.kind !== "select" && field.unit === "mm";
    const control = isLength
      ? <LengthField label={`${title} · ${field.label}`} value={typeof value === "number" ? String(value) : ""} onChange={(next) => onChange(setSpecEntry(state, field.key, next === "" ? undefined : Number(next)))} />
      : field.kind === "select"
      ? <select value={typeof value === "string" ? value : ""} aria-label={field.label} onChange={(event) => onChange(setSpecEntry(state, field.key, parse(field, event.target.value)))}><option value="">Válassz…</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : <input type={field.kind === "text" ? "text" : "number"} inputMode={field.kind === "text" ? "text" : "decimal"} min={field.kind === "text" ? undefined : "0"} step="any" value={value === undefined ? "" : String(value)} aria-label={`${title} · ${field.label}${field.unit ? `, ${field.unit}` : ""}`} onChange={(event) => {
        const parsed = parse(field, event.target.value);
        if (typeof parsed === "number" && !Number.isFinite(parsed)) return;
        onChange(setSpecEntry(state, field.key, parsed));
      }} />;
    return <label className="construction-suite-field material-spec-field" key={field.key}>
      <span>{field.label}{field.unit && !isLength && <small>{field.unit}</small>}{source && <em className="material-spec-badge" data-source={source}>{source === "product" && spec.profile?.verification === "demo" ? "DEMO termék" : BADGE[source]}</em>}{source === "override" && <button type="button" className="material-spec-restore" onClick={() => onChange(restoreProductValues(state, spec, field.key))}>Visszaállít</button>}</span>
      {control}
      {spec.issues[field.key] && <small className="material-spec-hint is-error" role="alert">{spec.issues[field.key]}</small>}
      {missingInProduct && <small className="material-spec-hint">A termékadat ezt nem tartalmazza · add meg kézzel.</small>}
    </label>;
  };
  return <fieldset className="material-spec" data-group={group}>
    <legend>{title}</legend>
    <div className="material-spec-modes" role="group" aria-label={`${title} · megadás módja`}>
      <button type="button" aria-pressed={productMode} disabled={options.length === 0} title={options.length === 0 ? "Nincs elérhető termék – használd a kézi megadást." : undefined} onClick={() => setMode("product")}>Termék</button>
      <button type="button" aria-pressed={!productMode} onClick={() => setMode("manual")}>Kézi megadás</button>
    </div>
    {productMode && <div className="construction-suite-field material-spec-picker-field" role="group" aria-label={`${title} · termék`}><span>Termék</span>
      {categories.length > 1 && <select aria-label={`${title} · kategória`} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Összes kategória</option>{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>}
      <WorkflowMaterialProductPicker options={pickerOptions} value={state.profileId ?? ""} disabled={false} idPrefix={`roof-material-${group}`} label={`${title} · termék`} copy={PICKER_COPY} onSelect={(id) => onChange({ ...state, profileId: id })} />
    </div>}
    {productMode && state.profileId !== null && !spec.profile && <p className="material-spec-hint is-error" role="alert">A kiválasztott termék már nem elérhető · válassz másikat vagy add meg kézzel.</p>}
    {productMode && !options.some((profile) => profile.catalog) && <p className="material-spec-note">{catalogError ? "Az Anyagkezelő termékei nem töltődtek be." : "Az Anyagkezelőben nincs ehhez a csoporthoz tartozó aktív termék."}</p>}
    {!productMode && <p className="material-spec-note">Felhasználó által megadott adat – nem gyártói ellenőrzött érték.</p>}
    {spec.profile?.verification === "demo" && <p className="material-spec-note is-demo">DEMO adat – nem gyártói specifikáció.</p>}
    {spec.profile?.catalog && !spec.profile.catalog.categoryMatch && <p className="material-spec-note" role="status">A termék kategóriája ({spec.profile.catalog.categoryName}) nem ehhez az anyagcsoporthoz tartozik · csak a kifejezetten ehhez megadott műszaki adatok kerültek át, az általános méreteket nem használjuk. Pótold kézzel, ami hiányzik.</p>}
    {spec.profile?.catalog && spec.profile.verification !== "demo" && <p className="material-spec-note">Anyagkezelő adat · {materialProvenanceLabels[spec.profile.verification]}{spec.profile.catalog.sku ? ` · SKU: ${spec.profile.catalog.sku}` : ""}. A hiányzó értékeket kézzel pótolhatod; a katalógus nem módosul.</p>}
    <div className="construction-suite-form-grid">{MATERIAL_SPEC_FIELDS[group].map(renderField)}</div>
    {spec.overriddenKeys.length > 0 && <button type="button" className="material-spec-restore is-block" onClick={() => onChange(restoreProductValues(state, spec))}>Termékadatok visszaállítása</button>}
  </fieldset>;
}

const layoutFields = [
  ["rafterMaxSpacingMm", "Szarufa · legnagyobb tengelytávolság"], ["battenMaxSpacingMm", "Léc · legnagyobb sortávolság"],
] as const satisfies readonly (readonly [keyof RoofTimberParameters, string])[];

type InputsProps = Readonly<{
  /** The cut-list calculator is timber-only; the takeoff lets the user pick the material groups. */
  timberOnly: boolean;
  profiles: readonly MaterialProfile[];
  catalogError?: boolean;
  state: RoofMaterialUiState;
  onChange: (next: RoofMaterialUiState) => void;
}>;

export function RoofMaterialInputs({ timberOnly, profiles, catalogError, state, onChange }: InputsProps) {
  const requested = timberOnly ? { ...state.requested, timber: true } : state.requested;
  const setSpec = (group: MaterialGroup) => (next: SpecState) => onChange({ ...state, specs: { ...state.specs, [group]: next } });
  const toggles = [["timber", "Szarufa és léc"], ["underlay", "Alátétfólia"], ["covering", "Fedőtábla"]] as const;
  return <div className="material-inputs">
    {!timberOnly && <fieldset className="material-spec-picker"><legend>Mit számoljon?</legend>
      {toggles.map(([key, label]) => <label key={key} className="material-spec-toggle"><input type="checkbox" aria-label={label} checked={requested[key]} onChange={(event) => onChange({ ...state, requested: { ...state.requested, [key]: event.target.checked } })} /><span>{label}</span></label>)}
    </fieldset>}
    {requested.timber && <>
      <fieldset className="material-spec"><legend>Faanyag kiosztása</legend>
        <p className="material-spec-note">Peremsáv nélkül: a szélső szarufa a tetősík (kiüléssel együtt mért) szélén, a szélső léc az eresznél és a felső élnél áll.</p>
        <div className="construction-suite-form-grid">{layoutFields.map(([key, label]) => <label className="construction-suite-field" key={key}><span>{label}</span><LengthField label={label} value={state.layout[key] === undefined ? "" : String(state.layout[key])} onChange={(value) => {
          const rest = Object.fromEntries(Object.entries(state.layout).filter(([entry]) => entry !== key));
          onChange({ ...state, layout: value === "" ? rest : { ...rest, [key]: Number(value) } });
        }} /></label>)}</div>
      </fieldset>
      <MaterialSpecEditor group="rafter" title="Szarufa keresztmetszet · opcionális" profiles={profiles} catalogError={catalogError} state={state.specs.rafter} onChange={setSpec("rafter")} />
      <MaterialSpecEditor group="batten" title="Léc keresztmetszet · opcionális" profiles={profiles} catalogError={catalogError} state={state.specs.batten} onChange={setSpec("batten")} />
    </>}
    {requested.underlay && <MaterialSpecEditor group="underlay" title="Alátétfólia" profiles={profiles} catalogError={catalogError} state={state.specs.underlay} onChange={setSpec("underlay")} />}
    {requested.covering && <MaterialSpecEditor group="covering" title="Fedőtábla" profiles={profiles} catalogError={catalogError} state={state.specs.covering} onChange={setSpec("covering")} />}
  </div>;
}

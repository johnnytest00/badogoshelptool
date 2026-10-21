import type { MaterialProvenance } from "@/domain/materials/contracts";
import type { RoofCoveringProductParameters } from "./roof-covering-parameters";
import type { RoofTimberParameters } from "./roof-timber-layout";
import type { RoofUnderlayParameters } from "./roof-underlay";

/**
 * Typed technical-specification model for the roof material takeoff.
 * A value is either taken from a selected profile ("product"), typed over a profile value ("override")
 * or typed without any profile ("manual"). Manual and override values are user-supplied, never manufacturer data.
 */
export type MaterialGroup = "covering" | "underlay" | "rafter" | "batten";
export type SpecValue = number | string;
export type SpecValueSource = "product" | "override" | "manual";
export type SpecMode = "product" | "manual";

export type SpecFieldDef = Readonly<{
  key: string;
  label: string;
  unit: string;
  kind?: "number" | "text" | "select";
  options?: readonly { value: string; label: string }[];
}>;

const section: readonly SpecFieldDef[] = [
  { key: "sectionWidthMm", label: "Keresztmetszet szélessége", unit: "mm" },
  { key: "sectionHeightMm", label: "Keresztmetszet magassága", unit: "mm" },
];

export const MATERIAL_SPEC_FIELDS: Readonly<Record<MaterialGroup, readonly SpecFieldDef[]>> = {
  covering: [
    { key: "nominalWidthMm", label: "Tábla névleges szélessége", unit: "mm" },
    { key: "effectiveCoveringWidthMm", label: "Hasznos fedési szélesség", unit: "mm" },
    { key: "physicalLengthMm", label: "Tábla fizikai hossza", unit: "mm" },
    { key: "usableCoveringLengthMm", label: "Használható fedési hossz", unit: "mm" },
    { key: "manufacturerConstraintReference", label: "Adatforrás megnevezése · opcionális", unit: "", kind: "text" },
  ],
  underlay: [
    { key: "rollWidthMm", label: "Tekercs szélessége", unit: "mm" },
    { key: "rollLengthMm", label: "Tekercs hossza", unit: "mm" },
    { key: "sideOverlapMm", label: "Oldalátfedés", unit: "mm" },
    { key: "endOverlapMm", label: "Végtoldás átfedése", unit: "mm" },
    { key: "installationDirection", label: "Fektetés iránya", unit: "", kind: "select", options: [{ value: "eave-to-ridge", label: "Eresztől a gerinc felé" }, { value: "ridge-to-eave", label: "Gerinctől az eresz felé" }] },
  ],
  rafter: section,
  batten: section,
};

/** Identity of the Anyagkezelő record a profile was read from; absent for DEMO samples. */
export type CatalogIdentity = Readonly<{ productId: string; variantId: string; productName: string; variantName: string; manufacturerName: string | null; sku: string | null; purchasingUnit: string; categoryId: string; categoryName: string;
  /** False when the product's technical category does not fit this group: general dimensions are then NOT reused, only explicit calculator keys. */
  categoryMatch: boolean }>;

export type MaterialProfile = Readonly<{
  id: string;
  group: MaterialGroup;
  label: string;
  /** Catalog provenance as recorded in the Anyagkezelő (weaker of product and variant); `demo` is shown with a conspicuous DEMO marker. */
  verification: MaterialProvenance;
  sourceReference: string;
  catalog?: CatalogIdentity;
  /** Only properties actually present in the source; absent keys stay missing. */
  values: Readonly<Record<string, SpecValue>>;
}>;

export type SpecState = Readonly<{ mode: SpecMode; profileId: string | null; entered: Readonly<Record<string, SpecValue>> }>;
export const initialSpecState = (hasProfiles: boolean): SpecState => ({ mode: hasProfiles ? "product" : "manual", profileId: null, entered: {} });

export const MANUAL_REFERENCE = "Felhasználó által megadott kézi adat (nem gyártói)";

export type ResolvedSpec = Readonly<{
  group: MaterialGroup;
  mode: SpecMode;
  profile: Readonly<{ id: string; label: string; verification: MaterialProvenance; sourceReference: string; catalog: CatalogIdentity | null }> | null;
  values: Readonly<Record<string, SpecValue>>;
  sources: Readonly<Record<string, SpecValueSource>>;
  /** Original product values, kept even when overridden. */
  productValues: Readonly<Record<string, SpecValue>>;
  overriddenKeys: readonly string[];
  /** Product selected but the source does not provide the property (and the user did not enter it). */
  missingKeys: readonly string[];
  referenceLabel: string | null;
  /** Field-level problems, e.g. a cross-section with only one dimension. Entered values are never dropped. */
  issues: Readonly<Record<string, string>>;
  /** Subset of `issues` that are wrong values (zero, negative, fractional) rather than merely missing ones. */
  invalidKeys: readonly string[];
}>;

const present = (value: SpecValue | undefined): value is SpecValue => value !== undefined && value !== "" && !(typeof value === "number" && Number.isNaN(value));

/** Cross-section check: absent pair = optional, one side only = incomplete, zero/negative/fractional = invalid. */
function sectionIssues(values: Readonly<Record<string, SpecValue>>): { issues: Record<string, string>; invalidKeys: string[] } {
  const issues: Record<string, string> = {};
  const invalidKeys: string[] = [];
  const dims = [["sectionWidthMm", "szélesség"], ["sectionHeightMm", "magasság"]] as const;
  for (const [key, name] of dims) {
    const value = values[key];
    if (!present(value)) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) { issues[key] = `Érvénytelen ${name}: pozitív érték kell.`; invalidKeys.push(key); }
    else if (!Number.isInteger(value)) { issues[key] = `Érvénytelen ${name}: egész milliméter kell.`; invalidKeys.push(key); }
  }
  const hasWidth = present(values.sectionWidthMm), hasHeight = present(values.sectionHeightMm);
  if (hasWidth !== hasHeight) issues[hasWidth ? "sectionHeightMm" : "sectionWidthMm"] = `Hiányzik ${hasWidth ? "a magasság" : "a szélesség"} · a térfogathoz mindkét méret kell.`;
  return { issues, invalidKeys };
}

/** Merges a selected profile with the user's entries. Zero is a valid entered value; only undefined/empty is missing. */
export function resolveMaterialSpec(group: MaterialGroup, state: SpecState, profiles: readonly MaterialProfile[]): ResolvedSpec {
  const profile = state.mode === "product" && state.profileId !== null ? profiles.find((item) => item.id === state.profileId && item.group === group) ?? null : null;
  const values: Record<string, SpecValue> = {};
  const sources: Record<string, SpecValueSource> = {};
  const overriddenKeys: string[] = [];
  const missingKeys: string[] = [];
  for (const { key } of MATERIAL_SPEC_FIELDS[group]) {
    const entered = state.entered[key];
    const fromProduct = profile?.values[key];
    if (present(entered)) {
      values[key] = entered;
      // Typed where the product has no value is the user's own data, not an override of product data.
      const overrides = profile !== null && present(fromProduct);
      sources[key] = overrides ? "override" : "manual";
      if (overrides) overriddenKeys.push(key);
    } else if (profile && present(fromProduct)) {
      values[key] = fromProduct;
      sources[key] = "product";
    } else if (profile && key !== "manufacturerConstraintReference") missingKeys.push(key); // the source label comes from the profile itself
  }
  const overridden = overriddenKeys.length > 0;
  const referenceLabel = profile
    ? `${profile.sourceReference}${overridden ? " · felülírt értékekkel" : ""}`
    : Object.keys(values).some((key) => key !== "manufacturerConstraintReference") ? MANUAL_REFERENCE : null;
  const { issues, invalidKeys } = group === "rafter" || group === "batten" ? sectionIssues(values) : { issues: {}, invalidKeys: [] };
  const typedReference = values.manufacturerConstraintReference;
  return {
    group, mode: state.mode,
    profile: profile ? { id: profile.id, label: profile.label, verification: profile.verification, sourceReference: profile.sourceReference, catalog: profile.catalog ?? null } : null,
    values, sources, productValues: profile ? { ...profile.values } : {}, overriddenKeys, missingKeys, issues, invalidKeys,
    referenceLabel: typeof typedReference === "string" && typedReference.trim() !== "" ? typedReference.trim() : referenceLabel,
  };
}

/** Switching to manual keeps what the user sees: current product values become the user's own entries. */
export function switchSpecMode(state: SpecState, next: SpecMode, resolved: ResolvedSpec): SpecState {
  if (next === state.mode) return state;
  if (next === "manual") return { ...state, mode: "manual", entered: { ...resolved.values, ...state.entered } };
  return { ...state, mode: "product" };
}

/** Restores only fields that override a product value; manual-only entries (no product value) are kept. */
export const restoreProductValues = (state: SpecState, resolved: Pick<ResolvedSpec, "overriddenKeys">, key?: string): SpecState => {
  const restore = key === undefined ? resolved.overriddenKeys : resolved.overriddenKeys.filter((entry) => entry === key);
  return { ...state, entered: Object.fromEntries(Object.entries(state.entered).filter(([entry]) => !restore.includes(entry))) };
};

export function setSpecEntry(state: SpecState, key: string, value: SpecValue | undefined): SpecState {
  if (!present(value)) return { ...state, entered: Object.fromEntries(Object.entries(state.entered).filter(([entry]) => entry !== key)) };
  return { ...state, entered: { ...state.entered, [key]: value } };
}

const num = (values: Readonly<Record<string, SpecValue>>, key: string) => typeof values[key] === "number" ? values[key] : undefined;

export function underlayParametersFromSpec(spec: Pick<ResolvedSpec, "values">): RoofUnderlayParameters {
  const { values } = spec;
  const direction = values.installationDirection;
  return {
    ...(num(values, "rollWidthMm") === undefined ? {} : { rollWidthMm: num(values, "rollWidthMm") }),
    ...(num(values, "rollLengthMm") === undefined ? {} : { rollLengthMm: num(values, "rollLengthMm") }),
    ...(num(values, "sideOverlapMm") === undefined ? {} : { sideOverlapMm: num(values, "sideOverlapMm") }),
    ...(num(values, "endOverlapMm") === undefined ? {} : { endOverlapMm: num(values, "endOverlapMm") }),
    ...(direction === "eave-to-ridge" || direction === "ridge-to-eave" ? { installationDirection: direction } : {}),
  };
}

export function coveringParametersFromSpec(spec: Pick<ResolvedSpec, "values" | "referenceLabel">): RoofCoveringProductParameters {
  const { values } = spec;
  const pick = (key: "nominalWidthMm" | "effectiveCoveringWidthMm" | "physicalLengthMm" | "usableCoveringLengthMm") => num(values, key) === undefined ? {} : { [key]: num(values, key) };
  return {
    form: "sheet",
    ...pick("nominalWidthMm"), ...pick("effectiveCoveringWidthMm"), ...pick("physicalLengthMm"), ...pick("usableCoveringLengthMm"),
    ...(spec.referenceLabel === null ? {} : { manufacturerConstraintReference: spec.referenceLabel.slice(0, 200) }),
  };
}

/** Only a complete, valid pair reaches the engine; anything else is reported by `sectionIssues`, never silently used. */
export function timberSectionFromSpec(spec: Pick<ResolvedSpec, "values">): { sectionWidthMm?: number; sectionHeightMm?: number } {
  const { invalidKeys } = sectionIssues(spec.values);
  if (invalidKeys.length > 0) return {};
  const sectionWidthMm = num(spec.values, "sectionWidthMm"), sectionHeightMm = num(spec.values, "sectionHeightMm");
  return { ...(sectionWidthMm === undefined ? {} : { sectionWidthMm }), ...(sectionHeightMm === undefined ? {} : { sectionHeightMm }) };
}

/** Layout inputs (spacing/insets) stay user inputs; the cross-sections come from the resolved specifications. */
export function timberParametersFromSpecs(layout: RoofTimberParameters, rafter: Pick<ResolvedSpec, "values">, batten: Pick<ResolvedSpec, "values">): RoofTimberParameters {
  const rafterSection = timberSectionFromSpec(rafter), battenSection = timberSectionFromSpec(batten);
  return {
    ...layout,
    ...(rafterSection.sectionWidthMm === undefined ? {} : { rafterSectionWidthMm: rafterSection.sectionWidthMm }),
    ...(rafterSection.sectionHeightMm === undefined ? {} : { rafterSectionHeightMm: rafterSection.sectionHeightMm }),
    ...(battenSection.sectionWidthMm === undefined ? {} : { battenSectionWidthMm: battenSection.sectionWidthMm }),
    ...(battenSection.sectionHeightMm === undefined ? {} : { battenSectionHeightMm: battenSection.sectionHeightMm }),
  };
}

/** Deterministic, serialisable record of the exact specification used. Preview-only: not persisted anywhere. */
export type RoofMaterialSpecSnapshot = Readonly<{
  schemaVersion: 1;
  persisted: false;
  groups: Readonly<Partial<Record<MaterialGroup, ResolvedSpec>>>;
  gableOverhangs: Readonly<{ front: OverhangInput; rear: OverhangInput }> | null;
}>;

export const createSpecSnapshot = (specs: readonly ResolvedSpec[], gableOverhangs: RoofMaterialSpecSnapshot["gableOverhangs"] = null): RoofMaterialSpecSnapshot =>
  ({ schemaVersion: 1, persisted: false, groups: Object.fromEntries(specs.map((spec) => [spec.group, spec])), gableOverhangs });

/** Gable front/rear overhang: an empty field is "not provided" (historical 0 mm), distinct from an explicit 0. */
export type OverhangInput = Readonly<{ valueMm: number; state: "explicit" | "not-provided" }>;
export function overhangFromField(raw: number | null | undefined): OverhangInput {
  return raw === null || raw === undefined ? { valueMm: 0, state: "not-provided" } : { valueMm: raw, state: "explicit" };
}

/**
 * Example profiles so the product mode is usable before a verified technical catalog exists.
 * Every value is DEMO data, not a manufacturer specification. `DEMO – hiányos` intentionally lacks properties.
 */
export const DEMO_MATERIAL_PROFILES: readonly MaterialProfile[] = [
  { id: "demo-covering-sheet", group: "covering", label: "DEMO fedőtábla", verification: "demo", sourceReference: "DEMO termékadat (nem gyártói)", values: { nominalWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, physicalLengthMm: 4_000, usableCoveringLengthMm: 3_900 } },
  { id: "demo-covering-partial", group: "covering", label: "DEMO fedőtábla · hiányos adat", verification: "demo", sourceReference: "DEMO termékadat (hiányos)", values: { nominalWidthMm: 1_100 } },
  { id: "demo-underlay-roll", group: "underlay", label: "DEMO alátétfólia tekercs", verification: "demo", sourceReference: "DEMO termékadat (nem gyártói)", values: { rollWidthMm: 1_500, rollLengthMm: 50_000, sideOverlapMm: 100, endOverlapMm: 100 } },
  { id: "demo-rafter-80x200", group: "rafter", label: "DEMO 80 × 200 mm", verification: "demo", sourceReference: "DEMO keresztmetszet", values: { sectionWidthMm: 80, sectionHeightMm: 200 } },
  { id: "demo-batten-50x30", group: "batten", label: "DEMO 50 × 30 mm", verification: "demo", sourceReference: "DEMO keresztmetszet", values: { sectionWidthMm: 50, sectionHeightMm: 30 } },
];

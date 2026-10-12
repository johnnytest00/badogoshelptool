import { AlertTriangle, Clock3, PanelsTopLeft, Save, Send } from "lucide-react";
import type { CalculationResult } from "@/domain/calculations/engine";
import type { MetalSheetLayoutInput, MetalSheetLayoutOutput } from "@/domain/calculations/metal-sheet-layout";
import type { SavedSheetLayout, SavedSheetLayoutRevision, SheetLayoutMaterialOption } from "./sheet-layout-data";

export type MetalSheetLayoutFormValues = Readonly<{
  productId: string; variantId: string; effectiveCoveringWidthMm: string; nominalSheetWidthMm: string; alignment: "left" | "right";
  minimumSheetLengthMm: string; maximumSheetLengthMm: string; endAllowanceMm: string; takeoffAllowancePercent: string;
}>;

export const initialMetalSheetLayoutValues: MetalSheetLayoutFormValues = { productId: "", variantId: "", effectiveCoveringWidthMm: "", nominalSheetWidthMm: "", alignment: "left", minimumSheetLengthMm: "", maximumSheetLengthMm: "", endAllowanceMm: "", takeoffAllowancePercent: "0" };

function LayoutField({ name, label, value, catalogValue, onChange, optional = true }: Readonly<{ name: keyof MetalSheetLayoutFormValues; label: string; value: string; catalogValue: number | null; onChange: (name: keyof MetalSheetLayoutFormValues, value: string) => void; optional?: boolean }>) {
  return <label className="roof-field"><span>{label} <small>{optional ? "opcionális · mm" : "mm"}</small></span><input inputMode="decimal" value={value} placeholder={catalogValue === null ? "Nincs katalógusadat" : `Katalógus: ${catalogValue}`} onChange={(event) => onChange(name, event.target.value)} /><em>{value.trim() ? "Felhasználói felülírás" : catalogValue === null ? "Hiányzó adat" : "Katalógusadat használata"}</em></label>;
}

const numberFormat = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 });
const millimeters = (value: number) => `${numberFormat.format(value)} mm`;

export function MetalSheetLayoutPanel({ values, calculation, materials, savedLayout, viewedRevision, canSave, pending, message, onChange, onProductChange, onVariantChange, onSave, onOpenRevision, onTakeoff }: Readonly<{
  values: MetalSheetLayoutFormValues; calculation: CalculationResult<MetalSheetLayoutInput, MetalSheetLayoutOutput> | null; materials: readonly SheetLayoutMaterialOption[];
  savedLayout: SavedSheetLayout | null; viewedRevision: SavedSheetLayoutRevision | null; canSave: boolean; pending: boolean; message: string;
  onChange: (name: keyof MetalSheetLayoutFormValues, value: string) => void; onProductChange: (productId: string) => void; onVariantChange: (variantId: string) => void;
  onSave: () => void; onOpenRevision: (revision: SavedSheetLayoutRevision) => void; onTakeoff: (revision: SavedSheetLayoutRevision) => void;
}>) {
  const products = [...new Map(materials.map((item) => [item.productId, item.productName])).entries()];
  const variants = materials.filter((item) => item.productId === values.productId);
  const selected = materials.find((item) => item.variantId === values.variantId) ?? null;
  const output = viewedRevision?.output ?? (calculation?.ok ? calculation.output : null);
  return <section className="roof-surface sheet-layout-panel" aria-labelledby="sheet-layout-title">
    <div className="roof-section-heading"><div><p className="section-eyebrow">F7.3.2 · verziózott kiosztás</p><h2 id="sheet-layout-title">Lemezkiosztás</h2></div><span className="unit-note">{viewedRevision ? `Mentett revízió ${viewedRevision.revisionNumber}` : "Nem mentett előnézet"}</span></div>
    <p className="roof-disclaimer">A hasznos és a névleges szélesség nem ugyanaz. A rendszer nem következtet gyártói átfedésre, vágási méretre vagy jóváhagyott szerelési tervre.</p>
    <div className="roof-form-grid sheet-layout-fields">
      <label className="roof-field"><span>Anyag kiválasztása</span><select value={values.productId} onChange={(event) => onProductChange(event.target.value)}><option value="">Válassz aktív terméket…</option>{products.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
      <label className="roof-field"><span>Termékváltozat</span><select value={values.variantId} disabled={!values.productId} onChange={(event) => onVariantChange(event.target.value)}><option value="">Válassz változatot…</option>{variants.map((variant) => <option value={variant.variantId} key={variant.variantId}>{variant.variantName}</option>)}</select></label>
      <LayoutField name="effectiveCoveringWidthMm" label="Hasznos fedési szélesség" value={values.effectiveCoveringWidthMm} catalogValue={selected?.catalog.effectiveCoveringWidthMm ?? null} onChange={onChange} optional={false} />
      <LayoutField name="nominalSheetWidthMm" label="Névleges lemezszélesség" value={values.nominalSheetWidthMm} catalogValue={selected?.catalog.nominalSheetWidthMm ?? null} onChange={onChange} />
      <label className="roof-field"><span>Indulási oldal</span><select value={values.alignment} onChange={(event) => onChange("alignment", event.target.value)}><option value="left">Balról jobbra</option><option value="right">Jobbról balra</option></select></label>
      <LayoutField name="minimumSheetLengthMm" label="Minimális lemezhossz" value={values.minimumSheetLengthMm} catalogValue={selected?.catalog.minimumSheetLengthMm ?? null} onChange={onChange} />
      <LayoutField name="maximumSheetLengthMm" label="Maximális lemezhossz" value={values.maximumSheetLengthMm} catalogValue={selected?.catalog.maximumSheetLengthMm ?? null} onChange={onChange} />
      <LayoutField name="endAllowanceMm" label="Végoldali ráhagyás" value={values.endAllowanceMm} catalogValue={selected?.catalog.endAllowanceMm ?? null} onChange={onChange} />
    </div>
    {selected && <div className="sheet-layout-specs"><strong>{selected.productName} · {selected.variantName}</strong><span>Beszerzési egység: {selected.catalog.purchasingUnit}</span><span>Adat eredete: {selected.catalog.provenance}</span>{selected.catalog.sourceName && <span>Forrás: {selected.catalog.sourceName}</span>}</div>}
    {selected && selected.catalog.effectiveCoveringWidthMm === null && !values.effectiveCoveringWidthMm.trim() && <p className="sheet-layout-warning" role="alert"><AlertTriangle aria-hidden="true" className="size-4" /> A katalógusból hiányzik a hasznos fedési szélesség. Add meg explicit felhasználói felülírásként.</p>}
    {!selected && <p className="sheet-layout-note"><PanelsTopLeft aria-hidden="true" className="size-4" /> Válassz katalógusváltozatot a kiosztási előnézethez.</p>}
    {calculation && !calculation.ok && !viewedRevision && <div className="sheet-layout-warning" role="alert"><AlertTriangle aria-hidden="true" className="size-4" /><span>{calculation.errors[0]?.message ?? "A lemezkiosztás nem számítható ki."}</span></div>}
    {output && <div className="sheet-layout-results" aria-live="polite"><div className="roof-result-grid"><div className="roof-result-metric"><small>Sávok száma tetősíkonként</small><strong>{output.stripsPerPlane}</strong></div><div className="roof-result-metric"><small>Összes fedési sáv</small><strong>{output.totalStripCount}</strong></div><div className="roof-result-metric"><small>Geometriai lemezhossz</small><strong>{millimeters(output.geometricSheetLengthMm)}</strong></div><div className="roof-result-metric"><small>Ideiglenes lemezhossz</small><strong>{millimeters(output.provisionalSheetLengthMm)}</strong></div><div className="roof-result-metric"><small>Részleges szélső sáv</small><strong>{output.partialEdgeIntervalMm === null ? "Nincs" : millimeters(output.partialEdgeIntervalMm)}</strong></div></div>{output.manufacturingStatus === "not_evaluated" && <p className="roof-disclaimer">Gyártási korlát nem lett megadva; a gyárthatóság nincs ellenőrizve.</p>}{output.manufacturingIssues.map((issue) => <p className="sheet-layout-warning" role="status" key={issue.code}><AlertTriangle aria-hidden="true" className="size-4" /> {issue.message}</p>)}</div>}
    {viewedRevision?.geometryStale && <p className="sheet-layout-warning"><AlertTriangle className="size-4" /> Elavult tetőgeometria alapján készült.</p>}
    {viewedRevision?.materialStale && <p className="sheet-layout-warning"><AlertTriangle className="size-4" /> A releváns katalógus-specifikációk megváltoztak.</p>}
    <div className="form-actions sheet-layout-actions"><button type="button" className="primary-button" disabled={!canSave || pending || !calculation?.ok} onClick={onSave}><Save className="size-4" />{pending ? "Mentés…" : "Kiosztás mentése"}</button></div>
    {message && <p className={`form-message ${message.includes("sikeresen") || message.includes("változatlan") ? "is-success" : "is-error"}`} role="status">{message}</p>}
    {savedLayout && <div className="sheet-layout-history"><h3><Clock3 className="size-4" /> Korábbi kiosztások</h3>{savedLayout.revisions.map((revision) => <div className="sheet-layout-history-row" key={revision.id}><button type="button" className={viewedRevision?.id === revision.id ? "secondary-button is-active" : "secondary-button"} onClick={() => onOpenRevision(revision)}>Revízió {revision.revisionNumber} · {new Date(revision.createdAt).toLocaleString("hu-HU")}</button><span>{revision.current ? "Aktuális" : "Történeti"}{revision.geometryStale ? " · Elavult geometria" : ""}{revision.materialStale ? " · Módosult anyagadat" : ""}</span>{revision.current && <div className="sheet-layout-takeoff"><label>Ráhagyás %<input inputMode="decimal" value={values.takeoffAllowancePercent} onChange={(event) => onChange("takeoffAllowancePercent", event.target.value)} /></label><button type="button" className="secondary-button" disabled={pending} onClick={() => onTakeoff(revision)}><Send className="size-4" /> Átadás anyagkimutatás-tervezethez</button>{revision.input.material.catalogSnapshot.purchasingUnit !== "square_meter" && <small>Automatikus átadás csak négyzetméteres egységnél biztonságos; más egységnél használd a kézi folyamatot.</small>}</div>}</div>)}</div>}
  </section>;
}

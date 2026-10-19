import type { ReactNode } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { fieldSurveyUnitLabels } from "@/domain/field-surveys/contracts";
import { primaryRunSemantic, roofEdgeRoleLabels, workElementDefs, workElementKinds, type WorkElementKind } from "@/domain/field-surveys/work-elements";
import type { SurveySectionDraft } from "./survey-draft-recovery";
import { metres, type RoofEdgeSuggestion } from "./work-element-suggestions";

type Props = Readonly<{
  elements: readonly SurveySectionDraft[];
  suggestions: readonly RoofEdgeSuggestion[];
  sectionButtons?: ReactNode;
  duplicates: ReadonlyMap<string, readonly string[]>;
  photos: readonly { id: string; filename: string }[];
  openId: string | null;
  disabled: boolean;
  onAdd: (kind: WorkElementKind) => void;
  onPatch: (id: string, patch: Partial<SurveySectionDraft>) => void;
  onMeasurement: (id: string, measurementId: string, value: string) => void;
  onAccept: (id: string, suggestion: RoofEdgeSuggestion) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}>;

const parse = (value: string) => (value.trim() === "" ? null : Number(value.trim().replace(",", ".")));

export function SurveyWorkElements({ elements, suggestions, duplicates, sectionButtons, photos, openId, disabled, onAdd, onPatch, onMeasurement, onAccept, onDuplicate, onRemove }: Props) {
  return <section className="work-elements" aria-label="Bádogos elemek">
    <GlassDisclosure className="work-element-add" summary={<>Bádogos elemek hozzáadása<span className="survey-optional-badge">Opcionális</span></>}>
      <p className="work-element-help">Válaszd ki, mit mérsz még ugyanezen a felmérésen — egy elem hozzáadása után csak a hozzá tartozó méretek jelennek meg.</p>
      <div className="work-element-kinds">{workElementKinds.map((kind) => <button key={kind} type="button" className="secondary-button" disabled={disabled} onClick={() => onAdd(kind)}><Plus aria-hidden="true" className="size-4" />{workElementDefs[kind].label}</button>)}</div>
      {sectionButtons && <><p className="work-element-help">Másik tető vagy általános munka:</p><div className="work-element-kinds">{sectionButtons}</div></>}
    </GlassDisclosure>
    {elements.map((el) => {
      const kind = el.elementKind!; const def = workElementDefs[kind];
      const primarySemantic = primaryRunSemantic(kind);
      const primary = primarySemantic ? el.measurements.find((m) => m.semanticType === primarySemantic) : undefined;
      const filled = el.measurements.filter((m) => m.value.trim() !== "").length;
      const primaryValue = primary ? parse(primary.value) : null;
      const transferable = Boolean(primary && primaryValue !== null && primaryValue > 0 && primary.unit === "m");
      const state = filled === 0 ? "Hiányos" : filled < el.measurements.length ? `Részben kitöltött · ${filled}/${el.measurements.length}` : "Kitöltve";
      const role = def.roofRole;
      const offers = role ? suggestions.filter((s) => s.role === role) : [];
      const source = el.lengthSource ? suggestions.find((s) => s.roofSectionId === el.lengthSource!.roofSectionId && s.role === el.lengthSource!.role) : undefined;
      const sourceMatches = Boolean(source && primaryValue !== null && Math.abs(primaryValue * 1000 - source.valueMm) < 0.5);
      const likely = duplicates.get(el.id);
      return <GlassDisclosure key={el.id} className="work-element-card" defaultOpen={el.id === openId} summary={<span className="work-element-summary"><strong>{el.name}</strong><span>{def.label}</span><span className={`work-element-state${filled === 0 ? " is-missing" : ""}`}>{state}</span></span>}>
        <div className="work-element-body">
          <label className="field-survey-field"><span>Elem neve</span><input value={el.name} maxLength={120} disabled={disabled} onChange={(event) => onPatch(el.id, { name: event.target.value })} /></label>
          <div className="work-element-fields">{el.measurements.map((m) => <label className="field-survey-field" key={m.id}><span>{m.label} <small>({fieldSurveyUnitLabels[m.unit]})</small></span><input type="text" inputMode="decimal" autoComplete="off" disabled={disabled} value={m.value} onChange={(event) => onMeasurement(el.id, m.id, event.target.value)} /></label>)}</div>
          {offers.length > 0 && <div className="work-element-suggest">{offers.map((s) => <div key={`${s.roofSectionId}:${s.role}`}><span>Tetőgeometriából javasolt {roofEdgeRoleLabels[s.role]}: <strong>{metres(s.valueMm)} m</strong> <span className="quick-gable-tag">számított</span> · {s.roofName} · {s.basis}</span><button type="button" className="secondary-button" disabled={disabled} onClick={() => onAccept(el.id, s)}>Javaslat átvétele</button></div>)}</div>}
          {el.lengthSource && <p className={`work-element-provenance${sourceMatches ? "" : " is-diverged"}`} role="status">{!source ? "A forrás tetőszakasz már nem számítható; az érték kézi mérésként marad." : sourceMatches ? `Tetőgeometriából átvett érték (számított) · ${source.roofName}. Azonos tetőél más anyaghoz (pl. ereszcsatorna és ereszszegély) használható.` : `Kézzel módosítva — eltér a tetőgeometriától (${metres(source.valueMm)} m). Mért értékként kezelendő.`}</p>}
          {likely && <p className="work-element-warning" role="alert">Valószínű duplikátum: {likely.join(", ")} azonos típusú és méretű. Ha két külön munkaszakasz, hagyd meg; ha véletlen másolat, töröld.</p>}
          <p className={`work-element-transfer${transferable ? " is-ready" : ""}`}>{primarySemantic ? (transferable ? "A szakaszhossz mentés után átvehető az anyaglistába (mért mennyiség, mennyiségi becslés nélkül)." : "Szakaszhossz (m) megadása után átvehető az anyaglistába.") : "Ez az elem csak rögzítésre kerül; anyaglistába nem vihető át."}</p>
          <label className="field-survey-field"><span>Megjegyzés</span><textarea rows={2} maxLength={2000} disabled={disabled} value={el.notes} onChange={(event) => onPatch(el.id, { notes: event.target.value })} /></label>
          {photos.length > 0 && <div className="survey-section-more-block"><h4>Fotók · {el.photoIds.length}</h4>{photos.map((photo) => <label className="survey-photo-choice" key={photo.id}><input type="checkbox" disabled={disabled} checked={el.photoIds.includes(photo.id)} onChange={(event) => onPatch(el.id, { photoIds: event.target.checked ? [...el.photoIds, photo.id] : el.photoIds.filter((id) => id !== photo.id) })} />{photo.filename}</label>)}</div>}
          <div className="work-element-actions"><button type="button" className="secondary-button" disabled={disabled} onClick={() => onDuplicate(el.id)}><Copy aria-hidden="true" className="size-4" />Elem másolása</button><button type="button" className="field-survey-remove" disabled={disabled} onClick={() => onRemove(el.id)}><Trash2 aria-hidden="true" className="size-4" />Elem törlése</button></div>
        </div>
      </GlassDisclosure>;
    })}
  </section>;
}

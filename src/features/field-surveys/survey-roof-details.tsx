"use client";

import { Plus, Trash2 } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { LengthField } from "@/components/ui/length-field";
import {
  roofDetailDefs, roofDetailKinds, roofDetailSchema, roofDetailStatusLabels, roofDetailsSummary,
  type RoofDetailFieldKey, type RoofDetailKind, type RoofDetailStatus,
} from "@/domain/field-surveys/roof-details";
import { serializeRoofDetail, type RoofDetailDraft } from "./survey-draft-recovery";

const statuses: readonly RoofDetailStatus[] = ["measured", "present_unmeasured", "absent"];
const unitLabels: Record<"db" | "mm" | "m", string> = { db: "db", mm: "mm", m: "m" };

/** Új bejegyzés: a jelenlét megerősített, a mérés még nem — a felhasználó jelöli „Felmérve”-nek, ha kész. */
export const emptyRoofDetail = (kind: RoofDetailKind, id: string): RoofDetailDraft => ({ id, kind, status: "present_unmeasured", count: "", widthMm: "", heightMm: "", lengthM: "", note: "" });

/** Mezőszintű magyar üzenetek a domain szerződésből; az üres mező nem hiba. */
function detailMessages(detail: RoofDetailDraft): Partial<Record<RoofDetailFieldKey | "status", string>> {
  const parsed = roofDetailSchema.safeParse(serializeRoofDetail(detail));
  if (parsed.success) return {};
  const messages: Partial<Record<RoofDetailFieldKey | "status", string>> = {};
  const shown: readonly (RoofDetailFieldKey | "status")[] = ["count", "widthMm", "heightMm", "lengthM", "status"];
  for (const issue of parsed.error.issues) {
    const key = shown.find((candidate) => candidate === issue.path[0]);
    if (key && !(key in messages)) messages[key] = issue.message;
  }
  return messages;
}

/**
 * A meglévő, megfigyelt fizikai tetőrészletek rögzítése. Nem munkatervezés: tervezett munka, termék és
 * mennyiség nem kerül ide, és a rögzített objektumot a tetőfelületből sem vonjuk le.
 */
export function SurveyRoofDetails({ details, disabled, onChange, newId }: Readonly<{
  details: readonly RoofDetailDraft[]; disabled: boolean; onChange: (details: RoofDetailDraft[]) => void; newId: () => string;
}>) {
  const patch = (id: string, change: Partial<RoofDetailDraft>) => onChange(details.map((detail) => detail.id === id ? { ...detail, ...change } : detail));
  const add = (kind: RoofDetailKind) => onChange([...details, emptyRoofDetail(kind, newId())]);
  return <GlassDisclosure
    className="survey-section-more"
    defaultOpen={details.length > 0}
    summary={<>Meglévő tetőrészletek<span className="survey-optional-badge">Opcionális</span></>}
  >
    <p className="quick-gable-provenance survey-roof-detail-intro">{roofDetailsSummary(details)}. Csak a meglévő állapot rögzül: tervezett munka és anyagmennyiség nem, és a tetőfelületből sem vonunk le semmit.</p>
    {details.map((detail) => {
      const def = roofDetailDefs[detail.kind];
      const messages = detailMessages(detail);
      return <div className="survey-section-more-block survey-roof-detail" key={detail.id}>
        <h3>{def.label}</h3>
        <fieldset className="roof-mode-selector" disabled={disabled}>
          <legend className="sr-only">{`${def.label} állapota`}</legend>
          {statuses.map((status) => <button
            key={status}
            type="button"
            className="roof-mode-option"
            aria-pressed={detail.status === status}
            onClick={() => patch(detail.id, status === "absent" ? { status, count: "", widthMm: "", heightMm: "", lengthM: "" } : { status })}
          ><strong>{roofDetailStatusLabels[status]}</strong></button>)}
        </fieldset>
        {messages.status && <p className="field-survey-inline-error" role="status">{messages.status}</p>}
        {detail.status !== "absent" && <div className="roof-survey-measurement-strip">
          {def.fields.map((field) => {
            const inputId = `survey-detail-${detail.id}-${field.key}`;
            const error = messages[field.key];
            return <div className={`field-survey-measurement${error ? " has-geometry-error" : ""}`} key={field.key}>
              <div className="field-survey-measurement-head"><label className="field-survey-measurement-name" htmlFor={inputId}>{field.label}</label></div>
              <div className="field-survey-measurement-control">
                {field.unit === "mm" ? <LengthField id={inputId} label={field.label} value={detail[field.key]} error={error} onChange={(value) => patch(detail.id, { [field.key]: value } as Partial<RoofDetailDraft>)} /> : <>
                <input
                  id={inputId}
                  type="text"
                  inputMode={field.key === "count" ? "numeric" : "decimal"}
                  autoComplete="off"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${inputId}-error` : undefined}
                  value={detail[field.key]}
                  onChange={(event) => patch(detail.id, { [field.key]: event.target.value } as Partial<RoofDetailDraft>)}
                />
                <span className="field-survey-measurement-unit-badge" aria-hidden="true">{unitLabels[field.unit]}</span>
                </>}
              </div>
              {error && field.unit !== "mm" && <span className="field-survey-inline-error" id={`${inputId}-error`}>{error}</span>}
            </div>;
          })}
        </div>}
        <label className="field-survey-field"><span>Megfigyelés</span><textarea value={detail.note} rows={2} maxLength={500} disabled={disabled} onChange={(event) => patch(detail.id, { note: event.target.value })} /></label>
        <button type="button" className="secondary-button survey-roof-detail-remove" disabled={disabled} aria-label={`${def.label} bejegyzés törlése`} onClick={() => onChange(details.filter((item) => item.id !== detail.id))}><Trash2 aria-hidden="true" className="size-4" />Bejegyzés törlése</button>
      </div>;
    })}
    <GlassDisclosure className="field-survey-template-details" summary="Tetőrészlet hozzáadása">
      {roofDetailKinds.map((kind) => <button type="button" key={kind} disabled={disabled} onClick={() => add(kind)}><Plus aria-hidden="true" className="size-4" />{roofDetailDefs[kind].label}</button>)}
    </GlassDisclosure>
  </GlassDisclosure>;
}

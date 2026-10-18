import { CircleAlert, CircleCheck, CircleDot, Loader2 } from "lucide-react";

export type QuotationSaveState = "saving" | "error" | "unsaved" | "saved" | "new";

const icons = { saving: Loader2, error: CircleAlert, unsaved: CircleDot, saved: CircleCheck, new: CircleDot } as const;

export function quotationSaveState({ pending, error, dirty, hasRevision }: Readonly<{ pending: boolean; error: boolean; dirty: boolean; hasRevision: boolean }>): QuotationSaveState {
  if (pending) return "saving";
  if (error) return "error";
  if (dirty) return "unsaved";
  return hasRevision ? "saved" : "new";
}

/** Single in-flow sticky save surface: status text plus the one primary save action. */
export function QuotationSaveBar({ state, labels, disabled, onSave }: Readonly<{ state: QuotationSaveState; labels: Record<QuotationSaveState, string>; disabled: boolean; onSave: () => void }>) {
  const Icon = icons[state];
  return <div className={`quotation-savebar is-${state}`}>
    <p className="quotation-savebar-status" role="status" aria-live="polite"><Icon aria-hidden="true" className={`size-4${state === "saving" ? " animate-spin" : ""}`} /><span>{labels[state]}</span></p>
    <button className="primary-button quotation-savebar-save" type="button" disabled={disabled} onClick={onSave}>{state === "saving" ? "Mentés…" : "Piszkozat mentése"}</button>
  </div>;
}

"use client";
import { useRef, useState } from "react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { GutterCalculator } from "@/features/gutters/gutter-calculator";
import { FlashingCalculator } from "@/features/flashings/flashing-calculator";
import { StandaloneGablePreview } from "@/features/roof-models/standalone-gable-preview";
import { StandaloneGableMetalTilePreview } from "@/features/roof-models/gable-metal-tile-covering-preview";
import { linkSurveyCalculation, loadSurveyCalculator } from "./workspace-actions";
import type { SavedSurveyCalculation } from "@/domain/field-surveys/workspace";
import { gutterInputFromSelectedEaves } from "@/features/gutters/gutter-handoff";
import { useAppInteraction } from "@/components/feedback/app-interaction-provider";

type Context = Awaited<ReturnType<typeof loadSurveyCalculator>>;
export function WorkspaceCalculator({ organizationId, surveyId, sectionId, version, context, onClose, onShowSummary, onLinked, onState }: {
  organizationId: string; surveyId: string; sectionId: string; version: number; context: Context;
  onClose: () => void; onShowSummary: () => void; onLinked: () => void; onState: (state: { dirty: boolean; pending: boolean }) => void;
}) {
  const { requestConfirmation, notify } = useAppInteraction();
  const [kind, setKind] = useState<"roof" | "metal">("roof");
  const [receipt, setReceipt] = useState<SavedSurveyCalculation | null>(null);
  const [linked, setLinked] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const state = useRef({ dirty: false, pending: false });
  function report(next: { dirty: boolean; pending: boolean }) { state.current = next; onState(next); }
  const handoff = context.handoff;
  const gutterInput = handoff.calculator === "gutter" && context.projectId && context.savedGutter
    ? { ...context.savedGutter.input, gutterStockLengthMm: handoff.input.gutterStockLengthMm || context.savedGutter.input.gutterStockLengthMm,
      runs: [...context.savedGutter.input.runs, ...gutterInputFromSelectedEaves(context.selectedGutter).runs.filter((run) => !context.savedGutter!.input.runs.some((existing) => existing.roofEdge?.roofModelId === run.roofEdge?.roofModelId && existing.roofEdge?.edgeId === run.roofEdge?.edgeId))] }
    : handoff.calculator === "gutter" ? handoff.input : null;
  async function associate(saved: SavedSurveyCalculation) {
    if (lock.current) return;
    lock.current = true; setReceipt(saved); setPending(true); setError(""); report({ dirty: true, pending: true });
    try {
      const result = await linkSurveyCalculation({ organizationId, surveyId, sectionId, version, saved });
      if (!result.ok) { const message = result.error ?? "A számítás mentve, de a kapcsolás még nem sikerült."; setError(message); notify({ kind: "error", message }); report({ dirty: true, pending: false }); return; }
      setLinked(true); report({ dirty: false, pending: false }); notify({ kind: "success", message: "Számítás a felméréshez kapcsolva" }); onLinked();
    } catch { const message = "A számítás mentve, a kapcsolat válasza bizonytalan. Próbáld újra a kapcsolást."; setError(message); notify({ kind: "error", message }); report({ dirty: true, pending: false }); }
    finally { setPending(false); lock.current = false; }
  }
  // Keep callbacks stable so editor state reports do not retrigger effects on every render.
  const reportRef = useRef(report); reportRef.current = report;
  const stableReport = useRef((next: { dirty: boolean; pending: boolean }) => reportRef.current(next)).current;
  async function close() {
    if (pending || state.current.pending) return;
    if (state.current.dirty || (receipt && !linked)) {
      const accepted = await requestConfirmation({ title: "Mentetlen módosítások", message: "A kalkulátor bezárásakor a nem mentett adatok vagy a befejezetlen felméréskapcsolat elveszhetnek.", cancelLabel: "Maradok", actions: [{ label: "Kalkulátor bezárása", tone: "danger", run: () => undefined }] });
      if (!accepted) return;
    }
    report({ dirty: false, pending: false }); onClose();
  }
  const sectionTitle = handoff.calculator === "roof" ? "Tető számítása" : handoff.calculator === "gutter" ? "Ereszcsatorna-szükséglet" : "Szegélyanyag számítása";
  const sectionIntro = handoff.calculator === "roof" ? "A felmérés tetőméretei már be vannak töltve." : handoff.calculator === "gutter" ? "A felmért ereszszakaszok már be vannak töltve." : "A felmért szegélyszakaszok már be vannak töltve.";
  return <section className="survey-workspace-calculator" aria-label={sectionTitle}>
    <div className="field-survey-section-heading"><div><h2>{sectionTitle}</h2><p>{sectionIntro}</p></div><button type="button" className="secondary-button" onClick={() => void close()} disabled={pending || state.current.pending}>Vissza a felméréshez</button></div>
    {handoff.missing.length > 0 && !(handoff.calculator === "gutter" && gutterInput?.gutterStockLengthMm) && <p className="missing-data">Még szükséges: {handoff.missing.join(", ")}.</p>}
    {receipt ? <div role="status" className="survey-calculation-receipt"><p>Számítás mentve · V{receipt.revisionNumber}</p><p>{linked ? "A számítás a megnyitott felmérés-változathoz kapcsolódik." : "A számítás mentve; a felméréskapcsolat újrapróbálható."}</p>{!linked && <button className="primary-button" type="button" disabled={pending} onClick={() => void associate(receipt)}>Kapcsolás újrapróbálása</button>}{linked && <button className="primary-button" type="button" onClick={onShowSummary}>Tovább a felmérés összesítőjéhez</button>}<GlassDisclosure summary="Mentés és forrás részletei"><dl><dt>Számításazonosító</dt><dd>{receipt.calculationId}</dd><dt>Számításrevízió</dt><dd>{receipt.revisionId}</dd><dt>Felméret-revízió</dt><dd>{handoff.source.revisionId} · V{handoff.source.version}</dd></dl></GlassDisclosure></div> : <>
      {handoff.calculator === "gutter" && <GutterCalculator organizationId={organizationId} projectId={context.projectId ?? undefined} saved={context.savedGutter} suggestions={context.availableGutter} selectedSuggestions={context.selectedGutter} catalogVariants={context.gutterCatalog} initialInput={gutterInput ?? handoff.input} handoffSource={handoff.source} onSaved={associate} onWorkspaceState={stableReport} />}
      {handoff.calculator === "flashing" && <FlashingCalculator organizationId={organizationId} projectId={context.projectId ?? undefined} saved={context.savedFlashing} suggestions={context.availableFlashing} selectedSuggestions={context.selectedFlashing} catalogVariants={context.flashingCatalog} initialHandoff={handoff.input} handoffSource={handoff.source} onSaved={associate} onWorkspaceState={stableReport} />}
      {handoff.calculator === "roof" && <>
        <fieldset className="survey-calculator-choice"><legend>Mit szeretnél számítani?</legend><div><button type="button" className={kind === "roof" ? "is-selected" : ""} aria-pressed={kind === "roof"} disabled={pending} onClick={() => setKind("roof")}><strong>Geometria és trapézlemez</strong><small>Felület, méretek és lemezkiosztás</small></button><button type="button" className={kind === "metal" ? "is-selected" : ""} aria-pressed={kind === "metal"} disabled={pending} onClick={() => setKind("metal")}><strong>Cserepeslemez-fedés</strong><small>Fedési mennyiség termékadatokból</small></button></div></fieldset>
        {kind === "roof" ? <StandaloneGablePreview embedded organizationId={organizationId} initialHandoff={handoff.input} handoffSource={handoff.source} missingHandoffFields={handoff.missing} onSaved={associate} onWorkspaceState={stableReport} /> : <StandaloneGableMetalTilePreview embedded organizationId={organizationId} initialHandoff={handoff.input} handoffSource={handoff.source} onSaved={associate} onWorkspaceState={stableReport} />}
      </>}
    </>}
    {error && <p className="form-message is-error" role="alert">{error}</p>}
  </section>;
}

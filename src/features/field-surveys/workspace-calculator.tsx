"use client";
import { useRef, useState } from "react";
import { GutterCalculator } from "@/features/gutters/gutter-calculator";
import { FlashingCalculator } from "@/features/flashings/flashing-calculator";
import { StandaloneGablePreview } from "@/features/roof-models/standalone-gable-preview";
import { StandaloneGableMetalTilePreview } from "@/features/roof-models/gable-metal-tile-covering-preview";
import { linkSurveyCalculation, loadSurveyCalculator } from "./workspace-actions";
import type { SavedSurveyCalculation } from "@/domain/field-surveys/workspace";
import { gutterInputFromSelectedEaves } from "@/features/gutters/gutter-handoff";

type Context = Awaited<ReturnType<typeof loadSurveyCalculator>>;
export function WorkspaceCalculator({ organizationId, surveyId, sectionId, version, context, onClose, onLinked, onState }: {
  organizationId: string; surveyId: string; sectionId: string; version: number; context: Context;
  onClose: () => void; onLinked: () => void; onState: (state: { dirty: boolean; pending: boolean }) => void;
}) {
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
      if (!result.ok) { setError(result.error ?? "A számítás mentve, de a kapcsolás még nem sikerült."); report({ dirty: true, pending: false }); return; }
      setLinked(true); report({ dirty: false, pending: false }); onLinked();
    } catch { setError("A számítás mentve, a kapcsolat válasza bizonytalan. Próbáld újra a kapcsolást."); report({ dirty: true, pending: false }); }
    finally { setPending(false); lock.current = false; }
  }
  // Keep callbacks stable so editor state reports do not retrigger effects on every render.
  const reportRef = useRef(report); reportRef.current = report;
  const stableReport = useRef((next: { dirty: boolean; pending: boolean }) => reportRef.current(next)).current;
  function close() {
    if (pending || state.current.pending) return;
    if ((state.current.dirty || (receipt && !linked)) && !window.confirm("Nem mentett kalkulátoradat vagy befejezetlen kapcsolat van. Bezárod?")) return;
    report({ dirty: false, pending: false }); onClose();
  }
  return <section className="survey-workspace-calculator" aria-label="Számítás a munkaszakaszhoz">
    <div className="field-survey-section-heading"><h2>Számítás hozzáadása</h2><button type="button" className="secondary-button" onClick={close} disabled={pending || state.current.pending}>Kalkulátor bezárása</button></div>
    {handoff.missing.length > 0 && !(handoff.calculator === "gutter" && gutterInput?.gutterStockLengthMm) && <p className="missing-data">Hiányzó adatok: {handoff.missing.join(", ")}. A kalkulátorban pótolhatók.</p>}
    {receipt ? <div role="status"><p>Számítás mentve · V{receipt.revisionNumber} · {receipt.calculationId} · revízió: {receipt.revisionId}</p><p>{linked ? "A pontos számításrevízió a munkaszakaszhoz kapcsolva." : "A mentett számítás kapcsolása folyamatban vagy újrapróbálásra vár."}</p>{!linked && <button className="primary-button" type="button" disabled={pending} onClick={() => void associate(receipt)}>Kapcsolás újrapróbálása</button>}</div> : <>
      {handoff.calculator === "gutter" && <GutterCalculator organizationId={organizationId} projectId={context.projectId ?? undefined} saved={context.savedGutter} suggestions={context.availableGutter} selectedSuggestions={context.selectedGutter} catalogVariants={context.gutterCatalog} initialInput={gutterInput ?? handoff.input} handoffSource={handoff.source} onSaved={associate} onWorkspaceState={stableReport} />}
      {handoff.calculator === "flashing" && <FlashingCalculator organizationId={organizationId} projectId={context.projectId ?? undefined} saved={context.savedFlashing} suggestions={context.availableFlashing} selectedSuggestions={context.selectedFlashing} catalogVariants={context.flashingCatalog} initialHandoff={handoff.input} handoffSource={handoff.source} onSaved={associate} onWorkspaceState={stableReport} />}
      {handoff.calculator === "roof" && <>
        <label className="field-survey-field"><span>Kalkulátor</span><select value={kind} onChange={(event) => { if (state.current.pending || (state.current.dirty && !window.confirm("Elveted a nem mentett kalkulátoradatokat?"))) return; setKind(event.target.value as "roof" | "metal"); }}><option value="roof">Nyeregtető-geometria és trapézlemez-fedés</option><option value="metal">Cserepeslemez-fedés</option></select></label>
        <p>A geometria előnézet. A fedési számítás termékadatok megadása után külön menthető. Névleges lemezfelületből nem készül beszerzési mennyiség.</p>
        {kind === "roof" ? <StandaloneGablePreview embedded organizationId={organizationId} initialHandoff={handoff.input} handoffSource={handoff.source} missingHandoffFields={handoff.missing} onSaved={associate} onWorkspaceState={stableReport} /> : <StandaloneGableMetalTilePreview organizationId={organizationId} initialHandoff={handoff.input} handoffSource={handoff.source} onSaved={associate} onWorkspaceState={stableReport} />}
      </>}
    </>}
    {error && <p className="form-message is-error" role="alert">{error}</p>}
  </section>;
}

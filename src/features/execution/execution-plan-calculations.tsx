"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { useAppInteraction } from "@/components/feedback/app-interaction-provider";
import { constructionCalculatorLabels, isSaveableConstructionCalculator } from "@/features/calculators/construction-computation";
import type { PlanLinkedCalculation } from "./execution-calculation-links";
import { unlinkExecutionPlanDocumentAction } from "./execution-document-link-actions";
import type { ExecutionWorkspaceSection } from "./execution-workspace-read";

const formatValue = (value: number | string) => typeof value === "number" ? new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value) : value;

/** Work log side of calculation links: the exact saved revision, readable by members; only its creator edits or detaches it. */
export function ExecutionPlanCalculations({ organizationId, planId, result }: Readonly<{ organizationId: string; planId: string; result: ExecutionWorkspaceSection<readonly PlanLinkedCalculation[]> }>) {
  const router = useRouter();
  const { requestConfirmation, notify } = useAppInteraction();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const rows = result.status === "loaded" ? result.data : [];

  async function unlink(calculation: PlanLinkedCalculation) {
    const accepted = await requestConfirmation({
      title: "Kalkuláció leválasztása",
      message: `A „${calculation.name}” kalkuláció és a munkanapló is megmarad; csak a kapcsolatuk szűnik meg. A kapcsolat később újra létrehozható.`,
      cancelLabel: "Mégse",
      actions: [{ label: "Leválasztás", tone: "danger", run: () => undefined }],
    });
    if (!accepted || lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const outcome = await unlinkExecutionPlanDocumentAction({ organizationId, linkId: calculation.linkId, planId, kind: "calculation", documentId: calculation.revisionId });
      if (!outcome.ok) { setError(outcome.error); return; }
      notify({ kind: "success", message: "Kalkuláció leválasztva" });
      router.refresh();
    } catch { setError("A válasz bizonytalan. Frissítsd az oldalt, és ellenőrizd a kapcsolatot."); }
    finally { lock.current = false; setPending(false); }
  }

  const summary = result.status === "loaded" ? `Kapcsolt kalkulációk · ${rows.length}` : `Kapcsolt kalkulációk · ${result.status === "access_denied" ? "nincs hozzáférés" : "nem tölthető be"}`;
  return <GlassDisclosure className="execution-workflow-links execution-plan-calculations" defaultOpen={rows.length > 0} summary={summary}>
    {result.status !== "loaded" && <p className="missing-data" role="alert">{result.status === "access_denied" ? "Nincs hozzáférés a kapcsolt kalkulációkhoz." : "A kapcsolt kalkulációk átmenetileg nem tölthetők be."} A munkanapló többi része továbbra is elérhető. {result.status === "unavailable" && <button className="text-action" type="button" onClick={() => router.refresh()}>Újrapróbálás</button>}</p>}
    {result.status === "loaded" && rows.length === 0 && <p className="missing-data">Nincs kapcsolt kalkuláció. Mentett kalkulációt a Kalkulátorokban kapcsolhatsz munkanaplóhoz; ez opcionális.</p>}
    {rows.length > 0 && <ul className="plan-link-list">{rows.map((calculation) => <li key={calculation.linkId} className="execution-plan-calculation">
      <div>
        <strong><Calculator aria-hidden="true" size={15} /> {calculation.name}</strong>
        <span>{isSaveableConstructionCalculator(calculation.calculatorId) ? constructionCalculatorLabels[calculation.calculatorId] : calculation.calculatorId} · V{calculation.revisionNumber} · rögzített revízió</span>
        {calculation.lines.length > 0 && <GlassDisclosure summary={`Eredmény · V${calculation.revisionNumber}`}><dl>{calculation.lines.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{formatValue(line.value)} {line.unit}</dd></div>)}</dl></GlassDisclosure>}
        {!calculation.ownedByViewer && <small>Csak olvasható · a kalkulációt a létrehozója szerkesztheti.</small>}
      </div>
      {calculation.ownedByViewer && <div className="project-module-actions">
        <Link className="secondary-button" href={`/kalkulatorok?organization=${organizationId}&calculator=${calculation.calculatorId}&calculation=${calculation.calculationId}`}>Megnyitás a kalkulátorban</Link>
        <button type="button" className="text-action" disabled={pending} onClick={() => void unlink(calculation)}>Leválasztás</button>
      </div>}
    </li>)}</ul>}
    {error && <p role="alert" className="form-message is-error">{error}</p>}
  </GlassDisclosure>;
}

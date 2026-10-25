"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { stableJsonStringify } from "@/features/roof-models/stable-json";
import { saveConstructionCalculationAction } from "@/features/calculations/construction-actions";
import type { SavedConstructionRevision } from "@/features/calculations/construction-data";
import type { ConstructionInputSnapshot, ConstructionOutputSnapshot } from "./construction-computation";

export type ConstructionSaveSession = Readonly<{
  calculationId: string;
  name: string;
  /** Latest saved revision; 0 until the first save. */
  revisionNumber: number;
  /** Stable JSON of the latest saved input and its name, the baseline for "unsaved changes". */
  baselineInput: string | null;
  savedName: string | null;
  viewedRevisionNumber: number | null;
  revisions: readonly SavedConstructionRevision[];
}>;

export const newConstructionSession = (name: string): ConstructionSaveSession =>
  ({ calculationId: generateSecureUuid(), name, revisionNumber: 0, baselineInput: null, savedName: null, viewedRevisionNumber: null, revisions: [] });

const comparableOutput = (output: Pick<ConstructionOutputSnapshot, "lines" | "takeoff" | "cutList">) => stableJsonStringify({ lines: output.lines, takeoff: output.takeoff, cutList: output.cutList });
const formatValue = (value: number | string) => typeof value === "number" ? new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value) : value;

type Props = Readonly<{
  organizationId: string;
  calculatorId: string;
  session: ConstructionSaveSession;
  input: ConstructionInputSnapshot;
  liveOutput: ConstructionOutputSnapshot;
  saveable: boolean;
  onSessionChange: (next: ConstructionSaveSession) => void;
  onLoadRevision: (revision: SavedConstructionRevision) => void;
}>;

/** Save, reopen and revision controls; an unsaved result is always labelled as a local preview. */
export function ConstructionSavePanel({ organizationId, calculatorId, session, input, liveOutput, saveable, onSessionChange, onLoadRevision }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string; conflict?: boolean } | null>(null);
  const attempt = useRef<{ key: string; operationId: string } | null>(null);
  const inputJson = stableJsonStringify(input);
  const saved = session.revisionNumber > 0;
  const dirty = saved && (inputJson !== session.baselineInput || session.name.trim() !== session.savedName);
  const viewed = session.revisions.find((revision) => revision.revisionNumber === session.viewedRevisionNumber) ?? null;
  const viewedIsOlder = viewed !== null && viewed.revisionNumber !== session.revisionNumber;
  const outputDrift = viewed !== null && stableJsonStringify(viewed.input) === inputJson && comparableOutput(viewed.output) !== comparableOutput(liveOutput);
  const nameValid = session.name.trim().length > 0 && session.name.trim().length <= 200;
  useUnsavedChangeGuard({ dirty, pending });

  const save = () => {
    if (!saveable || !nameValid) return;
    const request = { organizationId, calculationId: session.calculationId, expectedRevisionNumber: session.revisionNumber, name: session.name.trim(), input };
    const key = stableJsonStringify(request);
    // A retry of the exact same request reuses its operation id, so a lost response cannot create a second revision.
    if (attempt.current?.key !== key) attempt.current = { key, operationId: generateSecureUuid() };
    const operationId = attempt.current.operationId;
    setMessage(null);
    startTransition(async () => {
      const result = await saveConstructionCalculationAction({ ...request, operationId }).catch(() => ({ ok: false as const, error: "A mentés nem ért célba. Az eredmény nincs mentve; próbáld újra.", conflict: false }));
      if (!result.ok) { setMessage({ kind: "error", text: result.error, conflict: result.conflict }); return; }
      attempt.current = null;
      onSessionChange({ ...session, name: request.name, revisionNumber: result.revisionNumber, baselineInput: inputJson, savedName: request.name, viewedRevisionNumber: result.revisionNumber });
      setMessage({ kind: "success", text: `Mentve · V${result.revisionNumber}` });
      router.replace(`/kalkulatorok?organization=${organizationId}&calculator=${calculatorId}&calculation=${result.calculationId}`, { scroll: false });
      router.refresh();
    });
  };

  const status = !saved ? "Nincs mentve · helyi előnézet"
    : viewedIsOlder ? `V${viewed.revisionNumber} megnyitva (korábbi) · mentéskor új V${session.revisionNumber + 1} készül`
      : dirty ? `Mentetlen módosítás · utolsó mentés V${session.revisionNumber}` : `Mentve · V${session.revisionNumber}`;
  return <section className="construction-save-panel" aria-label="Kalkuláció mentése">
    <label className="construction-suite-field"><span>Kalkuláció neve</span><input value={session.name} maxLength={200} disabled={pending} onChange={(event) => onSessionChange({ ...session, name: event.target.value })} aria-invalid={!nameValid || undefined} /></label>
    <p className={`construction-save-status${saved && !dirty && !viewedIsOlder ? " is-saved" : ""}`} role="status">{status}</p>
    {!saveable && <p className="construction-suite-limit">Mentéshez teljes, kiszámítható eredmény szükséges.</p>}
    <button type="button" className="primary-button" disabled={!saveable || !nameValid || pending || (saved && !dirty)} onClick={save}>
      <Save aria-hidden="true" className="size-4" />{pending ? "Mentés…" : saved ? `Új revízió mentése · V${session.revisionNumber + 1}` : "Kalkuláció mentése"}
    </button>
    {message && <p className={`form-message${message.kind === "error" ? " is-error" : ""}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}{message.conflict && <> <button type="button" className="text-button" onClick={() => router.refresh()}>Aktuális változat betöltése</button></>}</p>}
    {outputDrift && viewed && <div className="form-message" role="note">
      <strong>A mentett V{viewed.revisionNumber} eredménye eltér a mostani számítástól.</strong> Ok lehet például megváltozott anyagkatalógus vagy számítási verzió. A mentett revízió változatlan; új mentés a mostani eredményt rögzíti.
      <GlassDisclosure summary={`Mentett eredmény · V${viewed.revisionNumber}`}><dl>{viewed.output.lines.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{formatValue(line.value)} {line.unit}</dd></div>)}</dl></GlassDisclosure>
    </div>}
    {session.revisions.length > 1 && <GlassDisclosure className="construction-save-revisions" summary={`Revíziók · ${session.revisions.length}`}>
      <div className="project-module-links" role="group" aria-label="Mentett revíziók">{session.revisions.map((revision) => <button key={revision.revisionId} type="button" className="secondary-button" aria-pressed={revision.revisionNumber === session.viewedRevisionNumber} disabled={pending} onClick={() => onLoadRevision(revision)}>
        V{revision.revisionNumber}{revision.revisionNumber === session.revisionNumber ? " · aktuális" : ""} · {new Date(revision.createdAt).toLocaleString("hu-HU")}
      </button>)}</div>
    </GlassDisclosure>}
    <p className="construction-suite-independent">A mentett kalkuláció csak a te fiókodban látható. Nem kapcsolódik ügyfélhez, projekthez, felméréshez, anyaglistához, munkanaplóhoz vagy ajánlathoz.</p>
  </section>;
}

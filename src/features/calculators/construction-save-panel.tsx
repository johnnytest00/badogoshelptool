"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { stableJsonStringify } from "@/features/roof-models/stable-json";
import { saveConstructionCalculationAction } from "@/features/calculations/construction-actions";
import { loadConstructionRevisionPageAction } from "@/features/calculations/construction-revision-actions";
import type { SavedConstructionRevision } from "@/features/calculations/construction-data";
import { comparableConstructionInput, isCompleteConstructionOutput, type ConstructionInputSnapshot, type ConstructionOutputSnapshot } from "./construction-computation";
import type { CalculatorDefinition } from "./construction-calculator-types";
import { ExecutionPlanLinkControl } from "@/features/execution/execution-plan-link-control";
import type { DocumentPlanLink } from "@/features/execution/execution-document-links";
import type { ExecutionPlanOption } from "@/features/execution/execution-data";

export type ConstructionPlanLinks = Readonly<{ plans: readonly ExecutionPlanOption[]; links: readonly DocumentPlanLink[] }>;

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
  hasOlderRevisions?: boolean;
  nextBeforeRevisionNumber?: number | null;
}>;

export const newConstructionSession = (name: string): ConstructionSaveSession =>
  ({ calculationId: generateSecureUuid(), name, revisionNumber: 0, baselineInput: null, savedName: null, viewedRevisionNumber: null, revisions: [], hasOlderRevisions: false, nextBeforeRevisionNumber: null });

const driftComparisonFields = (output: Pick<ConstructionOutputSnapshot, "lines" | "takeoff" | "cutList">) => ({ lines: output.lines, takeoff: output.takeoff, cutList: output.cutList });
const formatValue = (value: number | string) => typeof value === "number" ? new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value) : value;

// M10.1.7: an identical input re-run can differ from the saved result in the last bit of a double (~1e-14 on
// Karmi trig results), which is not a real output drift. Both base tolerances sit ~1e7x above that noise and
// ~1e3x below the smallest professionally meaningful difference (a count of 1, 0.01 mm, 0.001°).
// M10.1.9: the relative term alone grows without bound, so at billion-scale LAYOUT piece counts (reachable with
// valid but extreme covering inputs, see docs/M10_PHASE1_FINAL_NUMERICAL_QA.md) it swallowed a real +1 count
// drift. DRIFT_NUMERIC_MAX_TOLERANCE caps the continuous-value tolerance well above that same ULP noise but
// below any domain-bounded (roof dimensions ≤100 000 mm) meaningful length/angle/area/volume difference, so a
// huge-magnitude continuous value can no longer hide a real difference behind the relative term. Discrete
// counts (unit "db", or a cutList "count") are compared exactly instead, independent of magnitude.
const DRIFT_NUMERIC_ABSOLUTE_TOLERANCE = 1e-9;
const DRIFT_NUMERIC_RELATIVE_TOLERANCE = 1e-9;
const DRIFT_NUMERIC_MAX_TOLERANCE = 1e-6;
const numbersEquivalent = (a: number, b: number, exact: boolean) => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false; // NaN/Infinity: never a valid, driftless result, even against itself
  if (a === b) return true;
  if (exact) return false;
  const tolerance = Math.min(DRIFT_NUMERIC_ABSOLUTE_TOLERANCE + DRIFT_NUMERIC_RELATIVE_TOLERANCE * Math.max(Math.abs(a), Math.abs(b)), DRIFT_NUMERIC_MAX_TOLERANCE);
  return Math.abs(a - b) <= tolerance;
};

/**
 * Structural output-drift comparison: same shape, keys and values. Numbers allowed machine-precision noise
 * only, except discrete counts (a "value" next to `unit: "db"`, or a "count" key, as in `lines`, `takeoff`
 * quantities and `cutList`), which must match exactly regardless of magnitude.
 */
export function outputsEquivalent(a: unknown, b: unknown, exact = false): boolean {
  if (typeof a === "number" && typeof b === "number") return numbersEquivalent(a, b, exact);
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => outputsEquivalent(item, b[index], exact));
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  const isCountUnit = objA.unit === "db" || objB.unit === "db";
  return keysA.length === keysB.length && keysA.every((key) => key in objB && outputsEquivalent(objA[key], objB[key], key === "count" || (key === "value" && isCountUnit)));
}

/**
 * Dev/test diagnostic: the exact JSON paths where two comparable output projections differ, so an output-drift
 * warning can be localized without exposing internal values in the UI. Exact equality only — use
 * `outputsEquivalent` for the actual drift decision, which tolerates floating-point noise.
 */
export function outputDriftDiffPaths(a: unknown, b: unknown, path = ""): readonly string[] {
  if (a === b) return [];
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return [path || "(root)"];
  if (Array.isArray(a) !== Array.isArray(b)) return [path || "(root)"];
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return [`${path || "(root)"} (length ${a.length} vs ${b.length})`];
    return a.flatMap((item, index) => outputDriftDiffPaths(item, b[index], `${path}[${index}]`));
  }
  const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
  return [...keys].flatMap((key) => outputDriftDiffPaths((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], path ? `${path}.${key}` : key));
}

export function savedInputComparison(definition: CalculatorDefinition, session: ConstructionSaveSession) {
  const latest = session.revisions.find((revision) => revision.revisionNumber === session.revisionNumber);
  if (!latest) return { baseline: session.baselineInput, incompatible: false };
  const comparable = comparableConstructionInput(definition, latest.input);
  return { baseline: comparable ? stableJsonStringify(comparable) : session.baselineInput, incompatible: comparable === null };
}

type Props = Readonly<{
  organizationId: string;
  calculatorId: string;
  definition: CalculatorDefinition;
  session: ConstructionSaveSession;
  input: ConstructionInputSnapshot;
  liveOutput: ConstructionOutputSnapshot;
  saveable: boolean;
  onSessionChange: (next: ConstructionSaveSession) => void;
  onLoadRevision: (revision: SavedConstructionRevision) => void;
  onPendingChange?: (pending: boolean) => void;
  onDiscard?: () => void;
  /** Work logs and existing links of the saved calculation; null when not saved yet or not loadable. */
  planLinks?: ConstructionPlanLinks | null;
  /** True only when the server tried and failed to load work logs for this saved calculation. */
  planLinksUnavailable?: boolean;
  /** M10 Fázis 0: a jelenlegi mezőkbe átvett roof.rafter-cut revízió; a következő mentés calculation_dependencies sorként rögzíti. */
  sourceCalculationRevisionId?: string | null;
  /** A forrás elfogyasztása után (sikeres mentés), hogy egy következő, immár saját szerkesztés ne örökölje tovább. */
  onSourceConsumed?: () => void;
}>;

/** Save, reopen and revision controls; an unsaved result is always labelled as a local preview. */
export function ConstructionSavePanel({ organizationId, calculatorId, definition, session, input, liveOutput, saveable, onSessionChange, onLoadRevision, onPendingChange, onDiscard, planLinks = null, planLinksUnavailable = false, sourceCalculationRevisionId = null, onSourceConsumed }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revisionPending, startRevisionTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string; conflict?: boolean } | null>(null);
  const attempt = useRef<{ key: string; operationId: string } | null>(null);
  const revisionRequest = useRef(0);
  const activeCalculationId = useRef(session.calculationId);
  activeCalculationId.current = session.calculationId;
  const inputJson = stableJsonStringify(input);
  const saved = session.revisionNumber > 0;
  const comparison = savedInputComparison(definition, session);
  const dirty = saved && (comparison.incompatible || inputJson !== comparison.baseline || session.name.trim() !== session.savedName);
  const viewed = session.revisions.find((revision) => revision.revisionNumber === session.viewedRevisionNumber) ?? null;
  const viewedIsOlder = viewed !== null && viewed.revisionNumber !== session.revisionNumber;
  const comparableViewed = viewed && comparableConstructionInput(definition, viewed.input);
  const outputDrift = viewed !== null && comparableViewed !== null && stableJsonStringify(comparableViewed) === inputJson && !outputsEquivalent(driftComparisonFields(viewed.output), driftComparisonFields(liveOutput));
  const latestRevision = session.revisions.find((revision) => revision.revisionNumber === session.revisionNumber) ?? null;
  const latestRevisionId = latestRevision?.revisionId ?? null;
  const latestComplete = latestRevision !== null && isCompleteConstructionOutput(latestRevision.output);
  const nameValid = session.name.trim().length > 0 && session.name.trim().length <= 200;
  const busy = pending || revisionPending;
  useUnsavedChangeGuard({ dirty, pending: busy, discard: onDiscard });
  useEffect(() => { onPendingChange?.(busy); }, [busy, onPendingChange]);

  const save = () => {
    if (!saveable || !nameValid || comparison.incompatible || busy) return;
    const request = { organizationId, calculationId: session.calculationId, expectedRevisionNumber: session.revisionNumber, name: session.name.trim(), input, ...(sourceCalculationRevisionId ? { sourceCalculationRevisionId } : {}) };
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
      onSourceConsumed?.();
      setMessage({ kind: "success", text: `Mentve · V${result.revisionNumber}` });
      router.replace(`/kalkulatorok?organization=${organizationId}&calculator=${calculatorId}&calculation=${result.calculationId}`, { scroll: false });
      router.refresh();
    });
  };

  const loadOlderRevisions = () => {
    const beforeRevisionNumber = session.nextBeforeRevisionNumber;
    if (!session.hasOlderRevisions || beforeRevisionNumber === null || beforeRevisionNumber === undefined || busy) return;
    const requestId = ++revisionRequest.current;
    const calculationId = session.calculationId;
    startRevisionTransition(async () => {
      const result = await loadConstructionRevisionPageAction({ organizationId, calculationId, beforeRevisionNumber });
      if (requestId !== revisionRequest.current || activeCalculationId.current !== calculationId) return;
      if (!result.ok) { setMessage({ kind: "error", text: result.error }); return; }
      const byId = new Map(session.revisions.map((revision) => [revision.revisionId, revision]));
      result.data.revisions.forEach((revision) => byId.set(revision.revisionId, revision));
      onSessionChange({ ...session, revisions: [...byId.values()].sort((a, b) => b.revisionNumber - a.revisionNumber), hasOlderRevisions: result.data.hasOlderRevisions, nextBeforeRevisionNumber: result.data.nextBeforeRevisionNumber });
    });
  };

  const status = !saved ? "Nincs mentve · helyi előnézet"
    : viewedIsOlder ? `V${viewed.revisionNumber} megnyitva (korábbi) · mentéskor új V${session.revisionNumber + 1} készül`
      : comparison.incompatible ? `Nem kompatibilis mentett revízió · V${session.revisionNumber}`
        : dirty ? `Mentetlen módosítás · utolsó mentés V${session.revisionNumber}`
          : !latestComplete ? `Mentett V${session.revisionNumber} · hiányos` : `Mentve · V${session.revisionNumber}`;
  return <section className="construction-save-panel" aria-label="Kalkuláció mentése">
    <label className="construction-suite-field"><span>Kalkuláció neve</span><input value={session.name} maxLength={200} disabled={busy} onChange={(event) => onSessionChange({ ...session, name: event.target.value })} aria-invalid={!nameValid || undefined} /></label>
    <p className={`construction-save-status${saved && latestComplete && !dirty && !viewedIsOlder ? " is-saved" : ""}`} role="status">{status}</p>
    {comparison.incompatible && <p className="form-message is-error" role="alert">A mentett revízió mezői nem vetíthetők biztonságosan a jelenlegi kalkulátorba. A mentett adat változatlan; ebből a nézetből új revízió nem menthető.</p>}
    {!saveable && <p className="construction-suite-limit"><strong>Hiányos kalkuláció.</strong> Mentéshez teljes, kiszámítható eredmény szükséges.</p>}
    <button type="button" className="primary-button" disabled={!saveable || !nameValid || busy || comparison.incompatible || (saved && !dirty)} onClick={save}>
      <Save aria-hidden="true" className="size-4" />{pending ? "Mentés…" : saved ? `Új revízió mentése · V${session.revisionNumber + 1}` : "Kalkuláció mentése"}
    </button>
    {message && <p className={`form-message${message.kind === "error" ? " is-error" : ""}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}{message.conflict && <> <button type="button" className="text-button" onClick={() => router.refresh()}>Aktuális változat betöltése</button></>}</p>}
    {outputDrift && viewed && <div className="form-message" role="note">
      <strong>A mentett V{viewed.revisionNumber} eredménye eltér a mostani számítástól.</strong> Ok lehet például megváltozott anyagkatalógus vagy számítási verzió. A mentett revízió változatlan; új mentés a mostani eredményt rögzíti.
      <GlassDisclosure summary={`Mentett eredmény · V${viewed.revisionNumber}`}><dl>{viewed.output.lines.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{formatValue(line.value)} {line.unit}</dd></div>)}</dl></GlassDisclosure>
    </div>}
    {(session.revisions.length > 1 || session.hasOlderRevisions) && <GlassDisclosure className="construction-save-revisions" summary={`Revíziók · ${session.revisions.length}${session.hasOlderRevisions ? "+" : ""}`}>
      <div className="project-module-links" role="group" aria-label="Mentett revíziók">{session.revisions.map((revision) => <button key={revision.revisionId} type="button" className="secondary-button" aria-pressed={revision.revisionNumber === session.viewedRevisionNumber} disabled={busy} onClick={() => onLoadRevision(revision)}>
        V{revision.revisionNumber}{revision.revisionNumber === session.revisionNumber ? " · aktuális" : ""} · {new Date(revision.createdAt).toLocaleString("hu-HU")}
      </button>)}{session.hasOlderRevisions && <button type="button" className="secondary-button" disabled={busy} onClick={loadOlderRevisions}>{revisionPending ? "Régebbi revíziók betöltése…" : "Régebbi revíziók betöltése"}</button>}</div>
    </GlassDisclosure>}
    {saved && latestRevisionId && latestComplete && <section className="construction-save-quotation" aria-label="Árajánlat"><strong>Árajánlat</strong>
      {dirty ? <p className="plan-link-note">Mentetlen módosítás van. Ajánlat mindig mentett revízióból készül; mentsd el előbb.</p>
        : <Link className="secondary-button" href={`/ajanlatok/uj?organization=${organizationId}&calculation=${session.calculationId}&calculationRevision=${latestRevisionId}`}>Árajánlat készítése a V{session.revisionNumber} revízióból</Link>}
    </section>}
    {saved && latestRevisionId && !latestComplete && <p className="construction-suite-limit">Hiányos kalkuláció nem adható tovább ajánlatba vagy munkanaplóba. Pótold a hiányzó adatokat, majd ments teljes új revíziót.</p>}
    {saved && latestRevisionId && planLinks && <ExecutionPlanLinkControl organizationId={organizationId} kind="calculation" documentId={latestRevisionId} links={planLinks.links} plans={planLinks.plans}
      linkBlockedReason={!latestComplete ? "Ez a mentett revízió hiányos; új munkanapló-kapcsolat nem hozható létre." : dirty ? `Mentetlen módosítás van. Munkanaplóhoz mindig mentett revízió kapcsolódik; mentsd el előbb, vagy a mentett V${session.revisionNumber} marad kapcsolható a módosítás elvetése után.` : undefined} />}
    {saved && planLinksUnavailable && <p className="construction-suite-limit">A munkanaplók most nem tölthetők be, ezért a kapcsolás átmenetileg nem érhető el. A kalkuláció ettől függetlenül mentve van.</p>}
    <p className="construction-suite-independent">A mentett kalkulációt csak te szerkesztheted. Ha munkanaplóhoz kapcsolod, a napló látói a kapcsolt revíziót olvashatják. Ügyfélhez, projekthez, felméréshez, anyaglistához vagy ajánlathoz nem kapcsolódik.</p>
  </section>;
}

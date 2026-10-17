"use client";

import { useEffect, useState } from "react";
import type { SurveyCalculationLink, SavedSurveyCalculation } from "@/domain/field-surveys/workspace";
import type { RoofGeometryType } from "@/domain/calculations/roof-geometry";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { linkSurveyCalculation } from "./workspace-actions";
import {
  listVerifiedSurveyRoofs,
  saveSurveyRoofGeometry,
  listVerifiedSurveyMultiRoofs,
  saveSurveyMultiRoofGeometry,
  type VerifiedSurveyRoof,
  type VerifiedSurveyMultiRoof,
} from "./survey-roof-actions";

type Props = Readonly<{
  organizationId: string;
  surveyId: string;
  version: number;
  sectionId: string;
  sectionName: string;
  roofType: RoofGeometryType;
  links: readonly SurveyCalculationLink[];
  ensureSaved: () => Promise<{ surveyId: string; version: number } | null>;
  onLinked: () => void;
}>;

export function SurveyRoofWorkspace(props: Props) {
  return props.roofType === "gable"
    ? <GableSurveyRoofWorkspace {...props} />
    : <MultiSurveyRoofWorkspace {...props} roofType={props.roofType} />;
}

function GableSurveyRoofWorkspace({ organizationId, surveyId, version, sectionId, sectionName, links, ensureSaved, onLinked }: Props) {
  const [operationId, setOperationId] = useState(() => generateSecureUuid());
  const [newRoofModelId] = useState(() => generateSecureUuid());
  const [sources, setSources] = useState<VerifiedSurveyRoof[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<SavedSurveyCalculation | null>(null);
  const [receiptVersion, setReceiptVersion] = useState<number | null>(null);
  const [linked, setLinked] = useState(true);

  useEffect(() => {
    let live = true;
    void listVerifiedSurveyRoofs({ organizationId, surveyId, version, sectionId }).then((items) => {
      if (!live) return;
      setSources(items);
      const linkedIds = links.filter((link) => link.sectionId === sectionId && link.calculatorType === "roof.gable").map((link) => link.calculationId);
      setSelectedModelId((current) => current || items.find((item) => linkedIds.includes(item.calculationId))?.roofModelId || "");
    }).catch(() => { if (live) setError("A mentett tetőmodell nem tölthető be."); });
    return () => { live = false; };
  }, [organizationId, surveyId, version, sectionId, links]);

  const source = sources.find((item) => item.roofModelId === selectedModelId) ?? null;
  const sourceLinks = links.filter((link) => link.sectionId === sectionId && link.calculatorType === "roof.gable" && link.calculationId === source?.calculationId);
  const sourceLink = sourceLinks.find((link) => link.revisionId === source?.calculationRevisionId && link.surveyVersion === version)
    ?? [...sourceLinks].sort((a, b) => b.surveyVersion - a.surveyVersion || b.revisionNumber - a.revisionNumber)[0];
  const locallyLinked = linked && receipt?.revisionId === source?.calculationRevisionId;
  const stale = Boolean(source && (!source.matchesCurrentSurvey || (sourceLink && sourceLink.revisionId !== source.calculationRevisionId && !locallyLinked)));

  async function save() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const savedSurvey = await ensureSaved();
      if (!savedSurvey) return;
      const result = await saveSurveyRoofGeometry({ organizationId, surveyId: savedSurvey.surveyId, version: savedSurvey.version, sectionId,
        roofModelId: selectedModelId || null, newRoofModelId, operationId, expectedRevisionNumber: source?.roofModelRevisionNumber ?? 0,
        name: source?.name ?? sectionName });
      if (!result.ok) { setError(result.error); return; }
      setOperationId(generateSecureUuid());
      setSources((current) => [...current.filter((item) => item.roofModelId !== result.source.roofModelId), result.source]);
      setSelectedModelId(result.source.roofModelId);
      setReceipt({ calculationId: result.source.calculationId, revisionId: result.source.calculationRevisionId, revisionNumber: result.source.roofModelRevisionNumber });
      setReceiptVersion(savedSurvey.version);
      setLinked(result.linked);
      if (result.linkError) setError(result.linkError);
      if (result.linked) onLinked();
    } catch { setError("A mentés válasza bizonytalan. Ellenőrizd a tetőmodell-revíziót újrapróbálás előtt."); }
    finally { setBusy(false); }
  }

  async function retryLink() {
    if (!receipt || busy) return;
    setBusy(true); setError("");
    try {
      const result = await linkSurveyCalculation({ organizationId, surveyId, version: receiptVersion ?? version, sectionId, saved: receipt });
      if (result.ok) { setLinked(true); onLinked(); }
      else setError(result.error ?? "A felméréskapcsolat nem jött létre.");
    } finally { setBusy(false); }
  }

  return <section className="survey-roof-workspace" aria-label="Tetőgeometria mentése projekttetőmodellként">
    <p>A felmérés rajza és eredménye a fenti mérésekből automatikusan frissül. Ha a projekthez külön tetőmodell-revízió is kell, itt menthető az aktuális felmérésváltozatból.</p>
    <label className="field-survey-field"><span>Projekttetőmodell</span><select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}><option value="">Új tetőmodell</option>{sources.map((item) => <option key={item.roofModelId} value={item.roofModelId}>{item.name} · mentett V{item.roofModelRevisionNumber}</option>)}</select></label>
    <button type="button" className="primary-button" disabled={busy} onClick={() => void save()}>{busy ? "Mentés…" : source ? "Új tetőmodell-revízió mentése" : "Tetőmodell mentése"}</button>
    {receipt && !linked && <button type="button" className="secondary-button" disabled={busy} onClick={() => void retryLink()}>Felméréskapcsolat újrapróbálása · V{receipt.revisionNumber}</button>}
    {error && <p role="alert" className="form-message is-error">{error}</p>}
    {source && <p role="status">Tetőmodell V{source.roofModelRevisionNumber} · forrás: {source.roofModelRevisionId}. {stale ? "A felmérés méretei vagy a mentett modell eltérnek; a korábbi revízió változatlan." : sourceLink || locallyLinked ? `Az aktuális felméréshez kapcsolva · V${locallyLinked ? receiptVersion : sourceLink?.surveyVersion}.` : "Ez a modell még nincs ehhez a felmérésváltozathoz kapcsolva."}</p>}
  </section>;
}

function MultiSurveyRoofWorkspace({ organizationId, surveyId, version, sectionId, sectionName, roofType, links, ensureSaved, onLinked }: Props & { roofType: Exclude<RoofGeometryType, "gable"> }) {
  const [sources, setSources] = useState<VerifiedSurveyMultiRoof[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [newModelId] = useState(() => generateSecureUuid());
  const [operationId, setOperationId] = useState(() => generateSecureUuid());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<SavedSurveyCalculation | null>(null);
  const [linked, setLinked] = useState(true);

  useEffect(() => {
    let live = true;
    void listVerifiedSurveyMultiRoofs({ organizationId, surveyId, version, sectionId }).then((items) => {
      if (!live) return;
      setSources(items);
      const linkedIds = links.filter((link) => link.sectionId === sectionId && link.calculatorType === `roof.geometry.${roofType}`).map((link) => link.calculationId);
      setSelectedModelId((current) => current || items.find((item) => linkedIds.includes(item.calculationId))?.roofModelId || "");
    }).catch(() => { if (live) setError("A mentett tetőmodell nem tölthető be."); });
    return () => { live = false; };
  }, [organizationId, surveyId, version, sectionId, roofType, links]);

  const source = sources.find((item) => item.roofModelId === selectedModelId) ?? null;
  const sourceLink = links.find((link) => link.sectionId === sectionId && link.calculatorType === `roof.geometry.${roofType}` && link.calculationId === source?.calculationId && link.revisionId === source?.calculationRevisionId);
  const current = Boolean(source?.matchesCurrentSurvey && (sourceLink || (linked && receipt?.revisionId === source.calculationRevisionId)));

  async function save() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const savedSurvey = await ensureSaved();
      if (!savedSurvey) return;
      const result = await saveSurveyMultiRoofGeometry({ organizationId, surveyId: savedSurvey.surveyId, version: savedSurvey.version,
        sectionId, roofType, roofModelId: selectedModelId || newModelId, operationId,
        expectedRevisionNumber: source?.roofModelRevisionNumber ?? 0, name: source?.name ?? sectionName });
      if (!result.ok) { setError(result.error); return; }
      setSources((items) => [...items.filter((item) => item.roofModelId !== result.source.roofModelId), result.source]);
      setSelectedModelId(result.source.roofModelId);
      setReceipt({ calculationId: result.source.calculationId, revisionId: result.source.calculationRevisionId, revisionNumber: result.source.roofModelRevisionNumber });
      setLinked(result.linked);
      if (result.linked) { setOperationId(generateSecureUuid()); onLinked(); }
      if (result.linkError) setError(result.linkError);
    } catch { setError("A tetőmodell mentése válasza bizonytalan. Ugyanazzal a művelettel újrapróbálható."); }
    finally { setBusy(false); }
  }

  return <section className="survey-roof-workspace" aria-label="Tetőgeometria mentése projekttetőmodellként">
    <p>A felmérés rajza és eredménye a fenti mérésekből automatikusan frissül. Külön tetőmodell-revízió az aktuális felmérésváltozatból menthető.</p>
    <label className="field-survey-field"><span>Projekttetőmodell</span><select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}><option value="">Új tetőmodell</option>{sources.map((item) => <option key={item.roofModelId} value={item.roofModelId}>{item.name} · V{item.roofModelRevisionNumber}</option>)}</select></label>
    <button type="button" className="primary-button" disabled={busy} onClick={() => void save()}>{busy ? "Mentés…" : source ? "Új tetőmodell-revízió mentése" : "Tetőmodell mentése"}</button>
    {!linked && <button type="button" className="secondary-button" disabled={busy} onClick={() => void save()}>Felméréskapcsolat újrapróbálása</button>}
    {error && <p role="alert" className="form-message is-error">{error}</p>}
    {source && <p role="status">Tetőmodell V{source.roofModelRevisionNumber} · forrás: {source.roofModelRevisionId}. {source.matchesCurrentSurvey ? current ? "Aktuális felméréshez kapcsolt geometria." : "A felméréskapcsolat még nem teljes." : "A felmérés mérései változtak; a korábbi modellrevízió változatlan."}</p>}
  </section>;
}

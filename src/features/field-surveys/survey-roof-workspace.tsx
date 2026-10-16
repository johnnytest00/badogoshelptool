"use client";

import { useEffect, useState } from "react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { TechnicalDrawing } from "@/features/roof-models/technical-drawing";
import { gableSegments, selectedGableLength } from "@/domain/calculations/gable-segments";
import type { SurveyCalculationLink, SavedSurveyCalculation } from "@/domain/field-surveys/workspace";
import { linkSurveyCalculation } from "./workspace-actions";
import { listVerifiedSurveyRoofs, saveSurveyRoofGeometry, type VerifiedSurveyRoof } from "./survey-roof-actions";
import { listVerifiedSurveyMultiRoofs, saveSurveyMultiRoofGeometry, type VerifiedSurveyMultiRoof } from "./survey-roof-actions";
import type { RoofGeometryType } from "@/domain/calculations/roof-geometry";
import { generateSecureUuid } from "@/lib/secure-uuid";

type Props = Readonly<{
  organizationId: string; surveyId: string; version: number; sectionId: string; sectionName: string;
  projectId: string; roofType: RoofGeometryType; links: readonly SurveyCalculationLink[]; ensureSaved: () => Promise<{ surveyId: string; version: number } | null>;
  onWork: (kind: "gutter" | "flashing", source: VerifiedSurveyRoof | VerifiedSurveyMultiRoof, edgeIds: string[]) => Promise<void>;
  onLinked: () => void;
}>;

export function SurveyRoofWorkspace(props: Props) {
  return props.roofType === "gable" ? <GableSurveyRoofWorkspace {...props} /> : <MultiSurveyRoofWorkspace {...props} roofType={props.roofType} />;
}

function GableSurveyRoofWorkspace({ organizationId, surveyId, version, sectionId, sectionName, projectId, links, ensureSaved, onWork, onLinked }: Props) {
  const [operationId, setOperationId] = useState(() => generateSecureUuid());
  const [newRoofModelId] = useState(() => generateSecureUuid());
  const [sources, setSources] = useState<VerifiedSurveyRoof[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
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
      const linkedCalculationIds = links.filter((link) => link.sectionId === sectionId && link.calculatorType === "roof.gable").map((link) => link.calculationId);
      setSelectedModelId((current) => current || items.find((item) => linkedCalculationIds.includes(item.calculationId))?.roofModelId || "");
    }).catch(() => { if (live) setError("A mentett tetőgeometria nem tölthető be."); });
    return () => { live = false; };
  }, [organizationId, surveyId, version, sectionId, links]);
  const source = sources.find((item) => item.roofModelId === selectedModelId) ?? null;
  const segments = source ? gableSegments(source.output) : [];
  const eaves = selectedSegmentIds.filter((id) => segments.some((segment) => segment.id === id && segment.kind === "eave"));
  const flashings = selectedSegmentIds.filter((id) => segments.some((segment) => segment.id === id && (segment.kind === "rake" || segment.kind === "ridge")));
  const roofLinks = links.filter((link) => link.sectionId === sectionId && link.calculatorType === "roof.gable" && link.calculationId === source?.calculationId);
  const sourceLink = roofLinks.find((link) => link.revisionId === source?.calculationRevisionId && link.surveyVersion === version)
    ?? [...roofLinks].sort((a, b) => b.surveyVersion - a.surveyVersion || b.revisionNumber - a.revisionNumber)[0];
  const locallyLinked = linked && receipt?.revisionId === source?.calculationRevisionId;
  const stale = Boolean(source && (!source.matchesCurrentSurvey || (sourceLink && sourceLink.revisionId !== source.calculationRevisionId && !locallyLinked)));
  const readyForWork = Boolean((sourceLink || locallyLinked) && !stale && source?.matchesCurrentSurvey && linked);
  async function save() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const savedSurvey = await ensureSaved();
      if (!savedSurvey) return;
      const result = await saveSurveyRoofGeometry({ organizationId, surveyId: savedSurvey.surveyId, version: savedSurvey.version, sectionId, roofModelId: selectedModelId || null, newRoofModelId, operationId, expectedRevisionNumber: source?.roofModelRevisionNumber ?? 0, name: source?.name ?? sectionName });
      if (!result.ok) { setError(result.error); return; }
      setOperationId(generateSecureUuid());
      setSources((current) => [...current.filter((item) => item.roofModelId !== result.source.roofModelId), result.source]);
      setSelectedModelId(result.source.roofModelId); setSelectedSegmentIds([]);
      setReceipt({ calculationId: result.source.calculationId, revisionId: result.source.calculationRevisionId, revisionNumber: result.source.roofModelRevisionNumber });
      setReceiptVersion(savedSurvey.version);
      setLinked(result.linked);
      if (result.linkError) setError(result.linkError);
      if (result.linked) onLinked();
    } catch { setError("A mentés válasza bizonytalan. Ellenőrizd a mentett tetőrevíziót újrapróbálás előtt."); }
    finally { setBusy(false); }
  }
  async function retryLink() {
    if (!receipt || busy) return;
    setBusy(true); setError("");
    try {
      const result = await linkSurveyCalculation({ organizationId, surveyId, version: receiptVersion ?? version, sectionId, saved: receipt });
      if (result.ok) { setLinked(true); onLinked(); }
      else setError(result.error ?? "A kapcsolat nem jött létre.");
    } finally { setBusy(false); }
  }
  return <section className="detail-surface survey-roof-workspace" aria-label="Mentett tetőgeometria és munkaszél-kiválasztás">
    <div className="section-heading"><div><p className="section-eyebrow">Tetőgeometria · {projectId}</p><h2>Mentett nyeregtető és kapcsolódó munka</h2></div></div>
    <p>Felmért adat: a felmérés aktuális tetőmérései. A számítás csak teljes, ellenőrzött mm-adatokból menthető; a hiányzó túlnyúlás nem lesz automatikusan nulla.</p>
    <label className="field-survey-field"><span>Tetőmodell célja</span><select value={selectedModelId} onChange={(event) => { setSelectedModelId(event.target.value); setSelectedSegmentIds([]); }}><option value="">Új tetőmodell</option>{sources.map((item) => <option key={item.roofModelId} value={item.roofModelId}>{item.name} · mentett V{item.roofModelRevisionNumber}</option>)}</select></label>
    <button type="button" className="primary-button" disabled={busy} onClick={() => void save()}>{busy ? "Mentés…" : source ? "Új tetőgeometriai revízió mentése" : "Geometria ellenőrzése és mentése"}</button>
    {receipt && !linked && <button type="button" className="secondary-button" disabled={busy} onClick={() => void retryLink()}>Felméréskapcsolat újrapróbálása · V{receipt.revisionNumber}</button>}
    {error && <p role="alert" className="form-message is-error">{error}</p>}
    {source && <><p role="status">Tetőgeometriából számított · mentett tető V{source.roofModelRevisionNumber} · forrás: {source.roofModelRevisionId}. {stale ? "A felmérés tetőmérése vagy a mentett tetőrevízió eltér; a korábbi számítás változatlan." : sourceLink || locallyLinked ? `Aktuális ellenőrzött geometria · forrás felmérés V${locallyLinked ? receiptVersion : sourceLink?.surveyVersion}.` : "Ez a modell még nincs az aktuális felmérési munkaszakaszhoz kapcsolva."}</p>
      <TechnicalDrawing output={source.output} isSaved selectedSegmentIds={selectedSegmentIds} onSegmentToggle={(id) => setSelectedSegmentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />
      <div className="roof-segment-actions"><p>A kijelölt élekből csak a választott munkát indítjuk. A szálhossz, rendszer és toldás külön adat.</p>
        {eaves.length > 0 && <button type="button" className="primary-button" disabled={busy || !readyForWork} onClick={() => void onWork("gutter", source, eaves)}>Felhasználás ereszcsatornához · {(selectedGableLength(segments, eaves, "eave") / 1000).toLocaleString("hu-HU")} m</button>}
        {flashings.length > 0 && <button type="button" className="secondary-button" disabled={busy || !readyForWork} onClick={() => void onWork("flashing", source, flashings)}>Felhasználás szegélyhez · {flashings.length} él</button>}
        <Link className="secondary-button" href={`/projektek/${projectId}/tetomodellek/${source.roofModelId}?organization=${organizationId}`}>Tetőfedés számítása ebből a mentett geometriából</Link>
      </div></>}
  </section>;
}

function MultiSurveyRoofWorkspace({ organizationId, surveyId, version, sectionId, sectionName, projectId, roofType, links, ensureSaved, onWork, onLinked }: Props & { roofType: Exclude<RoofGeometryType, "gable"> }) {
  const [sources, setSources] = useState<VerifiedSurveyMultiRoof[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [newModelId] = useState(() => generateSecureUuid());
  const [operationId, setOperationId] = useState(() => generateSecureUuid());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
    }).catch(() => { if (live) setError("A mentett tetőgeometria nem tölthető be."); });
    return () => { live = false; };
  }, [organizationId, surveyId, version, sectionId, roofType, links]);
  const source = sources.find((item) => item.roofModelId === selectedModelId) ?? null;
  const selectedEdges = source?.output.edges.filter((edge) => selectedIds.includes(edge.id)) ?? [];
  const eaves = selectedEdges.filter((edge) => edge.kind === "eave");
  const flashingEdges = selectedEdges.filter((edge) => edge.kind !== "upper");
  const sourceLink = links.find((link) => link.sectionId === sectionId && link.calculatorType === `roof.geometry.${roofType}` && link.calculationId === source?.calculationId && link.revisionId === source?.calculationRevisionId);
  const ready = Boolean(source?.matchesCurrentSurvey && (sourceLink || (linked && receipt?.revisionId === source.calculationRevisionId)));
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
      setSources((current) => [...current.filter((item) => item.roofModelId !== result.source.roofModelId), result.source]);
      setSelectedModelId(result.source.roofModelId); setSelectedIds([]);
      setReceipt({ calculationId: result.source.calculationId, revisionId: result.source.calculationRevisionId, revisionNumber: result.source.roofModelRevisionNumber });
      setLinked(result.linked);
      if (result.linked) { setOperationId(generateSecureUuid()); onLinked(); }
      if (result.linkError) setError(result.linkError);
    } catch { setError("A mentés válasza bizonytalan. Ugyanazzal a művelettel újrapróbálható."); }
    finally { setBusy(false); }
  }
  return <section className="detail-surface survey-roof-workspace" aria-label="Mentett tetőgeometria és munkaszél-kiválasztás">
    <div className="section-heading"><div><p className="section-eyebrow">Tetőgeometria · {projectId}</p><h2>Mentett tető és kapcsolódó munka</h2></div></div>
    <p>Az aktuális felmérésben kitöltött méretekből készül a geometria. Hiányzó méretet és túlnyúlást a rendszer nem pótol.</p>
    <label className="field-survey-field"><span>Tetőmodell célja</span><select value={selectedModelId} onChange={(event) => { setSelectedModelId(event.target.value); setSelectedIds([]); }}><option value="">Új tetőmodell</option>{sources.map((item) => <option key={item.roofModelId} value={item.roofModelId}>{item.name} · V{item.roofModelRevisionNumber}</option>)}</select></label>
    <button type="button" className="primary-button" disabled={busy} onClick={() => void save()}>{busy ? "Mentés…" : source ? "Új tetőgeometriai revízió mentése" : "Geometria ellenőrzése és mentése"}</button>
    {!linked && <button type="button" className="secondary-button" disabled={busy} onClick={() => void save()}>Felméréskapcsolat újrapróbálása</button>}
    {error && <p role="alert" className="form-message is-error">{error}</p>}
    {source && <><p role="status">Mentett tető V{source.roofModelRevisionNumber} · forrásrevízió: {source.roofModelRevisionId}. {source.matchesCurrentSurvey ? ready ? "Aktuális felméréshez kapcsolt geometria." : "A felméréskapcsolat még nem teljes." : "A felmérés mérései változtak; a korábbi geometria változatlan."}</p>
      <TechnicalDrawing geometry={source.output} isSaved selectedSegmentIds={selectedIds} onSegmentToggle={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />
      <div className="roof-segment-actions"><p>A kijelölt élek pontos forrásrevízióval kerülnek át. Szálhossz, rendszer és profil külön adat.</p>
        {eaves.length > 0 && <button type="button" className="primary-button" disabled={busy || !ready} onClick={() => void onWork("gutter", source, eaves.map((edge) => edge.id))}>Felhasználás ereszcsatornához · {(eaves.reduce((sum, edge) => sum + edge.lengthMm, 0) / 1000).toLocaleString("hu-HU")} m</button>}
        {flashingEdges.length > 0 && <button type="button" className="secondary-button" disabled={busy || !ready} onClick={() => void onWork("flashing", source, flashingEdges.map((edge) => edge.id))}>Felhasználás szegélyhez · {flashingEdges.length} él</button>}
        <Link className="secondary-button" href={`/projektek/${projectId}/tetomodellek/${source.roofModelId}?organization=${organizationId}`}>Tetőmodell megnyitása</Link>
      </div></>}
  </section>;
}

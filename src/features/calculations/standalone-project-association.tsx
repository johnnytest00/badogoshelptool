"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { associateStandaloneCalculationAction, getStandaloneAssociationTarget, searchStandaloneAssociationProjects, type StandaloneAssociationProject, type StandaloneAssociationTarget } from "./standalone-actions";
import { generateSecureUuid } from "@/lib/secure-uuid";
import type { StandaloneCalculatorType } from "./standalone-persistence";
import { gutterMaterialCalculator } from "@/domain/calculations/gutter-material";
import { flashingMaterialCalculator } from "@/domain/calculations/flashing-material";
import { sheetMetalProfileCalculator } from "@/domain/calculations/sheet-metal-profile";

const calculatorLabels: Record<StandaloneCalculatorType, string> = {
  [gutterMaterialCalculator.id]: "Ereszcsatorna",
  [flashingMaterialCalculator.id]: "Bádogos szegélyek",
  [sheetMetalProfileCalculator.id]: "Lemezprofilok és hajtások",
};
const projectTypeLabels: Record<string, string> = { residential: "Lakóépület", commercial: "Kereskedelmi", industrial: "Ipari", other: "Egyéb" };
const statusLabels: Record<string, string> = { planning: "Tervezés", active: "Aktív", on_hold: "Szünetel", completed: "Lezárt" };

export function standaloneCalculatorRoute(type: StandaloneCalculatorType): string {
  return type === gutterMaterialCalculator.id ? "ereszcsatorna" : type === flashingMaterialCalculator.id ? "szegelyek" : "lemezprofilok";
}

export function standaloneProjectRevisionHref(projectId: string, organizationId: string, type: StandaloneCalculatorType, calculationId: string, revisionId: string): string {
  return `/projektek/${projectId}/${standaloneCalculatorRoute(type)}?organization=${organizationId}&calculation=${calculationId}&revision=${revisionId}`;
}

export type AssociationIdentity = Readonly<{ calculatorType: StandaloneCalculatorType; operationId: string; projectCalculationId?: string }>;
export function getOrCreateAssociationIdentity(current: AssociationIdentity | null, calculatorType: StandaloneCalculatorType, createUuid: () => string = generateSecureUuid): AssociationIdentity {
  if (current?.calculatorType === calculatorType) return current;
  return calculatorType === sheetMetalProfileCalculator.id
    ? { calculatorType, operationId: createUuid(), projectCalculationId: createUuid() }
    : { calculatorType, operationId: createUuid() };
}

type Props = Readonly<{
  organizationId: string;
  sourceCalculationId: string;
  sourceRevisionId: string;
  sourceRevisionNumber: number;
  sourceName: string;
  calculatorType: StandaloneCalculatorType;
  hasUnsavedChanges?: boolean;
}>;

export function StandaloneAssociationConfirmation({ sourceName, sourceRevisionNumber, calculatorType, target, hasUnsavedChanges = false, savedRevisionConfirmed = false, pending = false, retry = false, requiresReload = false, onBack, onConfirm, onSavedRevisionConfirmedChange, onReload }: Readonly<{
  sourceName: string; sourceRevisionNumber: number; calculatorType: StandaloneCalculatorType; target: StandaloneAssociationTarget;
  hasUnsavedChanges?: boolean; savedRevisionConfirmed?: boolean; pending?: boolean; retry?: boolean;
  requiresReload?: boolean; onBack?: () => void; onConfirm?: () => void; onSavedRevisionConfirmedChange?: (confirmed: boolean) => void; onReload?: () => void;
}>) {
  return <>
    <button type="button" className="back-link" onClick={onBack}>← Projektválasztás</button>
    <section className="association-confirmation"><h3>Ellenőrizd a másolatot</h3><dl>
      <div><dt>Számítás</dt><dd>{sourceName}</dd></div><div><dt>Kalkulátor</dt><dd>{calculatorLabels[calculatorType]}</dd></div>
      <div><dt>Forrás</dt><dd>Jelenlegi mentett revízió V{sourceRevisionNumber}</dd></div><div><dt>Célprojekt</dt><dd>{target.project.name}{target.project.location ? ` · ${target.project.location}` : ""}</dd></div>
    </dl><p>A projektbe készül egy másolat; az önálló számítás változatlanul megmarad. A projektpéldány a támogatott projektmunkafolyamatokban használható. Ez a művelet nem igazolja a geometriát, nem hagy jóvá mennyiséget, és nem készít anyagkimutatást vagy árajánlatot.</p>
    {hasUnsavedChanges && <label className="association-unsaved"><input type="checkbox" checked={savedRevisionConfirmed} onChange={(event) => onSavedRevisionConfirmedChange?.(event.target.checked)} /> A nem mentett szerkesztéseket nem veszi át; kifejezetten a mentett V{sourceRevisionNumber} változatot használom.</label>}
    {requiresReload ? <button type="button" className="primary-button" onClick={onReload}>Frissítés és újraellenőrzés</button> : <button type="button" className="primary-button" disabled={pending || (hasUnsavedChanges && !savedRevisionConfirmed)} onClick={onConfirm}>{pending ? "Másolat készül…" : retry ? "Újrapróbálás ugyanazzal a művelettel" : "Másolat létrehozása a projektben"}</button>}</section>
  </>;
}

export function StandaloneProjectAssociation(props: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchSequence = useRef(0);
  const submitting = useRef(false);
  const operationIdentity = useRef<AssociationIdentity | null>(null);
  const [projects, setProjects] = useState<StandaloneAssociationProject[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StandaloneAssociationTarget | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ambiguous, setAmbiguous] = useState(false);
  const [requiresReload, setRequiresReload] = useState(false);
  const [savedRevisionConfirmed, setSavedRevisionConfirmed] = useState(false);
  const [result, setResult] = useState<{ calculationId: string; revisionId: string; revisionNumber: number; reused: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  async function loadProjects(query: string) {
    const sequence = ++searchSequence.current;
    setLoading(true); setError("");
    try {
      const next = await searchStandaloneAssociationProjects(props.organizationId, query);
      if (sequence === searchSequence.current) { setProjects(next); setActiveIndex(0); }
    } catch (cause) {
      if (sequence === searchSequence.current) { setProjects([]); setError(cause instanceof Error ? cause.message : "A projektek betöltése nem sikerült."); }
    } finally { if (sequence === searchSequence.current) setLoading(false); }
  }

  function open() {
    setSelected(null); setResult(null); setSearch(""); setError(""); setAmbiguous(false); setRequiresReload(false); setSavedRevisionConfirmed(false); operationIdentity.current = null;
    dialogRef.current?.showModal(); void loadProjects("");
  }
  function close() { if (pending) return; dialogRef.current?.close(); operationIdentity.current = null; }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => { if (pending) event.preventDefault(); else operationIdentity.current = null; };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [pending]);

  async function chooseProject(project: StandaloneAssociationProject) {
    setLoading(true); setError("");
    try {
      const target = await getStandaloneAssociationTarget(props.organizationId, project.id, props.calculatorType);
      if (!target) { setError("A projekt már nem érhető el ebben a műhelyben."); return; }
      setSelected(target); setSavedRevisionConfirmed(false); operationIdentity.current = null;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "A projekt adatai nem tölthetők be."); }
    finally { setLoading(false); }
  }

  function createCopy() {
    if (!selected || pending || submitting.current || requiresReload || (props.hasUnsavedChanges && !savedRevisionConfirmed)) return;
    operationIdentity.current = getOrCreateAssociationIdentity(operationIdentity.current, props.calculatorType);
    const data = new FormData();
    data.set("organizationId", props.organizationId); data.set("projectId", selected.project.id);
    data.set("sourceCalculationId", props.sourceCalculationId); data.set("sourceRevisionId", props.sourceRevisionId);
    data.set("operationId", operationIdentity.current.operationId); data.set("name", props.sourceName);
    data.set("expectedProjectRevisionNumber", String(selected.expectedProjectRevisionNumber));
    if (operationIdentity.current.projectCalculationId) data.set("projectCalculationId", operationIdentity.current.projectCalculationId);
    setError(""); setAmbiguous(false); setResult(null); submitting.current = true;
    startTransition(async () => {
      try {
        const response = await associateStandaloneCalculationAction(data);
        if (!response.ok) {
          if (response.requiresReload) operationIdentity.current = null;
          else if (response.retrySameOperation) setAmbiguous(true);
          else operationIdentity.current = null;
          setError(response.error); setRequiresReload(!!response.requiresReload); return;
        }
        operationIdentity.current = null;
        setResult({ calculationId: response.calculationId, revisionId: response.revisionId, revisionNumber: response.revisionNumber, reused: response.reused });
      } catch {
        setAmbiguous(true); setError("A kapcsolat megszakadt, ezért az eredmény nem állapítható meg. Újrapróbáláskor ugyanazt a műveletazonosítót használjuk.");
      } finally { submitting.current = false; }
    });
  }

  const destinationHref = result && selected ? standaloneProjectRevisionHref(selected.project.id, props.organizationId, props.calculatorType, result.calculationId, result.revisionId) : "";
  return <>
    <button className="secondary-button" type="button" onClick={open}>Felhasználás projektben</button>
    <dialog ref={dialogRef} className="association-dialog" aria-labelledby="association-title">
      <div className="association-dialog-content">
        <div className="section-heading"><div><p className="section-eyebrow">Projektpéldány</p><h2 id="association-title">Felhasználás projektben</h2></div><button type="button" className="secondary-button" onClick={close} disabled={pending}>Bezárás</button></div>
        {result ? <section role="status" className="association-success"><h3>Projektpéldány létrejött</h3><p>{selected?.project.name} · V{result.revisionNumber}{result.reused ? " · a korábbi művelet eredménye" : ""}</p><p>Az eredeti mentett számítás változatlanul elérhető.</p><a className="primary-button" href={destinationHref}>Megnyitás a projektben</a></section> : selected ? <><StandaloneAssociationConfirmation sourceName={props.sourceName} sourceRevisionNumber={props.sourceRevisionNumber} calculatorType={props.calculatorType} target={selected} hasUnsavedChanges={props.hasUnsavedChanges} savedRevisionConfirmed={savedRevisionConfirmed} pending={pending} retry={ambiguous} requiresReload={requiresReload} onReload={() => window.location.reload()} onBack={() => { setSelected(null); operationIdentity.current = null; setError(""); setRequiresReload(false); }} onConfirm={createCopy} onSavedRevisionConfirmedChange={setSavedRevisionConfirmed} />{error && <p role="alert" className="form-message is-error">{error}</p>}</> : <>
          <p>Válassz projektet a jelenlegi műhelyből.</p><label className="association-search"><span>Projekt keresése név szerint</span><input autoFocus type="search" value={search} onChange={(event) => { setSearch(event.target.value); void loadProjects(event.target.value); }} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, projects.length - 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); } if (event.key === "Enter" && projects[activeIndex]) { event.preventDefault(); void chooseProject(projects[activeIndex]); } }} /></label>
          {loading ? <p role="status">Projektek betöltése…</p> : error ? <p role="alert" className="form-message is-error">{error}</p> : projects.length ? <ul className="association-project-list" aria-label="Választható projektek">{projects.map((project, index) => <li key={project.id}><button type="button" className={index === activeIndex ? "association-project is-active" : "association-project"} onMouseEnter={() => setActiveIndex(index)} onClick={() => void chooseProject(project)}><strong>{project.name}</strong><span>{[project.location, projectTypeLabels[project.projectType] ?? project.projectType, statusLabels[project.status] ?? project.status, `v${project.version}`].filter(Boolean).join(" · ")}</span></button></li>)}</ul> : <section className="empty-state"><h3>{search ? "Nincs ilyen nevű projekt" : "Nincs választható projekt"}</h3><p>{search ? "Próbálj másik keresést." : "Ebben a műhelyben jelenleg nincs aktív projekt."}</p></section>}
        </>}
      </div>
    </dialog>
  </>;
}

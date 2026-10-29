"use client";

import { useEffect, useState, useTransition } from "react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useRouter } from "next/navigation";
import { createExecutionJournalEntryAction, createExecutionPhotoAction, createExecutionPlanAction, saveExecutionTaskAction, setExecutionPhotoCategoryAction } from "./execution-actions";
import type { AcceptedQuotationOption, ExecutionPhotoRecord, ExecutionPlanRecord, ExecutionTimelineItem } from "./execution-data";
import type { ExecutionPhotoCategory } from "@/domain/execution/contracts";
import { buildExecutionOverview } from "./execution-overview";
import { ExecutionReportPreparation } from "./execution-report-preparation";
import { ExecutionSubsection } from "./execution-section";
import { createIdempotencyKey } from "@/lib/secure-uuid";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { GlassSectionHeader } from "@/components/ui/glass-section-header";
import { optimizeUploadPhoto } from "@/lib/optimize-upload-photo";
import { constructionCalculatorLabels } from "@/features/calculators/construction-computation";

const statusLabels = { todo: "Teendő", in_progress: "Folyamatban", done: "Kész" } as const;
const quotationStatusLabels: Record<string, string> = { draft: "Piszkozat", finalized: "Véglegesített", sent: "Elküldött", accepted: "Elfogadott", rejected: "Elutasított" };
const priorityLabels = { low: "Alacsony", normal: "Normál", high: "Magas" } as const;
const categoryLabels: Record<ExecutionPhotoCategory, string> = { before: "Munka előtt", during: "Munkavégzés közben", after: "Munka után", uncategorized: "Nincs kategorizálva" };
const journalLabels = { general: "Általános bejegyzés", work_done: "Elvégzett munka", problem: "Probléma / akadály", next_step: "Következő lépés" } as const;
const localDate = () => { const date = new Date(); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10); };
type SavedCalculationOption = Readonly<{ calculationId: string; revisionId: string; calculatorId: keyof typeof constructionCalculatorLabels; name: string; revisionNumber: number; savedAt: string }>;

export function ExecutionPlanning({ organizationId, projectId, projectName, clientName, location, plans, acceptedQuotations, savedCalculations = [], timelineByPlan, preselectedQuotationId, initialPlanId, initialCreate = false, showHeading = true, showDescription = true, showPlanTabs = true }: Readonly<{ organizationId: string; projectId: string | null; projectName: string; clientName: string | null; location: string | null; plans: ExecutionPlanRecord[]; acceptedQuotations: AcceptedQuotationOption[]; savedCalculations?: SavedCalculationOption[]; timelineByPlan: ReadonlyMap<string, ExecutionTimelineItem[]>; preselectedQuotationId?: string; initialPlanId?: string; initialCreate?: boolean; showHeading?: boolean; showDescription?: boolean; showPlanTabs?: boolean }>) {
  const router = useRouter(); const [pending, start] = useTransition(); const [message, setMessage] = useState(""); const [selected, setSelected] = useState(initialPlanId ?? plans[0]?.id ?? ""); const [showCreate, setShowCreate] = useState(initialCreate || Boolean(preselectedQuotationId) || plans.length === 0); const [journalSaveToken, setJournalSaveToken] = useState(0); const selectedPlan = plans.find((plan) => plan.id === selected) ?? plans[0];
  const [planRequestKey] = useState(() => createIdempotencyKey());
  const [calculationFilter, setCalculationFilter] = useState("");
  const [selectedCalculationRevisions, setSelectedCalculationRevisions] = useState<string[]>([]);
  const [taskRequestKey] = useState(() => createIdempotencyKey());
  const [journalRequestKey] = useState(() => createIdempotencyKey());
  const submitPlan = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("organizationId", organizationId); if (projectId) form.set("projectId", projectId); else form.delete("projectId"); form.set("requestKey", planRequestKey.current()); start(async () => { const result = await createExecutionPlanAction(form); setMessage(result.ok ? "A munkanapló létrejött." : result.error ?? "A mentés nem sikerült."); if (result.ok) { planRequestKey.renew(); if (!projectId && result.planId) { router.push(`/kivitelezes/${result.planId}?organization=${organizationId}`); return; } setShowCreate(false); router.refresh(); } }); };
  const submitTask = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!selectedPlan) return; const form = new FormData(event.currentTarget); form.set("organizationId", organizationId); if (projectId) form.set("projectId", projectId); form.set("planId", selectedPlan.id); form.set("requestKey", taskRequestKey.current()); start(async () => { const result = await saveExecutionTaskAction(form); setMessage(result.ok ? "A feladat mentve." : result.error ?? "A mentés nem sikerült."); if (result.ok) { taskRequestKey.renew(); router.refresh(); } }); };
  const submitJournal = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!selectedPlan) return; const formElement = event.currentTarget; const form = new FormData(formElement); form.set("organizationId", organizationId); if (projectId) form.set("projectId", projectId); form.set("planId", selectedPlan.id); form.set("requestKey", journalRequestKey.current()); start(async () => { const result = await createExecutionJournalEntryAction(form); setMessage(result.ok ? "A napi bejegyzés mentve." : result.error ?? "A mentés nem sikerült."); if (result.ok) { journalRequestKey.renew(); formElement.reset(); setJournalSaveToken((value) => value + 1); router.refresh(); } }); };
  const submitPhoto = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selectedPlan) return;
    const formElement = event.currentTarget;
    const selectedFiles = Array.from(new FormData(formElement).getAll("photos")).filter((value): value is File => value instanceof File && value.size > 0);
    start(async () => {
      let uploaded = 0, originalBytes = 0, optimizedBytes = 0, failures = 0, uploadStateUnknown = false;
      for (const [index, source] of selectedFiles.entries()) {
        setMessage(`Képek optimalizálása és feltöltése: ${index + 1}/${selectedFiles.length}`);
        let optimized;
        try { optimized = await optimizeUploadPhoto(source); }
        catch { failures += 1; continue; }
        originalBytes += optimized.originalBytes; optimizedBytes += optimized.optimizedBytes;
        const form = new FormData(formElement);
        form.delete("photos"); form.set("photos", optimized.file); form.set("organizationId", organizationId);
        if (projectId) form.set("projectId", projectId);
        form.set("planId", selectedPlan.id);
        try {
          const result = await createExecutionPhotoAction(form);
          if (!result.ok) { failures += 1; continue; }
          uploaded += result.uploaded;
        } catch { failures += 1; uploadStateUnknown = true; break; }
      }
      if (uploaded || uploadStateUnknown) { formElement.reset(); router.refresh(); }
      const saved = originalBytes ? Math.round((1 - optimizedBytes / originalBytes) * 100) : 0;
      setMessage(`${uploaded} fénykép feltöltve${saved ? ` · ${saved}% méretcsökkentés` : ""}${uploadStateUnknown ? " · a hálózati válasz megszakadt; ellenőrizd a frissített galériát" : failures ? ` · ${failures} nem sikerült, ezeket válaszd ki újra` : "."}`);
    });
  };
  const updatePhotoCategory = (photoId: string, category: ExecutionPhotoCategory) => { const form = new FormData(); form.set("organizationId", organizationId); if (projectId) form.set("projectId", projectId); form.set("planId", selectedPlan?.id ?? ""); form.set("photoId", photoId); form.set("category", category); start(async () => { const result = await setExecutionPhotoCategoryAction(form); setMessage(result.ok ? "A fényképkategória mentve." : result.error ?? "A kategória mentése nem sikerült."); if (result.ok) router.refresh(); }); };
  const filteredCalculations = savedCalculations.filter((item) => `${item.name} ${constructionCalculatorLabels[item.calculatorId]}`.toLocaleLowerCase("hu").includes(calculationFilter.trim().toLocaleLowerCase("hu")));
  return <section className="detail-surface execution-planning">{showHeading && <div className="roof-list-heading"><h2>Munkanaplók</h2><button className="primary-button" type="button" onClick={() => setShowCreate((value) => !value)}>+ Új munkanapló</button></div>}{showDescription && <p className="detail-description">{projectId ? "A projektkapcsolat és az elfogadott ajánlat forrásrevíziója változatlan." : "A munkanapló önálló munkatér; felmérés és ügyfél nélkül is kezelhető."}</p>}<ExecutionOverview organizationId={organizationId} projectId={projectId} projectName={projectName} clientName={clientName} location={location} plan={selectedPlan ?? null} timeline={selectedPlan ? timelineByPlan.get(selectedPlan.id) ?? [] : []} />{showCreate && <form className="stack-form execution-create-form" onSubmit={submitPlan} onChange={() => planRequestKey.renew()}><label>Munkanapló neve<input name="title" required maxLength={200} placeholder="Például: Tetőfelújítás" /></label><label>Leírás<textarea name="description" rows={3} maxLength={2000} /></label><label>Elfogadott ajánlat forrásként<select name="sourceQuotationId" defaultValue={preselectedQuotationId ?? ""} onChange={(event) => { const quote = acceptedQuotations.find((item) => item.id === event.currentTarget.value); const revision = event.currentTarget.form?.elements.namedItem("sourceRevisionId"); if (revision instanceof HTMLInputElement) revision.value = quote?.finalizedRevisionId ?? ""; }}><option value="">Nincs ajánlati forrás</option>{acceptedQuotations.map((quote) => <option key={quote.id} value={quote.id}>{quote.name}</option>)}</select></label><input type="hidden" name="sourceRevisionId" defaultValue={acceptedQuotations.find((item) => item.id === preselectedQuotationId)?.finalizedRevisionId ?? ""} /><fieldset className="execution-calculation-picker"><legend>Mentett kalkulációk (opcionális)</legend>{savedCalculations.length === 0 ? <div className="execution-calculation-empty"><p>Még nincs mentett, munkanaplóhoz kapcsolható kalkulációd.</p><div><Link className="secondary-button" href={`/kalkulatorok?organization=${organizationId}`}>Kalkulátorok megnyitása</Link><Link className="text-action" href={`/kalkulatorok/mentett?organization=${organizationId}`}>Mentett kalkulációk</Link></div></div> : <><label htmlFor="execution-calculation-search">Mentett kalkulációk keresése<input id="execution-calculation-search" type="search" value={calculationFilter} onChange={(event) => setCalculationFilter(event.target.value)} placeholder="Név vagy kalkulátortípus" /></label>{selectedCalculationRevisions.length > 0 && <ul className="execution-calculation-selected" aria-label="Kiválasztott kalkulációk">{savedCalculations.filter((item) => selectedCalculationRevisions.includes(item.revisionId)).map((item) => <li key={item.revisionId}><span>{item.name} · {constructionCalculatorLabels[item.calculatorId]} · V{item.revisionNumber}</span><button type="button" className="text-action" onClick={() => setSelectedCalculationRevisions((selectedIds) => selectedIds.filter((id) => id !== item.revisionId))}>Eltávolítás</button></li>)}</ul>}<div className="execution-calculation-options">{filteredCalculations.length ? filteredCalculations.map((item) => <label key={item.revisionId}><input type="checkbox" name="calculationRevisionIds" value={item.revisionId} checked={selectedCalculationRevisions.includes(item.revisionId)} onChange={() => setSelectedCalculationRevisions((selectedIds) => selectedIds.includes(item.revisionId) ? selectedIds.filter((id) => id !== item.revisionId) : [...selectedIds, item.revisionId])} /><span><strong>{item.name}</strong><small>{constructionCalculatorLabels[item.calculatorId]} · V{item.revisionNumber} · mentve {new Date(item.savedAt).toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" })}</small></span></label>) : <p className="missing-data">Nincs találat a keresésre.</p>}</div></>}</fieldset><button className="primary-button" disabled={pending}>{pending ? "Mentés…" : "Munkanapló létrehozása"}</button></form>}{plans.length > 0 && <>{showPlanTabs && <div className="execution-plan-tabs" role="tablist" aria-label="Munkanaplók">{plans.map((plan) => <button key={plan.id} type="button" role="tab" aria-selected={selectedPlan?.id === plan.id} className={selectedPlan?.id === plan.id ? "is-active" : ""} onClick={() => { if (selected !== plan.id) { taskRequestKey.renew(); journalRequestKey.renew(); setSelected(plan.id); } }}>{plan.title}</button>)}</div>}{selectedPlan && <PlanPanel organizationId={organizationId} projectId={projectId} plan={selectedPlan} timeline={timelineByPlan.get(selectedPlan.id) ?? []} onSubmit={submitTask} onJournalSubmit={submitJournal} onTaskChange={() => taskRequestKey.renew()} onJournalChange={() => journalRequestKey.renew()} onPhotoSubmit={submitPhoto} onCategoryChange={updatePhotoCategory} pending={pending} journalSaveToken={journalSaveToken} />}</>}{message && <p className="form-message" role="status">{message}</p>}</section>;
}

function ExecutionOverview({ organizationId, projectId, projectName, clientName, location, plan, timeline }: Readonly<{ organizationId: string; projectId: string | null; projectName: string; clientName: string | null; location: string | null; plan: ExecutionPlanRecord | null; timeline: ExecutionTimelineItem[] }>) {
  if (!plan) return null;

  const overview = buildExecutionOverview(plan, timeline, localDate());
  const attentionItems = overview.attentionItems.filter((item) => item.kind !== "open_task");
  const hasProjectContext = Boolean(projectId);
  const hasSourceQuotation = Boolean(plan.sourceQuotationName);
  const hasUsefulOverview = overview.totalTasks > 0 || attentionItems.length > 0 || hasProjectContext || hasSourceQuotation;
  if (!hasUsefulOverview) return null;

  const money = plan.sourceSubtotal === null ? "Nincs megadva" : `${Number(plan.sourceSubtotal).toLocaleString("hu-HU")} Ft`;
  return <section className="execution-overview" aria-label="Munkanapló áttekintése">
    {overview.totalTasks > 0 && <div className="execution-overview-stats" aria-label="Feladatok állása">
      <div><strong>{overview.totalTasks}</strong><span>Feladat</span></div>
      {overview.todoTasks > 0 && <div><strong>{overview.todoTasks}</strong><span>Teendő</span></div>}
      {overview.inProgressTasks > 0 && <div><strong>{overview.inProgressTasks}</strong><span>Folyamatban</span></div>}
      {overview.completedTasks > 0 && <div><strong>{overview.completedTasks}</strong><span>Kész</span></div>}
      {overview.progress !== null && <div><strong>{overview.progress}%</strong><span>Elkészült</span></div>}
    </div>}
    {attentionItems.length > 0 && <GlassDisclosure summary={`Figyelmet igényel · ${attentionItems.length}`}>
      <ul className="execution-overview-list">{attentionItems.map((item) => <li key={`${item.kind}-${item.taskId ?? item.journalId}`}>
        <Link href={item.taskId ? "#execution-tasks" : item.journalId ? `#journal-${item.journalId}` : "#execution-journal"}>{item.title}</Link>
        <small>{item.detail}{item.kind === "blocker" ? " · bejegyzett akadály" : ""}</small>
      </li>)}</ul>
    </GlassDisclosure>}
    {(hasProjectContext || hasSourceQuotation) && <GlassDisclosure summary="Kapcsolatok és források">
      <dl className="execution-overview-context">
        {projectId && <><div><dt>Projekt</dt><dd>{projectName}</dd></div><div><dt>Ügyfél</dt><dd>{clientName ?? "Nincs megadva"}</dd></div><div><dt>Munkavégzés helye</dt><dd>{location ?? "Nincs megadva"}</dd></div></>}
        {plan.sourceQuotationName && <div className="execution-overview-source"><dt>Forrásajánlat</dt><dd><strong>{plan.sourceQuotationName}</strong><span>Státusz: {plan.sourceQuotationStatus === "accepted" ? "Elfogadva" : quotationStatusLabels[plan.sourceQuotationStatus ?? ""] ?? "Nem elérhető"}</span><span>Mentett változat: {plan.sourceRevisionNumber == null ? "Nincs megadva" : `V${plan.sourceRevisionNumber}`}</span><span>Összegzés: {money}</span></dd></div>}
      </dl>
      {projectId && hasSourceQuotation && <Link className="text-action" href={`/projektek/${projectId}/ajanlatok?organization=${organizationId}`}>Ajánlatok megnyitása</Link>}
      {hasSourceQuotation && <p className="execution-overview-legal-note">Az elfogadási státusz a rendszerben rögzített állapot; ez nem önálló jogi szerződésigazolás.</p>}
    </GlassDisclosure>}
  </section>;
}

function PhotoMetadata({ photo }: Readonly<{ photo: ExecutionPhotoRecord }>) { return <small className="execution-photo-meta">Feltöltve: {new Date(photo.uploadedAt).toLocaleString("hu-HU")} · {photo.uploaderName || "Ismeretlen feltöltő"}{photo.taskTitle && <> · Feladat: {photo.taskTitle}</>}{photo.journalDate && <> · Bejegyzés: {new Date(`${photo.journalDate}T00:00:00`).toLocaleDateString("hu-HU")}</>}</small>; }

function PlanPanel({ organizationId, projectId, plan, timeline, onSubmit, onJournalSubmit, onTaskChange, onJournalChange, onPhotoSubmit, onCategoryChange, pending, journalSaveToken }: Readonly<{ organizationId: string; projectId: string | null; plan: ExecutionPlanRecord; timeline: ExecutionTimelineItem[]; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onTaskChange: () => void; onJournalChange: () => void; onJournalSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onPhotoSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onCategoryChange: (photoId: string, category: ExecutionPhotoCategory) => void; pending: boolean; journalSaveToken: number }>) {
  const [viewer, setViewer] = useState<ExecutionPhotoRecord | null>(null); const [comparison, setComparison] = useState(false); const [filterCategory, setFilterCategory] = useState<ExecutionPhotoCategory | "all">("all"); const [filterTask, setFilterTask] = useState("all"); const [fromDate, setFromDate] = useState(""); const [toDate, setToDate] = useState(""); const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest"); const [beforeId, setBeforeId] = useState<string | null>(null); const [afterId, setAfterId] = useState<string | null>(null); const [journalFormOpen, setJournalFormOpen] = useState(false);
  useEffect(() => { if (journalSaveToken > 0) setJournalFormOpen(false); }, [journalSaveToken]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setViewer(null); setComparison(false); } }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  const photos = [...plan.photos].filter((photo) => filterCategory === "all" || photo.category === filterCategory).filter((photo) => filterTask === "all" || photo.taskId === filterTask).filter((photo) => !fromDate || photo.uploadedAt.slice(0, 10) >= fromDate).filter((photo) => !toDate || photo.uploadedAt.slice(0, 10) <= toDate).sort((a, b) => sortOrder === "newest" ? b.uploadedAt.localeCompare(a.uploadedAt) || b.id.localeCompare(a.id) : a.uploadedAt.localeCompare(b.uploadedAt) || a.id.localeCompare(b.id));
  const beforePhoto = photos.find((photo) => photo.id === beforeId) ?? photos.find((photo) => photo.category === "before") ?? photos[0] ?? null; const afterPhoto = photos.find((photo) => photo.id === afterId) ?? photos.find((photo) => photo.category === "after") ?? photos.find((photo) => photo.id !== beforePhoto?.id) ?? null; const taskCounts = plan.tasks.map((task) => ({ task, count: plan.photos.filter((photo) => photo.taskId === task.id).length })); const openComparison = () => { if (beforePhoto && afterPhoto && beforePhoto.id !== afterPhoto.id) { setBeforeId(beforePhoto.id); setAfterId(afterPhoto.id); setComparison(true); } };
  return <div className="execution-plan-panel">
    {plan.description && <GlassDisclosure summary="Leírás"><p className="execution-plan-description">{plan.description}</p></GlassDisclosure>}

    <ExecutionSubsection title="Napi bejegyzések" defaultOpen>
      <section className="execution-journal" id="execution-journal">
        <div className="execution-journal-heading"><div>{timeline.length === 0 && <p className="execution-empty-hint">Rögzítsd röviden, mit végeztél el. A bejegyzéshez nem szükséges projekt vagy feladatkapcsolat.</p>}</div><button className="primary-button" type="button" onClick={() => setJournalFormOpen((open) => !open)} aria-expanded={journalFormOpen} aria-controls={`execution-journal-entry-form-${plan.id}`}>{journalFormOpen ? "Bezárás" : "+ Új bejegyzés"}</button></div>
        {journalFormOpen && <form id={`execution-journal-entry-form-${plan.id}`} className="stack-form execution-journal-entry-form" onSubmit={onJournalSubmit} onChange={onJournalChange}>
          <label>Mit végeztél?<textarea id="execution-journal-entry-content" name="content" rows={4} required maxLength={10000} placeholder="Röviden írd le az elvégzett munkát…" /></label>
          <label>Munkavégzés dátuma<input name="workDate" type="date" defaultValue={localDate()} required /></label>
          <GlassDisclosure summary="További adatok · opcionális">
            <div className="execution-journal-grid">
              <label>Bejegyzés típusa<select name="category" defaultValue="general">{Object.entries(journalLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Kapcsolódó feladat<select name="taskId" defaultValue=""><option value="">Nincs kapcsolódó feladat</option>{plan.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
              <label>Problémák / akadályok<textarea name="problems" rows={2} maxLength={5000} /></label>
              <label>Következő lépések<textarea name="nextSteps" rows={2} maxLength={5000} /></label>
            </div>
          </GlassDisclosure>
          <button className="primary-button" disabled={pending}>{pending ? "Mentés…" : "Bejegyzés mentése"}</button>
        </form>}
      </section>
      {timeline.length > 0 && <section className="execution-timeline" id="execution-history">
        <h3>Korábbi bejegyzések és feladatesemények</h3>
        <ol>{timeline.map((item) => <li id={`journal-${item.id}`} key={`${item.type}-${item.id}`}>
          <div className="execution-timeline-heading"><strong>{item.type === "journal" ? journalLabels[item.category ?? "general"] : "Feladat állapota megváltozott"}</strong><span>{new Date(`${item.date}T00:00:00`).toLocaleDateString("hu-HU")}</span></div>
          {item.type === "journal" ? <><p>{item.content}</p>{item.problems && <small>Probléma: {item.problems}</small>}{item.nextSteps && <small>Következő lépés: {item.nextSteps}</small>}</> : <p>{item.taskTitle ?? "Feladat"}: {statusLabels[item.fromStatus ?? "todo"]} → {statusLabels[item.toStatus ?? "todo"]}</p>}
          <small>{item.taskTitle && item.type === "journal" ? `Kapcsolódó feladat: ${item.taskTitle} · ` : ""}Rögzítve: {new Date(item.recordedAt).toLocaleString("hu-HU")} · {item.authorAvailable ? "Felhasználó" : "Ismeretlen szerző"}</small>
        </li>)}</ol>
      </section>}
    </ExecutionSubsection>

    <section className="execution-tasks" id="execution-tasks">
      <GlassSectionHeader title="Feladatok" actions={plan.tasks.length > 0 ? <span className="execution-task-count">{plan.tasks.length}</span> : null} />
      <form className="execution-task-add" onSubmit={onSubmit} onChange={onTaskChange}>
        <input type="hidden" name="taskId" value="" />
        <input type="hidden" name="version" value="0" />
        <input type="hidden" name="description" value="" />
        <input type="hidden" name="status" value="todo" />
        <input type="hidden" name="priority" value="normal" />
        <input type="hidden" name="sortOrder" value={plan.tasks.length} />
        <input type="hidden" name="dueDate" value="" />
        <input id="execution-new-task-title" name="title" aria-label="Új feladat neve" required maxLength={200} placeholder="Új feladat neve" />
        <button className="secondary-button" disabled={pending}>{pending ? "Mentés…" : "Feladat hozzáadása"}</button>
      </form>
      {plan.tasks.length > 0 && <div className="execution-task-list">{plan.tasks.map((task) => <form className="execution-task-row" key={task.id} onSubmit={onSubmit} onChange={onTaskChange}>
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="version" value={task.version} />
        <input name="title" defaultValue={task.title} aria-label="Feladat" />
        <select name="status" defaultValue={task.status} aria-label="Státusz">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select name="priority" defaultValue={task.priority} aria-label="Prioritás">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input name="dueDate" type="date" defaultValue={task.dueDate ?? ""} aria-label="Határidő" />
        <input type="hidden" name="description" value={task.description ?? ""} />
        <input type="hidden" name="sortOrder" value={task.sortOrder} />
        <button className="secondary-button" disabled={pending}>{pending ? "Mentés…" : "Mentés"}</button>
      </form>)}</div>}
    </section>

    <ExecutionSubsection title="Dokumentáció">
      {projectId && <ExecutionReportPreparation organizationId={organizationId} projectId={projectId} plan={plan} />}
      <section className="execution-photos">
        <h3>Kivitelezési fényképek</h3>
        <p className="missing-data">Privát tárhely, legfeljebb 10 MB kiválasztáskor; automatikus optimalizálás legfeljebb 3 MB-os feltöltésre. A kategória kézzel választható; a feltöltés időpontja nem minősít automatikusan.</p>
        <form className="stack-form" onSubmit={onPhotoSubmit}>
          <div className="execution-photo-form-grid">
            <label>Képek<input name="photos" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple required /></label>
            <label>Kapcsolódó feladat<select name="taskId" defaultValue=""><option value="">Nincs kapcsolódó feladat</option>{plan.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
            <label>Kapcsolódó bejegyzés<select name="journalEntryId" defaultValue=""><option value="">Nincs kapcsolódó bejegyzés</option>{timeline.filter((item) => item.type === "journal").map((item) => <option key={item.id} value={item.id}>{item.date} · {item.content?.slice(0, 70)}</option>)}</select></label>
          </div>
          <label>Képaláírás / megjegyzés<textarea name="caption" rows={2} maxLength={1000} placeholder="Opcionális rövid megjegyzés" /></label>
          <button className="primary-button" disabled={pending}>{pending ? "Optimalizálás és feltöltés…" : "Fényképek feltöltése"}</button>
        </form>
        <div className="execution-photo-filters">
          <label>Kategória<select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value as ExecutionPhotoCategory | "all")}><option value="all">Minden kategória</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Feladat<select value={filterTask} onChange={(event) => setFilterTask(event.target.value)}><option value="all">Minden feladat</option>{plan.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
          <label>Feltöltés ettől<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label>Feltöltés eddig<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          <label>Sorrend<select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}><option value="newest">Legújabb előre</option><option value="oldest">Legrégebbi előre</option></select></label>
        </div>
        <div className="execution-photo-toolbar"><strong>{photos.length} / {plan.photos.length} fénykép</strong><button className="secondary-button" type="button" onClick={openComparison} disabled={!beforePhoto || !afterPhoto || beforePhoto.id === afterPhoto.id}>Előtte / utána összehasonlítás</button></div>
        {taskCounts.some(({ count }) => count > 0) && <div className="execution-photo-task-groups"><strong>Feladatonkénti csoportosítás</strong>{taskCounts.filter(({ count }) => count > 0).map(({ task, count }) => <span key={task.id}>{task.title}: {count} fénykép</span>)}{plan.photos.some((photo) => !photo.taskId) && <span>Feladathoz nem kapcsolt: {plan.photos.filter((photo) => !photo.taskId).length} fénykép</span>}</div>}
        {photos.length ? <div className="execution-photo-grid">{photos.map((photo) => <article className="execution-photo-card" key={photo.id}>
          <button type="button" className="execution-photo-open" onClick={() => setViewer(photo)} disabled={!photo.signedUrl} aria-label={`${photo.caption || "Kivitelezési fénykép"} megnyitása`}>{photo.signedUrl ? <img src={photo.signedUrl} alt={photo.caption || "Kivitelezési fénykép"} loading="lazy" /> : <span className="missing-data">A kép linkje lejárt; frissítsd az oldalt.</span>}</button>
          <div className="execution-photo-card-body"><div className="execution-photo-card-heading"><strong>{photo.caption || photo.displayFilename}</strong><span>{categoryLabels[photo.category]}</span></div>
            <label>Kategória<select value={photo.category} onChange={(event) => onCategoryChange(photo.id, event.target.value as ExecutionPhotoCategory)} disabled={pending}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <PhotoMetadata photo={photo} />{photo.journalContent && <small className="execution-photo-journal">Bejegyzés: {photo.journalContent}</small>}
            <div className="execution-photo-compare-actions"><button type="button" onClick={() => setBeforeId(photo.id)}>Beállítás: előtte</button><button type="button" onClick={() => setAfterId(photo.id)}>Beállítás: utána</button></div>
          </div>
        </article>)}</div> : <p className="missing-data">A szűrésnek megfelelő fénykép nincs.</p>}
      </section>
    </ExecutionSubsection>

    {viewer && <div className="execution-photo-viewer" role="dialog" aria-modal="true" aria-label="Kivitelezési fénykép nagy nézet"><button type="button" className="secondary-button" onClick={() => setViewer(null)}>Bezárás (Esc)</button>{viewer.signedUrl && <img src={viewer.signedUrl} alt={viewer.caption || "Kivitelezési fénykép"} />}<PhotoMetadata photo={viewer} /></div>}
    {comparison && beforePhoto && afterPhoto && <div className="execution-photo-comparison" role="dialog" aria-modal="true" aria-label="Előtte és utána összehasonlítás">
      <button type="button" className="secondary-button" onClick={() => setComparison(false)}>Bezárás (Esc)</button>
      <div className="execution-photo-comparison-controls"><label>Munka előtt<select value={beforePhoto.id} onChange={(event) => setBeforeId(event.target.value)}>{photos.map((photo) => <option key={photo.id} value={photo.id}>{photo.caption || photo.displayFilename}</option>)}</select></label><label>Munka után<select value={afterPhoto.id} onChange={(event) => setAfterId(event.target.value)}>{photos.map((photo) => <option key={photo.id} value={photo.id}>{photo.caption || photo.displayFilename}</option>)}</select></label></div>
      <div className="execution-photo-comparison-grid"><figure><figcaption>Munka előtt · {categoryLabels[beforePhoto.category]}</figcaption>{beforePhoto.signedUrl && <img src={beforePhoto.signedUrl} alt="Munka előtt" />}<PhotoMetadata photo={beforePhoto} /></figure><figure><figcaption>Munka után · {categoryLabels[afterPhoto.category]}</figcaption>{afterPhoto.signedUrl && <img src={afterPhoto.signedUrl} alt="Munka után" />}<PhotoMetadata photo={afterPhoto} /></figure></div>
      {beforePhoto.taskId !== afterPhoto.taskId && <p className="missing-data">A két kép külön feladathoz tartozik; az összehasonlítás csak a felhasználó által kiválasztott képeket mutatja.</p>}
    </div>}
  </div>;
}

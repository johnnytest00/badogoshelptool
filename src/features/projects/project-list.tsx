"use client";

import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Archive, CalendarDays, Filter, MapPin, Plus, RotateCcw, Search, UserRound, X } from "lucide-react";
import { projectStatusLabels, projectTypeLabels, type ProjectStatus, type ProjectType } from "@/domain/projects/contracts";
import type { ProjectRecord } from "./project-data";
import { GlassToolbar } from "@/components/ui/glass-toolbar";
import { GlassPageHeader } from "@/components/ui/glass-page-header";

const dateFormatter = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export type ProjectFilterState = { search?: string; status?: ProjectStatus; projectType?: ProjectType; includeArchived: boolean; sort: "newest" | "oldest" };

export function createProjectFilterDraft(filters: ProjectFilterState): ProjectFilterState {
  return { ...filters };
}

export function resetProjectFilterDraft(): ProjectFilterState {
  return { status: undefined, projectType: undefined, includeArchived: false, sort: "newest" };
}

export function ProjectList({ organizationId, projects, filters }: Readonly<{ organizationId: string; projects: readonly ProjectRecord[]; filters: ProjectFilterState }>) {
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [draft, setDraft] = useState<ProjectFilterState>(() => createProjectFilterDraft(filters));
  const [search, setSearch] = useState(filters.search ?? "");
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = filterDialogRef.current;
    if (!dialog) return;
    if (filterDialogOpen && !dialog.open) dialog.showModal();
    if (!filterDialogOpen && dialog.open) {
      dialog.close();
      filterTriggerRef.current?.focus({ preventScroll: true });
    }
  }, [filterDialogOpen]);

  const openFilters = () => {
    setDraft(createProjectFilterDraft(filters));
    setFilterDialogOpen(true);
  };
  const closeFilters = () => setFilterDialogOpen(false);
  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.submit();
    closeFilters();
  };
  const hasFilters = Boolean(filters.status || filters.projectType || filters.includeArchived || filters.sort === "oldest");

  return (
    <section className="projects-workspace">
      <GlassPageHeader title="Projektek" actions={
        <div className="toolbar-actions">
          <Link className="secondary-button" href={`/ugyfelek?organization=${organizationId}`}><UserRound className="size-4" /> Ügyfelek</Link>
          <Link className="primary-button" href={`/projektek/uj?organization=${organizationId}`}><Plus className="size-4" /> Új projekt</Link>
        </div>
      } />

      <form className="project-filter-form project-filter-desktop" method="get">
        <input type="hidden" name="organization" value={organizationId} />
        <GlassToolbar ariaLabel="Projektkeresés és szűrés" className="project-filters">
          <label className="filter-search"><Search className="size-4" aria-hidden="true" /><span className="sr-only">Projekt keresése</span><input name="search" defaultValue={filters.search ?? ""} placeholder="Keresés projekt név alapján" /></label>
          <label className="project-filter-field"><span>Állapot</span><select name="status" defaultValue={filters.status ?? ""}><option value="">Aktív állapotok</option>{Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="project-filter-field"><span>Munkatípus</span><select name="projectType" defaultValue={filters.projectType ?? ""}><option value="">Minden munkatípus</option>{Object.entries(projectTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="project-filter-field"><span>Rendezés</span><select name="sort" defaultValue={filters.sort}><option value="newest">Legutóbbi módosítás</option><option value="oldest">Legrégebbi módosítás</option></select></label>
          <div className="project-filter-actions"><label className="filter-check"><input type="checkbox" name="archived" value="1" defaultChecked={filters.includeArchived} /> <span>Archiváltak is</span></label><button className="secondary-button" type="submit">Szűrés</button></div>
        </GlassToolbar>
      </form>

      <div className="project-filter-mobile">
        <form className="mobile-project-search" method="get">
          <input type="hidden" name="organization" value={organizationId} />
          <input type="hidden" name="status" value={filters.status ?? ""} />
          <input type="hidden" name="projectType" value={filters.projectType ?? ""} />
          <input type="hidden" name="sort" value={filters.sort} />
          {filters.includeArchived && <input type="hidden" name="archived" value="1" />}
          <label className="mobile-project-search-field"><Search className="size-4" aria-hidden="true" /><span className="sr-only">Projekt keresése</span><input name="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Keresés a projektek között" /></label>
          <button ref={filterTriggerRef} className={`mobile-project-filter-trigger${hasFilters ? " has-applied-filters" : ""}`} type="button" onClick={openFilters} aria-label="Szűrők" aria-haspopup="dialog"><Filter aria-hidden="true" className="size-4" /><span className="sr-only">Szűrők</span></button>
          <button className="sr-only" type="submit" aria-label="Keresés">Keresés</button>
        </form>
        <dialog ref={filterDialogRef} className="mobile-project-filter-dialog" aria-labelledby="mobile-project-filter-title" onCancel={(event) => { event.preventDefault(); closeFilters(); }} onClick={(event) => { if (event.target === event.currentTarget) closeFilters(); }}>
          <form action="/projektek" method="get" onSubmit={applyFilters}>
            <input type="hidden" name="organization" value={organizationId} />
            <input type="hidden" name="search" value={search} />
            <div className="mobile-filter-heading"><div><p className="section-eyebrow">Projektlista</p><h2 id="mobile-project-filter-title">Szűrők</h2></div><button className="mobile-filter-close" type="button" onClick={closeFilters} aria-label="Szűrőpanel bezárása"><X aria-hidden="true" className="size-5" /></button></div>
            <div className="mobile-filter-fields">
              <label className="project-filter-field"><span>Állapot</span><select value={draft.status ?? ""} onChange={(event) => setDraft((current) => ({ ...current, status: (event.target.value || undefined) as ProjectStatus | undefined }))}><option value="">Aktív állapotok</option>{Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="project-filter-field"><span>Munkatípus</span><select value={draft.projectType ?? ""} onChange={(event) => setDraft((current) => ({ ...current, projectType: (event.target.value || undefined) as ProjectType | undefined }))}><option value="">Minden munkatípus</option>{Object.entries(projectTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="project-filter-field"><span>Rendezés</span><select value={draft.sort} onChange={(event) => setDraft((current) => ({ ...current, sort: event.target.value as ProjectFilterState["sort"] }))}><option value="newest">Legutóbbi módosítás</option><option value="oldest">Legrégebbi módosítás</option></select></label>
              <label className="mobile-filter-check"><input type="checkbox" checked={draft.includeArchived} onChange={(event) => setDraft((current) => ({ ...current, includeArchived: event.target.checked }))} /><span>Archiváltak is</span></label>
            </div>
            <input type="hidden" name="status" value={draft.status ?? ""} />
            <input type="hidden" name="projectType" value={draft.projectType ?? ""} />
            <input type="hidden" name="sort" value={draft.sort} />
            {draft.includeArchived && <input type="hidden" name="archived" value="1" />}
            <div className="mobile-filter-actions"><button className="secondary-button" type="button" onClick={() => setDraft(resetProjectFilterDraft())}>Visszaállítás</button><button className="primary-button" type="submit">Szűrők alkalmazása <ArrowRight aria-hidden="true" className="size-4" /></button></div>
          </form>
        </dialog>
      </div>

      {projects.length === 0
        ? <ProjectEmptyState hasFilters={Boolean(filters.search || filters.status || filters.projectType || filters.includeArchived)} organizationId={organizationId} />
        : <div className="real-project-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} organizationId={organizationId} />)}</div>}
    </section>
  );
}

function ProjectCard({ project, organizationId }: Readonly<{ project: ProjectRecord; organizationId: string }>) {
  return <article className={`real-project-card status-card-${project.status}`}><div className="project-card-top"><span className={`status-pill status-${project.status}`}>{projectStatusLabels[project.status]}</span><span className="project-type-label">{projectTypeLabels[project.projectType]}</span></div><h2>{project.name}</h2><div className="project-card-meta">{project.clientName && <span><UserRound className="size-4" />{project.clientName}</span>}{project.location && <span><MapPin className="size-4" />{project.location}</span>}<span><CalendarDays className="size-4" />{dateFormatter.format(new Date(project.updatedAt))}</span></div><div className="project-card-footer"><span>{project.status === "archived" ? <><Archive className="size-4" /> Archiválva</> : <><RotateCcw className="size-4" /> v{project.version}</>}</span><Link className="text-action" href={`/projektek/${project.id}?organization=${organizationId}`}>Megnyitás <ArrowRight className="size-4" /></Link></div></article>;
}

function ProjectEmptyState({ hasFilters, organizationId }: Readonly<{ hasFilters: boolean; organizationId: string }>) {
  return <div className="empty-state project-empty-state"><span className="empty-state-icon"><Archive className="size-5" /></span><div><h2>{hasFilters ? "Nincs ilyen projekt" : "Még nincs saját projekted"}</h2><p>{hasFilters ? "Módosítsd a keresést vagy a szűrőket." : "Hozd létre az első munkát, és később innen folytathatod."}</p><Link className="text-action" href={`/projektek/uj?organization=${organizationId}`}><Plus className="size-4" /> Új projekt</Link></div></div>;
}

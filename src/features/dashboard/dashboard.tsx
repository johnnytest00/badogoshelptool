"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronRight, CircleHelp, FolderKanban, Settings2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useTheme } from "@/components/theme/theme-provider";
import { ScalingControls } from "@/features/preferences/scaling-controls";
import { LogoutButton } from "@/features/auth/auth-controls";
import { dashboardFunctions, type DashboardFunction } from "@/features/dashboard/dashboard.data";
import { getNextDashboardTab } from "@/features/dashboard/dashboard.utils";
import type { DashboardTab } from "@/features/dashboard/dashboard.types";
import type { ProjectRecord } from "@/features/projects/project-data";
import { projectTypeLabels } from "@/domain/projects/contracts";

export function Dashboard({ displayName, email, organizationName, organizationId, projects = [] }: Readonly<{ displayName?: string | null; email?: string | null; organizationName?: string; organizationId?: string; projects?: readonly ProjectRecord[] }>) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("functions");
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { setMode } = useTheme();

  const showComingSoon = (label: string) => setNotice(`${label}: ez a modul hamarosan elérhető lesz.`);
  const resetTheme = () => {
    setMode("system");
    setNotice("A megjelenés visszaállt a rendszer beállítására.");
  };

  return (
    <main className="dashboard-shell">
      <div className="dashboard-container">
        <DashboardHeader displayName={displayName} email={email} organizationName={organizationName} settingsOpen={settingsOpen} onToggleSettings={() => setSettingsOpen((current) => !current)} />
        {settingsOpen && <DashboardSettings onResetTheme={resetTheme} />}

        <section className="greeting-section" aria-labelledby="dashboard-title">
          <p className="eyebrow">TetőPro · műhely</p>
          <h1 id="dashboard-title" className="dashboard-title">Jó reggelt!</h1>
          <p className="dashboard-subtitle">Miben segíthetünk ma?</p>
        </section>

        <DashboardTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="dashboard-content" role="tabpanel" aria-live="polite" aria-labelledby={`dashboard-tab-${activeTab}`}>
          {activeTab === "functions" ? (
            <FunctionsView onSelect={showComingSoon} organizationId={organizationId} />
          ) : (
            <ProjectsView projects={projects} organizationId={organizationId} />
          )}
        </div>

        <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      </div>
    </main>
  );
}

function DashboardHeader({ displayName, email, organizationName, settingsOpen, onToggleSettings }: Readonly<{ displayName?: string | null; email?: string | null; organizationName?: string; settingsOpen: boolean; onToggleSettings: () => void }>) {
  const userLabel = displayName || email || "Felhasználó";
  return (
    <header className="dashboard-header">
      <div className="brand-label">
        <span className="brand-mark"><span className="brand-mark-line" aria-hidden="true" /></span>
        <span>TETŐPRO</span>
      </div>
      <div className="dashboard-account"><span className="dashboard-account-copy"><strong>{userLabel}</strong><span>{organizationName ?? "Helyi műhely"}</span></span><LogoutButton /></div>
      <div className="dashboard-header-actions">
        <ThemeToggle />
        <button className={`icon-button ${settingsOpen ? "is-active" : ""}`} type="button" onClick={onToggleSettings} aria-expanded={settingsOpen} aria-controls="dashboard-settings" aria-label="Beállítások" title="Beállítások">
          <Settings2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </header>
  );
}

function DashboardSettings({ onResetTheme }: Readonly<{ onResetTheme: () => void }>) {
  return <aside className="dashboard-settings-panel" id="dashboard-settings" aria-labelledby="dashboard-settings-title"><div className="settings-panel-heading"><div><p className="section-eyebrow">Helyi beállítások</p><h2 id="dashboard-settings-title">Megjelenítés</h2></div><button className="settings-reset-theme" type="button" onClick={onResetTheme}>Rendszer szerint</button></div><p>A megjelenítési méretek minden nézetben érvényesek és csak ebben a böngészőben tárolódnak.</p><ScalingControls /><Link className="settings-demo-link" href="/demo/meretezes">Méretezési demo megnyitása <span aria-hidden="true">→</span></Link></aside>;
}

function DashboardTabs({ activeTab, onChange }: Readonly<{ activeTab: DashboardTab; onChange: (tab: DashboardTab) => void }>) {
  const tabs: readonly { id: DashboardTab; label: string }[] = [
    { id: "functions", label: "Funkciók" },
    { id: "projects", label: "Aktuális munkák" },
  ];

  return (
    <div className="dashboard-tabs" role="tablist" aria-label="Műhely áttekintő nézetei">
      {tabs.map((tab) => (
        <button
          className={`dashboard-tab ${activeTab === tab.id ? "is-active" : ""}`}
          id={`dashboard-tab-${tab.id}`}
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowDown") onChange(getNextDashboardTab(tab.id, "forward"));
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") onChange(getNextDashboardTab(tab.id, "backward"));
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function FunctionsView({ onSelect, organizationId }: Readonly<{ onSelect: (label: string) => void; organizationId?: string }>) {
  return (
    <section aria-labelledby="functions-title">
      <SectionHeading eyebrow="Gyorsindító" title="Munkafolyamatok egy helyen" description="Válassz egy területet a következő lépéshez." />
      <div className="function-grid">
        {dashboardFunctions.map((item) => <FunctionLauncher item={item} key={item.id} onSelect={onSelect} organizationId={organizationId} />)}
      </div>
      <div className="dashboard-tip">
        <CircleHelp aria-hidden="true" className="size-5" />
        <p><strong>Új a TetőProban?</strong> A funkciók fokozatosan válnak elérhetővé. A későbbi modulok mindig egyértelműen jelölve lesznek.</p>
      </div>
    </section>
  );
}

function FunctionLauncher({ item, onSelect, organizationId }: Readonly<{ item: DashboardFunction; onSelect: (label: string) => void; organizationId?: string }>) {
  const Icon = item.icon;
  if (item.id === "projects" && organizationId) return <Link className={`function-launcher tone-${item.tone}`} href={`/projektek?organization=${organizationId}`}><span className="function-icon"><Icon aria-hidden="true" className="size-6" /></span><span className="function-copy"><strong>{item.label}</strong><span>{item.description}</span></span><span className="function-arrow"><ArrowRight aria-hidden="true" className="size-5" /></span></Link>;
  if (item.id === "materials" && organizationId) return <Link className={`function-launcher tone-${item.tone}`} href={`/anyagok?organization=${organizationId}`}><span className="function-icon"><Icon aria-hidden="true" className="size-6" /></span><span className="function-copy"><strong>{item.label}</strong><span>{item.description}</span></span><span className="function-arrow"><ArrowRight aria-hidden="true" className="size-5" /></span></Link>;
  return (
    <button className={`function-launcher tone-${item.tone}`} type="button" onClick={() => onSelect(item.label)} aria-label={`${item.label}, hamarosan elérhető`}>
      <span className="function-icon"><Icon aria-hidden="true" className="size-6" /></span>
      <span className="function-copy"><strong>{item.label}</strong><span>{item.description}</span></span>
      <span className="coming-soon-badge">Hamarosan</span>
      <ChevronRight aria-hidden="true" className="function-arrow size-5" />
    </button>
  );
}

function ProjectsView({ projects, organizationId }: Readonly<{ projects: readonly ProjectRecord[]; organizationId?: string }>) {
  return (
    <section aria-labelledby="projects-title">
      <SectionHeading eyebrow="Saját munkák" title="Aktuális munkák" description="A kiválasztott műhely aktív projektjei." />
      {projects.length === 0 ? <div className="empty-state"><span className="empty-state-icon"><FolderKanban aria-hidden="true" className="size-5" /></span><div><h3>Még nincs aktív projekt</h3><p>Hozd létre az első munkát, és innen bármikor folytathatod.</p>{organizationId && <Link className="text-action" href={`/projektek/uj?organization=${organizationId}`}>Új projekt <ArrowRight aria-hidden="true" className="size-3.5" /></Link>}</div></div> : <div className="project-grid real-dashboard-project-grid">{projects.slice(0, 6).map((project) => <RealProjectPreview project={project} organizationId={organizationId} key={project.id} />)}</div>}
      {organizationId && <Link className="dashboard-projects-link" href={`/projektek?organization=${organizationId}`}>Összes projekt megnyitása <ArrowRight aria-hidden="true" className="size-4" /></Link>}
    </section>
  );
}

function RealProjectPreview({ project, organizationId }: Readonly<{ project: ProjectRecord; organizationId?: string }>) {
  return <article className="project-preview"><div className="project-preview-top"><span className={`status-pill status-${project.status}`}>{project.status}</span></div><h3>{project.name}</h3><p className="project-type">{projectTypeLabels[project.projectType]}{project.clientName ? ` · ${project.clientName}` : ""}</p><div className="project-preview-bottom"><span className="project-updated">v{project.version}</span>{organizationId && <Link className="text-action" href={`/projektek/${project.id}?organization=${organizationId}`}>Folytatás <ArrowRight aria-hidden="true" className="size-3.5" /></Link>}</div></article>;
}

function SectionHeading({ eyebrow, title, description }: Readonly<{ eyebrow: string; title: string; description: string }>) {
  return <div className="section-heading"><p className="section-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>;
}

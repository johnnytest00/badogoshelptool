"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FolderKanban, Settings2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useTheme } from "@/components/theme/theme-provider";
import { ScalingControls } from "@/features/preferences/scaling-controls";
import { LogoutButton } from "@/features/auth/auth-controls";
import { AccountManagementDialog } from "@/features/auth/account-management-dialog";
import { dashboardFunctionHref, dashboardFunctions, type DashboardFunction } from "@/features/dashboard/dashboard.data";
import { getDashboardGreeting, getNextDashboardTab } from "@/features/dashboard/dashboard.utils";
import type { DashboardTab } from "@/features/dashboard/dashboard.types";
import type { ProjectRecord } from "@/features/projects/project-data";
import { projectTypeLabels } from "@/domain/projects/contracts";

export function Dashboard({ displayName, email, organizationName, organizationId, projects = [] }: Readonly<{ displayName?: string | null; email?: string | null; organizationName?: string; organizationId?: string; projects?: readonly ProjectRecord[]; recentSurveys?: readonly { id: string; version: number; updatedAt: string }[] }>) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("functions");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [greeting, setGreeting] = useState("Üdv a műhelyben!");

  useEffect(() => {
    const updateGreeting = () => setGreeting(getDashboardGreeting(new Date().getHours()));
    updateGreeting();
    const interval = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="dashboard-shell">
      <div className="dashboard-container">
        <DashboardHeader displayName={displayName} email={email} organizationName={organizationName} settingsOpen={settingsOpen} onToggleSettings={() => setSettingsOpen((current) => !current)} />
        {settingsOpen && <DashboardSettings onOpenAccount={() => setAccountDialogOpen(true)} />}
        <AccountManagementDialog open={accountDialogOpen} onClose={() => setAccountDialogOpen(false)} />

        <section className="greeting-section" aria-labelledby="dashboard-title">
          <p className="eyebrow">TetőPro · műhely</p>
          <h1 id="dashboard-title" className="dashboard-title">{greeting}</h1>
          <p className="dashboard-subtitle">Miben segíthetünk ma?</p>
        </section>

        <DashboardTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="dashboard-content" role="tabpanel" aria-live="polite" aria-labelledby={`dashboard-tab-${activeTab}`}>
          {activeTab === "functions" ? (
            <FunctionsView organizationId={organizationId} />
          ) : (
            <ProjectsView projects={projects} organizationId={organizationId} />
          )}
        </div>

      </div>
    </main>
  );
}

function DashboardHeader({ displayName, email, organizationName, settingsOpen, onToggleSettings }: Readonly<{ displayName?: string | null; email?: string | null; organizationName?: string; settingsOpen: boolean; onToggleSettings: () => void }>) {
  const userLabel = displayName || email || "Felhasználó";
  return (
    <header className="dashboard-header glass-navigation">
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

function DashboardSettings({ onOpenAccount }: Readonly<{ onOpenAccount: () => void }>) {
  const { mode, setMode } = useTheme();
  return <aside className="dashboard-settings-panel" id="dashboard-settings" aria-labelledby="dashboard-settings-title">
    <div className="settings-panel-heading"><div><p className="section-eyebrow">Helyi beállítások</p><h2 id="dashboard-settings-title">Megjelenítés</h2></div></div>
    <section className="settings-theme-section" aria-labelledby="settings-theme-title"><h3 id="settings-theme-title">Megjelenési mód</h3><label className="settings-theme-select-label" htmlFor="settings-theme-mode">Téma</label><select id="settings-theme-mode" className="settings-theme-select" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="system">Rendszer szerint</option><option value="light">Világos</option><option value="dark">Sötét</option></select>{mode === "system" && <p className="settings-theme-help">Az alkalmazás az eszközöd világos vagy sötét megjelenését követi.</p>}</section>
    <p>A megjelenítési méretek minden nézetben érvényesek és csak ebben a böngészőben tárolódnak.</p>
    <ScalingControls idPrefix="settings-scale" /><Link className="settings-demo-link" href="/demo/meretezes">Méretezési demo megnyitása <span aria-hidden="true">→</span></Link>
    <section className="settings-account-section" aria-labelledby="settings-account-title"><div><p className="section-eyebrow">Saját hozzáférés</p><h3 id="settings-account-title">Fiókbeállítások</h3><p>E-mail-cím és jelszó kezelése a hitelesítési szolgáltatásban.</p></div><button className="secondary-button" type="button" onClick={onOpenAccount}>Fiókom kezelése</button></section>
  </aside>;
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

function FunctionsView({ organizationId }: Readonly<{ organizationId?: string }>) {
  return (
    <section aria-labelledby="functions-title">
      <SectionHeading eyebrow="Gyorsindító" title="Munkafolyamatok egy helyen" description="Válassz egy területet a következő lépéshez." />
      <div className="function-grid">
        {dashboardFunctions.map((item) => <FunctionLauncher item={item} key={item.id} organizationId={organizationId} />)}
      </div>
      <div className="dashboard-tip">
        <p><strong>Jelenlegi működés:</strong> önálló felméréssel vagy közvetlenül a kalkulátorokkal és ajánlatokkal is kezdhetsz.</p>
      </div>
    </section>
  );
}

function FunctionLauncher({ item, organizationId }: Readonly<{ item: DashboardFunction; organizationId?: string }>) {
  const Icon = item.icon;
  if (!organizationId) return null;
  return (
    <Link className={`function-launcher tone-${item.tone}`} href={dashboardFunctionHref(item.id, organizationId)}>
      <span className="function-icon"><Icon aria-hidden="true" className="size-6" /></span>
      <span className="function-copy"><strong>{item.label}</strong><span>{item.description}</span></span>
      <span className="function-arrow"><ArrowRight aria-hidden="true" className="size-5" /></span>
    </Link>
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

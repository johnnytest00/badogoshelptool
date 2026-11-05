"use client";

import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, ClipboardList } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { ScalingControls } from "@/features/preferences/scaling-controls";
import { LogoutButton } from "@/features/auth/auth-controls";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { LiquidGlassControls } from "@/features/preferences/liquid-glass-controls";
import { useScaling } from "@/features/preferences/scaling-provider";
import { useLiquidGlass } from "@/features/preferences/liquid-glass-provider";
import { MobileNavigationControl, useMobileNavigationPreference } from "@/features/preferences/mobile-navigation-controls";
import { dashboardFunctionHref, dashboardFunctions, type DashboardFunction } from "@/features/dashboard/dashboard.data";
import { getNextDashboardTab } from "@/features/dashboard/dashboard.utils";
import type { DashboardTab } from "@/features/dashboard/dashboard.types";
type DashboardPlan = { id: string; title: string; updatedAt: string; tasks: { total: number; done: number; inProgress: number; todo: number } };

export function Dashboard({ organizationId, plans = [] }: Readonly<{ displayName?: string | null; email?: string | null; organizationName?: string; organizationId?: string; plans?: readonly DashboardPlan[] }>) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("functions");

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-shell">
      <div className="dashboard-container">
        <h1 className="sr-only">Műhely</h1>

        <DashboardTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="dashboard-content" role="tabpanel" aria-live="polite" aria-labelledby={`dashboard-tab-${activeTab}`}>
          {activeTab === "functions" ? (
            <FunctionsView organizationId={organizationId} />
          ) : (
            <ProjectsView plans={plans} organizationId={organizationId} />
          )}
        </div>

      </div>
    </main>
  );
}

function SettingSummary({ title, value }: Readonly<{ title: string; value: string }>) {
  return <span className="settings-summary"><span>{title}</span><small>{value}</small></span>;
}

export function DashboardSettings({ onOpenAccount }: Readonly<{ onOpenAccount: () => void }>) {
  const { mode, setMode } = useTheme();
  const scaling = useScaling();
  const glass = useLiquidGlass();
  const [mobileNavigation, setMobileNavigation] = useMobileNavigationPreference();
  return <aside className="dashboard-settings-panel" id="dashboard-settings" role="dialog" aria-modal="false" aria-labelledby="dashboard-settings-title">
    <div className="settings-panel-heading"><h2 id="dashboard-settings-title">MEGJELENÉS</h2><button className="settings-account-trigger" type="button" onClick={onOpenAccount}>Fiókbeállítások</button></div>
    <section className="settings-theme-section" aria-labelledby="settings-theme-title"><h3 id="settings-theme-title">Téma</h3><select id="settings-theme-mode" className="settings-theme-select" aria-label="Megjelenítési téma" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="system">Rendszer szerint</option><option value="light">Világos</option><option value="dark">Sötét</option></select>{mode === "system" && <p className="settings-theme-help">Az eszköz megjelenését követi.</p>}</section>
    <GlassDisclosure className="settings-disclosure" summary={<SettingSummary title="Méretezések" value={`Szöveg ${scaling.text}% · Felület ${scaling.ui}%`} />}>
      <ScalingControls idPrefix="settings-scale" keys={["text", "ui", "spacing", "drawing"]} />
    </GlassDisclosure>
    <label className="settings-mobile-sticky-control"><span>Tapadós méretező megjelenítése mobilon</span><input type="checkbox" checked={scaling.mobileStickyEnabled} onChange={(event) => scaling.setMobileStickyEnabled(event.target.checked)} /></label>
    <GlassDisclosure className="settings-disclosure" summary={<SettingSummary title="Liquid Glass" value={`Átlátszóság ${glass.opacity}% · ${glass.tintMode === "custom" ? "egyéni szín" : "automatikus szín"}`} />}>
      <LiquidGlassControls />
    </GlassDisclosure>
    <GlassDisclosure className="settings-disclosure settings-mobile-navigation" summary={<SettingSummary title="Alsó navigáció megjelenítése" value={mobileNavigation ? "Bekapcsolva" : "Kikapcsolva"} />}>
      <MobileNavigationControl enabled={mobileNavigation} onChange={setMobileNavigation} />
    </GlassDisclosure>
    <LogoutButton className="settings-logout-form" />
  </aside>;
}

function DashboardTabs({ activeTab, onChange }: Readonly<{ activeTab: DashboardTab; onChange: (tab: DashboardTab) => void }>) {
  const tabs: readonly { id: DashboardTab; label: string }[] = [
    { id: "functions", label: "Funkciók" },
    { id: "work", label: "Aktuális munkák" },
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
    <section aria-label="Funkciók">
      <div className="function-grid">
        {dashboardFunctions.map((item) => <FunctionLauncher item={item} key={item.id} organizationId={organizationId} />)}
      </div>
    </section>
  );
}

function FunctionLauncher({ item, organizationId }: Readonly<{ item: DashboardFunction; organizationId?: string }>) {
  if (!organizationId) return null;
  return (
    <Link className={`function-launcher tone-${item.tone}`} href={dashboardFunctionHref(item.id, organizationId)}>
      <span className="function-icon"><Image alt="" aria-hidden="true" className="function-icon-image" height={64} src={item.dashboardIcon} width={64} /></span>
      <span className="function-copy"><strong>{item.label}</strong><span>{item.description}</span></span>
      <span className="function-arrow"><ArrowRight aria-hidden="true" className="size-5" /></span>
    </Link>
  );
}

export function ProjectsView({ plans, organizationId }: Readonly<{ plans: readonly DashboardPlan[]; organizationId?: string }>) {
  return (
    <section aria-label="Aktuális munkák">
      {plans.length === 0 ? <div className="empty-state"><span className="empty-state-icon"><ClipboardList aria-hidden="true" className="size-5" /></span><div><h3>Még nincs munkanaplód</h3><p>Munkanaplót önállóan vagy mentett kalkulációból indíthatsz.</p>{organizationId && <Link className="text-action" href={`/kivitelezes/uj?organization=${organizationId}`}>Új munkanapló <ArrowRight aria-hidden="true" className="size-3.5" /></Link>}</div></div> : <div className="project-grid real-dashboard-project-grid">{plans.slice(0, 6).map((plan) => <article className="project-preview" key={plan.id}><div className="project-preview-top"><span className="status-pill status-active">Munkanapló</span></div><h3>{plan.title}</h3><p className="project-type">{plan.tasks.total ? `${plan.tasks.done} / ${plan.tasks.total} feladat kész` : "Nincs rögzített feladat"}</p><div className="project-preview-bottom"><span className="project-updated">{new Date(plan.updatedAt).toLocaleDateString("hu-HU")}</span>{organizationId && <Link className="text-action" href={`/kivitelezes/${plan.id}?organization=${organizationId}`}>Folytatás <ArrowRight aria-hidden="true" className="size-3.5" /></Link>}</div></article>)}</div>}
      {organizationId && <Link className="dashboard-projects-link" href={`/kivitelezes?organization=${organizationId}`}>Összes munkanapló <ArrowRight aria-hidden="true" className="size-4" /></Link>}
    </section>
  );
}

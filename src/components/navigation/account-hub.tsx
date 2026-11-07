"use client";

import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/theme-provider";
import { AccountManagementDialog } from "@/features/auth/account-management-dialog";
import { LogoutButton } from "@/features/auth/auth-controls";
import { DashboardSettings } from "@/features/dashboard/dashboard";
import { ScalingControls } from "@/features/preferences/scaling-controls";
import type { OrganizationAccess } from "@/features/auth/auth.server";
import { navigationIcons } from "@/features/dashboard/dashboard.data";

export function AccountHub({ email, organizations, organizationId }: Readonly<{ displayName: string | null; email: string | null; organizations: OrganizationAccess[]; organizationId: string | null }>) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, bottom: 64 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const { mode, setMode } = useTheme();
  const searchParams = useSearchParams();
  const selectedOrganization = searchParams.get("organization") ?? organizationId;
  const organization = organizations.find((item) => item.id === selectedOrganization);

  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("button, select, input, a")?.focus({ preventScroll: true });
  }, [open, settingsOpen]);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 344)), bottom: Math.max(8, window.innerHeight - rect.top + 8) });
    };
    const close = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setSettingsOpen(false);
      setMobileSettingsOpen(false);
      trigger.current?.focus({ preventScroll: true });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", keydown);
    };
  }, [open]);

  return <>
    <button ref={trigger} type="button" className="app-account-trigger" aria-label="Beállítások megnyitása" aria-haspopup="dialog" aria-expanded={open} onClick={() => {
      const mobile = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(max-width: 63.999rem)").matches;
      setOpen((value) => !value);
      setSettingsOpen(mobile);
      setMobileSettingsOpen(mobile);
    }}>
      <Image className="app-nav-icon app-account-icon" src={navigationIcons.settings} alt="" aria-hidden="true" width={32} height={32} />
      <span className="app-account-greeting">Beállítások</span>
    </button>
    {open && typeof document !== "undefined" && createPortal(<div ref={panel} className={`app-account-panel glass-navigation${mobileSettingsOpen ? " is-mobile-settings-popover" : ""}`} role="dialog" aria-label={settingsOpen ? "Beállítások" : "Profilmenü"} style={mobileSettingsOpen ? undefined : { left: position.left, bottom: position.bottom }}>
      {mobileSettingsOpen ? <>
        <div className="app-account-panel-heading app-account-mobile-heading"><strong>Beállítások</strong><button type="button" className="app-account-mobile-close" onClick={() => { setOpen(false); setSettingsOpen(false); setMobileSettingsOpen(false); }} aria-label="Beállítások bezárása">Bezárás</button></div>
        <AccountScalingControls />
        <DashboardSettings onOpenAccount={() => setAccountOpen(true)} />
      </> : <>
        <div className="app-account-panel-heading">
          {settingsOpen && <button type="button" className="app-account-back" onClick={() => setSettingsOpen(false)} aria-label="Vissza a profilmenühöz"><ChevronLeft aria-hidden="true" /></button>}
          <div className="app-account-identity"><strong>{email || "Bejelentkezett felhasználó"}</strong><span>{organization?.name ?? "Nincs aktív szervezet"}</span></div>
        </div>
        {settingsOpen ? <DashboardSettings onOpenAccount={() => setAccountOpen(true)} /> : <>
          <label className="app-account-theme">Téma<select aria-label="Téma" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="system">Rendszer szerint</option><option value="light">Világos</option><option value="dark">Sötét</option></select></label>
          <AccountScalingControls />
          <button type="button" className="app-account-action" onClick={() => setSettingsOpen(true)}>Beállítások</button>
          <LogoutButton className="app-account-logout" />
        </>}
      </>}
    </div>, document.body)}
    <AccountManagementDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
  </>;
}

function AccountScalingControls() {
  return <div className="app-account-scaling">
    <ScalingControls compact idPrefix="account-scale" />
  </div>;
}

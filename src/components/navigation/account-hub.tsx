"use client";

import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/theme-provider";
import { AccountManagementDialog } from "@/features/auth/account-management-dialog";
import { LogoutButton } from "@/features/auth/auth-controls";
import { DashboardSettings } from "@/features/dashboard/dashboard";
import type { OrganizationAccess } from "@/features/auth/auth.server";
import { greetingLabel, greetingName } from "@/components/navigation/account-name";

export function AccountHub({ displayName, email, organizations, organizationId }: Readonly<{ displayName: string | null; email: string | null; organizations: OrganizationAccess[]; organizationId: string | null }>) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, bottom: 64 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const { mode, setMode } = useTheme();
  const searchParams = useSearchParams();
  const firstName = greetingName(displayName);
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
    <button ref={trigger} type="button" className="app-account-trigger" aria-label={`Profilmenü, Szia${firstName ? ` ${firstName}` : ""}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen((value) => !value); setSettingsOpen(false); }}>
      <span className="app-account-avatar" aria-hidden="true">{firstName ? firstName.slice(0, 1).toLocaleUpperCase("hu-HU") : <UserRound />}</span>
      <span className="app-account-greeting">{greetingLabel(displayName)}</span>
      <ChevronDown aria-hidden="true" className="app-account-chevron" />
    </button>
    {open && typeof document !== "undefined" && createPortal(<div ref={panel} className="app-account-panel glass-navigation" role="dialog" aria-label={settingsOpen ? "Beállítások" : "Profilmenü"} style={{ left: position.left, bottom: position.bottom }}>
      <div className="app-account-panel-heading">
        {settingsOpen && <button type="button" className="app-account-back" onClick={() => setSettingsOpen(false)} aria-label="Vissza a profilmenühöz"><ChevronLeft aria-hidden="true" /></button>}
        <div className="app-account-identity"><strong>{email || "Bejelentkezett felhasználó"}</strong><span>{organization?.name ?? "Nincs aktív szervezet"}</span></div>
      </div>
      {settingsOpen ? <DashboardSettings onOpenAccount={() => setAccountOpen(true)} /> : <>
        <label className="app-account-theme">Téma<select aria-label="Téma" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="system">Rendszer szerint</option><option value="light">Világos</option><option value="dark">Sötét</option></select></label>
        <button type="button" className="app-account-action" onClick={() => setSettingsOpen(true)}>Beállítások</button>
        <LogoutButton className="app-account-logout" />
      </>}
    </div>, document.body)}
    <AccountManagementDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
  </>;
}

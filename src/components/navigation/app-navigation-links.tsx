"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import brandIcon from "@/assets/brand-icon.png";
import { LayoutGrid } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GuardedLink } from "@/components/navigation/guarded-link";
import { dashboardFunctions, dashboardFunctionRoutes, navigationIcons } from "@/features/dashboard/dashboard.data";
import { isRouteActive } from "@/components/navigation/routes";
import { AccountHub } from "@/components/navigation/account-hub";
import type { OrganizationAccess } from "@/features/auth/auth.server";

/** Mobilon ez az öt cél fér el kényelmesen az alsó sávban; a többi a Műhelyről érhető el. */
const mobileIds = new Set(["dashboard", "calculators", "execution", "quotes", "material-lists"]);

export function AppNavigationLinks({ displayName, email, organizations, organizationId }: Readonly<{ displayName: string | null; email: string | null; organizations: OrganizationAccess[]; organizationId: string | null }>) {
  const pathname = usePathname();
  // Az útvonal query paramétere a mérvadó (több szervezetnél ez mondja meg, melyikben dolgozunk);
  // ahol nincs ott, a szerveren feloldott egyetlen szervezet a tartalék.
  const current = useSearchParams().get("organization") ?? organizationId;
  if (pathname.startsWith("/bejelentkezes")) return null;
  const suffix = current ? `?organization=${encodeURIComponent(current)}` : "";
  const items = [
    { id: "dashboard", label: "Műhely", icon: <LayoutGrid aria-hidden="true" className="app-nav-icon" />, route: "/" },
    ...dashboardFunctions.map((item) => ({ id: item.id, label: item.label, icon: <Image alt="" aria-hidden="true" className="app-nav-icon" height={20} src={item.sidebarIcon} width={20} />, route: dashboardFunctionRoutes[item.id] })),
  ];
  return <nav className="app-nav" aria-label="Alkalmazás navigáció"><GuardedLink className="brand-label app-nav-brand" href={`/${suffix}`} aria-label="TetőPro – Műhely"><Image className="brand-icon" src={brandIcon} alt="" sizes="41px" priority /><span>TETŐPRO</span></GuardedLink><div className="app-nav-links">{items.map((item) => {
    const active = isRouteActive(pathname, item.route);
    return <GuardedLink key={item.id} className={`app-nav-item${active ? " is-active" : ""}${mobileIds.has(item.id) ? "" : " app-nav-item-wide"}`} href={`${item.route}${suffix}`} aria-current={active ? "page" : undefined}>
      {item.icon}<span>{item.label}</span>
    </GuardedLink>;
  })}</div><MobileNavigationMenu items={items} pathname={pathname} suffix={suffix} /><AccountHub displayName={displayName} email={email} organizations={organizations} organizationId={current} /></nav>;
}

type NavigationItem = { id: string; label: string; icon: React.ReactNode; route: string };

function MobileNavigationMenu({ items, pathname, suffix }: Readonly<{ items: readonly NavigationItem[]; pathname: string; suffix: string }>) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    const close = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", keydown);
    };
  }, [open]);

  return <div className="mobile-nav-menu-wrap"><button ref={trigger} type="button" className="mobile-nav-menu-trigger" aria-label="Menü megnyitása" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Image src={navigationIcons.menu} alt="" aria-hidden="true" width={24} height={24} /><span>Menü</span></button>{open && <div ref={panel} className="mobile-nav-menu-panel glass-navigation" role="menu" aria-label="Főmenü">{items.map((item) => <GuardedLink key={item.id} className={`mobile-nav-menu-item${isRouteActive(pathname, item.route) ? " is-active" : ""}`} href={`${item.route}${suffix}`} role="menuitem" aria-current={isRouteActive(pathname, item.route) ? "page" : undefined} onClick={() => setOpen(false)}>{item.icon}<span>{item.label}</span></GuardedLink>)}</div>}</div>;
}

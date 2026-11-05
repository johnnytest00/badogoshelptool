"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import brandIcon from "@/assets/brand-icon.png";
import { LayoutGrid } from "lucide-react";
import { GuardedLink } from "@/components/navigation/guarded-link";
import { dashboardFunctions, dashboardFunctionRoutes } from "@/features/dashboard/dashboard.data";
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
  })}</div><AccountHub displayName={displayName} email={email} organizations={organizations} organizationId={current} /></nav>;
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { GuardedLink } from "@/components/navigation/guarded-link";
import { dashboardFunctions, dashboardFunctionRoutes } from "@/features/dashboard/dashboard.data";
import { isRouteActive } from "@/components/navigation/routes";

/** Mobilon ez az öt cél fér el kényelmesen az alsó sávban; a többi a Műhelyről érhető el. */
const mobileIds = new Set(["dashboard", "calculators", "execution", "quotes", "material-lists"]);

export function AppNavigationLinks({ organizationId }: Readonly<{ organizationId: string | null }>) {
  const pathname = usePathname();
  // Az útvonal query paramétere a mérvadó (több szervezetnél ez mondja meg, melyikben dolgozunk);
  // ahol nincs ott, a szerveren feloldott egyetlen szervezet a tartalék.
  const current = useSearchParams().get("organization") ?? organizationId;
  if (pathname.startsWith("/bejelentkezes")) return null;
  const suffix = current ? `?organization=${encodeURIComponent(current)}` : "";
  const items = [
    { id: "dashboard", label: "Műhely", icon: LayoutGrid, route: "/" },
    ...dashboardFunctions.map((item) => ({ id: item.id, label: item.label, icon: item.icon, route: dashboardFunctionRoutes[item.id] })),
  ];
  return <nav className="app-nav" aria-label="Alkalmazás navigáció">{items.map((item) => {
    const active = isRouteActive(pathname, item.route);
    const Icon = item.icon;
    return <GuardedLink key={item.id} className={`app-nav-item${active ? " is-active" : ""}${mobileIds.has(item.id) ? "" : " app-nav-item-wide"}`} href={`${item.route}${suffix}`} aria-current={active ? "page" : undefined}>
      <Icon aria-hidden="true" className="app-nav-icon" /><span>{item.label}</span>
    </GuardedLink>;
  })}</nav>;
}

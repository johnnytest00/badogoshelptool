export type DashboardFunction = {
  id: string;
  label: string;
  description: string;
  dashboardIcon: string;
  sidebarIcon: string;
  tone: "orange" | "blue" | "violet" | "green" | "amber";
};

export const navigationIcons = {
  menu: "/images/navigation/sidebar/menu.png",
  settings: "/images/navigation/sidebar/beallitasok.png",
} as const;

export const dashboardFunctions: readonly DashboardFunction[] = [
  // Calculator-first: dimensions are entered in the calculators; the separate survey workflow is retired (M5).
  { id: "calculators", label: "Kalkulátorok", description: "Tető-, lépcső- és betonozási számítások", dashboardIcon: "/images/navigation/dashboard/kalkulatorok.png", sidebarIcon: "/images/navigation/sidebar/kalkulatorok.png", tone: "blue" },
  { id: "execution", label: "Munkanaplók", description: "Feladatok és napi bejegyzések", dashboardIcon: "/images/navigation/dashboard/munkanaplok.png", sidebarIcon: "/images/navigation/sidebar/munkanaplok.png", tone: "orange" },
  { id: "quotes", label: "Árajánlatok", description: "Szerkeszthető ajánlatpiszkozatok", dashboardIcon: "/images/navigation/dashboard/arajanlatok.png", sidebarIcon: "/images/navigation/sidebar/arajanlatok.png", tone: "violet" },
  { id: "material-lists", label: "Anyaglisták", description: "Önálló vagy munkanaplóhoz kapcsolt anyagok", dashboardIcon: "/images/navigation/dashboard/anyaglistak.png", sidebarIcon: "/images/navigation/sidebar/anyaglistak.png", tone: "green" },
  { id: "material-manager", label: "Anyagkezelő", description: "Kategóriák és katalógustermékek kezelése", dashboardIcon: "/images/navigation/dashboard/anyagkezelo.png", sidebarIcon: "/images/navigation/sidebar/anyagkezelo.png", tone: "orange" },
] as const;

export const dashboardFunctionRoutes: Record<string, string> = {
  calculators: "/kalkulatorok",
  quotes: "/ajanlatok",
  "material-lists": "/anyaglistak",
  "material-manager": "/anyagkezelo",
  execution: "/kivitelezes",
};

export function dashboardFunctionHref(id: string, organizationId: string) {
  const route = dashboardFunctionRoutes[id];
  if (!route) throw new Error(`Ismeretlen dashboard funkció: ${id}`);
  return `${route}?organization=${encodeURIComponent(organizationId)}`;
}

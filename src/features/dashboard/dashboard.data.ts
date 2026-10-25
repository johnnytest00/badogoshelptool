import type { LucideIcon } from "lucide-react";
import { Calculator, FileText, PackageOpen, ClipboardList, PackageSearch } from "lucide-react";

export type DashboardFunction = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: "orange" | "blue" | "violet" | "green" | "amber";
};

export const dashboardFunctions: readonly DashboardFunction[] = [
  // Calculator-first: dimensions are entered in the calculators; the separate survey workflow is retired (M5).
  { id: "calculators", label: "Kalkulátorok", description: "Tető-, lépcső- és betonozási számítások", icon: Calculator, tone: "blue" },
  { id: "execution", label: "Munkanaplók", description: "Feladatok és napi bejegyzések", icon: ClipboardList, tone: "orange" },
  { id: "quotes", label: "Árajánlatok", description: "Szerkeszthető ajánlatpiszkozatok", icon: FileText, tone: "violet" },
  { id: "material-lists", label: "Anyaglisták", description: "Önálló vagy munkanaplóhoz kapcsolt anyagok", icon: PackageOpen, tone: "green" },
  { id: "material-manager", label: "Anyagkezelő", description: "Kategóriák és katalógustermékek kezelése", icon: PackageSearch, tone: "orange" },
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

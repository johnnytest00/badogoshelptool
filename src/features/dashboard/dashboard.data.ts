import type { LucideIcon } from "lucide-react";
import { Calculator, FileText, PackageOpen, ClipboardList, ClipboardCheck } from "lucide-react";

export type DashboardFunction = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: "orange" | "blue" | "violet" | "green" | "amber";
};

export const dashboardFunctions: readonly DashboardFunction[] = [
  { id: "field-surveys", label: "Gyors felmérés", description: "Gyors mérések mentése és folytatása", icon: ClipboardCheck, tone: "amber" },
  { id: "execution", label: "Munkanaplók", description: "Feladatok és napi bejegyzések", icon: ClipboardList, tone: "orange" },
  { id: "material-lists", label: "Anyaglisták", description: "Önálló vagy munkanaplóhoz kapcsolt anyagok", icon: PackageOpen, tone: "green" },
  { id: "quotes", label: "Árajánlatok", description: "Szerkeszthető ajánlatpiszkozatok", icon: FileText, tone: "violet" },
  { id: "calculators", label: "Kalkulátorok", description: "Eresz-, szegély- és profilkalkulátorok", icon: Calculator, tone: "blue" },
] as const;

export function dashboardFunctionHref(id: string, organizationId: string) {
  const routes: Record<string, string> = {
    calculators: "/kalkulatorok",
    quotes: "/ajanlatok",
    "material-lists": "/anyaglistak",
    execution: "/kivitelezes",
    "field-surveys": "/felmeresek/uj",
  };
  const route = routes[id];
  if (!route) throw new Error(`Ismeretlen dashboard funkció: ${id}`);
  return `${route}?organization=${encodeURIComponent(organizationId)}`;
}

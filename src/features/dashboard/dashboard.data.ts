import type { LucideIcon } from "lucide-react";
import { Calculator, FileText, FolderKanban, PackageOpen, ClipboardList, ClipboardCheck } from "lucide-react";

export type DashboardFunction = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: "orange" | "blue" | "violet" | "green" | "amber";
};

export type DemoProject = {
  id: string;
  name: string;
  type: string;
  status: "Folyamatban" | "Vázlat" | "Lezárva";
  updatedAt: string;
  canContinue: boolean;
};

export const dashboardFunctions: readonly DashboardFunction[] = [
  { id: "projects", label: "Projektek", description: "Munkák és ügyfelek áttekintése", icon: FolderKanban, tone: "orange" },
  { id: "calculators", label: "Kalkulátorok", description: "Eresz-, szegély- és profilkalkulátorok", icon: Calculator, tone: "blue" },
  { id: "quotes", label: "Árajánlatok", description: "Projektajánlatok, revíziók és PDF-ek", icon: FileText, tone: "violet" },
  { id: "materials", label: "Anyagok", description: "Műhelykatalógus és árverziók", icon: PackageOpen, tone: "green" },
  { id: "execution", label: "Kivitelezés", description: "Tervek, feladatok, munkanaplók és fotók", icon: ClipboardList, tone: "amber" },
  { id: "field-surveys", label: "Helyszíni felmérés", description: "Gyors mérések mentése és folytatása", icon: ClipboardCheck, tone: "amber" },
] as const;

export function dashboardFunctionHref(id: string, organizationId: string) {
  const route = {
    projects: "/projektek",
    calculators: "/kalkulatorok",
    quotes: "/ajanlatok",
    materials: "/anyagok",
    execution: "/kivitelezes",
    "field-surveys": "/felmeresek",
  }[id as "projects" | "calculators" | "quotes" | "materials" | "execution"];
  if (!route) throw new Error(`Ismeretlen dashboard funkció: ${id}`);
  return `${route}?organization=${encodeURIComponent(organizationId)}`;
}

export const demoProjects: readonly DemoProject[] = [
  { id: "family-home", name: "Kovács családi ház — tetőfelújítás", type: "Nyeregtető · cserepes fedés", status: "Folyamatban", updatedAt: "Ma, 09:42", canContinue: true },
  { id: "metal-roof", name: "Nagy utca 18.", type: "Cserepeslemez · felmérés", status: "Vázlat", updatedAt: "Tegnap, 16:18", canContinue: true },
  { id: "gutter", name: "Tóparti műhely", type: "Ereszcsatorna-csere", status: "Lezárva", updatedAt: "2026. október 8.", canContinue: false },
] as const;

export const projectStatusIcons = {
  "Folyamatban": ClipboardList,
  "Vázlat": FileText,
  "Lezárva": FolderKanban,
} as const;

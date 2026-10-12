import type { LucideIcon } from "lucide-react";
import { BriefcaseBusiness, Calculator, FileText, FolderKanban, PackageOpen, Files, ClipboardList } from "lucide-react";

export type DashboardFunction = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: "orange" | "blue" | "violet" | "green" | "amber" | "slate";
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
  { id: "calculators", label: "Kalkulátorok", description: "Tető- és bádogos számítások", icon: Calculator, tone: "blue" },
  { id: "quotes", label: "Árajánlatok", description: "Ajánlatok és verziók", icon: FileText, tone: "violet" },
  { id: "materials", label: "Anyagok", description: "Katalógus és árak", icon: PackageOpen, tone: "green" },
  { id: "work-packages", label: "Munkacsomagok", description: "Ismételhető munkafolyamatok", icon: BriefcaseBusiness, tone: "amber" },
  { id: "documents", label: "Dokumentumok", description: "Műszaki lapok és exportok", icon: Files, tone: "slate" },
] as const;

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

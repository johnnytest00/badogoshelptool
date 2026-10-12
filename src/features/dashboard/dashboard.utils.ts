import type { DashboardTab } from "@/features/dashboard/dashboard.types";

export function getNextDashboardTab(tab: DashboardTab, direction: "forward" | "backward"): DashboardTab {
  if (direction === "forward") return tab === "functions" ? "projects" : "functions";
  return tab === "projects" ? "functions" : "projects";
}

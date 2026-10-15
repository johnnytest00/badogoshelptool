import type { DashboardTab } from "@/features/dashboard/dashboard.types";

export function getNextDashboardTab(tab: DashboardTab, direction: "forward" | "backward"): DashboardTab {
  if (direction === "forward") return tab === "functions" ? "projects" : "functions";
  return tab === "projects" ? "functions" : "projects";
}

export function getDashboardGreeting(hour: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError("Az óra 0 és 23 közötti egész szám lehet.");
  if (hour >= 5 && hour < 11) return "Jó reggelt!";
  if (hour >= 11 && hour < 18) return "Jó napot!";
  if (hour >= 18 && hour < 22) return "Jó estét!";
  return "Jó éjszakát!";
}

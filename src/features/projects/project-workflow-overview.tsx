/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema additions await generated database types. */
import Link from "next/link";
import { ArrowUpRight, Boxes, ClipboardCheck, FileText, House, NotebookPen, PanelTop, Ruler, Waves, type LucideIcon } from "lucide-react";
import { createClient } from "@/infrastructure/supabase/server";

type WorkflowRow = { label: string; count: number; detail: string; href: string };

export function projectWorkflowRows({ projectId, organizationId, roofCount, calculations, takeoffs, quotations, planCount, journalCount, photoCount }: {
  projectId: string; organizationId: string; roofCount: number;
  calculations: Array<{ calculator_type: string; status: string; current_revision_id: string | null }>;
  takeoffs: Array<{ status: string; version: number }>;
  quotations: Array<{ status: string; version: number }>;
  planCount: number; journalCount: number; photoCount: number;
}): WorkflowRow[] {
  const query = `?organization=${organizationId}`;
  const calc = (type: string) => calculations.filter((row) => row.calculator_type === type);
  const calcDetail = (rows: typeof calculations) => rows.length ? `${rows.length} mentett · ${rows.filter((r) => r.status === "current" && r.current_revision_id).length} aktuális` : "Nincs mentett számítás";
  const quoteStatus: Record<string, string> = { draft: "piszkozat", finalized: "véglegesített", sent: "elküldött", accepted: "elfogadott", rejected: "elutasított" };
  const latest = <T extends { version: number }>(rows: T[]) => rows.length ? `Legutóbbi: V${Math.max(...rows.map((r) => r.version))}` : "";
  const statuses = (rows: Array<{ status: string }>, labels: Record<string, string>) => [...new Set(rows.map((row) => row.status))].map((status) => `${rows.filter((row) => row.status === status).length} ${labels[status] ?? "ismeretlen állapotú"}`).join(" · ");
  return [
    { label: "Tetőmodellek", count: roofCount, detail: roofCount ? `${roofCount} mentett modell` : "Nincs mentett modell", href: `#tetomodellek` },
    { label: "Ereszcsatorna", count: calc("gutters.material-estimate").length, detail: calcDetail(calc("gutters.material-estimate")), href: `/projektek/${projectId}/ereszcsatorna${query}` },
    { label: "Szegélyek", count: calc("sheet_metal.flashings.material-estimate").length, detail: calcDetail(calc("sheet_metal.flashings.material-estimate")), href: `/projektek/${projectId}/szegelyek${query}` },
    { label: "Lemezprofilok", count: calc("sheet_metal.profiles.flat-pattern").length, detail: calcDetail(calc("sheet_metal.profiles.flat-pattern")), href: `/projektek/${projectId}/lemezprofilok${query}` },
    { label: "Anyagkimutatások", count: takeoffs.length, detail: takeoffs.length ? `${latest(takeoffs)} · ${statuses(takeoffs, { approved: "jóváhagyott", draft: "piszkozat" })}` : "Nincs anyagkimutatás", href: `/projektek/${projectId}/anyagkimutatas${query}` },
    { label: "Árajánlatok", count: quotations.length, detail: quotations.length ? `${latest(quotations)} · ${statuses(quotations, quoteStatus)}` : "Nincs ajánlat", href: `/projektek/${projectId}/ajanlatok${query}` },
    { label: "Kivitelezési tervek", count: planCount, detail: planCount ? `${planCount} terv` : "Nincs kivitelezési terv", href: `#kivitelezes` },
    { label: "Dokumentáció és munkanapló", count: journalCount + photoCount, detail: `${journalCount} belső naplóbejegyzés · ${photoCount} fénykép`, href: `#kivitelezes` },
  ];
}

export async function getProjectWorkflowRecords(organizationId: string, projectId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as { from: (table: string) => any };
  const [calculations, takeoffs, quotations] = await Promise.all([
    db.from("calculations").select("calculator_type, status, current_revision_id").eq("organization_id", organizationId).eq("project_id", projectId),
    db.from("material_takeoffs").select("status, version").eq("organization_id", organizationId).eq("project_id", projectId).order("updated_at", { ascending: false }),
    db.from("quotations").select("status, version").eq("organization_id", organizationId).eq("project_id", projectId).order("updated_at", { ascending: false }),
  ]);
  if (calculations.error || takeoffs.error || quotations.error) throw new Error("A projektfolyamat összefoglalója nem tölthető be.");
  return { calculations: calculations.data ?? [], takeoffs: takeoffs.data ?? [], quotations: quotations.data ?? [] };
}

export function ProjectWorkflowOverview({ rows }: { rows: WorkflowRow[] }) {
  const icons: Record<string, LucideIcon> = { "Tetőmodellek": House, "Ereszcsatorna": Waves, "Szegélyek": PanelTop, "Lemezprofilok": Ruler, "Anyagkimutatások": Boxes, "Árajánlatok": FileText, "Kivitelezési tervek": ClipboardCheck, "Dokumentáció és munkanapló": NotebookPen };
  return <section className="project-workflow-overview" aria-labelledby="project-workflow-title"><div className="roof-list-heading"><div><h2 id="project-workflow-title">Munka áttekintése</h2></div></div><nav className="project-workflow-grid" aria-label="Projektmunkák"><ul>{rows.map((row) => { const Icon = icons[row.label] ?? FileText; return <li key={row.label}><Link className="project-workflow-link" href={row.href}><span className="project-workflow-icon"><Icon aria-hidden="true" /></span><span className="project-workflow-copy"><strong>{row.label}</strong><small>{row.detail}</small></span><ArrowUpRight aria-hidden="true" className="project-workflow-open" /></Link></li>; })}</ul></nav><p className="project-workflow-note">Az állapotok a mentett adatok összefoglalói. A kalkulációk előzetes eredményei nem jelentenek szakmai jóváhagyást; az elfogadott ajánlat nem aláírt szerződés, a napló belső nyilvántartás.</p></section>;
}

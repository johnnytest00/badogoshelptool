import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getMaterialManufacturers } from "@/features/materials/material-data";
import { MaterialProductForm } from "@/features/materials/material-forms";

export default async function NewMaterialPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const manufacturers = await getMaterialManufacturers(selected.organization.id);
  return <main className="dashboard-shell"><div className="dashboard-container materials-workspace"><Link className="back-link" href={`/anyagok?organization=${selected.organization.id}`}><ArrowLeft className="size-4" /> Vissza az anyagokhoz</Link><section className="material-editor-card"><p className="section-eyebrow">Új anyag</p><h1>Termék hozzáadása</h1><p className="page-lead">A hiányzó műszaki vagy áradat maradjon üresen. Ne jelölj adatot ellenőrzöttnek forrás nélkül.</p><MaterialProductForm organizationId={selected.organization.id} manufacturers={manufacturers} /></section></div></main>;
}

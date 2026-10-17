import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { ArrowLeft } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getMaterialCategories } from "@/features/materials/material-data";
import { MaterialManagerProductForm } from "@/features/materials/material-forms";
import { GlassPageHeader } from "@/components/ui/glass-page-header";

export default async function NewMaterialPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const categories = await getMaterialCategories(selected.organization.id, false);
  return <main className="dashboard-shell"><div className="dashboard-container materials-workspace materials-manager-editor"><Link className="back-link" href={`/anyagok?organization=${selected.organization.id}`}><ArrowLeft className="size-4" /> Vissza az anyagkezelőhöz</Link><GlassPageHeader title="Új termék" context="Egység kötelező · ár opcionális" /><section className="material-editor-card"><MaterialManagerProductForm organizationId={selected.organization.id} categories={categories} /></section></div></main>;
}

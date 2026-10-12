import Link from "next/link";
import { ArrowLeft, Mail, MapPin, Plus, Search, UserRound } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getClientsForOrganization } from "@/features/projects/project-data";

export default async function ClientsPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; search?: string }> }>) {
  const params = await searchParams;
  const selected = await getProjectOrganization(params.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt az ügyfelekhez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organization = selected.organization;
  const clients = await getClientsForOrganization(organization.id);
  const search = params.search?.trim().toLocaleLowerCase("hu-HU") ?? "";
  const filtered = search ? clients.filter((client) => [client.name, client.email, client.phone].some((value) => value?.toLocaleLowerCase("hu-HU").includes(search))) : clients;
  return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/?organization=${organization.id}`}><ArrowLeft className="size-4" /> Vissza a műhelyhez</Link><section className="projects-workspace"><div className="projects-toolbar"><div><p className="section-eyebrow">Kapcsolatok</p><h1>Ügyfelek</h1><p>A műhelyhez tartozó ügyféladatok.</p></div><Link className="primary-button" href={`/ugyfelek/uj?organization=${organization.id}`}><Plus className="size-4" /> Új ügyfél</Link></div><form className="client-search" method="get"><input type="hidden" name="organization" value={organization.id} /><Search className="size-4" aria-hidden="true" /><label className="sr-only" htmlFor="client-search">Ügyfél keresése</label><input id="client-search" name="search" defaultValue={params.search ?? ""} placeholder="Keresés név, e-mail vagy telefon alapján" /><button className="secondary-button" type="submit">Keresés</button></form>{filtered.length === 0 ? <div className="empty-state project-empty-state"><span className="empty-state-icon"><UserRound className="size-5" /></span><div><h2>{search ? "Nincs találat" : "Még nincs ügyfél"}</h2><p>{search ? "Próbálj más keresési feltételt." : "Az első ügyfél létrehozásával gyorsabban társíthatsz projekteket."}</p><Link className="text-action" href={`/ugyfelek/uj?organization=${organization.id}`}><Plus className="size-4" /> Új ügyfél</Link></div></div> : <div className="client-grid">{filtered.map((client) => <article className="client-card" key={client.id}><span className="client-avatar"><UserRound className="size-5" /></span><div><h2>{client.name}</h2>{client.email && <p><Mail className="size-4" />{client.email}</p>}{client.phone && <p><MapPin className="size-4" />{client.phone}</p>}</div><Link className="text-action" href={`/ugyfelek/${client.id}?organization=${organization.id}`}>Megnyitás</Link></article>)}</div>}</section></div></main>;
}

"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "./actions";

export function LogoutButton({ className }: Readonly<{ className?: string }> = {}) {
  return <form action={logoutAction} className={className}><button className="logout-button" type="submit"><LogOut aria-hidden="true" className="size-4" /> Kilépés</button></form>;
}

export function OrganizationSelector({ organizations, selectedId }: Readonly<{ organizations: readonly { id: string; name: string }[]; selectedId?: string }>) {
  return <label className="organization-selector">Szervezet<select value={selectedId ?? ""} onChange={(event) => { const url = new URL(window.location.href); url.searchParams.set("organization", event.target.value); window.location.assign(url.toString()); }}><option value="" disabled>Válassz szervezetet</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>;
}

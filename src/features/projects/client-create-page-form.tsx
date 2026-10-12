"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { createClientAction } from "./project-actions";

export function ClientCreatePageForm({ organizationId }: Readonly<{ organizationId: string }>) {
  const router = useRouter(); const [isPending, startTransition] = useTransition(); const [error, setError] = useState("");
  return <form className="project-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); data.set("organizationId", organizationId); setError(""); startTransition(async () => { const result = await createClientAction(data); if (!result.ok) setError(result.error ?? "A mentés nem sikerült."); else router.push(`/ugyfelek/${result.projectId}?organization=${organizationId}`); }); }}><input type="hidden" name="organizationId" value={organizationId} /><div className="project-form-grid"><label className="project-field"><span>Név<b aria-hidden="true"> *</b></span><input name="name" required /></label><label className="project-field"><span>E-mail</span><input name="email" type="email" /></label><label className="project-field"><span>Telefon</span><input name="phone" inputMode="tel" /></label><label className="project-field"><span>Számlázási cím</span><input name="billingAddress" /></label><label className="project-field project-field-wide"><span>Megjegyzések</span><textarea name="notes" rows={5} /></label></div>{error && <p className="form-message is-error" role="alert">{error}</p>}<div className="form-actions"><button className="primary-button" type="submit" disabled={isPending}>{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Ügyfél létrehozása</button></div></form>;
}

"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Plus, UserRound } from "lucide-react";
import { createClientAction, createProjectAction, updateClientAction, updateProjectAction } from "./project-actions";
import type { ProjectRecord } from "./project-data";
import { projectTypeLabels } from "@/domain/projects/contracts";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";

type ClientOption = { id: string; name: string };

function ActionMessage({ error, success }: Readonly<{ error?: string; success?: string }>) {
  if (!error && !success) return null;
  return <p className={`form-message ${error ? "is-error" : "is-success"}`} role="status">{error ?? success}</p>;
}

function TextField({ label, name, defaultValue, type = "text", required = false, placeholder }: Readonly<{ label: string; name: string; defaultValue?: string | null; type?: string; required?: boolean; placeholder?: string }>) {
  return <label className="project-field"><span>{label}{required && <b aria-hidden="true"> *</b>}</span><input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} placeholder={placeholder} /></label>;
}

export function ClientQuickCreate({ organizationId, onCreated }: Readonly<{ organizationId: string; onCreated: (id: string, name: string) => void }>) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  if (!open) return <button className="secondary-button inline-button" type="button" onClick={() => setOpen(true)}><Plus aria-hidden="true" className="size-4" /> Új ügyfél gyorsan</button>;
  return <div className="quick-create-panel"><div className="inline-panel-heading"><strong>Új ügyfél</strong><button className="text-button" type="button" onClick={() => setOpen(false)}>Mégse</button></div><form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); setError(""); startTransition(async () => { const result = await createClientAction(formData); if (!result.ok) setError(result.error ?? "A mentés nem sikerült."); else { const name = String(formData.get("name") ?? ""); onCreated(result.projectId ?? "", name); setOpen(false); } }); }}><input type="hidden" name="organizationId" value={organizationId} /><TextField label="Név" name="name" required placeholder="Ügyfél neve" /><div className="form-actions"><button className="primary-button" type="submit" disabled={isPending}>{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Mentés</button></div><ActionMessage error={error} /></form></div>;
}

export function ProjectCreateForm({ organizationId, clients }: Readonly<{ organizationId: string; clients: readonly ClientOption[] }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [clientOptions, setClientOptions] = useState(clients);
  const [selectedClientId, setSelectedClientId] = useState("");
  const handleClientCreated = (id: string, name: string) => { setClientOptions((current) => [...current, { id, name }]); setSelectedClientId(id); };
  return <div className="project-form"><ClientQuickCreate organizationId={organizationId} onCreated={handleClientCreated} /><form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); formData.set("clientId", selectedClientId); setError(""); startTransition(async () => { const result = await createProjectAction(formData); if (!result.ok) setError(result.error ?? "A mentés nem sikerült."); else router.push(`/projektek/${result.projectId}?organization=${organizationId}`); }); }}><input type="hidden" name="organizationId" value={organizationId} /><div className="project-form-grid"><TextField label="Projekt neve" name="name" required placeholder="Például: Kossuth utca tetőfelújítás" /><label className="project-field"><span>Munkatípus<b aria-hidden="true"> *</b></span><select name="projectType" defaultValue="roof_renovation">{Object.entries(projectTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><TextField label="Helyszín" name="location" placeholder="Település, utca" /><label className="project-field project-field-wide"><span>Leírás</span><textarea name="description" rows={4} placeholder="Rövid munkaleírás, megjegyzések" /></label><label className="project-field project-field-wide"><span>Ügyfél</span><select name="clientId" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}><option value="">Ügyfél nélkül folytatom</option>{clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label></div><ActionMessage error={error} /><div className="form-actions"><button className="primary-button" type="submit" disabled={isPending}>{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Projekt létrehozása</button></div></form></div>;
}

export function ProjectEditForm({ organizationId, project, clients }: Readonly<{ organizationId: string; project: ProjectRecord; clients: readonly ClientOption[] }>) {
  const router = useRouter();
  const { notify } = useAppInteraction();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const baseline = JSON.stringify({ name: project.name, projectType: project.projectType, location: project.location ?? "", description: project.description ?? "", clientId: project.clientId ?? "" });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = useCallback(async (refreshAfterSave: boolean) => {
    const form = formRef.current;
    if (!form || isPending) return false;
    setError("");
    const formData = new FormData(form);
    const result = await updateProjectAction(formData);
    if (!result.ok) { const message = result.error ?? "A mentés nem sikerült."; setError(message); throw new Error(message); }
    setDirty(false);
    setSaved(true);
    notify({ kind: "success", message: "Projektadatok mentve." });
    if (refreshAfterSave) router.refresh();
    return true;
  }, [isPending, notify, router]);
  const saveAndLeave = useCallback(() => save(false), [save]);
  useUnsavedChangeGuard({ dirty, pending: isPending, save: saveAndLeave, discard: () => { formRef.current?.reset(); setDirty(false); setSaved(false); setError(""); } });
  return <form ref={formRef} className="project-form" onChange={() => {
    const form = formRef.current; if (!form) return;
    const values = new FormData(form);
    const current = { name: String(values.get("name") ?? ""), projectType: String(values.get("projectType") ?? ""), location: String(values.get("location") ?? ""), description: String(values.get("description") ?? ""), clientId: String(values.get("clientId") ?? "") };
    setDirty(JSON.stringify(current) !== baseline); setSaved(false);
  }} onSubmit={(event) => { event.preventDefault(); startTransition(async () => { try { await save(true); } catch { /* The inline form error explains the failed save. */ } }); }}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="version" value={project.version} /><div className="project-form-grid"><TextField label="Projekt neve" name="name" defaultValue={project.name} required /><label className="project-field"><span>Munkatípus<b aria-hidden="true"> *</b></span><select name="projectType" defaultValue={project.projectType}>{Object.entries(projectTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><TextField label="Helyszín" name="location" defaultValue={project.location} /><label className="project-field project-field-wide"><span>Leírás</span><textarea name="description" rows={4} defaultValue={project.description ?? ""} /></label><label className="project-field project-field-wide"><span>Ügyfél</span><select name="clientId" defaultValue={project.clientId ?? ""}><option value="">Ügyfél nélkül</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label></div><ActionMessage error={error} success={saved && !error && !isPending ? "Projektadatok mentve." : undefined} /><div className="form-actions"><button className="primary-button" type="submit" disabled={isPending}>{isPending ? <LoaderCircle className="size-4 interaction-spinner" /> : <Check className="size-4" />} {isPending ? "Mentés…" : "Változások mentése"}</button></div></form>;
}

export function ClientEditForm({ organizationId, client }: Readonly<{ organizationId: string; client: { id: string; name: string; email: string | null; phone: string | null; billing_address: string | null; notes: string | null } }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <form className="project-form" onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); setError(""); startTransition(async () => { const result = await updateClientAction(formData); if (!result.ok) setError(result.error ?? "A mentés nem sikerült."); else router.refresh(); }); }}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="clientId" value={client.id} /><div className="project-form-grid"><TextField label="Név" name="name" defaultValue={client.name} required /><TextField label="E-mail" name="email" type="email" defaultValue={client.email} /><TextField label="Telefon" name="phone" defaultValue={client.phone} /><TextField label="Számlázási cím" name="billingAddress" defaultValue={client.billing_address} /><label className="project-field project-field-wide"><span>Megjegyzések</span><textarea name="notes" rows={5} defaultValue={client.notes ?? ""} /></label></div><ActionMessage error={error} /><div className="form-actions"><button className="primary-button" type="submit" disabled={isPending}>{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Ügyfél mentése</button></div></form>;
}

export function ClientBadge() { return <UserRound aria-hidden="true" className="size-4" />; }

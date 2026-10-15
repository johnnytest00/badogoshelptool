"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Photo = { id: string; filename: string; mimeType: string; fileSize: number; description: string | null; uploadedAt?: string; url: string | null };
type QueuedPhoto = { key: string; file: File };

export function FieldSurveyPhotos({ organizationId, surveyId, version, onVersionChange, onEnsureSaved, onUploadComplete }: Readonly<{
  organizationId: string; surveyId: string | null; version: number;
  onVersionChange: (version: number) => void;
  onEnsureSaved: () => Promise<{ surveyId: string; version: number } | null>;
  onUploadComplete: (surveyId: string) => void;
}>) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const versionRef = useRef(version);
  const busyRef = useRef(false);

  useEffect(() => { versionRef.current = version; }, [version]);

  const refreshPhotos = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/felmeresek/${id}/photos?organization=${encodeURIComponent(organizationId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "A fényképek betöltése nem sikerült.");
      setPhotos(result.photos as Photo[]);
      versionRef.current = result.version; onVersionChange(result.version);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "A fényképek nem érhetők el."); }
    finally { setLoading(false); }
  }, [organizationId, onVersionChange]);

  useEffect(() => { if (surveyId) void refreshPhotos(surveyId); }, [surveyId, refreshPhotos]);

  async function uploadQueued(items: readonly QueuedPhoto[]) {
    if (busyRef.current || items.length === 0) return;
    busyRef.current = true; setUploading(true); setError("");
    let activeSurveyId = surveyId;
    try {
      if (!activeSurveyId) {
        const saved = await onEnsureSaved();
        if (!saved) throw new Error("A felmérés mentése sikertelen; a mérések javítása után próbáld újra a fényképet.");
        activeSurveyId = saved.surveyId; versionRef.current = saved.version; onVersionChange(saved.version);
      }
      for (const item of items) {
        const data = new FormData();
        data.set("organizationId", organizationId); data.set("requestKey", item.key);
        data.set("expectedVersion", String(versionRef.current)); data.set("description", description); data.set("file", item.file);
        const response = await fetch(`/api/felmeresek/${activeSurveyId}/photos`, { method: "POST", body: data });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error ?? "A fénykép feltöltése nem sikerült.");
        versionRef.current = result.version; onVersionChange(result.version);
        setPhotos((current) => [...current.filter((photo) => photo.id !== result.photo.id), result.photo as Photo]);
        setQueue((current) => current.filter((queued) => queued.key !== item.key));
      }
      setDescription("");
      onUploadComplete(activeSurveyId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A fénykép feltöltése nem sikerült. A mérési adatok megmaradtak.");
      if (activeSurveyId) await refreshPhotos(activeSurveyId);
    } finally { setUploading(false); busyRef.current = false; }
  }

  function selectFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const items = Array.from(fileList).map((file) => ({ key: crypto.randomUUID(), file }));
    setQueue((current) => [...current, ...items]);
    queueUploadAfterRender(items);
  }

  function queueUploadAfterRender(items: readonly QueuedPhoto[]) {
    queueMicrotask(() => { void uploadQueued(items); });
  }

  async function removePhoto(photo: Photo) {
    if (!window.confirm("Eltávolítod ezt a fényképet a felmérés aktuális változatából? A korábbi változatok fényképhivatkozása megmarad.")) return;
    setError("");
    try {
      const response = await fetch(`/api/felmeresek/${surveyId}/photos`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId, photoId: photo.id, expectedVersion: versionRef.current }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "A fénykép eltávolítása nem sikerült.");
      versionRef.current = result.version; onVersionChange(result.version); setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "A fénykép eltávolítása nem sikerült."); }
  }

  return <section className="field-survey-photos" aria-labelledby="field-survey-photos-title">
    <div className="field-survey-section-heading"><div><h2 id="field-survey-photos-title">Fényképek</h2><p>Privát képek; a változtatás új felmérésverziót hoz létre.</p></div>
      <button className="field-survey-add" type="button" disabled={uploading || loading} onClick={() => inputRef.current?.click()}><Plus aria-hidden="true" className="size-4" />{uploading ? "Feltöltés…" : "Fénykép hozzáadása"}</button>
      <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" onChange={(event) => { selectFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
    </div>
    <details className="field-survey-photo-details"><summary>Leírás a kiválasztott fényképekhez · opcionális</summary><label><span>Fényképleírás</span><input maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Például északi ereszcsomópont" /></label></details>
    <p className="field-survey-photo-help">JPEG, PNG vagy WebP · legfeljebb 10 MB/kép. iPhone-on HEIC esetén válaszd a Kamera beállításainál a „Kompatibilis” formátumot.</p>
    {loading && <p role="status">Fényképek betöltése…</p>}
    {uploading && <progress className="field-survey-photo-progress" aria-label="Fényképfeltöltés folyamatban" />}
    {queue.length > 0 && <div className="field-survey-photo-queue"><p>{queue.length} kiválasztott fénykép vár feltöltésre.</p><button className="secondary-button" type="button" disabled={uploading} onClick={() => void uploadQueued(queue)}>Feltöltés újrapróbálása</button></div>}
    {photos.length > 0 && <div className="field-survey-photo-grid">{photos.map((photo) => <article className="field-survey-photo-card" key={photo.id}>
      {photo.url ? <img src={photo.url} alt={photo.description || photo.filename} loading="lazy" /> : <div className="field-survey-photo-missing">Előnézet nem érhető el</div>}
      <div><strong>{photo.description || photo.filename}</strong><small>{(photo.fileSize / 1024 / 1024).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} MB</small></div>
      <button className="secondary-button" type="button" onClick={() => void removePhoto(photo)} disabled={uploading}><Trash2 aria-hidden="true" className="size-4" />Eltávolítás</button>
    </article>)}</div>}
    {!loading && photos.length === 0 && queue.length === 0 && <p className="field-survey-photo-empty">Még nincs fénykép.</p>}
    {error && <p className="form-message is-error" role="alert">{error}</p>}
  </section>;
}

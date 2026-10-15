"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { validateSurveyPhotoSelection } from "@/domain/field-surveys/photo-file";

type Photo = { id: string; filename: string; mimeType: string; fileSize: number; description: string | null; uploadedAt?: string; url: string | null };
type QueuedPhoto = { key: string; file: File };

export function FieldSurveyPhotos({ organizationId, surveyId, version, historical = false, onVersionChange, onEnsureSaved, onUploadComplete, onPendingChange }: Readonly<{
  organizationId: string; surveyId: string | null; version: number; historical?: boolean;
  onVersionChange: (version: number) => void;
  onEnsureSaved: () => Promise<{ surveyId: string; version: number } | null>;
  onUploadComplete: (surveyId: string) => void;
  onPendingChange?: (state: { busy: boolean; queued: boolean }) => void;
}>) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const versionRef = useRef(version);
  const busyRef = useRef(false);
  const refreshRef = useRef(0);

  useEffect(() => { versionRef.current = version; }, [version]);
  useEffect(() => { onPendingChange?.({ busy: uploading || removingPhotoId !== null, queued: queue.length > 0 }); }, [queue.length, uploading, removingPhotoId, onPendingChange]);

  const refreshPhotos = useCallback(async (id: string, selectedVersion: number) => {
    const request = ++refreshRef.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/felmeresek/${id}/photos?organization=${encodeURIComponent(organizationId)}&version=${selectedVersion}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "A fényképek betöltése nem sikerült.");
      if (request !== refreshRef.current) return;
      setPhotos(result.photos as Photo[]);
      if (!historical) { versionRef.current = result.currentVersion; onVersionChange(result.currentVersion); }
    } catch (cause) { if (request === refreshRef.current) setError(cause instanceof Error ? cause.message : "A fényképek nem érhetők el."); }
    finally { if (request === refreshRef.current) setLoading(false); }
  }, [organizationId, historical, onVersionChange]);

  useEffect(() => { if (surveyId) void refreshPhotos(surveyId, version); }, [surveyId, version, refreshPhotos]);

  async function uploadQueued(items: readonly QueuedPhoto[]) {
    if (busyRef.current || historical || items.length === 0) return;
    busyRef.current = true; setUploading(true); setError(""); setUploadStep(0); setUploadTotal(items.length);
    let activeSurveyId = surveyId;
    try {
      if (!activeSurveyId) {
        const saved = await onEnsureSaved();
        if (!saved) throw new Error("A felmérés mentése sikertelen; a mérések javítása után próbáld újra a fényképet.");
        activeSurveyId = saved.surveyId; versionRef.current = saved.version; onVersionChange(saved.version);
      }
      for (const [index, item] of items.entries()) {
        setUploadStep(index + 1);
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
      if (activeSurveyId) await refreshPhotos(activeSurveyId, versionRef.current);
    } finally { setUploading(false); setUploadStep(0); busyRef.current = false; }
  }

  function selectFiles(fileList: FileList | null) {
    if (!fileList?.length || historical || busyRef.current) return;
    const files = Array.from(fileList);
    const invalid = files.map(validateSurveyPhotoSelection).find((result) => !result.ok);
    if (invalid && !invalid.ok) { setError(invalid.error); return; }
    const items = files.map((file) => ({ key: crypto.randomUUID(), file }));
    setQueue((current) => [...current, ...items]);
    queueUploadAfterRender(items);
  }

  function queueUploadAfterRender(items: readonly QueuedPhoto[]) {
    queueMicrotask(() => { void uploadQueued(items); });
  }

  async function removePhoto(photo: Photo) {
    if (busyRef.current || historical) return;
    if (!window.confirm("Eltávolítod ezt a fényképet a felmérés aktuális változatából? A korábbi változatok fényképhivatkozása megmarad.")) return;
    busyRef.current = true; setRemovingPhotoId(photo.id); setError("");
    try {
      const response = await fetch(`/api/felmeresek/${surveyId}/photos`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId, photoId: photo.id, expectedVersion: versionRef.current }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "A fénykép eltávolítása nem sikerült.");
      versionRef.current = result.version; onVersionChange(result.version); setPhotos((current) => current.filter((item) => item.id !== photo.id));
      if (surveyId) onUploadComplete(surveyId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "A fénykép eltávolítása nem sikerült."); }
    finally { busyRef.current = false; setRemovingPhotoId(null); }
  }

  return <section className="field-survey-photos" aria-labelledby="field-survey-photos-title">
    <div className="field-survey-section-heading"><div><h2 id="field-survey-photos-title">Fényképek</h2><p>{historical ? `A V${version} változat saját fényképei.` : "Privát képek; a változtatás új felmérésverziót hoz létre."}</p></div>
      {!historical && <><button className="field-survey-add" type="button" disabled={uploading || loading || removingPhotoId !== null} onClick={() => inputRef.current?.click()}><Plus aria-hidden="true" className="size-4" />{uploading ? "Feltöltés…" : "Fénykép hozzáadása"}</button>
      <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple capture="environment" disabled={uploading || removingPhotoId !== null} onChange={(event) => { selectFiles(event.currentTarget.files); event.currentTarget.value = ""; }} /></>}
    </div>
    {!historical && <><details className="field-survey-photo-details"><summary>Leírás a kiválasztott fényképekhez · opcionális</summary><label><span>Fényképleírás</span><input maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Például északi ereszcsomópont" /></label></details>
    <p className="field-survey-photo-help">JPEG, PNG vagy WebP · legfeljebb 10 MB/kép. HEIC/HEIF képnél az iPhone Kamera beállításaiban válaszd a „Leginkább kompatibilis” formátumot, majd készíts új képet.</p></>}
    {loading && <p role="status">Fényképek betöltése…</p>}
    {uploading && <div role="status"><p>Fénykép feltöltése: {uploadStep}/{uploadTotal}</p><progress className="field-survey-photo-progress" aria-label="Fényképfeltöltés folyamatban" value={Math.max(0, uploadStep - 1)} max={uploadTotal} /></div>}
    {removingPhotoId && <p role="status">Fénykép eltávolítása…</p>}
    {queue.length > 0 && !historical && <div className="field-survey-photo-queue"><p>{queue.length} kiválasztott fénykép vár feltöltésre.</p>{queue.map((item) => <div key={item.key}><span>{item.file.name}</span><button className="secondary-button" type="button" disabled={uploading} onClick={() => setQueue((current) => current.filter((queued) => queued.key !== item.key))}>Elvetés</button></div>)}<button className="secondary-button" type="button" disabled={uploading} onClick={() => void uploadQueued(queue)}>Feltöltés újrapróbálása</button></div>}
    {photos.length > 0 && <div className="field-survey-photo-grid">{photos.map((photo) => <article className="field-survey-photo-card" key={photo.id}>
      {photo.url ? <img src={photo.url} alt={photo.description || photo.filename} loading="lazy" /> : <div className="field-survey-photo-missing">Előnézet nem érhető el</div>}
      <div><strong>{photo.description || photo.filename}</strong><small>{(photo.fileSize / 1024 / 1024).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} MB</small></div>
      {!historical && <button className="secondary-button" type="button" onClick={() => void removePhoto(photo)} disabled={uploading || removingPhotoId !== null}><Trash2 aria-hidden="true" className="size-4" />Eltávolítás</button>}
    </article>)}</div>}
    {!loading && photos.length === 0 && queue.length === 0 && <p className="field-survey-photo-empty">Még nincs fénykép.</p>}
    {error && <p className="form-message is-error" role="alert">{error}</p>}
  </section>;
}

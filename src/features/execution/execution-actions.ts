"use server";
/* eslint-disable @typescript-eslint/no-explicit-any -- RPC return shape is generated after migration deployment. */
import { revalidatePath } from "next/cache";
import { createClient } from "@/infrastructure/supabase/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { executionJournalCategorySchema, executionPlanSchema, executionTaskSchema } from "@/domain/execution/contracts";

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const PHOTO_BUCKET = "execution-photos";
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
type Rpc = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: any; error: { code?: string; message?: string } | null }> };
function errorMessage(error: { code?: string; message?: string } | null, fallback: string) { return error?.code === "40001" || error?.message?.includes("stale") ? "Az adat időközben megváltozott; töltsd újra az oldalt." : error?.message ?? fallback; }
async function access(organizationId: string) { const auth = await getAuthContext(); return auth?.organizations.some((org) => org.id === organizationId) ? auth : null; }

export async function createExecutionPlanAction(data: FormData) {
  const organizationId = text(data, "organizationId"), projectId = text(data, "projectId");
  if (!await access(organizationId)) return { ok: false, error: "Nincs jogosultságod ehhez a műhelyhez." };
  const parsed = executionPlanSchema.safeParse({ title: text(data, "title"), description: text(data, "description") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ellenőrizd a terv adatait." };
  const db = await createClient() as unknown as Rpc;
  const { data: result, error } = await db.rpc("create_execution_plan", { p_organization_id: organizationId, p_project_id: projectId, p_title: parsed.data.title, p_description: parsed.data.description || null, p_source_quotation_id: text(data, "sourceQuotationId") || null, p_source_revision_id: text(data, "sourceRevisionId") || null, p_request_key: text(data, "requestKey") || crypto.randomUUID() });
  if (error || !result?.[0]) return { ok: false, error: errorMessage(error, "A terv létrehozása nem sikerült.") };
  revalidatePath(`/projektek/${projectId}`); return { ok: true, planId: result[0].plan_id };
}

export async function saveExecutionTaskAction(data: FormData) {
  const organizationId = text(data, "organizationId"), projectId = text(data, "projectId"), planId = text(data, "planId");
  if (!await access(organizationId)) return { ok: false, error: "Nincs jogosultságod ehhez a műhelyhez." };
  const parsed = executionTaskSchema.safeParse({ title: text(data, "title"), description: text(data, "description"), status: text(data, "status") || "todo", priority: text(data, "priority") || "normal", dueDate: text(data, "dueDate"), sortOrder: text(data, "sortOrder") || "0", version: text(data, "version") || "0" });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ellenőrizd a feladat adatait." };
  const db = await createClient() as unknown as Rpc;
  const { data: result, error } = await db.rpc("save_execution_task", { p_organization_id: organizationId, p_plan_id: planId, p_task_id: text(data, "taskId") || null, p_title: parsed.data.title, p_description: parsed.data.description || null, p_status: parsed.data.status, p_priority: parsed.data.priority, p_due_date: parsed.data.dueDate || null, p_sort_order: parsed.data.sortOrder, p_expected_version: parsed.data.version, p_request_key: text(data, "requestKey") || crypto.randomUUID() });
  if (error || !result?.[0]) return { ok: false, error: errorMessage(error, "A feladat mentése nem sikerült.") };
  revalidatePath(`/projektek/${projectId}`); return { ok: true, taskId: result[0].task_id };
}

export async function createExecutionJournalEntryAction(data: FormData) {
  const organizationId = text(data, "organizationId"), projectId = text(data, "projectId"), planId = text(data, "planId");
  if (!await access(organizationId)) return { ok: false, error: "Nincs jogosultságod ehhez a műhelyhez." };
  const category = executionJournalCategorySchema.safeParse(text(data, "category") || "general");
  const workDate = text(data, "workDate");
  if (!category.success || !/^\d{4}-\d{2}-\d{2}$/.test(workDate) || !text(data, "content")) return { ok: false, error: "Add meg a munkavégzés dátumát és a bejegyzés tartalmát." };
  const db = await createClient() as unknown as Rpc;
  const { data: result, error } = await db.rpc("create_execution_journal_entry", { p_organization_id: organizationId, p_plan_id: planId, p_task_id: text(data, "taskId") || null, p_work_date: workDate, p_category: category.data, p_content: text(data, "content"), p_problems: text(data, "problems") || null, p_next_steps: text(data, "nextSteps") || null, p_request_key: text(data, "requestKey") || crypto.randomUUID() });
  if (error || !result?.[0]) return { ok: false, error: errorMessage(error, "A naplóbejegyzés mentése nem sikerült.") };
  revalidatePath(`/projektek/${projectId}`); return { ok: true, entryId: result[0].entry_id };
}

function safeDisplayFilename(name: string, mimeType: string) {
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
  const candidate = name.split(/[\\/]/).pop()?.split("").filter((character) => { const code = character.charCodeAt(0); return code >= 32 && code !== 127; }).join("").trim().slice(0, 240);
  return candidate || `kivitelezesi-fenykep.${extension}`;
}

async function matchesImageSignature(file: File, mimeType: string) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export async function createExecutionPhotoAction(data: FormData) {
  const organizationId = text(data, "organizationId"), projectId = text(data, "projectId"), planId = text(data, "planId");
  if (!await access(organizationId)) return { ok: false, uploaded: 0, error: "Nincs jogosultságod ehhez a műhelyhez." };
  const values = data.getAll("photos").filter((value): value is File => typeof value === "object" && value !== null && "arrayBuffer" in value);
  if (!values.length) return { ok: false, uploaded: 0, error: "Válassz legalább egy JPEG, PNG vagy WebP képet." };
  const supabase = await createClient();
  let uploaded = 0;
  for (const file of values) {
    const mimeType = file.type.toLowerCase();
    if (!supportedMimeTypes.has(mimeType)) return { ok: false, uploaded, error: "Csak JPEG, PNG és WebP kép tölthető fel. HEIC/HEIF jelenleg nem támogatott." };
    if (file.size < 1 || file.size > MAX_PHOTO_SIZE) return { ok: false, uploaded, error: "Egy kép legfeljebb 10 MB lehet." };
    if (!await matchesImageSignature(file, mimeType)) return { ok: false, uploaded, error: "A fájl tartalma nem egyezik a megadott képformátummal." };
    const requestKey = crypto.randomUUID();
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
    const objectKey = `${organizationId}/${projectId}/${planId}/${requestKey}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(objectKey, file, { contentType: mimeType, cacheControl: "3600", upsert: false });
    if (uploadError) return { ok: false, uploaded, error: "A kép feltöltése nem sikerült. Ellenőrizd a kapcsolatot, majd próbáld újra." };
    const db = supabase as unknown as Rpc;
    const { data: result, error: metadataError } = await db.rpc("create_execution_photo", { p_organization_id: organizationId, p_project_id: projectId, p_plan_id: planId, p_task_id: text(data, "taskId") || null, p_journal_entry_id: text(data, "journalEntryId") || null, p_object_key: objectKey, p_display_filename: safeDisplayFilename(file.name, mimeType), p_mime_type: mimeType, p_file_size: file.size, p_caption: text(data, "caption") || null, p_request_key: requestKey });
    if (metadataError || !result?.[0]?.photo_id) {
      await supabase.storage.from(PHOTO_BUCKET).remove([objectKey]);
      return { ok: false, uploaded, error: "A kép metaadatainak mentése nem sikerült; a feltöltött fájlt eltávolítottuk." };
    }
    uploaded += 1;
  }
  revalidatePath(`/projektek/${projectId}`);
  return { ok: true, uploaded };
}

import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { getFieldSurvey } from "@/features/field-surveys/field-survey-data";
import { createClient } from "@/infrastructure/supabase/server";
import { attachFieldSurveyPhoto, cancelFieldSurveyPhotoUpload, removeFieldSurveyPhoto, reserveFieldSurveyPhoto } from "@/infrastructure/supabase/field-survey-photo-writer";

const maxPhotoBytes = 10 * 1024 * 1024;
const allowedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const failure = (error: string, status: number) => Response.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

function sqlStatus(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === "40001" ? 409 : code === "42501" ? 403 : code === "22023" ? 422 : 502;
}

function matchesImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte);
  if (mimeType === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  return false;
}

function safeFilename(value: string, extension: string) {
  const base = value.split(/[\\/]/).pop()?.normalize("NFKC").replace(/[^\p{L}\p{N}._ -]/gu, "_").replace(/^\.+/, "").trim().slice(0, 245) || "fénykép";
  return `${base.replace(/\.[^.]*$/, "") || "fénykép"}.${extension}`;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await context.params;
  if (!uuidPattern.test(surveyId)) return failure("A felmérés nem található.", 404);
  const auth = await getAuthContext();
  if (!auth) return failure("Jelentkezz be a fényképek megtekintéséhez.", 401);
  const organizationId = new URL(_request.url).searchParams.get("organization") ?? "";
  if (!auth.organizations.some((organization) => organization.id === organizationId)) return failure("Nincs hozzáférés ehhez a műhelyhez.", 403);
  const survey = await getFieldSurvey(organizationId, surveyId);
  if (!survey) return failure("A felmérés vagy a fényképei nem érhetők el.", 404);
  const supabase = await createClient();
  const { data, error } = await supabase.from("field_survey_photos").select("id, object_key, display_filename, mime_type, file_size, description, uploaded_at")
    .eq("survey_id", surveyId).is("removed_at", null).order("uploaded_at", { ascending: true });
  if (error) return failure("A fényképek listája nem tölthető be.", 502);
  const photos = await Promise.all((data ?? []).map(async (photo) => {
    const { data: signed, error: signError } = await supabase.storage.from("field-survey-photos").createSignedUrl(photo.object_key, 900);
    return signError || !signed ? null : { id: photo.id, filename: photo.display_filename, mimeType: photo.mime_type, fileSize: photo.file_size, description: photo.description, uploadedAt: photo.uploaded_at, url: signed.signedUrl };
  }));
  return Response.json({ ok: true, version: survey.version, photos: photos.filter(Boolean) }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(request: NextRequest, context: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await context.params;
  if (!uuidPattern.test(surveyId)) return failure("A felmérés nem található.", 404);
  const auth = await getAuthContext();
  if (!auth) return failure("Jelentkezz be a fénykép feltöltéséhez.", 401);
  let form: FormData;
  try { form = await request.formData(); } catch { return failure("A feltöltési adatok nem olvashatók.", 400); }
  const organizationId = String(form.get("organizationId") ?? "");
  const requestKey = String(form.get("requestKey") ?? "");
  const expectedVersion = Number(form.get("expectedVersion"));
  const description = String(form.get("description") ?? "").trim();
  const file = form.get("file");
  if (!uuidPattern.test(organizationId) || !uuidPattern.test(requestKey) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1
    || description.length > 1000 || !(file instanceof File)) return failure("A fénykép feltöltési adatai hiányosak.", 422);
  if (!auth.organizations.some((organization) => organization.id === organizationId)) return failure("Nincs hozzáférés ehhez a műhelyhez.", 403);
  if (file.size < 1 || file.size > maxPhotoBytes) return failure("A fénykép mérete legfeljebb 10 MB lehet.", 413);
  const extension = allowedTypes.get(file.type);
  if (!extension) return failure("A rendszer JPEG, PNG és WebP képet fogad. iPhone-on HEIC helyett válaszd a Kompatibilis formátumot a Kamera beállításainál.", 415);
  const survey = await getFieldSurvey(organizationId, surveyId);
  if (!survey) return failure("A felmérés nem található vagy nincs hozzáférésed.", 404);

  const supabase = await createClient();
  const key = `${organizationId}/${surveyId}/${requestKey}.${extension}`;
  const filename = safeFilename(file.name, extension);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesImageSignature(bytes, file.type)) return failure("A fájl tartalma nem egyezik a kiválasztott képtípussal.", 415);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  let reservation: Awaited<ReturnType<typeof reserveFieldSurveyPhoto>>;
  try {
    reservation = await reserveFieldSurveyPhoto({ surveyId, organizationId, photoId: requestKey, objectKey: key,
      filename, mimeType: file.type, fileSize: file.size, sha256, description: description || null,
      requestKey, expectedVersion, actorId: auth.userId });
  } catch (error) {
    const status = sqlStatus(error);
    return failure(status === 409 ? "A felmérést közben módosították. Frissítsd az oldalt, majd ellenőrizd az adatokat." : status === 403 ? "Nincs jogosultságod ehhez a felméréshez." : status === 422 ? "A fénykép adatai érvénytelenek." : "A feltöltés előkészítése nem sikerült.", status);
  }
  if (reservation.reused) {
    const { data: existing } = await supabase.from("field_survey_photos")
      .select("upload_state, display_filename, mime_type, file_size, description, object_key")
      .eq("id", requestKey).eq("survey_id", surveyId).maybeSingle();
    if (existing?.upload_state === "active") {
      const { data: signed } = await supabase.storage.from("field-survey-photos").createSignedUrl(existing.object_key, 900);
      return Response.json({ ok: true, version: survey.version, photo: { id: requestKey, filename: existing.display_filename, mimeType: existing.mime_type, fileSize: existing.file_size, description: existing.description, url: signed?.signedUrl ?? null } }, { headers: { "Cache-Control": "no-store, private" } });
    }
  }
  const { error: uploadError } = await supabase.storage.from("field-survey-photos").upload(key, bytes, { contentType: file.type, upsert: reservation.reused });
  if (uploadError) {
    console.error("Field survey photo storage upload failed", { status: uploadError.status, statusCode: uploadError.statusCode });
    return failure("A fénykép feltöltése nem sikerült. Próbáld újra; a felmérés mérései megmaradtak.", 502);
  }
  let attached: Awaited<ReturnType<typeof attachFieldSurveyPhoto>>;
  try {
    attached = await attachFieldSurveyPhoto({ surveyId, organizationId, photoId: requestKey, expectedVersion: reservation.version, actorId: auth.userId });
  } catch (error) {
    const status = sqlStatus(error);
    if (status !== 502) {
      await supabase.storage.from("field-survey-photos").remove([key]);
      await cancelFieldSurveyPhotoUpload(requestKey, auth.userId).catch(() => undefined);
    }
    const message = status === 409 ? "A felmérést közben módosították. Frissítsd az oldalt, majd ellenőrizd az adatokat." : status === 403 ? "Nincs jogosultságod ehhez a felméréshez." : "A fénykép nem kapcsolható a felméréshez. A mérési adatok megmaradtak.";
    return failure(message, status);
  }
  const { data: signed } = await supabase.storage.from("field-survey-photos").createSignedUrl(key, 900);
  return Response.json({ ok: true, version: attached.version, photo: { id: requestKey, filename, mimeType: file.type, fileSize: file.size, description: description || null, url: signed?.signedUrl ?? null } }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await context.params;
  const auth = await getAuthContext();
  if (!auth) return failure("Jelentkezz be a fénykép eltávolításához.", 401);
  let body: { organizationId?: string; photoId?: string; expectedVersion?: number };
  try { body = await request.json(); } catch { return failure("A kérés adatai nem olvashatók.", 400); }
  if (!uuidPattern.test(surveyId) || !uuidPattern.test(body.organizationId ?? "") || !uuidPattern.test(body.photoId ?? "") || !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion! < 1) return failure("A fénykép azonosítója vagy verziója érvénytelen.", 422);
  if (!auth.organizations.some((organization) => organization.id === body.organizationId)) return failure("Nincs hozzáférés ehhez a műhelyhez.", 403);
  const survey = await getFieldSurvey(body.organizationId!, surveyId);
  if (!survey) return failure("A fénykép nem található vagy nincs hozzáférésed.", 404);
  const supabase = await createClient();
  const { data: photo } = await supabase.from("field_survey_photos").select("id").eq("id", body.photoId!).eq("survey_id", surveyId).maybeSingle();
  if (!photo) return failure("A fénykép nem található.", 404);
  try {
    const result = await removeFieldSurveyPhoto({ surveyId, photoId: body.photoId!, expectedVersion: body.expectedVersion!, actorId: auth.userId });
    return Response.json({ ok: true, version: result.version }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const status = sqlStatus(error);
    return failure(status === 409 ? "A felmérés közben megváltozott. Frissítsd, majd próbáld újra." : "A fénykép eltávolítása nem sikerült.", status);
  }
}

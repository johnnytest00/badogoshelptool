import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { getExecutionPlanningWorkspace } from "@/features/execution/execution-data";
import { renderExecutionReportPdfStream, safeExecutionReportFilename } from "@/features/execution/execution-report-pdf";
import type { ExecutionReportSection } from "@/features/execution/execution-report-document";
import { optimizeExecutionReportPhoto } from "@/infrastructure/images/optimize-execution-report-photo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sections = new Set<ExecutionReportSection>(["overview", "tasks", "journal", "events", "photos", "quotation"]);
const maxPhotos = 8;
const maxPhotoBytes = 4 * 1024 * 1024;
const maxTotalPhotoBytes = 12 * 1024 * 1024;
const validId = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

function badRequest(message: string, status = 400) {
  return new NextResponse(message, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getAuthContext();
  if (!auth) return new NextResponse("Bejelentkezés szükséges.", { status: 401 });
  const { projectId } = await params;
  const query = new URL(request.url).searchParams;
  const organizationId = query.get("organization") ?? "";
  const planId = query.get("plan") ?? "";
  if (!validId(projectId) || !validId(organizationId) || !validId(planId) || !auth.organizations.some((organization) => organization.id === organizationId)) return badRequest("A riport paraméterei vagy a műhely-hozzáférés érvénytelen.", 404);
  const selectedSections = [...new Set((query.get("sections") ?? "overview,tasks,journal,events,photos,quotation").split(",").filter((section): section is ExecutionReportSection => sections.has(section as ExecutionReportSection)))];
  if (!selectedSections.length) return badRequest("Válassz legalább egy riportfejezetet.");
  const photoIds = [...new Set((query.get("photos") ?? "").split(",").filter(Boolean))];
  if (photoIds.some((id) => !validId(id)) || photoIds.length > maxPhotos) return badRequest(`Legfeljebb ${maxPhotos} fénykép választható a riporthoz.`);
  const project = await getProjectForOrganization(organizationId, projectId);
  if (!project) return badRequest("A projekt nem található ebben a műhelyben.", 404);
  let workspace: Awaited<ReturnType<typeof getExecutionPlanningWorkspace>>;
  try {
    workspace = await getExecutionPlanningWorkspace(organizationId, projectId, planId);
  } catch {
    return badRequest("A munkanapló teljes adata nem tölthető be; a PDF nem készíthető el.", 502);
  }
  const plan = workspace.plans.find((candidate) => candidate.id === planId);
  if (!plan || plan.projectId !== projectId) return badRequest("A munkanapló nem található ebben a projektben.", 404);
  const selectedPhotos = photoIds.map((id) => plan.photos.find((photo) => photo.id === id)).filter((photo) => photo !== undefined);
  if (selectedPhotos.length !== photoIds.length) return badRequest("A kiválasztott fénykép nem tartozik ehhez a munkanaplóhoz.", 403);
  let totalBytes = 0;
  const reportPhotos = [];
  const supabase = await createClient();
  for (const photo of selectedPhotos) {
    if (photo.mimeType !== "image/jpeg" && photo.mimeType !== "image/png") return badRequest("A PDF csak JPEG és PNG fényképet tud biztonságosan beágyazni; a kiválasztott WebP kép maradjon a galériában.", 422);
    if (photo.fileSize > maxPhotoBytes || totalBytes + photo.fileSize > maxTotalPhotoBytes) return badRequest(`A riport fényképmérete meghaladja a támogatott korlátot (${maxPhotos} kép, képenként 4 MB, összesen 12 MB).`, 413);
    const { data: blob, error } = await supabase.storage.from("execution-photos").download(photo.objectKey);
    if (error || !blob) return badRequest("A kiválasztott privát fénykép nem tölthető be.", 502);
    const bytes = Buffer.from(await blob.arrayBuffer());
    totalBytes += bytes.length;
    try {
      const optimized = await optimizeExecutionReportPhoto(bytes, photo.mimeType);
      reportPhotos.push({ ...photo, dataUri: `data:${photo.mimeType};base64,${optimized.toString("base64")}` });
    } catch { return badRequest("A kiválasztott fénykép nem dolgozható fel a PDF-hez.", 422); }
  }
  const { data: organization } = await supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle();
  if (!organization) return badRequest("A műhely nem található.", 404);
  const generatedAt = new Date().toISOString();
  const stream = await renderExecutionReportPdfStream({ organizationName: organization.name, generatedAt, project: { name: project.name, clientName: project.clientName, location: project.location }, plan: { title: plan.title, description: plan.description, tasks: plan.tasks, timeline: workspace.timelineByPlan.get(plan.id) ?? [], sourceQuotationName: plan.sourceQuotationName, sourceQuotationStatus: plan.sourceQuotationStatus, sourceRevisionId: plan.sourceRevisionId, sourceRevisionNumber: plan.sourceRevisionNumber, sourceSubtotal: plan.sourceSubtotal, photos: reportPhotos }, sections: selectedSections });
  const disposition = query.get("download") === "1" ? "attachment" : "inline";
  return new NextResponse(Readable.toWeb(stream as Readable) as unknown as BodyInit, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${safeExecutionReportFilename(project.name, plan.title)}"`, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}

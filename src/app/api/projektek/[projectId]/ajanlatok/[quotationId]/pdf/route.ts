import { NextResponse } from "next/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import { renderQuotationPdf, safeQuotationFilename } from "@/features/quotations/quotation-pdf";
import type { QuotationDocumentData } from "@/features/quotations/quotation-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string; quotationId: string }> }) {
  const auth = await getAuthContext();
  if (!auth) return new NextResponse("Bejelentkezés szükséges.", { status: 401 });
  const { projectId, quotationId } = await params;
  const revisionId = new URL(request.url).searchParams.get("revision");
  const supabase = await createClient();
  const { data: quotation, error: quotationError } = await supabase.from("quotations").select("id, organization_id, project_id, name, currency, current_revision_id").eq("id", quotationId).eq("project_id", projectId).maybeSingle();
  if (quotationError || !quotation || !auth.organizations.some((organization) => organization.id === quotation.organization_id)) return new NextResponse("Az ajánlat nem található.", { status: 404 });
  const [{ data: project }, { data: revision }, { data: organization }, { data: revisionOrder }] = await Promise.all([
    supabase.from("projects").select("name, location, description, client_id").eq("id", projectId).eq("organization_id", quotation.organization_id).maybeSingle(),
    supabase.from("quotation_revisions").select("id, revision_number, line_items_snapshot, subtotal, price_class, currency, created_at, totals_snapshot, input_snapshot").eq("id", revisionId || quotation.current_revision_id || "").eq("quotation_id", quotation.id).eq("organization_id", quotation.organization_id).maybeSingle(),
    supabase.from("organizations").select("name").eq("id", quotation.organization_id).maybeSingle(),
    supabase.from("quotation_revisions").select("id").eq("quotation_id", quotation.id).eq("organization_id", quotation.organization_id).order("created_at", { ascending: true }),
  ]);
  if (!project || !revision || !organization) return new NextResponse("A kiválasztott revízió nem található.", { status: 404 });
  const revisionNumber = (revisionOrder ?? []).findIndex((item) => item.id === revision.id) + 1;
  const { data: client } = project.client_id ? await supabase.from("clients").select("name, email, phone, billing_address").eq("id", project.client_id).eq("organization_id", quotation.organization_id).maybeSingle() : { data: null };
  const snapshot = revision.input_snapshot && typeof revision.input_snapshot === "object" && !Array.isArray(revision.input_snapshot) ? revision.input_snapshot as Record<string, unknown> : {};
  const documentSnapshot = snapshot.documentSnapshot && typeof snapshot.documentSnapshot === "object" && !Array.isArray(snapshot.documentSnapshot) ? snapshot.documentSnapshot as QuotationDocumentData["documentSnapshot"] : null;
  const clientSnapshot = client ? { name: client.name, email: client.email, phone: client.phone, billingAddress: client.billing_address } : null;
  const buffer = await renderQuotationPdf({ organizationName: organization.name, quotation: { id: quotation.id, name: quotation.name, currency: quotation.currency }, revision: { id: revision.id, number: Number.isInteger(revisionNumber) && revisionNumber > 0 ? revisionNumber : 1, createdAt: revision.created_at, lines: Array.isArray(revision.line_items_snapshot) ? revision.line_items_snapshot as Array<Record<string, unknown>> : [], subtotal: revision.subtotal == null ? null : String(revision.subtotal), priceClass: revision.price_class, currency: revision.currency, totals: revision.totals_snapshot && typeof revision.totals_snapshot === "object" ? revision.totals_snapshot as Record<string, unknown> : {} }, project: { name: project.name, location: project.location, description: project.description }, client: clientSnapshot, documentSnapshot });
  return new NextResponse(new Uint8Array(buffer), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${safeQuotationFilename(project.name, revision.revision_number)}"`, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}


import { NextResponse } from "next/server";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";
import { renderQuotationPdf, safeStandaloneDraftFilename } from "@/features/quotations/quotation-pdf";
import { buildStandaloneDraftPdfData } from "@/features/quotations/standalone-quotation-pdf";
import { getQuotationRevisionCalculationSource } from "@/features/quotations/calculation-quotation-data";
import { constructionCalculatorLabels } from "@/features/calculators/construction-computation";
import { getStandaloneQuotationMaterialSourceAction } from "@/features/quotations/standalone-quotation-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const response = (message: string, status: number) => new NextResponse(message, {
  status,
  headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
});

type StandaloneQuotationHeader = { id: string; organization_id: string; name: string; currency: string; status: string; current_revision_id: string | null };
type StandaloneRevision = {
  id: string; revision_number: number; currency: string; price_class: string | null; input_snapshot: unknown;
  line_items_snapshot: unknown; subtotal: string | number | null; totals_snapshot: unknown; financial_contract: unknown;
};

export async function GET(request: Request, { params }: { params: Promise<{ quotationId: string }> }) {
  const auth = await getAuthContext();
  if (!auth) return response("Bejelentkezés szükséges.", 401);
  const { quotationId } = await params;
  if (!UUID.test(quotationId)) return response("Az ajánlat nem található.", 404);

  const supabase = await createClient();
  const quoteResult = await supabase.from("quotations")
    .select("id, organization_id, name, currency, status, current_revision_id")
    .eq("id", quotationId).eq("ownership_scope" as never, "standalone" as never).eq("created_by" as never, auth.userId as never).maybeSingle();
  const quotation = quoteResult.data as unknown as StandaloneQuotationHeader | null;
  if (quoteResult.error || !quotation || quotation.status !== "draft") return response("Az ajánlat nem található.", 404);
  if (!auth.organizations.some((organization) => organization.id === quotation.organization_id)) return response("Az ajánlat nem található.", 404);

  const requestedRevisionId = new URL(request.url).searchParams.get("revision");
  if (requestedRevisionId !== null && !UUID.test(requestedRevisionId)) return response("A kért revízió nem található.", 404);
  const revisionId = requestedRevisionId ?? quotation.current_revision_id;
  if (!revisionId) return response("A mentett revízió nem található.", 404);

  const db = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: StandaloneRevision[] | null; error: { code?: string } | null }> };
  const revisionResult = await db.rpc("get_standalone_quotation_revision", {
    p_organization_id: quotation.organization_id,
    p_quotation_id: quotation.id,
    p_revision_id: revisionId,
  });
  if (revisionResult.error || !revisionResult.data?.length || revisionResult.data[0].id !== revisionId) {
    const denied = revisionResult.error?.code === "42501" || revisionResult.error?.code === "23503";
    const absent = !revisionResult.error && (!revisionResult.data?.length || revisionResult.data[0].id !== revisionId);
    const status = denied || absent ? 404 : 500;
    return response(status === 404 ? "A kért revízió nem található." : "A PDF-előnézet jelenleg nem készíthető el.", status);
  }

  const revision = revisionResult.data[0];
  const input = revision.input_snapshot && typeof revision.input_snapshot === "object" && !Array.isArray(revision.input_snapshot)
    ? revision.input_snapshot as Record<string, unknown> : {};
  const document = input.document && typeof input.document === "object" && !Array.isArray(input.document)
    ? input.document as Record<string, unknown> : {};
  const issuer = document.issuer && typeof document.issuer === "object" && !Array.isArray(document.issuer)
    ? document.issuer as Record<string, unknown> : {};
  let calculationSource: Awaited<ReturnType<typeof getQuotationRevisionCalculationSource>>;
  try { calculationSource = await getQuotationRevisionCalculationSource(quotation.organization_id, revision.id); }
  catch { return response("Az ajánlat forrása nem tölthető be; a PDF-előnézet jelenleg nem készíthető el.", 500); }
  const materialSourceResult = await getStandaloneQuotationMaterialSourceAction(quotation.organization_id, quotation.id, revision.id);
  if (!materialSourceResult.ok) return response("Az ajánlat forrása nem tölthető be; a PDF-előnézet jelenleg nem készíthető el.", 500);
  const built = buildStandaloneDraftPdfData({
    quotation: { id: quotation.id, name: quotation.name, currency: quotation.currency },
    organizationName: typeof issuer.organizationName === "string" ? issuer.organizationName : "",
    revision,
    materialSource: materialSourceResult.data ? {
      listName: materialSourceResult.data.listName,
      revisionNumber: materialSourceResult.data.revisionNumber,
    } : null,
    calculationSource: calculationSource ? {
      calculationName: calculationSource.calculationName,
      calculatorLabel: constructionCalculatorLabels[calculationSource.calculatorId as keyof typeof constructionCalculatorLabels] ?? calculationSource.calculatorId,
      revisionNumber: calculationSource.revisionNumber,
    } : null,
  });
  if (!built.ok) return response(built.error, 422);

  try {
    const buffer = await renderQuotationPdf(built.data);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeStandaloneDraftFilename(quotation.id)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return response("A PDF-előnézet jelenleg nem készíthető el.", 500);
  }
}

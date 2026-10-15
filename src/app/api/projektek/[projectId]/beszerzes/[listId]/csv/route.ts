import { NextResponse } from "next/server";
import { materialPreparationCsv, type MaterialPreparationItem } from "@/domain/material-preparations/contracts";
import { materialPurchasingUnitLabels } from "@/domain/materials/contracts";
import { getAuthContext } from "@/features/auth/auth.server";
import { createClient } from "@/infrastructure/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string; listId: string }> }) {
  const auth = await getAuthContext();
  if (!auth) return new NextResponse("Bejelentkezés szükséges.", { status: 401 });
  const { projectId, listId } = await params;
  const organizationId = new URL(request.url).searchParams.get("organization");
  if (!organizationId || !auth.organizations.some((organization) => organization.id === organizationId)) {
    return new NextResponse("A lista nem található.", { status: 404 });
  }

  const supabase = await createClient();
  const { data: list } = await supabase.from("material_preparation_lists")
    .select("id, name, current_revision_id")
    .eq("id", listId).eq("project_id", projectId).eq("organization_id", organizationId).maybeSingle();
  if (!list?.current_revision_id) return new NextResponse("A lista nem található.", { status: 404 });
  const { data: revision } = await supabase.from("material_preparation_revisions")
    .select("revision_number, items_snapshot")
    .eq("id", list.current_revision_id).eq("list_id", listId).eq("organization_id", organizationId).maybeSingle();
  if (!revision || !Array.isArray(revision.items_snapshot)) return new NextResponse("A lista változata nem található.", { status: 404 });

  const csv = materialPreparationCsv(list.name, revision.items_snapshot as unknown as MaterialPreparationItem[], materialPurchasingUnitLabels);
  const fileBase = list.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "beszerzesi-lista";
  return new NextResponse(csv, { status: 200, headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${fileBase}-v${revision.revision_number}.csv"`,
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  } });
}

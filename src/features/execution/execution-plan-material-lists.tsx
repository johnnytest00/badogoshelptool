"use client";

import { useRouter } from "next/navigation";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import type { MaterialPreparationList } from "@/features/material-takeoffs/material-preparation-data";
import type { ExecutionWorkspaceSection } from "./execution-workspace-read";

export function ExecutionPlanMaterialLists({ organizationId, planId, result }: Readonly<{
  organizationId: string;
  planId: string;
  result: ExecutionWorkspaceSection<readonly MaterialPreparationList[]>;
}>) {
  const router = useRouter();
  const lists = result.status === "loaded" ? result.data.filter((list) => list.executionPlanId === planId) : [];
  const summary = result.status === "loaded" ? `Ebben a naplóban készült anyaglisták · ${lists.length}`
    : `Ebben a naplóban készült anyaglisták · ${result.status === "access_denied" ? "nincs hozzáférés" : "nem tölthető be"}`;

  return <GlassDisclosure className="execution-workflow-links" summary={summary}>
    {result.status === "access_denied" && <p className="missing-data" role="alert">Nincs hozzáférés az anyaglistákhoz. A munkanapló többi része továbbra is elérhető.</p>}
    {result.status === "unavailable" && <p className="missing-data" role="alert">Az anyaglisták átmenetileg nem tölthetők be. <button className="text-action" type="button" onClick={() => router.refresh()}>Újrapróbálás</button></p>}
    {result.status === "loaded" && lists.length > 0 && <ul>{lists.map((list) => <li key={list.id}>
      <Link href={`/anyaglistak/${list.id}?organization=${organizationId}`}><strong>{list.name}</strong><span>{list.currentRevisionId && list.currentRevision ? `V${list.version} · ${list.currentRevision.items.length} tétel` : list.currentRevisionId ? `V${list.version} · a pontos revízió nem érhető el` : `V${list.version} · nincs rögzített revízió`}</span></Link>
      {list.currentRevisionId && list.currentRevision && <Link className="text-action" href={`/ajanlatok/uj?organization=${organizationId}&plan=${planId}&materialList=${list.id}&materialRevision=${list.currentRevisionId}`}>Árajánlat ebből</Link>}
      {list.currentRevisionId && !list.currentRevision && <p className="missing-data" role="alert">A hivatkozott anyaglista-revízió hiányzik; a tételszámot és az ajánlatkészítést nem tekintjük ellenőrzöttnek.</p>}
    </li>)}</ul>}
    {result.status === "loaded" && lists.length === 0 && <p className="missing-data">Ehhez a munkanaplóhoz nem található látható anyaglista. Máshol készült listát lent kapcsolhatsz hozzá.</p>}
    <div className="execution-workflow-actions"><Link className="secondary-button" href={`/anyaglistak/uj?organization=${organizationId}&plan=${planId}`}>Anyaglista készítése</Link><Link className="text-action" href={`/ajanlatok/uj?organization=${organizationId}&plan=${planId}`}>Árajánlat készítése</Link></div>
  </GlassDisclosure>;
}

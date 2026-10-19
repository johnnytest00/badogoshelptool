"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { createIdempotencyKey } from "@/lib/secure-uuid";
import { approveStandaloneTakeoffAction, createMaterialListFromTakeoffAction } from "./takeoff-list-actions";

/** Draft → approve → material list. The list (and then the quotation draft) is created only from the approved, exact takeoff. */
export function TakeoffWorkflowPanel({ organizationId, takeoffId, status, canApprove, stale, listId }: Readonly<{
  organizationId: string; takeoffId: string; status: string; canApprove: boolean; stale: boolean; listId: string | null;
}>) {
  const router = useRouter();
  const [key] = useState(() => createIdempotencyKey());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  async function run(step: "approve" | "list") {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const result = step === "approve"
        ? await approveStandaloneTakeoffAction({ organizationId, takeoffId })
        : await createMaterialListFromTakeoffAction({ organizationId, takeoffId, requestKey: key.current() });
      if (!result.ok) { setError(result.error); return; }
      if (step === "list" && result.listId) router.push(`/anyaglistak/${result.listId}?organization=${organizationId}`);
      else router.refresh();
    } catch { setError("A válasz bizonytalan. Ugyanazzal a gombbal biztonságosan újrapróbálhatod; duplikátum nem jön létre."); }
    finally { lock.current = false; setPending(false); }
  }

  return <section className="detail-surface" aria-label="Következő lépés">
    <div className="roof-list-heading"><div><p className="section-eyebrow">Munkafolyamat</p><h2>Anyagkimutatás → anyaglista → ajánlat</h2></div></div>
    {listId
      ? <p className="material-quotation-link"><PackageOpen aria-hidden="true" size={16} /><span>Anyaglista már készült: <Link className="text-action" href={`/anyaglistak/${listId}?organization=${organizationId}`}>Anyaglista megnyitása</Link> · onnan készíthető ajánlat-piszkozat.</span></p>
      : status === "approved"
        ? <div className="material-quotation-actions">
          <button type="button" className="primary-button" disabled={pending || stale} onClick={() => void run("list")}>{pending ? "Létrehozás…" : "Anyaglista készítése"}</button>
          <p>{stale ? "A forrásprofil új revíziót kapott; ebből a kimutatásból nem készíthető lista." : "A jóváhagyott mennyiségek és a rögzített anyag-pillanatkép kerülnek át; ár csak akkor, ha a kimutatás rögzített árat tartalmaz."}</p>
        </div>
        : <div className="material-quotation-actions">
          <button type="button" className="primary-button" disabled={pending || !canApprove || stale} onClick={() => void run("approve")}>{pending ? "Jóváhagyás…" : "Kimutatás jóváhagyása"}</button>
          <p>{!canApprove ? "A jóváhagyáshoz admin vagy tulajdonos jogosultság kell." : stale ? "A forrásprofil új revíziót kapott; jóváhagyás helyett készíts új kimutatást." : "A jóváhagyás után a kimutatás nem módosítható, és anyaglistává alakítható."}</p>
        </div>}
    {error && <p role="alert" className="form-message is-error">{error}</p>}
  </section>;
}

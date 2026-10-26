"use client";

import { useState } from "react";
import type { SyntheticEvent } from "react";
import { ArrowLeftRight } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { listRafterCutTransferSourcesAction } from "@/features/calculations/construction-actions";
import type { RafterCutTransferSource } from "@/features/calculations/construction-data";

/**
 * M10 Fázis 0: explicit, megerősítést igénylő adatátvétel mentett roof.rafter-cut kalkulációból a HAP és
 * gerinckapcsolati mezőkre. Soha nem ír felül csendben; az átvétel csak a helyi (még nem mentett) mezőket tölti ki.
 */
export function ConstructionFieldTransferControl({ organizationId, onApply }: Readonly<{
  organizationId: string;
  onApply: (fields: Readonly<Record<string, string>>, sourceRevisionId: string) => void;
}>) {
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [sources, setSources] = useState<readonly RafterCutTransferSource[]>([]);
  const [applied, setApplied] = useState<{ displayName: string; revisionNumber: number } | null>(null);

  async function load(event: SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open || loaded || pending) return;
    setPending(true);
    try {
      setSources(await listRafterCutTransferSourcesAction(organizationId));
    } finally {
      setPending(false);
      setLoaded(true);
    }
  }

  return <section className="plan-link-control" aria-label="Adatok átvétele">
    <GlassDisclosure className="plan-link-add" summary={<><ArrowLeftRight aria-hidden="true" size={17} /> Adatok átvétele mentett szarufa-kiszabásból</>} onToggle={(event) => void load(event)}>
      {pending && <p className="plan-link-note">Betöltés…</p>}
      {!pending && loaded && sources.length === 0 && <p className="plan-link-empty">Nincs mentett, kompatibilis „Szarufa kiszabása” számítás ebben a műhelyben.</p>}
      {!pending && sources.length > 0 && <ul className="plan-link-list">
        {sources.map((source) => <li key={source.revisionId}>
          <span>{source.displayName} <small>· V{source.revisionNumber}</small></span>
          <button type="button" className="text-action" onClick={() => { onApply(source.fields, source.revisionId); setApplied({ displayName: source.displayName, revisionNumber: source.revisionNumber }); }}>Átvétel</button>
        </li>)}
      </ul>}
      {applied && <p className="plan-link-note">Átvéve: {applied.displayName} · V{applied.revisionNumber}. A HAP és gerinckapcsolati mezők kitöltve; ellenőrizd, majd mentsd a kalkulációt.</p>}
    </GlassDisclosure>
  </section>;
}

"use client";

import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useEffect, useState } from "react";
import { fieldSurveyWorkTypeLabels } from "@/domain/field-surveys/contracts";
import { roofTypeOptions } from "@/features/roof-models/roof-type-selector";
import { liveTabIds, ownTabIdSync } from "@/features/field-surveys/draft-liveness";
import { listSurveyDrafts, removeSurveyDraftRecovery, type ListedSurveyDraft } from "@/features/field-surveys/survey-draft-recovery";

const time = new Intl.DateTimeFormat("hu-HU", { hour: "2-digit", minute: "2-digit" });
const dateTime = new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function describe({ draft, surveyId }: ListedSurveyDraft) {
  const first = draft.sections[0];
  const name = first.roofType ? roofTypeOptions.find((option) => option.type === first.roofType)?.name : fieldSurveyWorkTypeLabels[first.workType];
  const saved = draft.savedAt ? new Date(draft.savedAt) : null;
  return `${name ?? "Felmérés"} · ${surveyId ? "mentett felmérés módosítása" : "új felmérés"}${saved ? ` · Utoljára módosítva: ${sameDay(saved, new Date()) ? time.format(saved) : dateTime.format(saved)}` : ""}`;
}

/** Compact, local-only reminder of this user's unfinished survey drafts; renders nothing when there is nothing to recover. */
export function SurveyDraftNotice({ userId, organizationId }: Readonly<{ userId?: string; organizationId?: string }>) {
  const [drafts, setDrafts] = useState<ListedSurveyDraft[]>([]);
  const [live, setLive] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  useEffect(() => {
    if (!userId || !organizationId) return;
    const read = () => {
      try { setDrafts(listSurveyDrafts(localStorage, userId, [organizationId])); } catch { setDrafts([]); }
      void liveTabIds().then((ids) => { const own = ownTabIdSync(); if (own) ids.delete(own); setLive(ids); });
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("focus", read);
    return () => { window.removeEventListener("storage", read); window.removeEventListener("focus", read); };
  }, [userId, organizationId]);
  if (!drafts.length) return null;

  // `recover` names exactly one record, so a second unfinished survey can never take over another one's measurements.
  const href = (item: ListedSurveyDraft) => `${item.surveyId ? `/felmeresek/${item.surveyId}` : "/felmeresek/uj"}?organization=${item.organizationId}${item.draftId ? `&draft=${item.draftId}` : ""}&recover=${item.target}.${item.instance}`;
  const perTarget = (item: ListedSurveyDraft) => drafts.filter((candidate) => candidate.target === item.target).length;
  const discard = (item: ListedSurveyDraft) => {
    try { removeSurveyDraftRecovery(localStorage, item.key); } catch { /* Storage may be blocked; the draft then stays. */ }
    setConfirming(null);
    setDrafts((current) => current.filter((candidate) => candidate.key !== item.key));
  };
  return <section className="survey-draft-notice" aria-label="Mentetlen felmérések">
    <h2>{drafts.length === 1 ? "Van egy mentetlen felmérésed" : `Van ${drafts.length} mentetlen felmérésed`}</h2>
    <ul>{drafts.map((item) => <li key={item.key}>
      <span>{describe(item)}{live.has(item.instance) ? " · másik lapon éppen nyitva van" : perTarget(item) > 1 ? " · ugyanahhoz a felméréshez több piszkozat is van" : ""}</span>
      {live.has(item.instance) ? null : confirming === item.key
        ? <span className="survey-draft-actions" role="group" aria-label="Elvetés megerősítése"><span>Biztosan elveted?</span><button type="button" className="secondary-button" onClick={() => discard(item)}>Igen, elvetem</button><button type="button" className="secondary-button" onClick={() => setConfirming(null)}>Mégse</button></span>
        : <span className="survey-draft-actions"><Link className="primary-button" href={href(item)}>Folytatás</Link><button type="button" className="secondary-button" onClick={() => setConfirming(item.key)}>Elvetés</button></span>}
    </li>)}</ul>
  </section>;
}

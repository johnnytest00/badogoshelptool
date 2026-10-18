"use client";

import { useRef, useState, useTransition } from "react";
import { ClipboardList, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { createIdempotencyKey } from "@/lib/secure-uuid";
import type { SurveyExecutionPlanLink } from "@/domain/field-surveys/workspace";
import type { ExecutionPlanOption } from "@/features/execution/execution-data";
import { createExecutionPlanFromSurvey, linkSurveyToExecutionPlan } from "./workspace-actions";

type SavedSurvey = { surveyId: string; version: number };

export function SurveyExecutionActions({ organizationId, surveyId, version, plans, linkedPlans, canSave, ensureSaved }: Readonly<{
  organizationId: string;
  surveyId: string | null;
  version: number;
  plans: readonly ExecutionPlanOption[];
  linkedPlans: readonly SurveyExecutionPlanLink[];
  canSave: boolean;
  ensureSaved: () => Promise<SavedSurvey | null>;
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"create" | "attach" | null>(null);
  const [title, setTitle] = useState("");
  const [planId, setPlanId] = useState("");
  const [message, setMessage] = useState("");
  const [requestKey] = useState(() => createIdempotencyKey());
  const lock = useRef(false);
  const currentLinks = surveyId ? linkedPlans : [];

  async function createPlan() {
    if (lock.current || !title.trim()) return;
    lock.current = true;
    setMessage("");
    const saved = await ensureSaved();
    if (!saved) { lock.current = false; return; }
    startTransition(async () => {
      try {
        const result = await createExecutionPlanFromSurvey({ organizationId, ...saved, title: title.trim(), requestKey: requestKey.current() });
        if (!result.ok || !result.planId) {
          setMessage(result.error ?? "A terv létrehozása nem sikerült. Azonos adatokkal biztonságosan újrapróbálható.");
          return;
        }
        requestKey.renew();
        router.push(`/kivitelezes/${result.planId}?organization=${organizationId}`);
      } finally { lock.current = false; }
    });
  }

  async function attachPlan() {
    if (lock.current || !planId) return;
    lock.current = true;
    setMessage("");
    const saved = await ensureSaved();
    if (!saved) { lock.current = false; return; }
    startTransition(async () => {
      try {
        const result = await linkSurveyToExecutionPlan({ organizationId, ...saved, executionPlanId: planId, requestKey: requestKey.current() });
        if (!result.ok) {
          setMessage(result.error ?? "A csatolás nem sikerült. Azonos választással biztonságosan újrapróbálható.");
          return;
        }
        requestKey.renew();
        setMessage("A felmérés pontos revíziója a munkanaplóhoz kapcsolódik.");
        setMode(null);
        router.refresh();
      } finally { lock.current = false; }
    });
  }

  const linkedPlanIds = new Set(linkedPlans.filter((link) => link.surveyVersion === version).map((link) => link.executionPlanId));
  const availablePlans = plans.filter((plan) => !linkedPlanIds.has(plan.id));

  return <section className="survey-workflow-actions" aria-label="Továbblépés a felméréssel">
    <div className="survey-workflow-tiles">
      <button type="button" className="survey-workflow-tile is-primary" disabled={!canSave || pending} onClick={() => { setMessage(""); setMode((current) => current === "create" ? null : "create"); }}>
        <ClipboardList aria-hidden="true" className="size-5" />
        <span>Munkanapló létrehozása</span>
        <small>A mentett felmérésrevízióval</small>
      </button>
    </div>
    {surveyId && <button type="button" className="survey-workflow-attach" disabled={!canSave || pending} onClick={() => { setMessage(""); setMode((current) => current === "attach" ? null : "attach"); }}>
      <Link2 aria-hidden="true" className="size-4" /> Felmérés csatolása meglévő munkanaplóhoz
    </button>}
    {currentLinks.map((link) => <p key={link.id} className="survey-workflow-linked">Kapcsolódó terv: <Link href={`/kivitelezes/${link.executionPlanId}?organization=${organizationId}`}>{link.planTitle} · a felmérés V{link.surveyVersion} változata{link.surveyVersion !== version ? " · korábbi forrásrevízió" : ""}</Link></p>)}
    {mode === "create" && <div className="survey-workflow-panel"><label className="field-survey-field"><span>Munkanapló neve</span><input autoFocus value={title} maxLength={200} onChange={(event) => { if (event.target.value !== title) requestKey.renew(); setTitle(event.target.value); }} placeholder="Például: Tetőfelújítás" /></label><button type="button" className="primary-button" disabled={!title.trim() || !canSave || pending} onClick={() => void createPlan()}>{pending ? "Mentés és létrehozás…" : "Felmérés mentése és munkanapló megnyitása"}</button></div>}
    {mode === "attach" && <div className="survey-workflow-panel"><label className="field-survey-field"><span>Munkanapló</span><select value={planId} onChange={(event) => setPlanId(event.target.value)}><option value="">Válassz munkanaplót</option>{availablePlans.map((plan) => <option value={plan.id} key={plan.id}>{plan.title}{plan.projectId ? " · korábbi projektkapcsolat" : ""}</option>)}</select></label><button type="button" className="secondary-button" disabled={!planId || !canSave || pending} onClick={() => void attachPlan()}>{pending ? "Csatolás…" : `V${version} csatolása a munkanaplóhoz`}</button>{availablePlans.length === 0 && <p>Minden elérhető munkanaplóhoz már csatoltad ezt a felmérést.</p>}</div>}
    {message && <p className="form-message" role="status">{message}</p>}
  </section>;
}

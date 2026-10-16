"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { warnBeforeUnloadIfDirty } from "@/lib/unsaved-changes";

export type NoticeKind = "success" | "error" | "warning" | "info";
export type Notice = Readonly<{ kind: NoticeKind; message: string; duration?: number }>;
export type GuardSnapshot = Readonly<{ dirty: boolean; pending?: boolean; save?: () => Promise<boolean>; discard?: () => void | Promise<void> }>;
export type ConfirmationAction = Readonly<{ label: string; tone?: "primary" | "danger"; run: () => void | Promise<void> }>;
export type ConfirmationOptions = Readonly<{ title: string; message: string; actions: readonly ConfirmationAction[]; cancelLabel?: string }>;
type GuardStatus = { dirty: boolean; pending: boolean };
type ToastItem = Notice & { id: number };
type ConfirmationState = ConfirmationOptions & { busy: boolean; error: string };

type InteractionContextValue = {
  notify: (notice: Notice) => void;
  requestConfirmation: (options: ConfirmationOptions) => Promise<boolean>;
  registerGuard: (id: string, snapshot: GuardSnapshot) => () => void;
  requestNavigation: (href: string, options?: { replace?: boolean; scroll?: boolean }) => Promise<boolean>;
  hasUnsavedChanges: boolean;
  hasPendingChanges: boolean;
};

const InteractionContext = createContext<InteractionContextValue>({
  notify: () => undefined,
  requestConfirmation: async () => false,
  registerGuard: () => () => undefined,
  requestNavigation: async () => false,
  hasUnsavedChanges: false,
  hasPendingChanges: false,
});

export function AppInteractionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const guards = useRef(new Map<string, GuardSnapshot>());
  const resolver = useRef<((accepted: boolean) => void) | null>(null);
  const confirmationActionLock = useRef(false);
  const nextToastId = useRef(0);
  const [guardStatus, setGuardStatus] = useState<GuardStatus>({ dirty: false, pending: false });
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [notices, setNotices] = useState<ToastItem[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const syncGuardStatus = useCallback(() => {
    const current = [...guards.current.values()];
    setGuardStatus({ dirty: current.some((guard) => guard.dirty), pending: current.some((guard) => guard.pending) });
  }, []);

  const registerGuard = useCallback((id: string, snapshot: GuardSnapshot) => {
    guards.current.set(id, snapshot);
    syncGuardStatus();
    return () => { guards.current.delete(id); syncGuardStatus(); };
  }, [syncGuardStatus]);

  useEffect(() => {
    if (!guardStatus.dirty) return;
    const warn = (event: BeforeUnloadEvent) => warnBeforeUnloadIfDirty(true, event);
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [guardStatus.dirty, guardStatus.pending]);

  useLayoutEffect(() => {
    const element = dialogRef.current;
    if (!element) return;
    if (confirmation && !element.open) {
      element.showModal();
      cancelButtonRef.current?.focus();
    } else if (!confirmation && element.open) element.close();
  }, [confirmation]);

  useEffect(() => {
    if (!confirmation) return;
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || confirmation.busy) return;
      const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [])];
      if (!buttons.length) return;
      const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex = event.shiftKey
        ? currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1
        : currentIndex < 0 || currentIndex === buttons.length - 1 ? 0 : currentIndex + 1;
      event.preventDefault();
      buttons[nextIndex]?.focus();
    };
    document.addEventListener("keydown", keepFocusInDialog, true);
    return () => document.removeEventListener("keydown", keepFocusInDialog, true);
  }, [confirmation]);

  const notify = useCallback((notice: Notice) => {
    const message = notice.message.trim();
    if (!message) return;
    setNotices((current) => {
      if (current.some((item) => item.kind === notice.kind && item.message === message)) return current;
      return [...current, { ...notice, message, id: ++nextToastId.current }].slice(-4);
    });
  }, []);

  const dismissNotice = useCallback((id: number) => setNotices((current) => current.filter((notice) => notice.id !== id)), []);

  const requestConfirmation = useCallback((options: ConfirmationOptions) => new Promise<boolean>((resolve) => {
    if (resolver.current) { resolve(false); return; }
    resolver.current = resolve;
    setConfirmation({ ...options, busy: false, error: "" });
  }), []);

  const finishConfirmation = useCallback((accepted: boolean) => {
    const complete = resolver.current;
    resolver.current = null;
    setConfirmation(null);
    complete?.(accepted);
  }, []);

  const runConfirmationAction = useCallback(async (action: ConfirmationAction) => {
    if (!confirmation || confirmation.busy || confirmationActionLock.current) return;
    confirmationActionLock.current = true;
    setConfirmation((current) => current ? { ...current, busy: true, error: "" } : current);
    try {
      await action.run();
      finishConfirmation(true);
    } catch (cause) {
      setConfirmation((current) => current ? { ...current, busy: false, error: cause instanceof Error ? cause.message : "A művelet nem sikerült. Próbáld újra." } : current);
    } finally { confirmationActionLock.current = false; }
  }, [confirmation, finishConfirmation]);

  const requestNavigation = useCallback(async (href: string, options: { replace?: boolean; scroll?: boolean } = {}) => {
    const changed = [...guards.current.values()].filter((guard) => guard.dirty);
    if ([...guards.current.values()].some((guard) => guard.pending)) {
      notify({ kind: "warning", message: "Folyamatban lévő művelet mellett most nem lehet továbblépni." });
      return false;
    }
    const navigate = () => options.replace ? router.replace(href, { scroll: options.scroll }) : router.push(href, { scroll: options.scroll });
    if (!changed.length) { navigate(); return true; }

    const canSave = changed.every((guard) => typeof guard.save === "function");
    const actions: ConfirmationAction[] = [];
    if (canSave) actions.push({ label: "Mentés és kilépés", tone: "primary", run: async () => {
      for (const guard of changed) {
        if (!guard.save || !(await guard.save())) throw new Error("Nem sikerült menteni. Javítsd a hibákat, majd próbáld újra.");
      }
      navigate();
    } });
    actions.push({ label: "Kilépés mentés nélkül", tone: "danger", run: async () => {
      for (const guard of changed) await guard.discard?.();
      navigate();
    } });
    return requestConfirmation({
      title: "Mentetlen módosítások",
      message: "Ha most kilépsz, a nem mentett módosítások elveszhetnek.",
      cancelLabel: "Maradok",
      actions,
    });
  }, [notify, requestConfirmation, router]);

  const value = useMemo<InteractionContextValue>(() => ({
    notify,
    requestConfirmation,
    registerGuard,
    requestNavigation,
    hasUnsavedChanges: guardStatus.dirty,
    hasPendingChanges: guardStatus.pending,
  }), [guardStatus.dirty, guardStatus.pending, notify, registerGuard, requestConfirmation, requestNavigation]);

  return <InteractionContext.Provider value={value}>
    {children}
    <dialog ref={dialogRef} className="glass-confirmation-dialog" aria-labelledby="interaction-confirmation-title" aria-describedby="interaction-confirmation-message" onCancel={(event) => { event.preventDefault(); if (!confirmation?.busy) finishConfirmation(false); }} onClick={(event) => { if (event.target === event.currentTarget && !confirmation?.busy) finishConfirmation(false); }}>
      {confirmation && <>
        <div className="glass-confirmation-heading"><span className="glass-confirmation-icon"><TriangleAlert aria-hidden="true" /></span><div><h2 id="interaction-confirmation-title">{confirmation.title}</h2><p id="interaction-confirmation-message">{confirmation.message}</p></div></div>
        {confirmation.error && <p className="glass-confirmation-error" role="alert">{confirmation.error}</p>}
        <div className="glass-confirmation-actions">
          {confirmation.actions.map((action) => <button key={action.label} type="button" className={`primary-button${action.tone === "danger" ? " is-danger" : ""}`} disabled={confirmation.busy} onClick={() => void runConfirmationAction(action)}>
            {confirmation.busy ? <><LoaderCircle aria-hidden="true" className="interaction-spinner" /> Művelet folyamatban…</> : action.label}
          </button>)}
          <button ref={cancelButtonRef} type="button" className="secondary-button" disabled={confirmation.busy} onClick={() => finishConfirmation(false)}>{confirmation.busy ? "Folyamatban…" : confirmation.cancelLabel ?? "Mégse"}</button>
        </div>
      </>}
    </dialog>
    <div className="glass-toast-stack" aria-label="Értesítések">
      {notices.map((notice) => <Toast key={notice.id} notice={notice} onDismiss={() => dismissNotice(notice.id)} />)}
    </div>
  </InteractionContext.Provider>;
}

function Toast({ notice, onDismiss }: Readonly<{ notice: ToastItem; onDismiss: () => void }>) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    const timeout = window.setTimeout(() => dismissRef.current(), notice.duration ?? 4600);
    return () => window.clearTimeout(timeout);
  }, [notice.duration, notice.id]);
  const Icon = notice.kind === "success" ? CheckCircle2 : notice.kind === "error" ? AlertCircle : notice.kind === "warning" ? TriangleAlert : Info;
  return <div className={`glass-toast is-${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"} aria-live={notice.kind === "error" ? "assertive" : "polite"}>
    <Icon aria-hidden="true" className="glass-toast-icon" /><p>{notice.message}</p><button type="button" aria-label="Értesítés bezárása" onClick={onDismiss}><X aria-hidden="true" /></button>
  </div>;
}

export function useAppInteraction() { return useContext(InteractionContext); }

export function useUnsavedChangeGuard(snapshot: GuardSnapshot) {
  const { registerGuard } = useAppInteraction();
  const id = useId();
  useEffect(() => registerGuard(id, snapshot), [id, registerGuard, snapshot.dirty, snapshot.pending, snapshot.save, snapshot.discard]);
}

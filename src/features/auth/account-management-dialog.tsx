"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/infrastructure/supabase/browser";
import { accountEmailSchema, accountPasswordSchema, getAccountAuthErrorMessage } from "./account-management";
import { LiquidGlassLayer } from "@/components/ui/liquid-glass-layer";

type AccountManagementDialogProps = Readonly<{ open: boolean; onClose: () => void }>;
type CurrentAccount = { email: string; providers: string[] };

function getProviders(user: User): string[] {
  const identityProviders = user.identities?.map((identity) => identity.provider) ?? [];
  const appProviders = user.app_metadata.providers ?? [];
  return [...new Set([...identityProviders, ...appProviders])];
}

function providerLabel(providers: string[]): string {
  if (providers.length === 0) return "A bejelentkezési mód nem állapítható meg.";
  return `Bejelentkezési mód: ${providers.map((provider) => provider === "email" ? "e-mail és jelszó" : provider).join(", ")}.`;
}

export function AccountManagementDialog({ open, onClose }: AccountManagementDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [account, setAccount] = useState<CurrentAccount | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailNotice, setEmailNotice] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [busy, setBusy] = useState<"email" | "password" | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    let active = true;
    setAccount(null);
    setLoadingError("");
    setEmailError("");
    setEmailNotice("");
    setPasswordError("");
    setPasswordNotice("");
    void createClient().auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        setLoadingError(error ? getAccountAuthErrorMessage(error) : "A munkamenet lejárt. Jelentkezz be újra.");
        return;
      }
      const current = { email: data.user.email ?? "", providers: getProviders(data.user) };
      setAccount(current);
      setEmail(current.email);
    }).catch(() => {
      if (active) setLoadingError("A helyi hitelesítési szolgáltatás nem érhető el.");
    });
    return () => { active = false; };
  }, [open]);

  async function changeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(""); setEmailNotice("");
    const parsed = accountEmailSchema.safeParse({ email });
    if (!parsed.success) { setEmailError(parsed.error.issues[0]?.message ?? "Ellenőrizd az e-mail-címet."); return; }
    setBusy("email");
    try {
      const client = createClient();
      const { data: currentData, error: currentError } = await client.auth.getUser();
      if (currentError || !currentData.user) { setEmailError(currentError ? getAccountAuthErrorMessage(currentError) : "A munkamenet lejárt. Jelentkezz be újra."); return; }
      const { data, error } = await client.auth.updateUser({ email: parsed.data.email });
      if (error) { setEmailError(getAccountAuthErrorMessage(error)); return; }
      const updatedEmail = data.user?.email;
      const pendingEmail = data.user?.new_email;
      if (updatedEmail?.toLocaleLowerCase() === parsed.data.email.toLocaleLowerCase()) {
        setAccount((value) => value ? { ...value, email: updatedEmail } : value);
        setEmailNotice("Az e-mail-cím módosítása befejeződött.");
      } else {
        setEmailNotice(`A megerősítő kérés elküldve${pendingEmail ? ` erre a címre: ${pendingEmail}` : ". A cím csak a Supabase által kért megerősítés után változik."}`);
      }
    } catch {
      setEmailError("A hitelesítési szolgáltatás nem érhető el. Próbáld újra.");
    } finally { setBusy(null); }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(""); setPasswordNotice("");
    const parsed = accountPasswordSchema.safeParse({ password, confirmation });
    if (!parsed.success) { setPasswordError(parsed.error.issues[0]?.message ?? "Ellenőrizd az új jelszót."); return; }
    setBusy("password");
    try {
      const client = createClient();
      const { data: currentData, error: currentError } = await client.auth.getUser();
      if (currentError || !currentData.user) { setPasswordError(currentError ? getAccountAuthErrorMessage(currentError) : "A munkamenet lejárt. Jelentkezz be újra."); return; }
      const { error } = await client.auth.updateUser({ password: parsed.data.password });
      if (error) { setPasswordError(getAccountAuthErrorMessage(error)); return; }
      setPassword(""); setConfirmation("");
      setPasswordNotice("A Supabase Auth visszaigazolta a jelszó módosítását.");
    } catch {
      setPasswordError("A hitelesítési szolgáltatás nem érhető el. Próbáld újra.");
    } finally { setBusy(null); }
  }

  return (
    <dialog ref={dialogRef} className="account-management-dialog" aria-labelledby="account-management-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <LiquidGlassLayer radius={22} />
      <div className="account-management-heading"><div className="account-management-title"><span className="account-management-avatar"><UserRound aria-hidden="true" className="size-5" /></span><div><p className="section-eyebrow">TetőPro-fiók</p><h2 id="account-management-title">Fiókbeállítások</h2></div></div><button className="account-management-close" type="button" onClick={onClose} aria-label="Fiókbeállítások bezárása"><X aria-hidden="true" className="size-5" /></button></div>
      <p className="account-dialog-intro">Az itt megadott adatok a fiókod azonosítására szolgálnak.</p>
      {loadingError ? <p className="account-message is-error" role="alert">{loadingError}</p> : !account ? <p className="account-message" role="status">Fiókadatok betöltése…</p> : <>
        <section className="account-current"><span>Bejelentkezett e-mail-cím</span><strong>{account.email || "Nincs e-mail-cím megadva"}</strong><small>{providerLabel(account.providers)}</small></section>
        <form className="account-form" onSubmit={changeEmail} noValidate>
          <h3><Mail aria-hidden="true" className="size-4" /> E-mail-cím módosítása</h3><label htmlFor="account-new-email">Új e-mail-cím</label><input id="account-new-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy !== null} />
          <p className="account-hint">A Supabase Auth saját megerősítési folyamatát használjuk. A függőben lévő címmódosítás csak a szükséges megerősítés után lép életbe.</p>
          {emailError && <p className="account-message is-error" role="alert">{emailError}</p>}{emailNotice && <p className="account-message" role="status">{emailNotice}</p>}
          <button className="secondary-button" type="submit" disabled={busy !== null}>{busy === "email" ? "Kérelem küldése…" : "E-mail-cím módosításának kérése"}</button>
        </form>
        <form className="account-form" onSubmit={changePassword} noValidate>
          <h3><LockKeyhole aria-hidden="true" className="size-4" /> Jelszó módosítása</h3><label htmlFor="account-new-password">Új jelszó</label><span className="account-password-field"><input id="account-new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy !== null} /><button type="button" aria-label={showPassword ? "Új jelszó elrejtése" : "Új jelszó megjelenítése"} aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)}>{showPassword ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}</button></span>
          <label htmlFor="account-confirm-password">Új jelszó megerősítése</label><span className="account-password-field"><input id="account-confirm-password" type={showConfirmation ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy !== null} /><button type="button" aria-label={showConfirmation ? "Jelszó-megerősítés elrejtése" : "Jelszó-megerősítés megjelenítése"} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((shown) => !shown)}>{showConfirmation ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}</button></span>
          <p className="account-hint">A jelszó szabályait a Supabase Auth érvényesíti. {providerLabel(account.providers)} Külső bejelentkezésnél a szolgáltató fiókbeállítása is szükséges lehet.</p>
          {passwordError && <p className="account-message is-error" role="alert">{passwordError}</p>}{passwordNotice && <p className="account-message" role="status">{passwordNotice}</p>}
          <button className="secondary-button" type="submit" disabled={busy !== null}>{busy === "password" ? "Jelszó módosítása…" : "Jelszó módosítása"}</button>
        </form>
      </>}
      <button className="account-dialog-done" type="button" onClick={onClose}>Bezárás</button>
    </dialog>
  );
}

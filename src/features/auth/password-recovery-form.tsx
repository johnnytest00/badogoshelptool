"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/infrastructure/supabase/browser";
import { accountEmailSchema, accountPasswordSchema, getAccountAuthErrorMessage } from "./account-management";
import { getPasswordRecoveryRedirectTo } from "./password-recovery";
import { finishPasswordRecovery } from "./password-recovery-actions";

const passwordRequestSchema = accountEmailSchema;

export function PasswordRecoveryForm({ recoveryAvailable, invalidLink }: Readonly<{ recoveryAvailable: boolean; invalidLink: boolean }>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const parsed = passwordRequestSchema.safeParse({ email });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Adj meg érvényes e-mail-címet."); return; }
    setPending(true);
    try {
      const { error: requestError } = await createClient().auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: getPasswordRecoveryRedirectTo(window.location.origin),
      });
      if (requestError) { setError(getAccountAuthErrorMessage(requestError)); return; }
      setNotice("Ha a címhez tartozik TetőPro-fiók, elküldtük a helyreállító e-mailt. Ellenőrizd a postafiókot és a levélszemét mappát is.");
    } catch {
      setError("A hitelesítési szolgáltatás nem érhető el. Próbáld újra.");
    } finally { setPending(false); }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const parsed = accountPasswordSchema.safeParse({ password, confirmation });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Ellenőrizd az új jelszót."); return; }
    setPending(true);
    try {
      const result = await finishPasswordRecovery(parsed.data);
      if (result.error) { setError(result.error); return; }
      setPassword(""); setConfirmation("");
      setDone(true);
      setNotice(("warning" in result ? result.warning : undefined) ?? "A jelszót sikeresen módosítottuk. Most már beléphetsz az új jelszóval.");
    } catch {
      setError("A hitelesítési szolgáltatás nem érhető el. Próbáld újra.");
    } finally { setPending(false); }
  }

  if (done) return <><p className="login-lead" role="status">{notice}</p><Link className="login-submit login-recovery-link" href="/bejelentkezes">Tovább a bejelentkezéshez</Link></>;

  if (recoveryAvailable) return (
    <>
      <p className="login-lead">Adj meg új jelszót. A jelszóra a Supabase Authban beállított biztonsági követelmények vonatkoznak.</p>
      <form className="login-form" onSubmit={updatePassword} noValidate>
        <label className="login-field">Új jelszó<span className="password-input"><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} /><button type="button" aria-label={showPassword ? "Új jelszó elrejtése" : "Új jelszó megjelenítése"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></span></label>
        <label className="login-field">Új jelszó megerősítése<span className="password-input"><input type={showConfirmation ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} /><button type="button" aria-label={showConfirmation ? "Megerősítés elrejtése" : "Megerősítés megjelenítése"} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((value) => !value)}>{showConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></span></label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="login-submit" type="submit" disabled={pending}>{pending ? "Jelszó mentése…" : "Új jelszó mentése"}</button>
      </form>
      <p className="login-note">Ha a hivatkozás lejárt vagy hibás, <Link className="login-secondary-link" href="/jelszo-visszaallitas">kérj új helyreállító e-mailt</Link>.</p>
    </>
  );

  return (
    <>
      <p className="login-lead">Add meg a fiókod e-mail-címét, és küldünk egy hivatkozást az új jelszó beállításához.</p>
      {invalidLink && <p className="login-error" role="alert">A hivatkozás érvénytelen, lejárt vagy már felhasználták. Kérj új helyreállító e-mailt.</p>}
      {notice && <p className="login-notice" role="status">{notice}</p>}
      <form className="login-form" onSubmit={requestReset} noValidate>
        <label className="login-field">E-mail-cím<input type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} /></label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="login-submit" type="submit" disabled={pending}>{pending ? "Kérelem küldése…" : "Helyreállító e-mail küldése"}</button>
      </form>
      <p className="login-note"><Link className="login-secondary-link" href="/bejelentkezes">Vissza a bejelentkezéshez</Link></p>
    </>
  );
}

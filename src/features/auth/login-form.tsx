"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/infrastructure/supabase/browser";
import { getSafeReturnTo } from "@/features/auth/redirect";

const loginSchema = z.object({
  email: z.string().trim().email("Adj meg érvényes e-mail-címet."),
  password: z.string().min(1, "Add meg a jelszavad."),
});

export function LoginForm({ returnTo }: Readonly<{ returnTo: string }>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Ellenőrizd a megadott adatokat.");
      return;
    }

    startTransition(async () => {
      try {
        const { error: signInError } = await createClient().auth.signInWithPassword(result.data);
        if (signInError) {
          setError("Nem sikerült bejelentkezni. Ellenőrizd az e-mail-címet és a jelszót.");
          return;
        }
        window.location.assign(getSafeReturnTo(returnTo));
      } catch {
        setError("A helyi hitelesítési szolgáltatás nem érhető el.");
      }
    });
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <label className="login-field">E-mail-cím<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="login-field">Jelszó<span className="password-input"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></span></label>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="login-submit" type="submit" disabled={isPending}><LogIn aria-hidden="true" />{isPending ? "Ellenőrzés…" : "Belépés"}</button>
    </form>
  );
}

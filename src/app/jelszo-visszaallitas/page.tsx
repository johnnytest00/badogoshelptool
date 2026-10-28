import { cookies } from "next/headers";
import { createClient } from "@/infrastructure/supabase/server";
import { PasswordRecoveryForm } from "@/features/auth/password-recovery-form";
import { isValidRecoverySession, PASSWORD_RECOVERY_COOKIE } from "@/features/auth/password-recovery";

export default async function PasswordRecoveryPage({ searchParams }: Readonly<{ searchParams: Promise<{ hiba?: string }> }>) {
  const cookieStore = await cookies();
  const hasRecoveryMarker = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value === "1";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const recoveryAvailable = isValidRecoverySession(hasRecoveryMarker ? "1" : undefined, !error && Boolean(data.user));
  const invalidLink = (await searchParams).hiba === "link";

  return (
    <main id="main-content" tabIndex={-1} className="auth-page-shell">
      <section className="login-card" aria-labelledby="password-recovery-title">
        <div className="auth-brand"><span>TETŐPRO</span></div>
        <p className="eyebrow">Bádogos HelpTool</p>
        <h1 id="password-recovery-title">Jelszó visszaállítása</h1>
        <PasswordRecoveryForm recoveryAvailable={recoveryAvailable} invalidLink={invalidLink} />
      </section>
    </main>
  );
}

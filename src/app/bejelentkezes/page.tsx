import Image from "next/image";
import brandIcon from "@/assets/brand-icon.png";
import { LoginForm } from "@/features/auth/login-form";
import { getAuthContext } from "@/features/auth/auth.server";
import { getSafeReturnTo } from "@/features/auth/redirect";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: Readonly<{ searchParams: Promise<{ returnTo?: string }> }>) {
  const returnTo = getSafeReturnTo((await searchParams).returnTo);
  const auth = await getAuthContext();
  if (auth) redirect(returnTo);

  return (
    <main id="main-content" tabIndex={-1} className="auth-page-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="auth-brand"><Image className="brand-icon" src={brandIcon} alt="" sizes="(max-width: 380px) 38px, 41px" priority /><span>TETŐPRO</span></div>
        <p className="eyebrow">Bádogos HelpTool</p>
        <h1 id="login-title">Üdv újra a műhelyben.</h1>
        <p className="login-lead">Jelentkezz be a helyi munkafelület folytatásához.</p>
        <LoginForm returnTo={returnTo} />
        <p className="login-note">Új hozzáférést a műhely adminisztrátora adhat.</p>
      </section>
    </main>
  );
}

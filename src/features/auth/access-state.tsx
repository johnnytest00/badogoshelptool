import { ShieldAlert } from "lucide-react";

export function NoOrganizationAccess() {
  return <main className="auth-state-shell"><section className="auth-state-card"><ShieldAlert aria-hidden="true" className="auth-state-icon" /><p className="eyebrow">Nincs hozzáférés</p><h1>Ehhez a műhelyhez nincs tagságod.</h1><p>Kérd meg a szervezet adminisztrátorát, hogy adjon hozzá egy szervezethez.</p><a className="login-secondary-link" href="/bejelentkezes">Vissza a belépéshez</a></section></main>;
}

export function ChooseOrganization() {
  return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a folytatáshoz.</h1><p>A rendszer nem választ helyetted automatikusan szervezetet.</p></section></main>;
}

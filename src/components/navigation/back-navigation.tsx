import { GuardedLink } from "@/components/navigation/guarded-link";
import { ArrowLeft } from "lucide-react";
import { isNavigationTarget } from "@/components/navigation/routes";

/**
 * Asztalon az állandó oldalsáv már elvezet minden fő célhoz, ezért az oda mutató vissza-sor
 * duplikált vezérlő, ami minden oldal tetejéről elvesz egy sort. A valóban beágyazott célok
 * (projekt, ajánlatrevízió — ezek nincsenek az oldalsávban) minden nézetben megmaradnak,
 * mobilon pedig minden vissza-link látszik, mert az alsó sáv nem jelöl hierarchiát.
 */
export function BackNavigation({ href, label }: Readonly<{ href: string; label: string }>) {
  const redundant = isNavigationTarget(href);
  return <GuardedLink className={`back-navigation glass-navigation${redundant ? " is-nav-duplicate" : ""}`} href={href}><ArrowLeft aria-hidden="true" className="size-4" /><span>{label}</span></GuardedLink>;
}

import { GuardedLink } from "@/components/navigation/guarded-link";
import { ArrowLeft } from "lucide-react";

export function BackNavigation({ href, label }: Readonly<{ href: string; label: string }>) {
  return <GuardedLink className="back-navigation glass-navigation" href={href}><ArrowLeft aria-hidden="true" className="size-4" /><span>{label}</span></GuardedLink>;
}

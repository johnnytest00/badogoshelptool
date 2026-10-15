import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackNavigation({ href, label }: Readonly<{ href: string; label: string }>) {
  return <Link className="back-navigation glass-navigation" href={href}><ArrowLeft aria-hidden="true" className="size-4" /><span>{label}</span></Link>;
}

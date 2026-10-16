"use client";

import Link from "next/link";
import { useAppInteraction } from "@/components/feedback/app-interaction-provider";
import type { ComponentProps } from "react";

type LinkProps = ComponentProps<typeof Link>;
type Props = Omit<LinkProps, "href" | "onNavigate"> & { href: string };

/** A Next App Router link that consults the active editor guard before SPA navigation. */
export function GuardedLink({ href, replace, scroll, ...props }: Props) {
  const interaction = useAppInteraction();
  return <Link {...props} href={href} replace={replace} scroll={scroll} onNavigate={(event) => {
    if (!interaction.hasUnsavedChanges && !interaction.hasPendingChanges) return;
    event.preventDefault();
    void interaction.requestNavigation(href, { replace, scroll });
  }} />;
}

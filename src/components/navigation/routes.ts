import { dashboardFunctionRoutes } from "@/features/dashboard/dashboard.data";

/**
 * Útvonal-aliasok. A `/anyagok*` és a `/anyagkezelo` ugyanazt a funkciót szolgálja ki
 * (mindkét oldal a `MaterialManagerPage`-et rendereli), ezért a navigációnak egy célnak kell látnia:
 * enélkül a termékoldalon egyik menüpont sem aktív, és a vissza-sor duplikáltnak sem minősül.
 */
const routeAliases: Readonly<Record<string, string>> = {
  "/anyagok": "/anyagkezelo",
};

export const navigationRoutes: readonly string[] = ["/", ...Object.values(dashboardFunctionRoutes)];

/** Lecsupaszított, alias nélküli útvonal: query, hash és záró perjel nélkül. */
export function canonicalRoute(href: string): string {
  const path = href.split("?")[0].split("#")[0].replace(/(.)\/+$/, "$1") || "/";
  const alias = Object.keys(routeAliases).find((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  return alias ? `${routeAliases[alias]}${path.slice(alias.length)}` : path;
}

/** Igaz, ha a cél maga egy oldalsávban is szereplő főútvonal (nem egy alatta lévő oldal). */
export function isNavigationTarget(href: string): boolean {
  return navigationRoutes.includes(canonicalRoute(href));
}

/** Igaz, ha az útvonal az adott menüpont alá tartozik (maga az útvonal vagy egy aloldala). */
export function isRouteActive(pathname: string, route: string): boolean {
  const current = canonicalRoute(pathname);
  if (route === "/") return current === "/";
  return current === route || current.startsWith(`${route}/`);
}

import { Suspense } from "react";
import { getAuthContext } from "@/features/auth/auth.server";
import { AppNavigationLinks } from "@/components/navigation/app-navigation-links";

/**
 * Egyetlen navigációs forrás: asztalon oldalsáv, mobilon alsó sáv.
 * A szervezetet szerveren oldjuk fel, mert a query paraméter nem minden útvonalon van jelen,
 * több szervezet esetén pedig enélkül a navigáció választóképernyőre vinne.
 */
export async function AppNavigation() {
  const auth = await getAuthContext();
  if (!auth) return null;
  const organizationId = auth.organizations.length === 1 ? auth.organizations[0].id : null;
  return <Suspense fallback={null}><AppNavigationLinks organizationId={organizationId} /></Suspense>;
}

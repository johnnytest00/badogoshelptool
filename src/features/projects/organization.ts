import { getAuthContext, type AuthContext, type OrganizationAccess } from "@/features/auth/auth.server";

export async function getProjectOrganization(requestedId?: string): Promise<{ auth: AuthContext; organization: OrganizationAccess | null; needsSelection: boolean } | null> {
  const auth = await getAuthContext();
  if (!auth) return null;
  if (auth.organizations.length === 0) return { auth, organization: null, needsSelection: false };
  const organization = auth.organizations.length === 1 ? auth.organizations[0] : auth.organizations.find((item) => item.id === requestedId) ?? null;
  return { auth, organization, needsSelection: auth.organizations.length > 1 && !organization };
}

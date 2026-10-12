import { createClient } from "@/infrastructure/supabase/server";

export type OrganizationAccess = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
};

export type AuthContext = {
  userId: string;
  email: string | null;
  displayName: string | null;
  organizations: OrganizationAccess[];
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub) return null;

  const userId = claims.sub;
  const [{ data: userData }, { data: profileData }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase.from("organization_members").select("organization_id, role").eq("user_id", userId),
  ]);

  if (membershipError) return { userId, email: userData.user?.email ?? null, displayName: profileData?.display_name ?? null, organizations: [] };

  const organizationIds = memberships.map((membership) => membership.organization_id);
  const { data: organizations } = organizationIds.length
    ? await supabase.from("organizations").select("id, name").in("id", organizationIds)
    : { data: [] };
  const organizationNames = new Map((organizations ?? []).map((organization) => [organization.id, organization.name]));

  return {
    userId,
    email: userData.user?.email ?? null,
    displayName: profileData?.display_name ?? null,
    organizations: memberships
      .filter((membership) => organizationNames.has(membership.organization_id))
      .map((membership) => ({ id: membership.organization_id, name: organizationNames.get(membership.organization_id)!, role: membership.role })),
  };
}

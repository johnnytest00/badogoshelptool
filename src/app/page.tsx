import { redirect } from "next/navigation";
import { Dashboard } from "@/features/dashboard/dashboard";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getAuthContext } from "@/features/auth/auth.server";
import { getExecutionOverviewForOrganization } from "@/features/execution/execution-data";

export default async function Home({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const auth = await getAuthContext();
  if (!auth) redirect("/bejelentkezes?returnTo=/");
  if (auth.organizations.length === 0) return <NoOrganizationAccess />;

  const requestedOrganization = (await searchParams).organization;
  const selectedOrganization = auth.organizations.length === 1
    ? auth.organizations[0]
    : auth.organizations.find((organization) => organization.id === requestedOrganization);

  if (!selectedOrganization) {
    return (
      <main id="main-content" tabIndex={-1} className="auth-state-shell">
        <section className="auth-state-card">
          <p className="eyebrow">Több szervezet</p>
          <h1>Válassz műhelyt a folytatáshoz.</h1>
          <p>A rendszer nem választ helyetted automatikusan szervezetet.</p>
          <OrganizationSelector organizations={auth.organizations} />
        </section>
      </main>
    );
  }

  const plans = await getExecutionOverviewForOrganization(selectedOrganization.id);
  return <Dashboard displayName={auth.displayName} email={auth.email} organizationName={selectedOrganization.name} organizationId={selectedOrganization.id} plans={plans} />;
}

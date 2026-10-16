import { redirect } from "next/navigation";

export default async function LegacyNewProjectPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const { organization } = await searchParams;
  redirect(organization ? `/?organization=${encodeURIComponent(organization)}` : "/");
}

import { MaterialManagerPage } from "@/features/materials/material-manager-page";

export default async function MaterialsPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  return <MaterialManagerPage searchParams={searchParams} />;
}

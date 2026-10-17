import { MaterialManagerPage } from "@/features/materials/material-manager-page";

export default async function MaterialsManagerRoute({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  return <MaterialManagerPage searchParams={searchParams} />;
}

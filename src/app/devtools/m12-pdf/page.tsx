import { notFound } from "next/navigation";
import PdfInspector from "@/features/drawings/pdf-inspector";

export const dynamic = "force-dynamic";

export default function M12PdfDiagnosticsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <PdfInspector />;
}

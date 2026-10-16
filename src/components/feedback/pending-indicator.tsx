import { LoaderCircle } from "lucide-react";

export function PendingIndicator({ label }: Readonly<{ label: string }>) {
  return <span className="interaction-pending-indicator" role="status" aria-live="polite"><LoaderCircle aria-hidden="true" className="interaction-spinner" />{label}</span>;
}

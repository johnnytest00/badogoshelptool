import type { ReactNode } from "react";

/** M9.15.2: one touch-sized switch tile for the calculator functions (rafter joints, material quantities). */
export function FeatureToggle({ id, checked, onChange, title, hint, ariaLabel }: Readonly<{ id?: string; checked: boolean; onChange: (checked: boolean) => void; title: string; hint?: ReactNode; ariaLabel?: string }>) {
  return <label className={`feature-toggle${checked ? " is-on" : ""}`}>
    <input id={id} type="checkbox" role="switch" aria-label={ariaLabel ?? title} checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span className="feature-toggle-copy"><strong>{title}</strong>{hint && <small>{hint}</small>}</span>
  </label>;
}

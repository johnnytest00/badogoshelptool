"use client";

import { useId, useState, type ReactNode } from "react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { GlassToolbar } from "@/components/ui/glass-toolbar";

/**
 * M9.6 order of the rafter-cut result: short state, the dimensioned rafter drawing (overview, marks, joint picker, detail,
 * cut guide), the main lengths, the joint state and limits, then the remaining numbers in a closed disclosure.
 */
export function RafterCutFlow({ status, drawing, main, limits, details }: Readonly<{ status: ReactNode; drawing: ReactNode; main?: ReactNode; limits?: ReactNode; details?: ReactNode }>) {
  return <>
    {status}
    {drawing}
    {main}
    {limits}
    {details && <GlassDisclosure className="construction-suite-result-details" summary="Részletes eredmények és kiindulási adatok">{details}</GlassDisclosure>}
  </>;
}

/**
 * The cut drawing needs data the roof shape does not give (rafter depth, HAP, supports), and those fields are opt-in.
 * Rather than leaving the view empty, it says what is missing and turns the fields on, so the drawing is never a dead end.
 */
export function RafterJointsInvitation({ onEnable }: Readonly<{ onEnable: () => void }>) {
  return <section className="technical-drawing is-compact rafter-joints-invitation" role="status">
    <div className="technical-drawing-header"><div className="technical-drawing-title"><h2>Szarufa vágásai · még nincs kiszámítva</h2></div></div>
    <p className="construction-suite-limit">A KARMI és a szelemencsatlakozások rajzához a tetőformán felül két adat kell: a <strong>szarufa keresztmetszet-magassága</strong> és a <strong>HAP</strong> — a szarufa felső élének magassága a talpszelemen felett. Derékszelemen és gerinckapcsolat megadása opcionális.</p>
    <button type="button" className="secondary-button" onClick={onEnable}>Szarufacsatlakozások bekapcsolása</button>
  </section>;
}

export type RoofDrawingView = Readonly<{ id: string; label: string; hint: string; content: ReactNode }>;

/**
 * M9.8: the roof calculators' drawings as one switchable panel instead of a stack with the secondary views buried in a
 * closed disclosure. One view at a time, so a phone shows a whole drawing; the hint under the switch says what it shows.
 * The buttons are a toggle group (aria-pressed), the same pattern as the drawing's own side and joint pickers.
 */
export function RoofDrawingViews({ views, label = "Tetőrajzok" }: Readonly<{ views: readonly RoofDrawingView[]; label?: string }>) {
  const [chosen, setChosen] = useState<string | null>(null);
  const headingId = useId();
  const current = views.find((view) => view.id === chosen) ?? views[0];
  if (!current) return null;
  return <section className="roof-drawing-views" aria-labelledby={headingId}>
    <h2 className="sr-only" id={headingId}>{label}</h2>
    {views.length > 1 && <GlassToolbar ariaLabel="Rajznézet választása" className="roof-drawing-switch">
      {views.map((view) => <button key={view.id} type="button" aria-pressed={view.id === current.id} onClick={() => setChosen(view.id)}>{view.label}</button>)}
    </GlassToolbar>}
    <p className="roof-drawing-view-hint">{current.hint}</p>
    <div className="roof-drawing-view-panel">{current.content}</div>
  </section>;
}

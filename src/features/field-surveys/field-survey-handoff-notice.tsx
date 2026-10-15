export function FieldSurveyHandoffNotice({ missing }: Readonly<{ missing: readonly string[] }>) {
  if (!missing.length) return null;
  return <section className="survey-handoff-banner" aria-label="Hiányzó kalkulátoradatok">
    <strong>A kalkulátorhoz még szükséges adat</strong>
    <span>{missing.join(" · ")}. A megadott értékeket nem pótoljuk feltételezéssel; a kalkulátorban töltsd ki a hiányzó mezőket.</span>
  </section>;
}

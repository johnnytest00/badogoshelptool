"use client";

export default function SavedCalculationsError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><section className="empty-state" role="alert"><h1>A mentett számítások nem tölthetők be.</h1><p>Próbáld meg újra a betöltést.</p><button className="primary-button" type="button" onClick={reset}>Újrapróbálás</button></section></div></main>;
}

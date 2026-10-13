"use client";

export default function ErrorFallback({ retry }: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
  return <main className="dashboard-shell"><div className="dashboard-container"><section className="empty-state" role="alert"><div><h1>Az oldal betöltése nem sikerült.</h1><p>Ellenőrizd a kapcsolatot, majd próbáld újra.</p><button className="primary-button" type="button" onClick={retry}>Újrapróbálás</button></div></section></div></main>;
}

import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { ArrowLeft, Ruler, Sparkles } from "lucide-react";
import { DemoRoofDrawing } from "@/drawings/demo-roof";
import { ScalingBubble } from "@/components/accessibility/scaling-bubble";
import { ScalingControls } from "@/features/preferences/scaling-controls";
import { getAuthContext } from "@/features/auth/auth.server";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { redirect } from "next/navigation";

export default async function ScalingDemoPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/bejelentkezes?returnTo=/demo/meretezes");
  if (auth.organizations.length === 0) return <NoOrganizationAccess />;

  return (
    <main id="main-content" tabIndex={-1} className="demo-page-shell">
      <div className="demo-page-container">
        <Link className="back-link" href="/"><ArrowLeft aria-hidden="true" className="size-4" /> Vissza a műhelyhez</Link>
        <header className="demo-page-header"><div><p className="eyebrow">DEMO · felületméretezés</p><h1 className="demo-page-title">Méretezési műhely</h1><p className="demo-page-lead">Három független beállítással ellenőrizheted, hogyan alkalmazkodik a felület a munkamódszeredhez.</p></div><span className="demo-page-icon"><Ruler aria-hidden="true" className="size-6" /></span></header>
        <div className="demo-grid">
          <section className="demo-surface" aria-labelledby="demo-controls-title"><div className="demo-section-heading"><Sparkles aria-hidden="true" className="size-5" /><div><p className="section-eyebrow">Élő vezérlés</p><h2 id="demo-controls-title">Globális megjelenítés</h2></div></div><p className="demo-copy">A beállítások helyben mentődnek. A szöveg, a kezelőszervek és a műszaki rajz külön-külön méretezhető.</p><ScalingControls /></section>
          <section className="demo-surface demo-form-surface" aria-labelledby="demo-input-title"><p className="section-eyebrow">Adatbevitel · DEMO</p><h2 id="demo-input-title">Minta felmérési adatok</h2><p className="demo-copy">Ezek a mezők csak a képernyőhöz igazodó elrendezés és a gombok bemutatására szolgálnak.</p><div className="demo-form-grid"><label>Épület szélessége<input type="text" inputMode="decimal" defaultValue="8,40" /><span>méter</span></label><label>Tető hajlásszöge<input type="text" inputMode="decimal" defaultValue="35" /><span>fok</span></label></div><div className="demo-status"><span className="status-dot" /> DEMO · Még nincs számítási eredmény</div></section>
        </div>
        <section className="demo-surface drawing-surface" aria-labelledby="drawing-title"><div className="demo-section-heading"><Ruler aria-hidden="true" className="size-5" /><div><p className="section-eyebrow">SVG megjelenítés · DEMO</p><h2 id="drawing-title">Nyeregtető vázlat</h2></div></div><p className="demo-copy">A rajz megjelenítési mérete változik, a feliratozott 12,0 m-es geometriai példa változatlan marad.</p><DemoRoofDrawing /></section>
      </div>
      <ScalingBubble />
    </main>
  );
}

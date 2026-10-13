# F9.7.0 — Product UX & Workflow Audit

**Dátum:** 2026-10-13
**Mód:** fókuszált, forrásalapú audit; alkalmazáskód nem változott.
**Állapot:** COMPLETE (AUDIT). A státusz helyi termék- és forráskód-auditot jelent, nem pilot- vagy eszközös elfogadást.

## Vezetői összefoglaló

A projekt már összeköti a geometriai forrást, három szakmai kalkulátort, a katalógust, a draft anyagkimutatást, az ajánlatot és az elfogadott ajánlatból induló kivitelezési tervezést. Az alap adatfolyam erős: a számítási revíziók és források visszakövethetők, a draft átadás explicit, a jóváhagyott anyagkimutatás és ajánlati snapshot nem frissül automatikusan. A fő UX-adósság az elérhetőség és a három kalkulátor közti eltérő kezelési minta: a projektáttekintésből két kalkulátor nem nyitható meg, az eresz és szegély hosszú adatbeviteli folyamata pedig másként rendezi az előzményt, eredményt, rajzot és átadást. P0 nincs bizonyítva; három P1 workflow-fejlesztés indokolt. A szakmai tartalom automatikus kitöltését csak meglévő, forrásolt adattal szabad javasolni.

## Megvalósított workflow és átmenetek

| Szakasz | Ténylegesen elérhető | Értékelés |
|---|---|---|
| Projekt létrehozás | Projektlista és új projekt útvonal, opcionális ügyféllel/helyszínnel | Meglévő, önálló belépési pont. |
| Tetőgeometria | Projekt alatt nyeregtetőmodell, mentett revízió és eredmény | Eresz-szegély javaslat forrása; forrás elavulása kezelve. |
| Szakmai kalkuláció | Ereszcsatorna, szegély, lemezprofil; saját projektroute-on | Az eresz és szegély linkje nincs a projektáttekintésen. |
| Katalógus és anyagkimutatás | Explicit variáns-hozzárendelés, mentett kalkulációból új draft; jóváhagyási workflow | Nincs implicit mértékegység-átváltás. Ez helyes adatvédelmi és szakmai korlát. |
| Ajánlat | Projektoldali ajánlatlista, revízió és életciklus, PDF | A már létező anyagkimutatás→ajánlat út természetes, de kalkulátor felől nincs egyetlen összefoglaló „mi következik” állapot. |
| Kivitelezési tervezés | Projektoldali `ExecutionPlanning`, elfogadott ajánlatokra alapozott terv | Megvalósított; a teljes tető→kivitelezés folyamat egy képernyőn nem vezetett. |
| Projektjelentés | Kivitelezési dokumentáció API route létezik | A felület és az elérhető, felhasználói jelentésworkflow nem igazolt az auditált oldalból; nem tekinthető bizonyított, végponttól végpontig jelentésfolyamatnak. |

Felesleges kötelező lépés nem bizonyítható. A geometria nélküli ereszcsere lehetősége a blueprintben szerepel, az ereszútvonal geometriát csak javaslatként ad hozzá; ezért a geometria nem kötelező előfeltétel. Biztonságosan automatizálható a már meglévő forrásból származó geometriajavaslat, elavult forrásjelzés, mentett revízió előnézete és draft-átadási előnézet. Anyag, gyártói megfelelőség, átváltás vagy ár nem következtethető hiányzó adatból.

## Kalkulátor UX összehasonlítása

| Terület | Ereszcsatorna (`GutterCalculator`) | Szegély (`FlashingCalculator`) | Lemezprofil (`ProfileEditor`) |
|---|---|---|---|
| Bemenet | Ereszszakaszok, lefolyók, kézi tartozékok; geometriai javaslat gombnyomással vehető fel | Szakasz/kategória-alapú draft és geometriajavaslat | L/U/egyedi sablon, profilparaméterek és katalógusjelölt |
| Magyarázat/figyelmeztetés | Darabegységű előzetes mennyiség; implicit fm/csomag átváltás kizárva | Előzetes darab/fm alternatíva; a mapping nem igazol gyártói profilt vagy szerelést | Tangenciapontok közötti méretek magyarázata; hiányzó BA/K esetén hiányos eredmény |
| Eredmény/rajz | Eredménytáblázat és műszaki rajz | Eredménykártyák, figyelmeztetések és méretezett séma | Élő eredmény és SVG-szerkesztés; pan/zoom működésről korábbi fizikai iPhone bizonyíték szerepel a projektelőzményben, ez most nem lett újratesztelve |
| Revízió | Történeti revíziók közvetlen betöltőgombokkal, külön „Revízió mentése” | Mentés új revízióként, revíziólista, stale jelzés | Külön profil- és revízióválasztó, aktuális revíziószám és dirty állapot |
| Katalógus/átadás | Több jelölt és kompatibilitási állapot, új takeoff draft | Kategória/egység ellenőrzés és átadási előnézet; kompatibilitási korlát kimondva | Explicit műszaki match szükséges; nettó blankterület draft átadás |

Konzisztencia-javaslat: ugyanazt a sorrendet használják (Bemenet → Eredmény/figyelmeztetés → Rajz → Katalógus → Átadási előnézet → Revíziók), ugyanazzal a mentési állapotnyelvvel és revízióválasztó viselkedéssel. Ez UI-összerendezés, nem motor- vagy revíziószerződés-módosítás. Az eresz- és szegély-SVG legalább 720 px széles rajzot vízszintesen görgethető keretben mutat; a profil SVG külön szerkesztőnézetet használ. Rajzolási konvenció, fókusz és mobil feliratolvasás szemrevételezéssel nincs igazolva.

## Navigáció, terminológia és állapotjelzés

- Bizonyított útvonalminta: mindhárom kalkulátor külön projekt alatti route, és mindegyiken közös `BackNavigation` tér vissza a projekthez.
- A projekt részletező oldalon a tetőmodell, lemezprofil, anyagkimutatás és ajánlat elérhető. Ereszcsatorna és szegély link nincs ott; a `future-module-grid` két helyén „Hamarosan” feliratú, nem kattintható modul található, miközben a kapcsolódó ajánlat és anyagkimutatás valós. **P1:** kalkulátor-kártyák és státuszok hozzáadása a projektáttekintéshez; bonyolultság S, F9.7.1.
- Az „Új draft”, „anyagkimutatás-piszkozat”, „kalkulációs revízió”, „történeti revízió” és „forrásrevízió” jelentése technikai pontosságú, de kezdő felhasználónak eltérő fogalmak. **P2:** rövid, következetes leírás: „számítás mentése új verzióként”, „anyaglista előkészítése” (draft státusz megtartásával); bonyolultság S, F9.7.2.
- A projektoldali kalkulátor- és átadási státuszok nem adnak közös „következő teendő” jelzést. **P1:** projektszintű workflow-összefoglaló, amely csak meglévő adatokból mutatja a következő elérhető lépést; bonyolultság M, F9.7.2. Ne változtasson adatot automatikusan.

## UI, mobil/tablet és hozzáférhetőség

**Forrásból igazolható:** globális elsődleges/másodlagos gomb min. 2.75rem magas; a projekt kalkulátorkártyái 760 px alatt két, 560 px alatt egy oszlopra váltanak; a profil editor 850 px alatt egy oszlop. Ereszadat-sor 700 px alatt két oszlopra törik; szegély eredmény és katalógus mapping 700/760 px alatt egy oszlopra vált. A szegély és eresz SVG konténer vízszintes görgetést enged, rajz minimum 720 px. Ezek CSS-szabályok, nem bizonyítékok 390 px vagy iPad tényleges használhatóságára.

**Potenciális kockázat (nem viewport-teszt):** az eresz szakasz és lefolyó űrlapja sok ismétlődő mezőt tartalmaz; érintéses bevitelnél hosszú görgetést és billentyűzet miatti műveletvesztést okozhat. Nincs közös, mindig elérhető mentés/eredmény navigáció; sticky viselkedés nem igazolt. Az SVG 720 px minimális szélessége mobilon pan/zoom nélkül vízszintes pásztázást igényel. iPad-specifikus elrendezés és tájolás forrásból nem bizonyítható.

**Akadálymentességi bizonyíték/kockázat:** több oldalon natív `label` köti a szöveget a vezérlőhöz; kalkulátorszekciók kapnak `aria-labelledby`/`aria-label`-t, mentési visszajelzés `role=status`, egy hiba `role=alert`. A szegély/eresz SVG teljes képernyőolvasói leírása és fókuszsorrendje nem igazolt. A globális CSS-részletben nincs látható közös `:focus-visible` szabály a vizsgált sorok között; ez kockázat, nem bizonyított fókuszhiba, mert böngésző és további stílusok nem kerültek ellenőrzésre. Kontrasztarány nem lett számolva; nincs állítás WCAG-megfelelésről. A `text-button` érintési mérete nem volt a rendelkezésre álló szabályok alapján bizonyítható. **P2:** fókusz/hiba/séma ellenőrzőlista és SVG alternatív összefoglaló egy célzott hozzáférhetőségi körben, F9.7.3, M.

## Prioritásos backlog

| Prioritás | Érintett felület | Bizonyíték és hatás | Javasolt javítás | Komplexitás / mérföldkő |
|---|---|---|---|---|
| P1 | Projekt részletező: `src/app/projektek/[projectId]/page.tsx` | Nincs link az eresz- és szegélykalkulátorhoz, bár route és funkció létezik; a felhasználó nem találja a munkát a projekt kontextusából. | Helyezzen el konzisztens projektmodul-kártyákat; mutasson mentett/nincs mentve státuszt, ahol már rendelkezésre áll. | S · F9.7.1 |
| P1 | Projekt→anyagkimutatás→ajánlat→kivitelezés | Egyes útvonalak léteznek, de nincs egy közös állapot-/következőlépés áttekintés. A teljes folyamatban nő a visszalépés és ellenőrzés költsége. | Projekt szintű olvasó workflow-összefoglaló a meglévő kalkuláció, draft, ajánlat és terv státuszaiból. | M · F9.7.2 |
| P1 | Eresz/szegély/profil kalkulátorok | Eltérő revízióválasztó, mentési gomb/üzenet, rajz- és mapping-sorrend; három külön workflow-t kell megtanulni. | Közös tartalmi sorrend és állapotnyelv; közös komponens csak valódi ismétlődésre. A domain és snapshot változatlan. | M · F9.7.2 |
| P2 | Eresz/szegély mobil forma és SVG | 390 px/érintés/tablet nem tesztelt; kétoszlopos űrlapsorok és 720 px rajz minimális szélesség potenciális kockázat. | Egyetlen 390 px + tablet ellenőrző workflow; szükség esetén mezőcsoport- és rajzvezérlés finomítás. | M · F9.7.3 |
| P2 | Minden kalkulátor, fókusz és hiba | Natív label és néhány élő státusz bizonyított; SVG screen-reader leírás, kontraszt, fókuszláthatóság nem. | Célzott billentyűzet/screen-reader/kontraszt áttekintés, feladathiba-mezőhöz kötése, SVG szöveges összegzése. | M · F9.7.3 |
| P2 | Kalkulátor és takeoff terminológia | A revízió/draft/snapshot terminusok pontosak, de technikaiak. | Mikrocopy a draft státuszt és az immutable előzményt megőrizve. | S · F9.7.2 |
| P3 | Rajz és bővített navigáció | További vizuális egységesítés vagy panoráma-vezérlés igénye tényleges használati megfigyelés nélkül nem igazolt. | Csak pilot-visszajelzés után vegyük fel. | S/M · későbbi iteráció |

## F9.7 ajánlott fázisok

1. **F9.7.1 — Projektoldali felfedezhetőség (S):** eresz- és szegélylink; modul-kártyák meglévő státusszal; link- és jogosultság-útvonal célzott ellenőrzése. Csak UI, adatmodell nélkül.
2. **F9.7.2 — Kalkulátor-munkafolyamat konzisztencia (M):** három képernyő azonos bemenet→eredmény→rajz→mapping→draft előnézet→revízió olvasási rendje; közös mentési mikrocopy; read-only projekt workflow-összefoglaló. Meglévő szerveroldali újraszámítás, optimistic concurrency, immutable revision, stale tiltás és jóváhagyott snapshot változatlanul marad.
3. **F9.7.3 — terepi használhatóság és hozzáférhetőség (M):** egy fókuszált mobil/tablet smoke (390 px + iPad szélesség) és billentyűzetes audit; csak feltárt hibák javítása; érintési célok, görgetés, fókusz, hibakapcsolás és SVG alternatíva igazolása. Fizikai eszköz QA külön jelölendő.
4. **F9.7.4 — pilot utáni finomítás (S, feltételes):** szakmai visszajelzésből P2/P3 felülvizsgálat. Nincs új kalkulációs szabály vagy valós gyártói adatforrás a pilot szakmai validálása nélkül.

## Módszer, korlátok és ellenőrzési állapot

- Áttekintve: `AGENTS.md`, `PROJECT_BLUEPRINT.md`, `docs/PROGRESS.md`, `docs/TEST_MATRIX.md`; projekt részletező, eresz/szegély/profil route és kalkulátor komponensek, releváns globális CSS és SVG használat.
- Böngésző: a Codex in-app browser tablistája üres volt. Hitelesített helyi session nem állt rendelkezésre, ezért nem indult navigáció/login és nem történt adatmutáció. Minden UX-megállapítás forrásalapú; képernyőn megfigyelt viselkedés nincs.
- Nem ellenőrzött: 390 px/iPad konkrét render, fizikai mobil, kontrasztmérés, képernyőolvasó, teljes útvonalteszt, hibás/üres/loading állapotok teljes katalógusa, jelentés UI, adatbázis/RLS és teljes regresszió. A dokumentált korábbi tesztek a mérföldkőnaplóban szereplő bizonyítékok; ebben az auditban nem futtattam őket újra.
- Nincs appkód-, adatbázis-, migration- vagy Supabase-változtatás. Nincs külső kutatás, build vagy tesztfuttatás.
- Javasolt Conventional Commit: `docs(F9.7.0): add product UX and workflow audit`.

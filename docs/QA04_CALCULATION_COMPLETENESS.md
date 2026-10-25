# QA-04 — Kalkulációteljesség, mentés és downstream biztonság

**Státusz (2026-10-25): PASS WITH LIMITATIONS.** A hiányos vagy nem számítható kalkuláció az alkalmazás normál útvonalain nem menthető teljes revízióként, és történeti hiányos revízió nem adható tovább ajánlatba vagy új munkanapló-kapcsolatba. Tartós piszkozatmentés nem készült: ehhez explicit adatmodell- és RPC-szerződés kellene.

## Eredeti hiba és bizonyított gyökérok

A `roof.timber-cutlist` érvényes tetőgeometriából részleges geometriai eredményt tudott adni kiosztási adatok nélkül. A korábbi közös menthetőségi feltétel csak ezt vizsgálta:

- minden nem opcionális alapmező ki van töltve;
- nincs számítási hiba;
- van legalább egy eredménysor **vagy** számított geometria.

Ez összemosta az érvényes geometriát a felhasználó által kért faanyag-kimutatás teljességével. A böngésző és a szerver ugyanazt a hibás `isSaveableComputation` szabályt használta, ezért a szerveroldali újraszámítás sem zárta ki a hiányos mentést. Az immutable revíziós táblák és író RPC-k nem tárolnak külön `draft`/`completeness` állapotot; egy ilyen mentés normál, továbbadható revíziónak látszott.

## Jelenlegi teljességi szerződés

A `computeConstruction` eredménye külön `complete`, `incomplete`, `invalid` vagy `unsupported` állapotot és oklistát ad. Ezek jelentése:

- **Teljes:** a jelenlegi validátorok szerint érvényes bemenetből minden kért eredmény előállt. Menthető és a meglévő jogosultsági/üzleti feltételekkel továbbadható.
- **Hiányos:** valamely szükséges bemenet vagy kért anyagcsoport eredménye hiányzik. A már számítható geometria és részérték csak előnézet; normál revízióként nem menthető.
- **Érvénytelen:** a mező vagy a faanyag-kiosztás numerikusan/strukturálisan hibás, vagy a motor hibát ad. Nem menthető.
- **Nem támogatott:** a kért anyagkimenethez a jelenlegi motor nem támogatja a geometriát. Nem menthető.

A szakmai, statikai, gyártói vagy kivitelezési jóváhagyás ettől külön fogalom. A „Teljes kalkulációs eredmény” felirat ezt explicit kimondja; nem minősít tervet vagy terméket.

A faanyag-kalkulátorban legalább szarufa- vagy léckiosztás szükséges. A felület tényleges mezőnévvel jelzi: „Szarufa · legnagyobb tengelytávolság vagy Léc · legnagyobb sortávolság”. A teljesen elhagyott keresztmetszet opcionális maradt; a félig megadott keresztmetszet hiányos, az érvénytelen érték hibás. A geometriai és pénzügyi képletek nem változtak.

## Termékviselkedés és kliens–szerver paritás

- A kalkulátor eredményterülete világosan jelzi a teljes, hiányos és nem számítható állapotot, és felsorolja a hiány okait.
- A mentőpanel csak `complete` állapotban enged mentést. A szerver a beküldött snapshotot ugyanazzal a domainfüggvénnyel újraszámolja és ugyanazzal a menthetőségi szabállyal ellenőrzi.
- A hiányos előnézet a QA-03 munkamenetmemóriában megmaradhat kalkulátorváltás és browser back/forward során, de tartós revízió nem lesz belőle.
- A tényleges mentett állapot az immutable revízió kimenetéből következik. Egy történeti hiányos revízió „Mentett Vn · hiányos” jelölést kap; nem zöld „mentve” állapotot.

## Piszkozatmentés döntési kapu

**Tartós piszkozatmentés nem támogatott ebben a mérföldkőben.** A jelenlegi `calculation_revisions` és az író/downstream RPC-k nem különböztetnek meg piszkozatot és teljes kalkulációt. Biztonságos megoldáshoz legalább explicit revízióállapot, újranyitási szerződés, immutabilitási és konkurencia-szabály, valamint minden downstream RPC adatbázis-oldali ellenőrzése kellene. Ez migrációt és széles szerződésváltozást jelent, amit a QA-04 korlátai szerint nem vezettünk be jóváhagyás nélkül.

A támogatott draft a QA-03 szerinti, csak aktuális böngésző-munkamenetben élő szerkesztési állapot. Újratöltés vagy lapbezárás után nem garantált.

## Snapshot-, revízió- és downstream kompatibilitás

- Mentett snapshotot nem írtunk át, a séma verziója változatlan.
- A régi revíziók továbbra is megnyithatók. A kimenetvédő a pontos immutable `output_snapshot` alapján konzervatívan dönt: nem anyagos kalkulátornál eredménysor kell; anyagosnál `VALID` takeoff és hibamentes specifikációs snapshot.
- Az alkalmazás szerveroldali ajánlatkészítő és munkanapló-kapcsoló műveletei a szervezethez és az exact revízióhoz tartozó kimenetet újra ellenőrzik. Hiányos forrásnál nem indul író RPC; új munkanapló sem jön létre mellékhatásként.
- Az ajánlat forrásbetöltője és tételjelölt-képzője hiányos snapshotból nem ad át mennyiséget. A munkanapló meglévő történeti kapcsolatát auditálhatóság miatt nem töröljük, de hiányosként jelöljük; új kapcsolat tiltott.
- Anyaglistába vezető közvetlen önálló kalkulációs útvonal nincs a jelenlegi alkalmazásban. A takeoff-részérték nem kapott új, kerülő továbbadási utat.

Az RLS változatlan; az olvasás szervezetre szűrt és a meglévő RLS-t használja. A konkurens kalkulációmentés meglévő `expectedRevisionNumber` és idempotens operation-ID szerződése változatlan.

## Automatizált bizonyíték

- TDD első piros futás: 4 fájl, **6 FAIL / 22 PASS** — a hiányos faanyag még menthető volt, a UI/downstream tiltások hiányoztak.
- Első zöld kör: ugyanaz a 4 fájl, **28/28 PASS**.
- Downstream TDD piros futás: 3 fájl, **4 FAIL / 14 PASS**; javítás után **18/18 PASS**.
- Kombinált QA-04 célzott futás: 7 fájl, **46/46 PASS**; a szervezeti/exact-revíziós read-guard külön tesztje **1/1 PASS**.
- A végső review egy új-munkanapló kerülőutat és a történeti kapcsolat leválaszthatóságát külön piros teszttel fogta meg (**2 FAIL / 8 PASS**); javítás után a kibővített végső célzott futás **11 fájl / 61 PASS**.
- Teljes `npm test`: **181 PASS / 8 SKIP fájl; 1085 PASS / 19 SKIP teszt**.
- `npm run lint`: PASS.
- Közvetlen `tsc --noEmit -p tsconfig.typecheck.json`: PASS.
- Izolált `npm run typecheck`: PASS; az aktív dev szerver `.next` könyvtárát nem érintette.
- Izolált `npm run build`: PASS, Next.js 16.4.2 webpack production build.
- `npm run db:test`: **61 fájl / 1292 PASS** a helyi adatbázison.
- `git diff --check`: PASS.

A célzott tesztek lefedik a teljes faanyag-kimenetet; hiányzó kiosztást; fél/érvénytelen keresztmetszetet; érvénytelen numerikus bemenetet; nem támogatott geometriát; kliens–szerver egyezést; történeti hiányos kimenetet; hiányzó adat pótlását; ajánlat- és munkanapló-negatív utat; exact revízió/szervezet ellenőrzést. A teljes suite újrafuttatta a QA-03/03.1 mm/cm/m, kalkulátorváltás, back/forward, új kalkuláció és dirty-state regressziókat is.

## Böngészős bizonyíték

Hitelesített helyi Brave, sötét téma, megosztott DEMO adat módosítása nélkül:

- Desktop: 1000 × 800 cm, 35° tető geometriája kiosztás nélkül megjelent, de „Hiányos kalkuláció” státusszal, a hiányzó kiosztási mező nevével és tiltott mentőgombbal.
- A szarufa-kiosztás 80 cm-es megadása után „Teljes kalkulációs eredmény”, 28 db / 136,727 m szarufa és engedélyezett mentőgomb jelent meg. Mentésre nem kattintottunk.
- Brave DevTools iPhone SE emuláció, **375 × 667 px**: a teljes és hiányos mentőpanel egyoszlopos, vízszintes túlcsordulás nélkül olvasható; hiányos állapotban a figyelmeztetés és a tiltott gomb egyszerre látható.

## Módosított QA-04 területek

- Teljesség és történeti kimenetőr: `src/features/calculators/construction-computation.ts`.
- Állapotkommunikáció és mentőpanel: `construction-suite.tsx`, `construction-save-panel.tsx`.
- Exact revízió olvasási őr: `src/features/calculations/construction-data.ts`.
- Munkanapló: `execution-document-link-actions.ts`, `execution-calculation-links.ts`, `execution-plan-calculations.tsx`.
- Ajánlat: `calculation-quotation-source.ts`, `calculation-quotation-data.ts`, `standalone-quotation-actions.ts`.
- A felsorolt modulok célzott Vitest fájljai és `construction-data.test.ts`.

## Fennmaradó kockázatok és nem ellenőrzött esetek

- A DB-séma és az RPC-k nem kaptak teljességi státuszt. Az alkalmazás normál szerveres útvonala védett, de egy közvetlenül, megfelelő jogosultsággal meghívott meglévő downstream RPC történeti hiányos revíziónál nem ismeri ezt az alkalmazásszintű szabályt. A teljes védelemhez jóváhagyott migráció szükséges.
- Tartós piszkozat újranyitása, hostolt Supabase/RLS, második élő szervezet, valódi mobilkészülék, világos téma és tartós böngészős mentés nem futott.
- A konzervatív történeti őr a hibamentes specifikációs snapshot nélküli régi anyagos kimenetet hiányosnak tekinti; megnyitását nem tiltja, csak a downstream átadást.

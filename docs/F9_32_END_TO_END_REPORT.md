# F9.32 — napi munkafolyamat végponttól végpontig tartó ellenőrzése

Dátum: 2026-10-17  
Környezet: helyi production build, hitelesített `DEMO TetőPró Kft.` szervezet, helyi Supabase. Hosted szolgáltatást nem módosítottam.

## STATUS

**COMPLETE a felsorolt helyi DEMO folyamatokra.** A Survey → Material List → Quotation draft → Work Log fő útvonalat, a négy független létrehozási útvonalat és a leírt accepted-quotation határt böngészőben végigjártam. Ez nem jelent fizikai telefonos, hosted vagy minden 33 kalkulátorra kiterjedő browser-elfogadást.

## COMPLETE WORKFLOW RESULTS

Aktív belépési pontok: felmérések `/felmeresek`, anyaglisták `/anyaglistak`, ajánlatok `/ajanlatok`, munkanaplók `/kivitelezes`; a konstrukciós kalkulátorok `/kalkulatorok` szekcióban érhetők el. A régi `/kalkulatorok/szegelyek` útvonal a kalkulátor-gyűjtőre irányított. A különálló, régi flashing/sheet-layout/project kalkulátor UI nem került vissza.

| Lépés | Eredmény és helyi DEMO azonosítók |
| --- | --- |
| Felmérés | Ügyfél/projekt nélküli új standalone nyeregtető-felmérés. 10 m hossz, 6 m szélesség, 3 m emelkedés; számított rajzi terület 103,945 m²; külön ereszmérés 12 m. Survey `1bb707f6-ca4a-47f0-8cbe-05a34e171b38`, V1 revízió `39d5f66c-b340-476f-909d-7d0bf394d3b1`. Mentés, újranyitás és összesítő ellenőrizve. |
| Anyaglista a felmérésből | `e33eaf05-d1c2-45a5-830e-3838c49b9d82`, V1 `57b44921-7e05-40a2-8990-6fd0746c0743`. Pontos Survey V1 forrásrevízióval indult; 12 m mért ereszforrás, egy DEMO katalógustermék és egy kézi tétel. Mentés, frissítés és újranyitás után a mennyiségek, forrás és hiányzó árak megmaradtak. |
| Árajánlat draft | `c3202c71-c686-4b2c-a6cd-64f3609b2bd8`, V1 `06b0e2bf-2881-4075-b013-c6c6461a743d`; pontos anyaglista-forrásrevízió `57b44921-7e05-40a2-8990-6fd0746c0743`. Három importált sor ára hiányzó maradt. Egy elkülönített DEMO munkadíjsor 1 HUF/óra értékkel készült, kizárólag tesztadatként. Mentés, frissítés, újranyitás sikeres; draft maradt, nem véglegesítettem és nem fogadtam el. |
| Munkanapló | Quote nélküli standalone munkanapló `ebd4ee73-c44a-4b1a-b306-39bbc611d402`: bejegyzés mentése és újranyitása sikeres; a Survey V1 később a meglévő társítási művelettel kapcsolódott hozzá. Külön accepted-quote határ: új worklog `19fad74a-75d2-4c68-9b81-1361b077e557` a már elfogadott quote `9f7f8e95-0ef5-4543-a041-1a94ac51e3f7` végleges revíziójára (`eac61b01-415b-4c0e-b952-1b844e392fc2`) hivatkozik. Az accepted státusz nem változott. |

Nem állítottam elő quote-elfogadást vagy kiállítást. Az új, tesztelt draft nem jelent meg accepted-only projekt munkanapló forrásaként; a munkanapló elfogadott ajánlatból induló határa megmaradt.

## INDEPENDENT WORKFLOW RESULTS

- Survey ügyfél és projekt kiválasztása nélkül: mentés és újranyitás sikeres.
- Anyaglista Survey nélkül: `45befed4-1831-42ba-9ff2-c29bbceb436e`; kézi DEMO sorral mentés és újranyitás sikeres.
- Üres standalone quotation draft anyaglista nélkül: `060d23f3-31bb-4de1-a067-31874a54ca0f`; létrehozás sikeres.
- Munkanapló quotation nélkül: lásd `ebd4ee73-c44a-4b1a-b306-39bbc611d402`; létrehozás és újranyitás sikeres.

## BUGS FOUND AND FIXED

1. A mentett Survey összesítő CTA-ja route-frissítés után elvesztette a helyi nézetállapotot. A CTA már nem frissíti a route-ot; az összesítő és anyaglista CTA böngészőben ellenőrzött.
2. A `/kivitelezes/uj` oldal meglévő munkanaplók esetén nem mutatta a létrehozó űrlapot. Az útvonal explicit `initialCreate` jelzése ezt helyreállítja; regressziós teszt készült.
3. Az árazatlan, felmérésből származó sorok nem menthetők quotation draftba: frontend validáció és restricted DB writer kötelező árat várt, holott az üzleti draft hiányos árakat is megenged. A standalone-only validátor és writer immutábilis draft snapshotban megőrzi az üres árat és `missing` provenance-t; a hiányzó ár null marad, részösszeg csak árazott sorokból áll, `complete=false`. Projektajánlat sémája/írása nem változott.
4. Anyaglista nézet 1024 px-en túlcsordult. A kapcsolódó reszponzív row/field grid breakpointok 1100 px-re váltanak.

## DATA INTEGRITY AND SECURITY

- A browser és helyi adatbázis olvasása ugyanazokat az immutable V1 source revision ID-ket igazolta az anyaglistán és ajánlaton.
- Az üres ár JSON mezője üres maradt; hiányzó ár nem lett kitalálva. A DEMO munkadíj ára egyértelműen tesztértékként volt megadva.
- A quote draft `complete=false`; nem történt véglegesítés, elfogadás vagy kiállítás. A meglévő accepted quote státusza változatlan.
- A mentések az alkalmazás meglévő szerveroldali műveletein/RPC-in mentek; nem történt közvetlen DB írás browserből. A DB RPC restricted grant modelljét a pgTAP és a releváns helyi Auth/RLS writer tesztek is érintették.
- Szervezeti határok és meglévő snapshot/idempotencia-szerződések nem módosultak. A lokális DEMO rekordok elkülönített névvel készültek; hosted adatot nem érintettem.

## UX FINDINGS

- A kritikus út tesztelt lépései: survey mentés → anyaglista létrehozás/mentés → draft ajánlat létrehozás/mentés → munkanapló létrehozás és forrás társítás. A böngészős futásban nem számoltam külön megerősítő dialógusokat, amelyek nem jelentek meg; a részletes navigáció a fenti route-okon és CTA-kon történt.
- Mobile-first emulációban a felmérés, anyaglista, ajánlat és munkanapló document/body vízszintes túlcsordulását ellenőriztem 1440, 1024, 768, 390 és 320 CSS px szélességen: mind a 20 mérésnél a scrollWidth megegyezett a viewporttal.
- Survey összesítő és témaváltó Enter billentyűvel használható volt. Világos és sötét téma ellenőrizve; a sötét témát visszaállítottam.
- A kritikus adatkapcsolatokat az UI forrás/revízió adatai mutatták; a munkanapló ajánlat-kapcsolata továbbra is accepted quote-hoz kötött. Nagyobb navigációs/űrlap-átalakítást nem végeztem.
- Fizikai telefon/touch, képernyőolvasó, forced-colors, kontrasztmérés és 33/33 kalkulátor különálló böngészős végigpróbálása nem történt.

## TEST RESULTS

| Ellenőrzés | Eredmény |
| --- | --- |
| Teljes Vitest: `npm test` | PASS: 134 fájl, 584 teszt; 9 fájl / 27 teszt skip. |
| Teljes helyi pgTAP: `SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db --local` | PASS: 39 fájl, 960 assertion. Új `038_standalone_unpriced_quote_drafts.sql` ellenőrzi az áratlan draft megőrzését és `complete=false` állapotát. |
| Helyi Auth/RLS integration Vitest | PASS: 4 fájl / 11 teszt (survey workspace, sheet-layout writer, multi-roof writer, material manager). |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS. |
| `npm run build` | PASS: Next.js 16.4.0 webpack, 30 statikus oldal. |
| `git diff --check` | PASS a dokumentáció és kód frissítése után. |
| Böngészős workflow / viewport / keyboard / themes | PASS a fenti lokális DEMO útvonalakon és emulációs méreteken. Fizikai eszköz és akadálymentességi technológia nincs állítva. |

### Helyi migrációs korlát

A `supabase migration up --local` a korábbi F9.31 `20261017120000_secure_sheet_layout_writer.sql` migrációnál megállt, mert a `sheet_layout_save_operations` reláció a helyi sémában már létezik, miközben a migration history eltér. Adatbázis-resetet nem végeztem. Az új `20261017130000_allow_unpriced_standalone_drafts.sql` `CREATE OR REPLACE` writerét a futó helyi DB-re közvetlenül alkalmaztam, és a teljes pgTAP suite sikeres volt. Ezért a funkció helyi DB-viselkedése bizonyított, de tiszta adatbázis teljes migration replayje nem. Hosted adatbázison nem futtattam migrációt.

## REMAINING LIMITATIONS AND PRIORITIES

1. **P1:** Helyi migrációs előzmény/séma drift rendezése és teljes, tiszta lokális migration replay bizonyítása külön, nem destruktív mérföldkőben.
2. **P1:** Valós eszközön végzett 390 px-es terepi használhatósági próba, touch célpontok, screen reader és forced-colors ellenőrzés.
3. **P2:** Quote- és munkanapló-asszociációs mikrocopy terepi megfigyelése; csak igazolt félreértés alapján módosítandó.
4. **P2:** A 33 építési kalkulátor elérhetőségének külön automatizált route smoke mátrixa. Ebben a mérföldkőben csak a kalkulátor-gyűjtőt és egy legacy redirectet ellenőriztem.

Nincs ismert blokkoló hiba a végigjárt helyi DEMO főfolyamatban. Hosted, fizikai eszközös és tiszta migration replay állítás nem része a sikeres eredménynek.

# F9.5.1 — Pilot readiness és üzembiztonság

**Státusz: PARTIAL**

Ez a dokumentum a Bádogos HelpTool korlátozott, ellenőrzött pilotjának előfeltételeit rendezi. Nem minősíti a rendszert production-ready, jogilag hiteles vagy szakmailag önálló döntéstámogató terméknek. Az alap a PRODUCT_READINESS_AUDIT.md, a jelenlegi forráskód, a lokális adatbázis-leírás és a korábbi célzott tesztbizonyíték.

## Bizonyítékosztályok

- VERIFIED — repository- vagy tényleges lokális futtatási bizonyíték.
- PARTIALLY VERIFIED — a megvalósítás egy része bizonyított, a teljes környezet nem.
- NOT VERIFIED — nincs futtatott vagy visszakövethető bizonyíték.
- USER DECISION — üzleti, adatvédelmi vagy üzemeltetési döntés kell.
- PROFESSIONAL REVIEW — építőipari, jogi, adatvédelmi vagy üzemeltetési review kell.

## G01–G04 állapot

| Kapu | Állapot | Bizonyíték és hiány |
|---|---|---|
| G01 Pilot scope és szerepkör | PARTIALLY VERIFIED | Lokális Auth, profil, szervezeti tagság és projekt-szűrés létezik; pilot-szerepkörök és onboarding nincsenek bizonyítva. |
| G02 Adatvédelem és hozzáférés | PARTIALLY VERIFIED | Privát fotó Storage, signed URL és szerveroldali szervezeti szűrés látható; jogalap, retention, export/törlés és hosted konfiguráció nem bizonyított. |
| G03 Üzemeltetés és helyreállítás | NOT VERIFIED | A rendszer lokális Supabase-re korlátozott; production/staging, mentés, restore, RPO/RTO és monitorozás nincs bizonyítva. |
| G04 Szakmai és jogi határ | PARTIALLY VERIFIED | A kalkulátor és PDF belső/geometriai összefoglalóként határolt; terepi szakmai és jogi review hiányzik. |

## Adatfolyam-leltár

| Adatcsoport | Jelenlegi kezelés | Pilot-hiány |
|---|---|---|
| Auth, profil, tagság | Auth claims, profiles, organization_members, RLS-minta | Hosted Auth, meghívás, letiltás, szerepkör-mátrix |
| Ügyfél, projekt, helyszín | Szerveroldali org/project szűrés | Adatminimalizálás, megőrzés, export/törlés |
| Tetőmodell, kalkuláció | Domain/UI validáció, revíziók | Szakmai felelősség, gyártói és statikai review |
| Anyag, ár, ajánlat | Szervezeti relációk, append-only döntési esemény | Árforrás és szerződéses határ |
| Feladat, napló, esemény | Szerveroldali org/project ellenőrzés, append-only napló | Archiválás, export, offline és konfliktus-eljárás |
| Fotó | Privát bucket, signed URL; feltöltéskor EXIF/GPS nélkül újrakódolt kép | Tájékoztatás, retention/törlés, régi fotók és cross-org staging |
| PDF | Aktuális adatokból belső összefoglaló | Immutable snapshot, hiteles archiválás |

## Fotók, EXIF és GPS

Az upload útvonal a fájlt Sharp segítségével dekódolja, EXIF nélkül újrakódolja, majd privát Storage-ba tölti; az alkalmazás által tárolt normalizált kép EXIF/GPS metaadatot nem tartalmaz. Ezt a viselkedést a `src/infrastructure/images/normalize-survey-photo.test.ts` közvetlenül ellenőrzi. A signed URL 15 perces; a metaadatot a normalizálás távolítja el, nem az URL. A hosted útvonal és a korábban feltöltött objektumok állapota ebből nem következik.

Pilot előtti döntés kell arról, hogy az eredeti fájl megmarad-e, kell-e tisztított előnézet, és milyen tájékoztatás, megőrzési idő és törlési jog vonatkozik a képekre. Történeti fotó nem kerül átírásra vagy törlésre. Szabály nélkül a fotófolyamat BLOCKING.

## Szervezeti izoláció

PARTIALLY VERIFIED: a szerveroldali olvasási utak aktív Auth-tagság és szervezeti/projekt kontextus alapján szűrnek; a fotó object key szervezeti és projekt prefixet tartalmaz; a bucket privát.

NOT VERIFIED: nincs hosted staging teszt cross-organization Storage-hozzáférésre, session-váltásra vagy admin/belső szerepkörre. Nincs bizonyíték exploitable cross-org hibára, de a negatív állítás teszt nélkül nem adható meg. Két szervezetet, két felhasználót és két projektet tartalmazó staging ellenőrzés szükséges.

## Mentés és helyreállítás

Nincs bizonyított hosted adatbázis- vagy Storage-backup, kulcsrotáció, restore-runbook, RPO/RTO, monitorozás vagy riasztás. Az adatbázismentés önmagában nem bizonyítja a fotóobjektumok helyreállíthatóságát.

Pilot előtt szükséges: mentési felelős; elkülönített staging restore DEMO-adatokkal; egy adatbázis-rekord és egy fotóobjektum tényleges visszaállítása; eredmény-, időpont- és eltérésnapló; dokumentált RPO/RTO és incidenskapcsolat. Restore-próba nélkül G03 BLOCKING.

## Kimeneti határok

A jelenlegi szöveg a geometriai összesítőt geometriailag ellenőrzöttként, a PDF-et belső kivitelezési összefoglalóként jelöli. A kimenet nem állít statikai méretezést, gyártói megfelelést, hivatalos e-építési naplót, elektronikus aláírást vagy szerződéses elfogadást. Az ajánlati döntés felhasználói esemény, nem szerződés. A terminológiát szakmai és jogi review-val kell jóváhagyni.

## Pilot checklist

| ID | Állapot | Bizonyíték | Akció | Felelős | Blokkoló |
|---|---|---|---|---|---|
| P01 | PARTIALLY VERIFIED | Lokális Auth/org/project szűrés | Szerepkörök, meghívás, letiltás | Product owner + fejlesztő | Igen |
| P02 | NOT VERIFIED | Nincs hosted bizonyíték | Staging/prod, secret, TLS | Üzemeltető | Igen |
| P03 | PARTIALLY VERIFIED | Privát bucket, signed URL | Cross-org és session staging smoke | Fejlesztő + QA | Igen |
| P04 | PARTIALLY VERIFIED | Az új feltöltésből EXIF/GPS törlődik; hosted és korábbi objektumok nem ellenőrzöttek | Tájékoztatás, retention/törlés és régi fotók kezelése | Product owner + adatvédelmi szakértő | Igen |
| P05 | NOT VERIFIED | Nincs restore-run | DB+Storage backup és restore-próba | Üzemeltető | Igen |
| P06 | NOT VERIFIED | Nincs RPO/RTO/monitoring | Runbook, riasztás, rotáció | Üzemeltető | Igen |
| P07 | PARTIALLY VERIFIED | Belső összefoglaló/disclaimer | Terminológia review | Szakmai reviewer + jogász | Igen |
| P08 | NOT VERIFIED | Nincs terepi smoke | Mobil, gyenge hálózat, újrapróbálás | Pilotvezető + QA | Igen |
| P09 | PARTIALLY VERIFIED | Lokális célzott tesztek | Gyártói/kivitelezési workflow review | Szakmai reviewer | Igen |
| P10 | PARTIALLY VERIFIED | Ismert hiányok dokumentálva | Go/no-go jegyzőkönyv | Product owner | Igen |

## Kritikus blokkolók

1. Hosted környezet, secrets, TLS és szerepkörök.
2. Adatvédelmi jogalap, tájékoztatás, megőrzés, export/törlés és incidensfolyamat.
3. A már működő EXIF/GPS-eltávolítás tájékoztatási, retention/törlési szabálya és a korábban feltöltött fotók kezelése.
4. Cross-organization és Storage negatív staging teszt.
5. DB- és Storage-mentés, restore, RPO/RTO és monitorozás.
6. Terminológia szakmai/jogi jóváhagyása.
7. Mobil és gyenge hálózati terepi smoke.
8. Kijelölt szakmai reviewer.

## Felhasználói döntések

- Mely szervezetek, szerepkörök és projekttípusok tartoznak a pilotba?
- Használhatók-e valódi ügyfél- és helyszínadatok, vagy csak DEMO-adatok?
- Megfelelő-e, hogy az új feltöltések normalizált képe EXIF/GPS nélkül tárolódik; milyen tájékoztatás, retention és törlés vonatkozzon a fotókra, és hogyan kezeljük a korábbi feltöltéseket?
- Mennyi a megőrzési idő, és kell-e export/törlés/helyesbítés?
- Mi a támogatási csatorna, válaszidő és incidens-eszkaláció?
- Mit tekintenek belső segédletnek, és mit tilos ügyfélnek vagy hatóságnak átadni?

## Szakértői review

Építőipari szakértő: tetőmodell, anyagkiírás, gyártói korlátok és kimeneti határok. Jogi szakértő: szerződés, aláírás, hivatalos napló és felelősségi nyilatkozat. Adatvédelmi szakértő: jogalap, EXIF/GPS, retention és érintetti jogok. Üzemeltető: backup, restore, monitorozás, kulcsok és incidens. Pilotvezető: mobil workflow, szerepkörök és elfogadási jegyzőkönyv.

## Ellenőrzési napló

Ebben a mérföldkőben célzott terminológiai UI/PDF módosítás készült; adatbázis-migráció és történeti adatváltoztatás nem történt. Futtatandó kapuk: git diff --check; célzott Vitest a geometriai és PDF-modulokra; npm run typecheck; npm run lint; npm run build webpack módban.

Hosted deploy, hosted restore, cross-org browser smoke és teljes pgTAP regresszió ebben a mérföldkőben nem bizonyított. F9.5.2 csak a blokkolók tulajdonosainak, határidejének és bizonyítékának rögzítése után indítható.

Javasolt Conventional Commit: docs(F9.5.1): add pilot readiness and operational safety.


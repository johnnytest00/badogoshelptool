# QA-03 — Kalkulátor-draft megőrzése és biztonságos váltás

Státusz: **PASS WITH LIMITATIONS** (2026-10-25). A fő, korábban reprodukált adatvesztés javítva; a lent felsorolt útvonal- és régi snapshot esetek nem teljesen igazoltak.

## Eredeti hiba és ok

A teljes QA audit a helyi DEMO-ban 400 cm fél fesztáv és 300 cm emelkedés után 5000 mm szarufaeredményt mért, majd másik kalkulátorra és vissza váltva mindkét érték elveszett. A korábbi `ConstructionCalculatorSuite` a választáskor `setValues({})`-t hívott, ugyanazon elem ismételt kiválasztásakor kezdőértékeket írt be, és az aszinkron definícióbetöltés minden visszatéréskor újrainicializált. A `LengthField` helyi szöveg- és mértékegység-állapota is eltűnt a mező leválasztásakor.

## Megoldás és állapothatárok

- Az aktuális komponensmunkamenet kanonikus mezői kalkulátorazonosító szerint elkülönített draft-térképben élnek. A hosszak továbbra is mm-ben jutnak a számításhoz és az input snapshotba; eredmény vagy rajz külön nem tárolódik. A hosszmező helyi szövege és mm/cm/m választása ugyanazon kalkulátorhoz és mezőhöz kötve áll vissza, a félkész szöveg is.
- Váltás és azonos elem újbóli kiválasztása nem töröl. Az aszinkron betöltés csak hiányzó draftot inicializál, a korábbi válaszokat generáció és effekt-takarítás szűri. A kezdeti szerverrevízió a saját kalkulátorának első betöltésekor alkalmazódik.
- Másik mentett kalkuláció explicit megnyitása új kontextus: a helyi draftok törlődnek, és a szerver aktuális revíziója töltődik. A helyben éppen sikeresen elmentett kalkuláció URL-frissítése megtartja a munkamenet többi draftját. Szervezetváltáskor a szervezetazonosítós React-kulcs új munkateret hoz létre; a szerver továbbra is szervezethez és jogosultsághoz kötve tölti a mentett adatot.
- A revízióválasztás az aktív mentetlen tartalom felülírása előtt a meglévő megerősítő párbeszédet használja. A „Maradok” változatlanul hagyja a mezőket; a jóváhagyott betöltés csak az adott kalkulátor draftját cseréli. Az „Új kalkuláció” az összes munkamenet-draft eldobását előre jelzi, és a mezőket, mértékegységeket, anyagállapotot és mentési munkamenetet alapállapotba teszi. Mentés alatt a váltás és az újrakezdés le van tiltva.
- A draft kizárólag memóriában marad. Nincs új függőség, `localStorage`/`sessionStorage`, DB-séma, RLS-, domainképlet- vagy snapshot-szerződés módosítás. Az új/korábbi szerverrevízió továbbra is csak a meglévő mentési actionön és optimista verzióellenőrzésen keresztül írható; a QA-03 böngészőpróbák nem mentettek.

## Ellenőrzés

- **Eredeti red:** a QA audit DEMO böngészőreprodukciója és a korábbi törlő kód. Az új célzott draft-regresszió az implementáció előtt hiányzó modullal bukott; ez önmagában nem UI red futás. **Green:** draft A→B→C→A/B, azonos újrainicializálás idempotenciája, késői alapérték figyelmen kívül hagyása, explicit revíziócsere, félkész szöveg és mértékegység statikus renderellenőrzése.
- **Asztali hitelesített DEMO, írás nélkül:** A `roof.rafter-cut` 400/300 cm → 5000 mm; B `roof.truss` részleges 250 cm; C `roof.timber-cutlist` részleges méretek; A/B visszatéréskor értékek megmaradtak. A ismételt választása változatlan. A 4 m kijelzés és opcionális 200 mm szarufamagasság visszaállt, eredmény újraszámolva 5000 mm. A B-ben lévő, rejtett A drafttal a „Mentett számításaim” link egyetlen mentetlenadat-párbeszédet adott; megszakítva megmaradt. Új kalkulációnál a megszakítás megőrizte, a jóváhagyás törölte az összes draftot és visszaállította a cm alapegységet.
- **Mobil emuláció:** Brave DevTools iPhone SE 375×667 nézetben a mobil választóval A→B→A működött; A 400/300 cm és 5000 mm eredmény visszaállt, az új kalkuláció üres mezőket adott. Látható vízszintes kilógás nem jelentkezett az ellenőrzött felső munkaterületen. Valódi érintőképernyős teszt és teljes oldalmagasságú overflow-mérés nem történt.
- **Mentett DEMO:** V2 megnyitás, V1 választás előtti megerősítés, megszakítás és jóváhagyott V1 megjelölés böngészőben igazolt. Mentési írás és szervezetek közti élő E2E nem történt.
- **Parancsok:** a végső célzott Vitest a draft-, hosszmező-, mentési panel- és definícióbetöltési tesztekre **4 fájl / 18 PASS**; teljes `npm test` **179 PASS / 8 SKIP fájl, 1070 PASS / 19 SKIP teszt**; teljes `npm run lint` PASS; közvetlen `tsc --noEmit -p tsconfig.typecheck.json` PASS; izolált másolatban `npm run typecheck` és `npm run build` PASS; `git diff --check` PASS.

## Ismert korlátok

- A meglévő alkalmazásszintű guard a linkes navigációt és az oldalelhagyást kezeli, de a Next.js kliensoldali browser back/forward előzményműveletet nem fogja meg. A QA-03 kalkulátorválasztó nem ír URL-előzményt; direkt URL-kalkulátorváltás frissül, de teljes route-elhagyáskor a memóriadraft nem tartós. Ez a teljes navigációs guard külön javítást igényel.
- A meglévő DEMO M2 szarufa V2 történeti rekord már a megnyitáskor „Mentetlen módosítás” státuszt mutatott; a QA-03 nem változtatott a régi snapshot és a mai input-séma összevetésén. A két revízió böngészős választása működött, de történeti kompatibilitását külön kell vizsgálni.
- React Testing Library nincs a projektben; új csomag nélkül a releváns állapotátmenetek Vitest egységtesztekkel és hitelesített böngészős próbával lettek ellenőrizve. A késleltetett alapérték segédfüggvény-szinten tesztelt; valódi hálózati versenyhelyzet és két szervezet közti élő váltás nem futott. A szervezeti kulcshatár kódban ellenőrzött. Nincs hostolt adatbázis- vagy RLS-regresszió; DB-változás sem történt.
- Browser plugin és telepített Playwright munkafolyamat nem állt rendelkezésre; a hitelesített helyi böngészős ellenőrzés a meglévő Brave munkamenetben, Codex számítógép-vezérléssel történt. A teszt végén a DEMO mezők ismét üresek, a DevTools bezárva.

Javasolt Conventional Commit: `fix(QA-03): preserve calculator drafts across in-session switching`.

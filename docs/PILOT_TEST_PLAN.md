# F9.5.2 — Szakmai terepi pilot tesztterv

**Státusz: PARTIAL / előkészítési dokumentum**

Ez a terv egy magyar tetőfedő vagy bádogos szakember kontrollált értékelését készíti elő. A pilot még nem történt meg. A dokumentum nem jelent production-readiness, szakmai megfelelőség vagy jogi jóváhagyás igazolást.

## 1. Pilot célja és hatóköre

**Első célcsoport:** egy kisvállalkozás egy tapasztalt tetőfedő/bádogos tesztelőjével.  
**Jelenlegi scope:** lokális vagy jóváhagyott staging DEMO-adatokkal végzett használhatósági és eredmény-összevetési próba.  
**Jövőbeli irány:** több szervezetet támogató SaaS; a jelenlegi szervezeti architektúra megőrzendő. Előfizetés és kereskedelmi onboarding most nem készül.

A pilot megválaszolja: érthető-e a munkafolyamat, mennyi a kézi adatbevitel, milyen terminológia zavaró, eltér-e a geometriai eredmény a szakmai referenciától, és használható-e mobil böngészőben. Nem validál hivatalos szabványt, gyártói előírást vagy statikai méretezést.

## 2. Belépési kapuk

| Kapu | Állapot | Bizonyíték / követelmény |
|---|---|---|
| Csak DEMO-adat, lokális próba | PASS | Fiktív személy, cím, projekt és fotó használata; nincs valódi ügyfélrekord. |
| Egy kijelölt szakmai tesztelő és scope | REQUIRES USER DECISION | Név, időablak, eszköz és értékelendő munkatípus rögzítése. |
| Hosted/staging környezet és TLS | NOT VERIFIED | F9.5.1 szerint nincs bizonyíték. |
| Szervezeti és Storage-izoláció | NOT VERIFIED | Két szervezet/két felhasználó negatív hozzáférési teszt kell. |
| Backup, restore, RPO/RTO | NOT VERIFIED | DB- és Storage-restore bizonyíték kell. |
| EXIF/GPS, retention, export/törlés | REQUIRES USER DECISION | Valódi fotó csak jóváhagyott adatvédelmi szabály mellett. |
| Szakmai/jogi kimeneti review | REQUIRES EXTERNAL REVIEW | Geometriai és belső összefoglaló határainak jóváhagyása. |
| Terepi mobil teszt | NOT VERIFIED | Fizikai iPhone/iPad ellenőrzés szükséges; emulátor nem helyettesíti. |

**Értelmezés:** a PASS csak a lokális, fiktív DEMO-próbára vonatkozik. Valódi ügyféladat pilotja a blokkolt kapuk feloldásáig nem engedélyezett.

## 3. Tesztkörnyezet és adatszabály

- Böngésző: támogatott iPhone/iPad Safari vagy a pilotvezető által kijelölt mobil böngésző; asztali böngésző csak előkészítő ellenőrzés.
- Adat: kizárólag DEMO név, DEMO cím, DEMO projekt és tesztfotó.
- Minden képernyőképen és visszajelzésben maszkolni kell személyes vagy ügyféladatot.
- Offline működést nem feltételezünk. Hálózati megszakadáskor az észlelt hiba és az elveszett/megmaradt bevitel rögzítendő.
- A PDF belső kivitelezési összefoglaló; nem hivatalos e-építési napló és nem archivált pillanatkép.

## 4. Három end-to-end forgatókönyv

### A — Nyeregtető-számítás és vizualizáció

**Cél:** a geometriai input, eredmény és rajzi értelmezés gyakorlati érthetőségének ellenőrzése.

**DEMO input:** szélesség 10 000 mm, hossz 12 500 mm, tetőhajlás 30°, eresztúlnyúlás 300 mm, oromfal-túlnyúlás 300 mm. A számítási referencia kizárólag a megadott geometriai feltételezés; nem statikai vagy gyártói adat.

**Lépések:**

1. Nyiss DEMO projektet és új nyeregtető-modellt.
2. Add meg az inputokat mm-ben és fokban.
3. Mentsd a modellt, majd nyisd meg az eredményt és a technikai rajzot.
4. Ellenőrizd az egy tetősíkot, teljes felületet, vetületet, emelkedést és ferde hosszt.
5. Módosítsd egy inputot, ments új revíziót, és figyeld a változást.
6. Írd le, melyik mező vagy jelölés volt félreérthető.

**Elvárt:** validációs hiba hiányos/érvénytelen inputnál; determinisztikus geometriai eredmények; az eredmény belső/geometriai határa látható.  
**Sikertelenség:** félreérthető mértékegység, eltűnő input, nem reprodukálható eredmény, vagy statikai/gyártói megfelelésre utaló állítás.  
**Kérdések:** Melyik adatot mérnéd másképp? Érthető-e a vízszintes vetület és ferde hossz különbsége? A rajz segít-e a munkában?

### B — Anyagbecslés és ajánlat

**Cél:** az elérhető anyagkiírás, anyagválasztás és ajánlati életciklus használhatóságának ellenőrzése.

**DEMO input:** a meglévő DEMO tetőmodellből származó tetőfelület; egy DEMO anyaglista két tétellel: Bádoglemez DEMO, Rögzítő DEMO. Az egység, ár és termékadat tesztadat, nem katalógus- vagy gyártói igazolás.

**Lépések:**

1. Nyisd meg a projekt anyagkimutatását.
2. Ellenőrizd, mely tételek származnak mentett tető- vagy lemezkiosztási eredményből.
3. Rögzíts egy kézi tételt és egy mennyiséget; jegyezd fel az egységet és az ár-besorolást.
4. Készíts DEMO ajánlati piszkozatot ügyfél- és tételkapcsolattal.
5. Nyisd meg a véglegesítés előtti ellenőrzést, majd csak DEMO-adattal rögzítsd a státuszt.
6. Ellenőrizd a történeti státuszt és PDF-linket.

**Elvárt:** hiányzó katalógusadat ne legyen automatikusan kitalálva; a nem támogatott egység kézi workflow maradjon; az ajánlati státusz ne állítson elektronikus aláírást vagy szerződést.  
**Gap:** az árak, gyártói specifikációk, csomagátváltás, ÁFA és beszerzés nem kerültek ebbe a pilotba.  
**Kérdések:** Hol kell ugyanazt az adatot újra megadni? Melyik egység vagy árjelölés zavaró? Melyik mező hiányzik a napi ajánlatkészítéshez?

### C — Kivitelezési terv, napló, fotó és dokumentáció

**Cél:** a tervből feladat, naplóbejegyzés, fotó és belső összefoglaló létrehozásának ellenőrzése.

**DEMO input:** DEMO kivitelezési terv; feladatok: Eresz előkészítés, Lemez felmérés; egy DEMO JPEG/PNG fotó, feladatkapcsolat nélkül és egy feladathoz kapcsolva; naplóbejegyzés DEMO szöveggel.

**Lépések:**

1. Hozz létre vagy nyiss meg egy DEMO kivitelezési tervet.
2. Rögzíts egy feladatot státusszal, prioritással és határidővel.
3. Készíts naplóbejegyzést munkadátummal, problémával és következő lépéssel.
4. Tölts fel DEMO fotót; ellenőrizd a méret-, MIME- és kategória-viselkedést.
5. Válassz fotót a tervhez, majd készíts belső kivitelezési összefoglaló előnézetet.
6. Nyisd meg a PDF-et és ellenőrizd a kiválasztott fejezeteket, fotókat és disclaimer-t.
7. Ismételd meg gyenge hálózattal, és rögzítsd a hiba utáni állapotot.

**Elvárt:** privát fotó és rövid signed URL; szervezeti/projekt szűrés; legfeljebb 8 PDF-fotó; belső összefoglaló megjelölés.  
**Nem támogatottként kezelendő:** offline mód, EXIF/GPS-strippelés, hivatalos e-napló, immutable archivált snapshot.  
**Kérdések:** Mennyi kézi adatbevitel szükséges? Megtalálható-e a fotó és feladat kapcsolata? Érthető-e, hogy a PDF nem hivatalos napló?

## 5. Számítási összevetési módszer

A tesztelő minden referenciát külön lapon rögzít. Egy eltérés önmagában nem bizonyít szoftverhibát: eltérő mérési pont, egység, ráhagyás vagy geometriai feltételezés is okozhatja.

| Mező | Rögzítendő |
|---|---|
| Referencia ID | Például REF-A-01 |
| Modul és revízió | Nyeregtető / mentett revízió |
| Input és egység | Minden méret mm-ben, szög fokban |
| Mérési forrás | Terepi mérés, rajz, DEMO vagy szakmai becslés |
| Szakmai várt eredmény | Tesztelő által megadott érték és feltételezés |
| Alkalmazás eredménye | Képernyőn/PDF-ben látható érték |
| Különbség | Abszolút és leíró eltérés; tolerancia nem található ki |
| Eltérés oka | Input, kerekítés, feltételezés vagy ismeretlen |
| Reviewer megjegyzése | Szakmai értékelés |
| Állapot | Nem ellenőrzött / egyeztetés alatt / szakmailag elfogadott |

**Bizonyítékosztály:** matematikailag ellenőrzött geometria; user-provided input; katalógusadat; gyártói igazolás; ideiglenes becslés; nem támogatott mérnöki számítás. A jelenlegi nyeregtető-kalkulátor csak geometriai eredményt ad.

## 6. Mobil iPhone/iPad ellenőrzés

- [ ] Navigáció, visszalépés és projektváltás
- [ ] Input mező fókusza, billentyűzet, mm/fok olvashatóság
- [ ] Tetőrajz zoom, pan és pointer érintés
- [ ] Eredménykártyák és hibaüzenetek álló nézetben
- [ ] Projekt, tetőmodell és feladat szerkesztése
- [ ] Fotó kiválasztása/feltöltése és kategória
- [ ] Naplóbejegyzés létrehozása
- [ ] Ajánlat megnyitása és státuszmagyarázata
- [ ] PDF előnézet/letöltés/nyomtatás-megnyitás
- [ ] Hálózat megszakítása, újrapróbálás, megmaradt adatok
- [ ] Nincs-e vízszintes túlcsordulás vagy eltakart művelet

A tesztelő rögzítse az eszközmodellt, OS-verziót, böngészőt, hálózatot és az időpontot. Az emulátor nem helyettesíti a fizikai készüléket.

## 7. UX-hatékonyság és gap-priorizálás

Minden forgatókönyvnél számlálandó: képernyők száma, mezők száma, visszalépések, ismételt adatbevitel, hibajavítás és megszakítás. Időt csak a tényleges pilot alatt rögzítsünk; előre várt idő nincs.

Prioritás: biztonság/helyesség → napi üzleti hatás → gyakoriság → felhasználói súrlódás → adatkonzisztencia → megvalósítási komplexitás → függőségek. Kritikus hiba külön kezelendő az opcionális feature-kéréstől.

Javasolt backlog-kártya: egy finding ID, egy reprodukálható probléma, egy felelős, egy elfogadási feltétel és egy újraellenőrzési lépés.

## 8. Kilépési feltételek

A DEMO-pilot akkor zárható, ha mindhárom forgatókönyv végigfutott, minden CRITICAL/HIGH findingnek van döntése, legalább egy geometriai összevetési lap kitöltött, a mobil ellenőrzőlista kitöltött, és a szakmai tesztelő aláírta a scope-ot. Ez nem jelenti a valódi ügyféladat pilot engedélyezését.

## 9. F9.6.1 előkészítése — ereszcsatorna-anyagbecslés

**Minimum input:** tetőél-szakaszok vagy mérési listák, szakaszhossz, kapcsolódó tetősík/projekt, mértékegység, kézi ráhagyás csak explicit jelöléssel.  
**Geometriai feltételezések:** mely élhez tartozik a szakasz, hogyan kezeljük a sarok- és végpontokat, mi tekinthető duplikált szakasznak, milyen kerekítés szükséges. Ezeket szakmailag kell dönteni.  
**Kimenet:** szakaszonkénti és összes folyóméter, darabszám csak explicit termékegységnél, külön jelzett kézi ráhagyás, provenance és bizonytalanság.  
**Gyártói adat:** ereszcsatorna-rendszer, szálhossz, toldó- és sarokelem-katalógus csak hiteles forrásból; ismeretlen adat nem tölthető ki.  
**Referenciaesetek:** rövid egyenes él, két eltérő hosszúságú eresz, sarokkal rendelkező DEMO-szakasz, hiányos mérési adat.  
**Biztonsági határ:** az anyagbecslés nem rainwater drainage design. Tetőfelületből önmagában nem következtethető megfelelő csatornaméret, lejtés, lefolyókapacitás vagy hidraulikai alkalmasság.  
**Nem készül ebben a mérföldkőben:** kalkulátor, schema, migráció, gyártói katalógus vagy hidraulikai méretezés.


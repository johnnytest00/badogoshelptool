# M9.16.1 — Karmi-paritás és régi snapshot QA

## Rövid eredmény

| Kérdés | Státusz | Megállapítás |
|---|---|---|
| 14,1 / 14,4 cm | **PASS** | Eltérő geometriai bemenetből, a HAP-ra vonatkozó két különböző hajlásmodellből adódik; nem kerekítési vagy rajzi eltérés. |
| Azonos normalizált geometriájú Karmi | **PASS** | Egyezik a függővágás, ülék, bevágásmélység és maradó magasság. |
| Régi snapshot szerkezeti kompatibilitása | **PARTIAL** | A meglévő, régi v1 bemeneteket modellező fixture-ek és betöltési kód kompatibilisek; valódi M9.15 előtti mentett revízió nem volt elérhető. |
| Teljes régi revízió visszanyitási E2E | **NOT VERIFIED** | Nincs ellenőrzött történeti adatbázis-rekord, és ebben a menetben nem történt böngészős/DB E2E. |

## 1. A 14,1 és 14,4 cm oka

Mindkét kalkulátor a közös `calculateRafterJoints` → `notchValues` geometriát használja a Karmi méreteihez. A szelvénymagasság 200 mm, a HAP 100 mm. A különbség az ehhez a közös számításhoz adott tetőhajlásban van:

| Útvonal | Tényleges bemenet és hajlás | Függővágás | Ülék | Merőleges bevágás | Maradó magasság |
|---|---|---:|---:|---:|---:|
| Szarufa kiszabása | fél fesztáv 4000 mm; gerincemelkedés 2800 mm; HAP 100 mm → `atan2(2800−100, 4000)` = **34,01935°** | 141,299 mm → **14,1 cm** | 209,331 mm → **20,9 cm** | 117,115 mm → **11,7 cm** | 82,885 mm → **8,3 cm** |
| Tetőanyag-kimutatás / faanyag-vágáslista | tetőszélesség 8000 mm; megadott hajlás 35° (a dokumentált 4000/2800-as geometria önmagában **34,99202°**) | 144,131 mm → **14,4 cm** | 205,902 mm → **20,6 cm** | 118,077 mm → **11,8 cm** | 81,923 mm → **8,2 cm** |

A kiszabási kalkulátorban a `riseMm` a gerinc felső élének a talpszelemen felső síkjától mért magassága, ezért a HAP levonódik a tető tényleges emelkedésének meghatározásakor (`roofs.ts`: `effectiveRiseMm = riseMm - seatCutHeightMm`; `pitch = atan2(effectiveRiseMm, halfSpan)`). Az anyagkalkulátorban a hajlás közvetlen bemenet, a HAP pedig ugyanabban a függőleges szelvényben a Karmi referenciamagassága; a tetőhajlást nem változtatja (`plane-birdsmouth.ts`). Így a „4000/2800 ≈ 35°” összevetés a kiszabási útvonalon figyelmen kívül hagyta, hogy a 2800 mm gerincmagasságból 100 mm HAP levonódik.

Független ellenőrzésként a fenti képletekkel újraszámolva a kiszabási érték 141,299 mm, a 2800/4000 tetőgeometriáé 144,131 mm. Azonos geometriához a kiszabási kalkulátorban **2900 mm gerincemelkedés** szükséges (2800 mm emelkedés + 100 mm HAP). Ekkor a hajlás 34,99202°, és mind a négy Karmi-méret egyezik a tetőgeometriából kapottal, a kijelzett értékek is rendre 14,4 / 20,6 / 11,8 / 8,2 cm. Ha a tetőanyag-kalkulátorba pontosan 35° kerül, a kiszabás azonos hajlású párja **2900,83 mm** gerincemelkedés (`4000 × tan(35°) + 100`).

A két út tehát a jelentett bemenetekkel **nem azonos bemenetű**, ezért nem azonos eredményű; normalizált geometriával **egyeznek**. A cm-es kijelzés 0,1 cm-re, ugyanabból a mm-eredményből kerekít. Az eredménytábla és a részletrajz ugyanazt a `calculateRafterJoints` kimenetet formázza, ezért a rajz és a tábla egyezése helyes; a meglévő egységteszt ezt külön is ellenőrzi. **Számítási, referencia-címkézési vagy kerekítési hibát nem találtam. Alkalmazáskód-javítás nem szükséges.** A M9.16 riportban a két forgatókönyv ekvivalensként való összevetése volt pontatlan; a további összevetéshez a gerincemelkedést HAP-pal együtt kell normalizálni.

## 2. M9.15 előtti snapshotok

### Szerződés és betöltési adatút

- Az input szerződés továbbra is `construction-suite.input.v1`; a `fields` string kulcs-érték rekord. A kalkulátor saját mezőlistája alapján az ismert régi értékeket változatlanul megtartja, az új, opcionális mezőket kezdeti vagy üres értékkel egészíti ki. Hiányzó kötelező bemenet és ismeretlen mező összehasonlításkor inkompatibilisnek minősül; mentési felület nem engedi arra új revíziót írni.
- Revízió betöltésekor `fieldValuesFrom` mai mezőlistát alkalmaz, `materialStateFromSnapshot` pedig a snapshotban tárolt anyagkérést, kiosztást és szarufa-/egyéb anyagspecifikációkat állítja vissza. A régi input és output snapshotokat a kód csak olvassa; a kompatibilitási normalizálás összehasonlítási nézet, nem írja át a történeti revíziót.
- A `seatCutHeightMm` (HAP), `purlinFaceMm`/`purlinTopMm`, `ridgeJoint` és a gerincdeszka-/gerincszelemen-méretek az input mezőrekordban maradnak. Hiányzó új mezőnél a gerinckapcsolat alapértéke „szembefutó”; opcionális méretmező üres marad, így nem keletkezik kitalált bevágás. A szarufatermék az anyag `specs.rafter` részében állítható vissza a profilazonosítóval és felülírt keresztmetszeti adatokkal; a szelvénymagasságot ezután a jelenlegi termékspecifikáció-feloldás adja.
- A szerveroldali revízióbetöltés szervezethez és standalone kalkulációhoz kötött; csak az input v1 sémát és a kalkulátorazonosságot elfogadó rekordot adja vissza. A SQL-író is v1 szerződést követ, a revíziós snapshotok immutable szabálya változatlan. E QA nem olvasott DB-rekordot és nem végzett írást.

### Meglévő fixture-bizonyíték

Az alábbi, meglévő tesztfixture-eket ténylegesen futtattam:

- M9.3 előtti tető-kalkulátor snapshot új `birdsmouth`, HAP és talpszelemenmező nélkül: az új mezők üresen hidratálódnak, nem jelenik meg hamis módosítás.
- M9.3 utáni, de új derék-/gerincmezők előtti snapshot: a régi HAP és Karmi-bemenetek megmaradnak; a hiányzó gerinckapcsolat alapértéke szembefutó, a hiányzó opcionális derékszelemen-érték üres.
- Korábbi V2 szarufakiszabási bemenet: a régi mm-értékek és a belőlük számolt eredménysorok az opcionális mai mezőkkel hidratálva változatlanok. Hiányzó kötelező vagy ismeretlen kulcs inkompatibilis.
- Mentett régebbi revízió panelfixture: betöltés, módosításjelzés és inkompatibilis revízió mentésének tiltása.
- Anyagsnapshot parse/restore fixture: tárolt anyag- és kiosztásállapot visszaállítása. Kiválasztott valós gyártói szarufaterméket, régi katalógusverziót és hozzá tartozó élő termékrekordot ez nem fed le.

Ez **fixture-alapú szerződés- és újrahidratálási bizonyíték**, nem valódi M9.15 előtti mentett kalkuláció újranyitása. Az M9.16.1 feladatban hivatkozott friss mentés–újranyitás csak újonnan készült rekordot fedett le. A régi adatbázis-rekord, teljes rajzi állapot és revízióazonosság élő E2E visszaállítása ezért **NOT VERIFIED**. Nem következtetek az ismeretlen, korábbi sémaverziójú vagy az input v1 sémát nem teljesítő rekordok kompatibilitására.

## 3. Prioritás és javítás

- **P1:** nem találtam igazolt számítási vagy snapshot-adatvesztési hibát.
- **P2:** nem szükséges javítás.
- **P3:** opcionális, csak ha a munkafolyamatban gyakran hasonlítják össze a kalkulátorokat: a kiszabási eredménynél röviden jelezni, hogy a tetőhajlás a gerincemelkedés és HAP különbségéből származik. Ez használhatósági magyarázat, nem hibajavítás; nem implementáltam az audit-only korlát miatt.

## 4. Ellenőrzési napló és korlátok

- `git status --short` ellenőrizve: már meglévő módosítások a `docs/PROGRESS.md` és `src/features/calculators/roof-calculator-definitions.ts` fájlokban, továbbá a meglévő `docs/M916_KARMI_PROFESSIONAL_WORKFLOW_QA.md` untracked állapotban. Ezeket érintetlenül hagytam; ezen jelentésen kívül nem módosítottam fájlt.
- Futtatott célzott tesztek: `npx vitest run src/features/calculators/construction-computation.test.ts src/features/calculators/rafter-joint-drawing.test.tsx src/domain/calculations/construction/rafter-joints.test.ts src/domain/calculations/construction/plane-birdsmouth.test.ts` — **4 fájl, 73 teszt PASS**; `npx vitest run src/features/calculators/construction-save-panel.test.tsx` — **1 fájl, 8 teszt PASS**. (Az első RTK-formázott kimenet nem volt olvasható, ezért ugyanazt a parancsot `rtk bypass`-szal futtattam; mindkét tényleges futtatás kilépési kódja 0.)
- Független trigonometriai számítás futtatva Node-dal; a fenti mm-értékek a nyers kimenetből származnak.
- **Nem futott:** teljes tesztkészlet, build, DB/migráció, élő böngészős azonos-geometriájú összehasonlítás, M9.15 előtti valódi rekord visszanyitása, nem DEMO gyártói szarufatermék-revízió ellenőrzése. Nincs új kód, ezért ezek nem változtatnak az itt igazolt domain- és fixture-eredményen, de az E2E kompatibilitást nyitva hagyják.

**Ajánlott Conventional Commit:** `docs(M9.16.1): report Karmi parity and legacy snapshot QA`.

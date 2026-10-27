# M10.1.8 — Független numerikus drift-QA

**Dátum:** 2026-10-27
**Vizsgált HEAD:** `abb6bd56d072cf2adbb22e6ee0665fc37a3d26b8` (`fix(M10.1.7)`)
**Munkafa:** a vizsgálat kezdetén a HEAD-del egyezett; csak a már meglévő, nem követett `.vitest/` állomány volt jelen. Ebben a QA-ban csak ez a jelentés került a követett fájlok közé.
**Döntés:** **FAIL — M10.1 nem zárható le.** A jelenlegi tolerancia a tényleges `takeoff` darabszámmezők megengedett tartományában elrejthet valódi, egy darabos eltérést (P2).

## 1. Hatókör és ellenőrzött kód

Csak az `outputsEquivalent` drift-összehasonlítót, a `ConstructionSavePanel` tesztjeit, a konstrukciós output-snapshotot, a fedőanyag-kiosztás releváns korlátait és a két megadott DEMO V1 újranyitását vizsgáltam. Alkalmazáskódot, kalkulációs adatot, adatbázist, sémát, revíziót és jogosultságot nem módosítottam.

A vizsgált képlet:

```text
|a − b| ≤ 1e-9 + 1e-9 × max(|a|, |b|)
```

## 2. Outputmezők és tartomány

A drift-döntés pontosan a korábbi védelem mezőhalmazát hasonlítja: `{lines, takeoff, cutList}`. Ezt a jelenlegi `driftComparisonFields` és az előző commit `comparableOutput` függvényének összevetése igazolja. A `specifications`, `schemaVersion`, `calculatorId` és opcionális `jointStatus` nem része ennek a korábbi drift-összehasonlításnak sem.

- `lines`: felirat, mért `number | string` érték, egység. Geometriai hossz, szög és anyagmennyiség mellett számláló sorokat is tartalmazhat.
- `takeoff`: státuszok, alkatrész- és mennyiségstruktúrák. A mennyiségek `value: number`, `unit` és `meaning` mezőket tartalmaznak; a `meaning` lehet `GEOMETRIC`, `LAYOUT`, `NOMINAL` vagy `PROCUREMENT`. A tényleges kiosztási darabszám `LAYOUT` mennyiségként jelenik meg.
- `cutList`: `lengthMm` és `count` számpárok, tömbsorrenddel és tömbhosszal.

A tetőméretek felső határa 100 000 mm, a fedőanyag-szélesség és -hossz pozitív egész mm, legfeljebb 1 000 000 mm. A kiosztás síkonként legfeljebb 2 000 oszlopot korlátoz, a darabszámot azonban csak a `Number.MAX_SAFE_INTEGER` határig validálja. Az egyes oszlopok `sheetCount` értékét a lejtőhossz és a használható hossz hányadosából számítja. Így egy szélsőséges, de a jelenlegi sémával érvényes kézi termékadat — 50 mm fedési szélesség, 1 mm használható és fizikai hossz, legfeljebb 100 m-es tetőméret, 2 000 oszlop — **milliárdos összesített táblad darabszámot** eredményezhet. A képlet relatív tagja ezért nem pusztán elméleti, a snapshotban szereplő darabszámokra is kiterjedhet.

## 3. Tolerancia és szélsőérték-vizsgálat

Az abszolút `1e-9` tag a nullához közeli pozitív és negatív gépi zajt elnyeli; a három korábban reprodukált Karmi-eltérés (`lines[6].value`, `lines[7].value`, `lines[9].value`) a tesztben is driftmentes. Az objektumkulcs-sorrend nem számít, a tömbök sorrendje és hossza számít. A hiányzó érték és a `null`, valamint a szám és a szöveg különböző marad.

A relatív tag viszont a nagysággal korlátlanul nő. A valódi production comparatorral futtatott ideiglenes, majd eltávolított határteszt eredményei:

| Eset | Comparator eredménye | Értékelés |
|---|---:|---|
| `1_000_000_000` vs. `1_000_000_001` | egyenértékű | **Hibásan elrejti az 1 darab eltérést.** Ennél a nagyságrendnél a megengedett különbség kb. 1. |
| `1_000_000` vs. `1_000_000.001` | egyenértékű | `1e-3` mennyiségi eltérés is belefér; mezőegység nélkül nem igazolható általánosan biztonságosnak. |
| `5` vs. `6` | eltérő | Darabszámváltozás megmarad a hétköznapi tartományban. |
| `100.000` vs. `100.001` | eltérő | `0.001` eltérés 100-as értéknél nem tűnik el. |
| `34.01934998982646` vs. `34.01934998982645` | egyenértékű | A bizonyított gépi szögzaj eltűnik. |
| `0` vs. `+1e-15` / `-1e-15` | egyenértékű | Várhatóan elnyeli a gépi zajt. |
| `Infinity` vs. `Infinity` | egyenértékű | Közvetlen `===` egyezés miatt igaz; JSON mentéskor a nem véges szám `null`-lá szerializálódik, így ez nem reális JSONB-snapshot pár. |
| `NaN` vs. `NaN` | eltérő | Helyes: az érvénytelen érték nem lesz egyenértékű. |
| Azonos objektum eltérő kulcssorrenddel | egyenértékű | Helyes, szerializációs kulcssorrendtől független. |

**Bizonyított P2:** a `takeoff.parts[].quantities[].value` vagy az onnan képzett `lines[].value` darabszám lehet milliárdos tartományban a jelenlegi valid bemeneti határok mellett. A reprodukció `outputsEquivalent(1_000_000_000, 1_000_000_001) === true`; a kijelzett mennyiség különbözhet egy táblával, miközben a driftjelzés elmarad. A probléma határa nem éles küszöb: a 1 000 000-es példa is lenyeli a `0.001` különbséget. Ez a különbség kis mennyiségű vagy finom felbontású értéknél szakmailag releváns lehet.

**Minősítés:** P2, mert ez a mentett és élő eredmény eltérését elrejtheti, de csak nagyobb outputértéknél; a szokásos, alacsonyabb tartományú méréseknél az 1 darabos és a fenti szögkülönbség jelződik. A régebbi P2 false-positive-ot a jelenlegi javítás ténylegesen kezeli; ez az újonnan bizonyított false-negative nyitva marad.

**Minimális javítási javaslat:** a darabszám szemantikájú mezőket hasonlítsuk pontosan (az outputstruktúrában pl. `unit: "db"`, `meaning: "LAYOUT"`, illetve a `cutList.count` alapján), a folytonos mennyiségek toleranciáját pedig egységhez/domainhoz kötött felső korláttal használjuk. Ne alkalmazzunk minden számra korlátlan, az értékkel növekvő toleranciát. Ez csak javaslat; a comparatort nem módosítottam.

## 4. Hamis és valódi drift regresszió

A `construction-save-panel.test.tsx` meglévő M10.1.7 tesztje a tényleges production `outputsEquivalent` függvényt használja. Lefedi a három Karmi ULP-eltérést, negatív és nullaközeli számot, kulcssorrendet, `5` vs. `6` darabot, szöveg/típus/mező/tömb eltérést, `NaN`-t, valamint komponensszinten az ULP-zaj elnyomását és az `+1` eltérés figyelmeztetését. A fenti további határtesztek szintén a production függvényen futottak; csak bizonyítékgyűjtésre szolgáltak, nem maradtak bent a forrásban.

Igazolt állapot: a szöveg, adattípus, objektumstruktúra, tömbsor, hiányzó/hozzáadott mező, és a szokásos tartománybeli érdemi geometriai vagy darabszám-változás drift marad. Az egységes relatív tolerancia miatt a nagyon nagy értékek kivételt képeznek a darabszám- és apró mennyiségváltozásoknál.

## 5. A két DEMO V1 újranyitása

Helyi Brave böngészőben, az alkalmazás normál sessionjével és az alkalmazás URL-jén keresztül nyitottam meg, majd teljes oldalfrissítést végeztem. RLS/auth megkerülés, SQL-írás, mentés vagy revíziómódosítás nem történt.

| DEMO kalkuláció | Frissítés utáni állapot | Mentési állapot |
|---|---|---|
| Material-takeoff `1a78b905-e80a-44fb-b701-1ad75e2171c3`, V1 revízió `88726c44-c605-4fa3-b26b-ecdd3a943976` | A mentett inputok és eredmények megjelentek; driftfigyelmeztetés nem látszott. | `Mentve · V1`; a V2 mentés gomb letiltva. |
| Timber-cutlist `ee5d703f-5c64-4179-9147-d8b776ad2866`, V1 revízió `399f81a0-f6d5-4088-9004-50ca9669c468` | A mentett inputok és eredmények megjelentek; driftfigyelmeztetés nem látszott. | `Mentve · V1`; a V2 mentés gomb letiltva. |

Az ellenőrzött eredmények között a material-takeoff 36 szarufát és 35 lécet mutatott; a timber-cutlist 36 db 4 826 mm-es szarufát és 35 db 10 000 mm-es lécet. A látható állapot bizonyítja a mentett V1 újranyitását és azt, hogy az útvonal nem ajánlott fel új mentést; adatbázis-snapshot előtte/utána összehasonlítást nem végeztem.

## 6. Diagnosztikai logger és futtatott ellenőrzések

- `src/features/calculators/construction-save-panel.tsx`: nincs `console.debug`, `loggedDrift` vagy drift-logoló effect; a megmaradt effect csak a mentési `pending` állapotot továbbítja. A `outputDriftDiffPaths` tiszta teszt-helperként megmaradt.
- `rtk bypass npx vitest run src/features/calculators/construction-save-panel.test.tsx` — **1 fájl, 11 teszt PASS**.
- Ideiglenes, production comparatorra hivatkozó peremteszt — **1 teszt PASS**; az eredmények fent dokumentáltak, a tesztfájl eltávolítva.
- `git diff --check` — PASS (a jelentés létrehozása előtti ellenőrzés; végső diff ellenőrzése külön szükséges).
- Teljes 1219-es Vitest suite, build, lint, typecheck, DB-diagnosztika nem futott; M10.1.7-ben dokumentált korábbi zöld eredmények nem számítanak ennek a QA-nak a friss ellenőrzésének.

## 7. Lezárási döntés

**FAIL — M10.1 nem zárható le.** A három korábbi Karmi gépi eltérésre a jelenlegi false-positive javítás böngészőben is eltüntette a két konkrét V1 figyelmeztetést. Ugyanakkor a korlátlan relatív tolerancia egy megengedett, milliárdos `LAYOUT` darabszámnál egy darabos valódi eltérést elrejthet. Ezt a hiányt legalább a darabszámmezők pontos összevetésével és a mértékegységes numerikus tolerancia célzott újra-QA-jával kell megszüntetni, mielőtt az M10.1 lezárható.

**Javasolt Conventional Commit:** `docs(M10.1.8): record numerical drift safety QA and high-magnitude count finding`

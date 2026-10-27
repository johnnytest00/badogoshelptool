# M10.1.10 — Végső numerikus QA és M10.1 lezárási döntés

**Dátum:** 2026-10-27
**Vizsgált kód:** src/features/calculators/construction-save-panel.tsx — production outputsEquivalent
**Hatókör:** független, célzott QA; alkalmazáskód, kalkuláció, adatbázis, migráció és revízió nem módosult.
**Döntés:** **PASS WITH LIMITATIONS — az M10.1 lezárható.** Nincs fennmaradó bizonyított P1/P2; a célzott elfogadási feltételek teljesültek. A m²/m³ egységekre nincs külön dokumentált szakmai tolerancia, ezt P3 kockázatként rögzítem.

## 1. Független numerikus ellenőrzés

A ténylegesen használt, exportált production outputsEquivalent függvényt közvetlenül vizsgáltam. A 2026-10-27-i munkafa tartalmazza az M10.1.9 változtatását. A számegyezés először elutasít minden nem véges operandust; a két véges, pontosan egyező érték elfogadott. A db egységű value és a count kulcs alatt lévő szám pontos egyezést követel. Más számoknál a megengedett eltérés:

    min(1e-9 + 1e-9 × max(|a|, |b|), 1e-6)

Objektumoknál a kulcsok és kulcsszám, tömböknél a hossz és a pozíciós sorrend is egyezik; a hiányzó kulcs, a null, a szöveg/szám típuscsere és más szövegérték eltérés marad. A kulcssorrend önmagában nem számít. Ez a comparator a mentett eredmény és az élő számítás driftjelzését vezérli; a QA nem módosított és nem mentett kalkulációt.

## 2. Diszkrét és folytonos mezők

| Tényleges outputforma | Kategorizálás | QA-eredmény |
|---|---|---|
| lines[].value | unit: "db" esetén pontos darabszám; más egységnél folytonos szám | Helyes. A mező egysége alapján azonosít; nem pusztán a címkétől vagy indexétől függ. |
| takeoff.parts[].quantities[].value | unit: "db" esetén pontos darabszám; egyébként folytonos | Helyes a beágyazott struktúrában is. A meaning: "LAYOUT" önmagában nem tesz pontos darabszámmá egy unit: "m" geometriai hosszt; ezt közvetlenül ellenőriztem. |
| cutList.*[].count | Pontos darabszám a count kulcs miatt | Helyes a vágáslista-struktúrában. |
| Hosszak, szögek, területek, térfogatok | Folytonos, felső korlátos numerikus tolerancia | A jelentős eltérések driftet adnak. |

A vizsgált domainkimenetek ténylegesen használnak unit: "db" mezőt a vonalakban és a takeoff mennyiségekben; a vágáslista lengthMm/count párokat tárol. Nem találtam olyan jelenlegi outputformát, amelyben egy nem-darabszám value unit: "db" értéket kapna, vagy a darabszám más kulcs/egység alatt jelenne meg. A LAYOUT jelentés nem elegendő a kategorizáláshoz, mert geometriai hossz is kaphatja ezt a jelentést.

## 3. Toleranciahatárok és kockázatok

- A tolerancia felső korlátja valóban 1e-6; nagy értéknél a relatív tag nem növeli tovább. Például 1000 környékén legfeljebb 1e-6 eltérés még tolerált, e fölött driftet jelez. Emiatt a korábbi milliárdos darabszám-problémát a diszkrét ág pontosan kezeli, a folytonos mezőknél pedig nem nő tovább az eltérésküszöb.
- A három dokumentált Karmi-ULP-különbség (lines[6].value, [7].value, [9].value) a teljes lines tömb alakjában is egyenértékű maradt. Az M10.1.9 eredeti komponens-tesztje külön igazolja, hogy a gépi zaj nem mutat mentett-vs-élő figyelmeztetést, míg az érdemi változás igen.
- A tolerancia abszolút része egységre nincs külön hangolva. 1e-6 mm és fok esetén elhanyagolható; ha az érték méter, akkor 0,001 mm; m²-nél 1 mm²; m³-nél 1 cm³. Az alkalmazás főeredmény-megjelenítése 0,001 egységig formáz, így az utóbbi két capérték ezerszer kisebb a megjelenített lépésnél. A specifikáció azonban nem mond ki külön legkisebb szakmai eltérést m²-re és m³-re. Ez **P3 / jövőbeli domainbővítési kockázat**, nem bizonyított jelenlegi hiba.
- A termékhatárok változása, új numerikus kimeneti egység vagy a darabszámok eltérő jelölése esetén a toleranciát és a szemantikai felismerést felül kell vizsgálni. A jelenlegi vizsgált outputoknál ilyen eltérés nem került elő.

## 4. Pozitív és negatív regressziós ellenőrzések

**Frissen futtatott célzott tesztek:**

- rtk bypass npx vitest run src/features/calculators/construction-save-panel.test.tsx — **1 fájl, 13/13 teszt PASS**. Lefedi a korábbi Karmi-zajt, komponensszintű zajelnyomást és valódi driftjelzést, a nagy diszkrét értéket, a cutList.count-ot, a nem véges értékeket és a szerkezeti eltérések alapjait.
- Ideiglenes, csak QA-célú teszt a production comparator importjával — **3/3 PASS**; a fájlt a futás után eltávolítottam. Bizonyított esetek:
  - 5 vs. 6 db → eltérő; 1 000 000 000 vs. 1 000 000 001 db → eltérő.
  - Milliárdos beágyazott takeoff.parts[].quantities[].value eltérés → eltérő.
  - Milliárdos lines[].value db-eltérés → eltérő.
  - cutList.count +1 → eltérő.
  - meaning: "LAYOUT", unit: "m" folytonos mennyiség ULP-közeli zajjal → egyenértékű, tehát nem lett tévesen darabszámnak minősítve.
  - Az ULP-közeli Karmi-szög- és hosszértékek → egyenértékűek.
  - 0,01 mm, 0,001°, 0,01 m², 0,001 m³ eltérés → drift.
  - Hibás/hiányzó mező, eltérő adattípus és tömbhossz → drift; NaN, Infinity, -Infinity önmagukkal összevetve is nem egyenértékű.

A korábbi M10.1.9 jelentésben szereplő teljes suite, lint, typecheck és build eredmények **korábbi bizonyítékok**, ebben a QA-fordulóban nem ismételtem meg őket. Teljes regressziós suite és production build nem friss bizonyíték e signoffhoz.

## 5. A korábbi mentett V1-ek újranyitása

A helyi, már hitelesített Brave alkalmazás-sessionen keresztül, az alkalmazás szokásos URL-jein nyitottam meg és frissítettem mindkét rekordot. Nem használtam adatbázis-hozzáférést, RLS-megkerülést vagy mentési műveletet.

| Kalkuláció | Friss újranyitás eredménye |
|---|---|
| Material-takeoff 1a78b905-e80a-44fb-b701-1ad75e2171c3 — V1 88726c44-c605-4fa3-b26b-ecdd3a943976 | A mentés panel Mentve · V1; Új revízió mentése · V2 letiltott; driftfigyelmeztetés nem látható. A számított eredmények megjelennek: 36 szarufa, 35 léc, 173,735 m és 350 m összhossz, 1,737 m³ és 0,525 m³ névleges keresztmetszeti térfogat. |
| Timber-cutlist ee5d703f-5c64-4179-9147-d8b776ad2866 — V1 399f81a0-f6d5-4088-9004-50ca9669c468 | Frissítés után Mentve · V1; Új revízió mentése · V2 letiltott; driftfigyelmeztetés nem látható. A vágáslista változatlanul 36 × 4 826 mm szarufát és 35 × 10 000 mm lécet mutat. |

A UI állapota és a letiltott V2 gomb bizonyítja, hogy az újranyitás után nem jelent meg mentendő eltérés, és e QA nem indított mentést. Nem készítettem DB előtte/utána revíziószám-lekérdezést. A rekordok az adott helyi, hitelesített alkalmazás-sessionben jogosultsággal elérhetők voltak; az alkalmazás UI-ján az admin1@testadmin.com e-mail címet nem tudtam külön visszaigazolni.

## 6. Fennmaradó hibák és nem ellenőrzött esetek

- **P1:** nincs bizonyított.
- **P2:** nincs bizonyított. Az M10.1.8 nagy darabszámú false-negative reprodukciója most driftet ad.
- **P3:** a folytonos tolerancia közös, egységfüggetlen 1e-6 capet használ; m²/m³ esetén az explicit szakmai küszöb hiánya miatt a jövőbeni kimenetbővítés újraértékelést igényel.
- Nem futtattam újra a teljes 1221-es tesztkészletet, production buildet, lintet, typechecket vagy adatbázis-tesztet; a szűk comparator-változás és a sikeres célzott tesztek mellett ezek nem voltak szükségesek ehhez a QA-döntéshez.
- Nem végeztem DB-revíziószám előtte/utána ellenőrzést, és külön nem igazoltam az aktív session e-mail címét; a UI-n keresztüli rekord-hozzáférés, állapot és számított eredmény frissen ellenőrzött.
- Nem történt mobileszközös vagy több böngészőmotoros vizuális regresszióteszt; a feladat numerikus drift- és V1 újranyitási ellenőrzésre korlátozódott.

## 7. Lezárási döntés

**PASS WITH LIMITATIONS. Az M10.1 lezárható.** A kért diszkrét számosságok minden vizsgált outputformában pontosak; a folytonos tolerancia felső korlátja a megadott szakmailag jelentős mm/fok/m²/m³ próbákon nem rejtett el eltérést; a korábbi false-positive Karmi esetek továbbra is toleráltak; a valódi drift figyelmeztetése működik; mindkét megadott V1 újranyitása sikerült. Nincs fennmaradó bizonyított P1/P2. A lezárás a fent rögzített P3 egységspecifikus tolerancia-kockázattal fogadható el.

**Javasolt Conventional Commit:** docs(M10.1.10): record final numerical QA and close M10.1
